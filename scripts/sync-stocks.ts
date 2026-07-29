import "dotenv/config";
import postgres from "postgres";

type Exchange = "KOSPI" | "KOSDAQ";
type SecurityType = "STOCK" | "ETF" | "ETN";

interface FscStockItem {
  basDt?: string;
  srtnCd?: string;
  itmsNm?: string;
  mrktCtg?: string;
}

interface FscResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      totalCount?: number;
      items?: { item?: FscStockItem | FscStockItem[] };
    };
  };
}

interface StockRecord {
  name: string;
  name_en: null;
  ticker: string;
  country: "KR";
  exchange: Exchange;
  currency: "KRW";
  security_type: SecurityType;
  is_active: true;
}

const SOURCES = [
  {
    securityType: "STOCK",
    url: "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo",
  },
  {
    securityType: "ETF",
    url: "https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo",
  },
  {
    securityType: "ETN",
    url: "https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETNPriceInfo",
  },
] as const;
type Source = (typeof SOURCES)[number];
const PAGE_SIZE = 1_000;
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");

function apiKey() {
  const value = process.env.FSC_STOCK_API_KEY;
  if (!value) throw new Error(".env에 FSC_STOCK_API_KEY가 필요합니다.");
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function fetchPage(source: Source, baseDate: string, pageNo: number) {
  const url = new URL(source.url);
  url.search = new URLSearchParams({
    serviceKey: apiKey(),
    resultType: "json",
    numOfRows: String(PAGE_SIZE),
    pageNo: String(pageNo),
    basDt: baseDate,
  }).toString();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 401)
    throw new Error(
      "공공데이터 인증키가 유효하지 않습니다. 주식시세정보 활용신청 승인 상태와 일반 인증키를 확인해 주세요.",
    );
  if (response.status === 403)
    throw new Error(
      source.securityType === "STOCK"
        ? "금융위원회 주식시세정보 API 활용신청 상태를 확인해 주세요."
        : "금융위원회 증권상품시세정보 API 활용신청이 필요합니다.",
    );
  if (!response.ok) throw new Error(`종목 목록 조회 실패 (${response.status})`);

  const body = (await response.json()) as FscResponse;
  const header = body.response?.header;
  if (header?.resultCode && header.resultCode !== "00")
    throw new Error(header.resultMsg || "종목 목록 조회에 실패했습니다.");

  const rawItems = body.response?.body?.items?.item;
  const items = rawItems
    ? Array.isArray(rawItems)
      ? rawItems
      : [rawItems]
    : [];
  return { items, totalCount: body.response?.body?.totalCount ?? items.length };
}

async function latestTradingDay(source: Source) {
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const baseDate = yyyymmdd(date);
    const page = await fetchPage(source, baseDate, 1);
    if (page.totalCount > 0) return { baseDate, firstPage: page };
  }
  throw new Error("최근 거래일의 종목 목록을 찾지 못했습니다.");
}

function toRecord(item: FscStockItem, source: Source): StockRecord | null {
  const ticker = item.srtnCd?.trim();
  const name = item.itmsNm?.trim();
  const exchange =
    source.securityType === "STOCK" ? item.mrktCtg?.trim() : "KOSPI";
  if (!ticker || !name || !/^\d{6}$/.test(ticker)) return null;
  if (exchange !== "KOSPI" && exchange !== "KOSDAQ") return null;
  return {
    name,
    name_en: null,
    ticker,
    country: "KR",
    exchange,
    currency: "KRW",
    security_type: source.securityType,
    is_active: true,
  };
}

async function fetchStocks() {
  const unique = new Map<string, StockRecord>();
  for (const source of SOURCES) {
    const { baseDate, firstPage } = await latestTradingDay(source);
    console.log(`${baseDate} 기준 ${source.securityType} 종목을 불러옵니다.`);
    const items = [...firstPage.items];
    const pageCount = Math.ceil(firstPage.totalCount / PAGE_SIZE);
    for (let pageNo = 2; pageNo <= pageCount; pageNo++) {
      const page = await fetchPage(source, baseDate, pageNo);
      items.push(...page.items);
    }

    let sourceCount = 0;
    for (const item of items) {
      const record = toRecord(item, source);
      if (!record) continue;
      unique.set(`${record.exchange}:${record.ticker}`, record);
      sourceCount++;
    }
    console.log(
      `${source.securityType} ${sourceCount.toLocaleString()}개 확인`,
    );
  }
  return [...unique.values()];
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
        where country = 'KR'
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
  const records = await fetchStocks();
  console.log(
    `국내 주식·ETF·ETN ${records.length.toLocaleString()}개 종목 확인`,
  );
  if (records.length < 1_000)
    throw new Error("종목 수가 비정상적으로 적어 동기화를 중단했습니다.");
  if (DRY_RUN) {
    console.log("--dry-run: 데이터베이스에는 저장하지 않았습니다.");
    return;
  }
  await saveToDatabase(records);
  console.log("금융위원회 공공데이터 종목 동기화가 완료되었습니다.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
