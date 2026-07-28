import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { stockPrices } from "./schema";

const PRICE_ENDPOINTS = {
  STOCK:
    "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo",
  ETF: "https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo",
  ETN: "https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETNPriceInfo",
} as const;
type SupportedSecurityType = keyof typeof PRICE_ENDPOINTS;
const PAGE_SIZE = 1_000;
const RECENT_LOOKBACK_DAYS = 21;

interface FscPriceItem {
  basDt?: string;
  srtnCd?: string;
  mkp?: string;
  hipr?: string;
  lopr?: string;
  clpr?: string;
  trqu?: string;
}

interface FscResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      totalCount?: number;
      items?: { item?: FscPriceItem | FscPriceItem[] };
    };
  };
}

interface PricePoint {
  date: string;
  close: number;
}

export interface DomesticMarketData {
  currentPrice: number;
  asOf: string;
  priceBasis: "raw_close";
  history: PricePoint[];
}

function apiKey() {
  const value = process.env.FSC_STOCK_API_KEY;
  if (!value)
    throw new Error(
      "금융위원회 주식 시세 API 키가 설정되지 않았습니다. FSC_STOCK_API_KEY를 확인해 주세요.",
    );
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function isoDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function numberOrNull(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function fetchPricePage(
  ticker: string,
  securityType: SupportedSecurityType,
  beginDate: string,
  endDate: string,
  pageNo: number,
) {
  const url = new URL(PRICE_ENDPOINTS[securityType]);
  url.search = new URLSearchParams({
    serviceKey: apiKey(),
    resultType: "json",
    numOfRows: String(PAGE_SIZE),
    pageNo: String(pageNo),
    likeSrtnCd: ticker,
    beginBasDt: beginDate,
    endBasDt: endDate,
  }).toString();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401)
    throw new Error(
      "공공데이터 인증키가 유효하지 않습니다. 주식시세정보 활용신청 승인 상태와 일반 인증키를 확인해 주세요.",
    );
  if (response.status === 403)
    throw new Error(
      securityType === "STOCK"
        ? "금융위원회 주식시세정보 API 활용신청 상태를 확인해 주세요."
        : "금융위원회 증권상품시세정보 API 활용신청이 필요합니다.",
    );
  if (!response.ok)
    throw new Error(
      `공공데이터 시세 조회에 실패했습니다. (${response.status})`,
    );

  const body = (await response.json()) as FscResponse;
  const header = body.response?.header;
  if (header?.resultCode && header.resultCode !== "00")
    throw new Error(header.resultMsg || "공공데이터 시세 조회에 실패했습니다.");

  const rawItems = body.response?.body?.items?.item;
  const items = rawItems
    ? Array.isArray(rawItems)
      ? rawItems
      : [rawItems]
    : [];
  return { items, totalCount: body.response?.body?.totalCount ?? items.length };
}

async function fetchPricesBetween(
  ticker: string,
  securityType: SupportedSecurityType,
  start: Date,
  end: Date,
) {
  const beginDate = yyyymmdd(start);
  const endDate = yyyymmdd(end);

  const first = await fetchPricePage(
    ticker,
    securityType,
    beginDate,
    endDate,
    1,
  );
  const items = [...first.items];
  const pageCount = Math.ceil(first.totalCount / PAGE_SIZE);
  for (let pageNo = 2; pageNo <= pageCount; pageNo++) {
    const page = await fetchPricePage(
      ticker,
      securityType,
      beginDate,
      endDate,
      pageNo,
    );
    items.push(...page.items);
  }

  return items
    .filter(
      (item) =>
        item.srtnCd === ticker &&
        /^\d{8}$/.test(item.basDt ?? "") &&
        (numberOrNull(item.clpr) ?? 0) > 0,
    )
    .map((item) => ({
      trading_date: isoDate(item.basDt!),
      open: numberOrNull(item.mkp),
      high: numberOrNull(item.hipr),
      low: numberOrNull(item.lopr),
      close: numberOrNull(item.clpr)!,
      volume: numberOrNull(item.trqu),
    }));
}

async function fetchTenYearPrices(
  ticker: string,
  securityType: SupportedSecurityType,
) {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 10);
  return fetchPricesBetween(ticker, securityType, start, end);
}

