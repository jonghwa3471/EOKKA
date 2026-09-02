const FRANKFURTER_BASE_URL = "https://api.frankfurter.app";

type FrankfurterResponse = {
  date?: string;
  rates?: { KRW?: number };
};

export type HistoricalExchangeRate = {
  rate: number;
  basedOn: string;
};

export async function getHistoricalUsdKrwRate(
  tradedOn: string,
): Promise<HistoricalExchangeRate> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradedOn))
    throw new Error("거래 날짜를 확인해 주세요.");

  const response = await fetch(
    `${FRANKFURTER_BASE_URL}/${tradedOn}?from=USD&to=KRW`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) throw new Error("거래 당시 환율을 불러오지 못했어요.");

  const body = (await response.json()) as FrankfurterResponse;
  const rate = body.rates?.KRW;
  if (!body.date || !rate || !Number.isFinite(rate) || rate <= 0)
    throw new Error("거래 당시 환율 정보가 없어요.");

  return { rate, basedOn: body.date };
}
