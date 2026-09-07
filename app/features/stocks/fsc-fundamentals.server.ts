import type { HoldingFundamentals } from "./fundamentals.types";

const FSC_FINANCIAL_URL =
  "https://apis.data.go.kr/1160100/service/GetFinaStatInfoService_V2/getSummFinaStat_V2";

interface FscFinancialItem {
  basDt?: string;
  bizYear?: string;
  fnclDcd?: string;
  fnclDcdNm?: string;
  enpSaleAmt?: string;
  enpBzopPft?: string;
  enpCrtmNpf?: string;
  enpTastAmt?: string;
  enpTdbtAmt?: string;
  enpTcptAmt?: string;
  fnclDebtRto?: string;
}

interface FscFinancialResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: FscFinancialItem | FscFinancialItem[] };
    };
  };
}

const cache = new Map<
  string,
  { expiresAt: number; value: HoldingFundamentals | null }
>();

function financialApiKey() {
  const value =
    process.env.FSC_FINANCIAL_API_KEY ?? process.env.FSC_STOCK_API_KEY;
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function finiteNumber(value?: string) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function preferConsolidated(items: FscFinancialItem[]) {
  const grouped = new Map<string, FscFinancialItem[]>();
  for (const item of items) {
    const year = item.bizYear ?? item.basDt?.slice(0, 4);
    if (!year) continue;
    grouped.set(year, [...(grouped.get(year) ?? []), item]);
  }
  return [...grouped.entries()]
    .map(
      ([, rows]) =>
        rows.find((row) =>
          `${row.fnclDcd ?? ""} ${row.fnclDcdNm ?? ""}`
            .toLowerCase()
            .includes("연결"),
        ) ?? rows[0],
    )
    .sort((a, b) =>
      (a.bizYear ?? a.basDt ?? "").localeCompare(b.bizYear ?? b.basDt ?? ""),
    )
    .slice(-5);
}

export function normalizeFscFundamentals(
  items: FscFinancialItem[],
): HoldingFundamentals | null {
  const periods = preferConsolidated(items);
  const latest = periods.at(-1);
  const previous = periods.at(-2);
  if (!latest) return null;

  const revenue = finiteNumber(latest.enpSaleAmt);
  const operatingProfit = finiteNumber(latest.enpBzopPft);
  const netIncome = finiteNumber(latest.enpCrtmNpf);
  const equity = finiteNumber(latest.enpTcptAmt);
  const liabilities = finiteNumber(latest.enpTdbtAmt);
  const debtRatioFromApi = finiteNumber(latest.fnclDebtRto);
  return {
    source: "금융위원회 기업 재무정보",
    asOf: latest.basDt ?? latest.bizYear ?? null,
    coverage: "full",
    periods: periods.length,
    revenueGrowthPercent: percentChange(
      revenue,
      finiteNumber(previous?.enpSaleAmt),
    ),
    operatingProfitGrowthPercent: percentChange(
      operatingProfit,
      finiteNumber(previous?.enpBzopPft),
    ),
    netIncomeGrowthPercent: percentChange(
      netIncome,
      finiteNumber(previous?.enpCrtmNpf),
    ),
    operatingMarginPercent:
      revenue && operatingProfit != null
        ? (operatingProfit / revenue) * 100
        : null,
    debtRatioPercent:
      debtRatioFromApi ??
      (equity && liabilities != null ? (liabilities / equity) * 100 : null),
    returnOnEquityPercent:
      equity && netIncome != null ? (netIncome / equity) * 100 : null,
    per: null,
    pbr: null,
    eps: null,
    bps: null,
  };
}

export async function getFscFundamentals(
  companyName: string,
): Promise<HoldingFundamentals | null> {
  const cached = cache.get(companyName);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const serviceKey = financialApiKey();
  if (!serviceKey) return null;

  try {
    const url = new URL(FSC_FINANCIAL_URL);
    url.search = new URLSearchParams({
      serviceKey,
      resultType: "json",
      pageNo: "1",
      numOfRows: "100",
      fnccmpNm: companyName,
    }).toString();
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as FscFinancialResponse;
    if (
      body.response?.header?.resultCode &&
      body.response.header.resultCode !== "00"
    )
      throw new Error(body.response.header.resultMsg ?? "공공데이터 응답 오류");

    const raw = body.response?.body?.items?.item;
    const items = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
    const value = normalizeFscFundamentals(items);
    if (!value) {
      cache.set(companyName, {
        expiresAt: Date.now() + 60 * 60_000,
        value: null,
      });
      return null;
    }

    cache.set(companyName, {
      expiresAt: Date.now() + 6 * 60 * 60_000,
      value,
    });
    return value;
  } catch (error) {
    console.warn("FSC fundamentals lookup failed", companyName, error);
    cache.set(companyName, {
      expiresAt: Date.now() + 30 * 60_000,
      value: null,
    });
    return null;
  }
}
