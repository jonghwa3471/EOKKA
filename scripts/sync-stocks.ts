import AdmZip from "adm-zip";
import "dotenv/config";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

type Country = "KR" | "US";
type Currency = "KRW" | "USD";
type Exchange = "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX";
type SecurityType = "STOCK" | "ETF" | "ETN";

interface StockRecord {
  name: string;
  name_en: string | null;
  ticker: string;
  country: Country;
  exchange: Exchange;
  currency: Currency;
  security_type: SecurityType;
  is_active: boolean;
}

interface DomesticSource {
  kind: "domestic";
  exchange: Extract<Exchange, "KOSPI" | "KOSDAQ">;
  url: string;
  archiveName: string;
  dataFileName: string;
  trailingFieldLength: number;
}

interface OverseasSource {
  kind: "overseas";
  exchange: Extract<Exchange, "NASDAQ" | "NYSE" | "AMEX">;
  url: string;
  archiveName: string;
  dataFileName: string;
}

type MasterSource = DomesticSource | OverseasSource;

const MASTER_DIRECTORY = path.resolve("data/stock-master");
const BATCH_SIZE = 500;
const KEEP_MASTER_FILES = process.env.KEEP_STOCK_MASTER_FILES === "1";
const DRY_RUN = process.argv.includes("--dry-run");

const SOURCES: MasterSource[] = [
  {
    kind: "domestic",
    exchange: "KOSPI",
    url: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
    archiveName: "kospi_code.mst.zip",
    dataFileName: "kospi_code.mst",
    // KIS documents 228 characters including the trailing newline.
    trailingFieldLength: 227,
  },
  {
    kind: "domestic",
    exchange: "KOSDAQ",
    url: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
    archiveName: "kosdaq_code.mst.zip",
    dataFileName: "kosdaq_code.mst",
    // KIS documents 222 characters including the trailing newline.
    trailingFieldLength: 221,
  },
  {
    kind: "overseas",
    exchange: "NASDAQ",
    url: "https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip",
    archiveName: "nasmst.cod.zip",
    dataFileName: "nasmst.cod",
  },
  {
    kind: "overseas",
    exchange: "NYSE",
    url: "https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip",
    archiveName: "nysmst.cod.zip",
    dataFileName: "nysmst.cod",
  },
  {
    kind: "overseas",
    exchange: "AMEX",
    url: "https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip",
    archiveName: "amsmst.cod.zip",
    dataFileName: "amsmst.cod",
  },
];

const decoder = new TextDecoder("euc-kr");

function normalize(value: string) {
  return value.replaceAll("\u0000", "").trim();
}

function parseDomestic(data: Buffer, source: DomesticSource): StockRecord[] {
  const rows = decoder.decode(data).split(/\r?\n/);
  const records: StockRecord[] = [];

  for (const row of rows) {
    if (row.length <= source.trailingFieldLength + 21) continue;

    const header = row.slice(0, -source.trailingFieldLength);
    const detail = row.slice(-source.trailingFieldLength);
    const ticker = normalize(header.slice(0, 9));
    const name = normalize(header.slice(21));
    const groupCode = detail.slice(0, 2);

    if (!/^[0-9A-Z]{6}$/.test(ticker) || !name) continue;

    const securityType =
      groupCode === "ST"
        ? "STOCK"
        : groupCode === "EF"
          ? "ETF"
          : groupCode === "EN"
            ? "ETN"
            : null;

    if (!securityType) continue;

    records.push({
      name,
      name_en: null,
      ticker,
      country: "KR",
      exchange: source.exchange,
      currency: "KRW",
      security_type: securityType,
      is_active: true,
    });
  }

  return records;
}

function parseOverseas(data: Buffer, source: OverseasSource): StockRecord[] {
  const rows = decoder.decode(data).split(/\r?\n/);
  const records: StockRecord[] = [];

  for (const row of rows) {
    if (!row.trim()) continue;

    const columns = row.split("\t");
    const ticker = normalize(columns[4] ?? "").toUpperCase();
    const nameKo = normalize(columns[6] ?? "");
    const nameEn = normalize(columns[7] ?? "");
    const sourceSecurityType = normalize(columns[8] ?? "");

    if (!ticker || (!nameKo && !nameEn)) continue;
    if (sourceSecurityType !== "2" && sourceSecurityType !== "3") continue;

    records.push({
      name: nameKo || nameEn,
      name_en: nameEn || null,
      ticker,
      country: "US",
      exchange: source.exchange,
      currency: "USD",
      security_type: sourceSecurityType === "3" ? "ETF" : "STOCK",
      is_active: true,
    });
  }

  return records;
}

async function downloadAndParse(source: MasterSource) {
  console.log(`[${source.exchange}] 마스터 파일 다운로드 중...`);

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(
      `${source.exchange} 다운로드 실패: ${response.status} ${response.statusText}`,
    );
  }

  const archive = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(MASTER_DIRECTORY, source.archiveName), archive);

  const zip = new AdmZip(archive);
  const entry = zip
    .getEntries()
    .find(
      (item) =>
        path.basename(item.entryName).toLowerCase() ===
        source.dataFileName.toLowerCase(),
    );

  if (!entry) {
    throw new Error(
      `${source.exchange} 압축 파일에서 ${source.dataFileName}을 찾지 못했습니다.`,
    );
  }

  const data = entry.getData();
  await writeFile(path.join(MASTER_DIRECTORY, source.dataFileName), data);

  const records =
    source.kind === "domestic"
      ? parseDomestic(data, source)
      : parseOverseas(data, source);

  console.log(`[${source.exchange}] ${records.length.toLocaleString()}개 확인`);
  return records;
}

function deduplicate(records: StockRecord[]) {
  const uniqueRecords = new Map<string, StockRecord>();

  for (const record of records) {
    uniqueRecords.set(`${record.exchange}:${record.ticker}`, record);
  }

  return [...uniqueRecords.values()];
}

async function saveToDatabase(records: StockRecord[]) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(".env에 DATABASE_URL이 필요합니다.");
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    await sql.begin(async (transaction) => {
      await transaction`
        update stocks
        set is_active = false, updated_at = now()
        where country in ('KR', 'US')
      `;

      for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
        const batch = records.slice(offset, offset + BATCH_SIZE);

        await transaction`
          insert into stocks ${transaction(
            batch,
            "name",
            "name_en",
            "ticker",
            "country",
            "exchange",
            "currency",
            "security_type",
            "is_active",
          )}
          on conflict (exchange, ticker) do update set
            name = excluded.name,
            name_en = excluded.name_en,
            country = excluded.country,
            currency = excluded.currency,
            security_type = excluded.security_type,
            is_active = true,
            updated_at = now()
        `;

        console.log(
          `Supabase 저장: ${Math.min(offset + batch.length, records.length).toLocaleString()} / ${records.length.toLocaleString()}`,
        );
      }
    });
  } finally {
    await sql.end();
  }
}

async function main() {
  await mkdir(MASTER_DIRECTORY, { recursive: true });

  try {
    const records = deduplicate(
      (await Promise.all(SOURCES.map(downloadAndParse))).flat(),
    );

    console.log(
      `전체 ${records.length.toLocaleString()}개 종목을 준비했습니다.`,
    );

    if (DRY_RUN) {
      console.log("--dry-run: 데이터베이스에는 저장하지 않았습니다.");
      return;
    }

    await saveToDatabase(records);
    console.log("KIS 종목 동기화가 완료되었습니다.");
  } finally {
    if (!KEEP_MASTER_FILES) {
      await rm(MASTER_DIRECTORY, { recursive: true, force: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