async function fetchRecentPrices(
  ticker: string,
  securityType: SupportedSecurityType,
) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - RECENT_LOOKBACK_DAYS);
  return fetchPricesBetween(ticker, securityType, start, end);
}

async function readCachedPrices(stockId: number) {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 10);
  return db
    .select({
      date: stockPrices.trading_date,
      close: stockPrices.close,
      updatedAt: stockPrices.updated_at,
    })
    .from(stockPrices)
    .where(
      and(
        eq(stockPrices.stock_id, stockId),
        gte(stockPrices.trading_date, start.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(asc(stockPrices.trading_date));
}

function currentRefreshBoundary(now = new Date()) {
  const koreaNow = new Date(now.getTime() + 9 * 60 * 60 * 1_000);
  const [year, month, day] = koreaNow
    .toISOString()
    .slice(0, 10)
    .split("-")
    .map(Number);
  const todayAt2PmKst = new Date(Date.UTC(year, month - 1, day, 5));
  return now >= todayAt2PmKst
    ? todayAt2PmKst
    : new Date(todayAt2PmKst.getTime() - 86_400_000);
}

function checkedInCurrentCycle(
  rows: Array<{ date: string; close: number; updatedAt: Date }>,
) {
  if (rows.length === 0) return false;
  return rows.at(-1)!.updatedAt >= currentRefreshBoundary();
}

function toMonthlyHistory(rows: Array<{ date: string; close: number }>) {
  const monthly = new Map<string, PricePoint>();
  for (const row of rows) monthly.set(row.date.slice(0, 7), row);
  return [...monthly.values()].map((row) => ({
    date: row.date.replaceAll("-", ""),
    close: row.close,
  }));
}

async function savePrices(
  stockId: number,
  fetched: Awaited<ReturnType<typeof fetchTenYearPrices>>,
) {
  if (fetched.length === 0) return;
  await db
    .insert(stockPrices)
    .values(fetched.map((row) => ({ ...row, stock_id: stockId })))
    .onConflictDoUpdate({
      target: [stockPrices.stock_id, stockPrices.trading_date],
      set: {
        open: sql`excluded.open`,
        high: sql`excluded.high`,
        low: sql`excluded.low`,
        close: sql`excluded.close`,
        volume: sql`excluded.volume`,
        updated_at: new Date(),
      },
    });
}

export async function getDomesticMarketData(
  stockId: number,
  ticker: string,
  securityType: SupportedSecurityType,
): Promise<DomesticMarketData> {
  let rows = await readCachedPrices(stockId);

  if (rows.length === 0) {
    const fetched = await fetchTenYearPrices(ticker, securityType);
    if (fetched.length === 0)
      throw new Error("해당 종목의 공공데이터 시세를 찾지 못했습니다.");
    await savePrices(stockId, fetched);
    rows = await readCachedPrices(stockId);
  } else if (!checkedInCurrentCycle(rows)) {
    const fetched = await fetchRecentPrices(ticker, securityType);
    if (fetched.length === 0)
      throw new Error("최근 공공데이터 시세를 확인하지 못했습니다.");
    await savePrices(stockId, fetched);
    rows = await readCachedPrices(stockId);
  }

  const latest = await db
    .select({ date: stockPrices.trading_date, close: stockPrices.close })
    .from(stockPrices)
    .where(eq(stockPrices.stock_id, stockId))
    .orderBy(desc(stockPrices.trading_date))
    .limit(1);
  if (!latest[0]) throw new Error("저장된 주가 데이터가 없습니다.");

  return {
    currentPrice: latest[0].close,
    asOf: latest[0].date,
    priceBasis: "raw_close",
    history: toMonthlyHistory(rows),
  };
}
