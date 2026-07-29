import AdmZip from "adm-zip";
import "dotenv/config";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

type Exchange = "NASDAQ" | "NYSE" | "AMEX";

interface StockRecord {
  name: string;
  name_en: string | null;
  ticker: string;
  country: "US";
  exchange: Exchange;
  currency: "USD";
  security_type: "STOCK" | "ETF";
  is_active: true;
}

const SOURCES = [
  ["NASDAQ", "nasmst.cod"],
  ["NYSE", "nysmst.cod"],
  ["AMEX", "amsmst.cod"],
] as const;
const MASTER_DIRECTORY = path.resolve("data/stock-master-us");
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");
const decoder = new TextDecoder("euc-kr");

function normalize(value: string) {
  return value.replaceAll("\u0000", "").trim();
}

function parseMaster(data: Buffer, exchange: Exchange) {
  const records: StockRecord[] = [];
  for (const row of decoder.decode(data).split(/\r?\n/)) {
    const columns = row.split("\t");
    const ticker = normalize(columns[4] ?? "").toUpperCase();
    const nameKo = normalize(columns[6] ?? "");
    const nameEn = normalize(columns[7] ?? "");
    const sourceType = normalize(columns[8] ?? "");
    if (!ticker || (!nameKo && !nameEn)) continue;
    if (sourceType !== "2" && sourceType !== "3") continue;
    records.push({
      name: nameKo || nameEn,
      name_en: nameEn || null,
      ticker,
      country: "US",
      exchange,
      currency: "USD",
      security_type: sourceType === "3" ? "ETF" : "STOCK",
      is_active: true,
    });
  }
  return records;
}

async function downloadAndParse(exchange: Exchange, dataFileName: string) {
  console.log(`[${exchange}] KIS 마스터 파일 다운로드 중...`);
  const url = `https://new.real.download.dws.co.kr/common/master/${dataFileName}.zip`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw new Error(`${exchange} 다운로드 실패 (${response.status})`);
  const archive = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(MASTER_DIRECTORY, `${dataFileName}.zip`), archive);
  const entry = new AdmZip(archive)
    .getEntries()
    .find(
      (item) =>
        path.basename(item.entryName).toLowerCase() ===
        dataFileName.toLowerCase(),
    );
  if (!entry)
    throw new Error(`${dataFileName}을 압축 파일에서 찾지 못했습니다.`);
  const records = parseMaster(entry.getData(), exchange);
  console.log(`[${exchange}] ${records.length.toLocaleString()}개 확인`);
  return records;
}

async function saveToDatabase(records: StockRecord[]) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error(".env에 DATABASE_URL이 필요합니다.");
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        update stocks
        set is_active = false, updated_at = now()
        where country = 'US'
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
      }
    });
  } finally {
    await sql.end();
  }
}

async function main() {
  await mkdir(MASTER_DIRECTORY, { recursive: true });
  try {
    const unique = new Map<string, StockRecord>();
    for (const record of (
      await Promise.all(
        SOURCES.map(([exchange, file]) => downloadAndParse(exchange, file)),
      )
    ).flat())
      unique.set(`${record.exchange}:${record.ticker}`, record);
    const records = [...unique.values()];
    console.log(`미국 주식·ETF ${records.length.toLocaleString()}개 확인`);
    if (records.length < 1_000)
      throw new Error("종목 수가 비정상적으로 적어 동기화를 중단했습니다.");
    if (DRY_RUN) {
      console.log("--dry-run: 데이터베이스에는 저장하지 않았습니다.");
      return;
    }
    await saveToDatabase(records);
    console.log("KIS 미국 종목 동기화가 완료되었습니다.");
  } finally {
    if (process.env.KEEP_STOCK_MASTER_FILES !== "1")
      await rm(MASTER_DIRECTORY, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
