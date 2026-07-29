const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";

interface PricePoint {
  date: string;
  close: number;
}

export interface KisMarketData {
  currentPrice: number;
  exchangeRate: number;
  asOf: string;
  priceBasis: "adjusted_close";
  history: PricePoint[];
}

const globalKisState = globalThis as typeof globalThis & {
  __eokkaKisToken?: { value: string; expiresAt: number };
  __eokkaKisTokenPromise?: Promise<string>;
  __eokkaKisRequestQueue?: Promise<unknown>;
  __eokkaKisLastRequestAt?: number;
};

function credentials() {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  if (!appKey || !appSecret)
    throw new Error("KIS_APP_KEY와 KIS_APP_SECRET을 설정해 주세요.");
  return { appKey, appSecret };
}

async function getAccessToken() {
  const cachedToken = globalKisState.__eokkaKisToken;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  if (globalKisState.__eokkaKisTokenPromise)
    return globalKisState.__eokkaKisTokenPromise;

  globalKisState.__eokkaKisTokenPromise = (async () => {
    const { appKey, appSecret } = credentials();
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret,
      }),
    });
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !body.access_token)
      throw new Error(body.error_description || "KIS 인증에 실패했습니다.");

    globalKisState.__eokkaKisToken = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 86_400) * 1_000,
    };
    return body.access_token;
  })();

  try {
    return await globalKisState.__eokkaKisTokenPromise;
  } finally {
    globalKisState.__eokkaKisTokenPromise = undefined;
  }
}

async function rawKisGet<T>(
  path: string,
  trId: string,
  params: URLSearchParams,
) {
  const token = await getAccessToken();
  const { appKey, appSecret } = credentials();
  const response = await fetch(`${KIS_BASE_URL}${path}?${params}`, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId,
      custtype: "P",
    },
  });
  const body = (await response.json()) as T & {
    rt_cd?: string;
    msg1?: string;
  };
  if (!response.ok || body.rt_cd === "1")
    throw new Error(body.msg1 || "KIS 시세 조회에 실패했습니다.");
  return body;
}

function kisGet<T>(path: string, trId: string, params: URLSearchParams) {
  const queue = globalKisState.__eokkaKisRequestQueue ?? Promise.resolve();
  const request = queue.then(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const lastRequestAt = globalKisState.__eokkaKisLastRequestAt ?? 0;
      const wait = Math.max(0, 1_500 - (Date.now() - lastRequestAt));
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      globalKisState.__eokkaKisLastRequestAt = Date.now();
      try {
        return await rawKisGet<T>(path, trId, params);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const limited =
          message.includes("초당 거래건수") || message.includes("EGW00201");
        if (!limited || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      }
    }
    throw new Error("KIS 시세 조회에 실패했습니다.");
  });
  globalKisState.__eokkaKisRequestQueue = request.catch(() => undefined);
  return request;
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function isoDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export async function getKisDomesticMarketData(
  ticker: string,
): Promise<KisMarketData> {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 10);
  const [price, chart] = await Promise.all([
    kisGet<{ output: { stck_prpr: string } }>(
      "/uapi/domestic-stock/v1/quotations/inquire-price",
      "FHKST01010100",
      new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: ticker,
      }),
    ),
    kisGet<{ output2: Array<{ stck_bsop_date: string; stck_clpr: string }> }>(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      "FHKST03010100",
      new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: ticker,
        FID_INPUT_DATE_1: yyyymmdd(start),
        FID_INPUT_DATE_2: yyyymmdd(end),
        FID_PERIOD_DIV_CODE: "M",
        FID_ORG_ADJ_PRC: "0",
      }),
    ),
  ]);
  const history = chart.output2
    .map((point) => ({
      date: point.stck_bsop_date,
      close: Number(point.stck_clpr),
    }))
    .filter((point) => point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!history.length || Number(price.output.stck_prpr) <= 0)
    throw new Error("KIS 국내 시세 데이터가 부족합니다.");
  return {
    currentPrice: Number(price.output.stck_prpr),
    exchangeRate: 1,
    asOf: isoDate(history.at(-1)!.date),
    priceBasis: "adjusted_close",
    history,
  };
}

const exchangeCodes = { NASDAQ: "NAS", NYSE: "NYS", AMEX: "AMS" } as const;

export async function getKisUsMarketData(
  ticker: string,
  exchange: keyof typeof exchangeCodes,
): Promise<KisMarketData> {
  const exchangeCode = exchangeCodes[exchange];
  const [price, chart] = await Promise.all([
    kisGet<{ output: { last: string; t_rate?: string } }>(
      "/uapi/overseas-price/v1/quotations/price-detail",
      "HHDFS76200200",
      new URLSearchParams({ AUTH: "", EXCD: exchangeCode, SYMB: ticker }),
    ),
    kisGet<{ output2: Array<{ xymd: string; clos: string }> }>(
      "/uapi/overseas-price/v1/quotations/dailyprice",
      "HHDFS76240000",
      new URLSearchParams({
        AUTH: "",
        EXCD: exchangeCode,
        SYMB: ticker,
        GUBN: "2",
        BYMD: "",
        MODP: "1",
      }),
    ),
  ]);
  const history = chart.output2
    .map((point) => ({ date: point.xymd, close: Number(point.clos) }))
    .filter((point) => point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!history.length || Number(price.output.last) <= 0)
    throw new Error("KIS 미국 시세 데이터가 부족합니다.");
  return {
    currentPrice: Number(price.output.last),
    exchangeRate: Number(price.output.t_rate) || 1_350,
    asOf: isoDate(history.at(-1)!.date),
    priceBasis: "adjusted_close",
    history,
  };
}
