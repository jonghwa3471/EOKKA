import type { AnalysisResult } from "./analysis.types";

import { inArray } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { getDomesticMarketData } from "./fsc-client.server";
import { stocks } from "./schema";

const PATHS = 5_000;
const MONTHS = 360;

export interface AnalysisInput {
  goalAmount: number;
  holdings: Array<{ stockId: number; averagePrice: number; quantity: number }>;
}

function goalLabel(amount: number) {
  return `${(amount / 100_000_000).toLocaleString("ko-KR")}억`;
}

function periodLabel(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function quantile(values: Float64Array, percentile: number) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * percentile)];
}

function cagr(returns: number[], months: number) {
  if (returns.length < months) return null;
  const selected = returns.slice(-months);
  const growth = selected.reduce((value, rate) => value * (1 + rate), 1);
  return (growth ** (12 / months) - 1) * 100;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

export async function analyzePortfolio(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  if (
    !Number.isInteger(input.goalAmount) ||
    input.goalAmount < 100_000_000 ||
    input.goalAmount > 100_000_000_000
  )
    throw new Error("목표 금액은 1억 이상 1,000억 이하로 입력해 주세요.");
  if (!input.holdings.length || input.holdings.length > 5)
    throw new Error("분석할 종목은 1개 이상 5개 이하로 입력해 주세요.");
  if (
    input.holdings.some(
      ({ stockId, averagePrice, quantity }) =>
        !Number.isInteger(stockId) || averagePrice <= 0 || quantity <= 0,
    )
  )
    throw new Error("매수가와 보유 수량을 올바르게 입력해 주세요.");

  const ids = input.holdings.map((holding) => holding.stockId);
  const stockRows = await db
    .select()
    .from(stocks)
    .where(inArray(stocks.stock_id, ids));
  if (stockRows.length !== new Set(ids).size)
    throw new Error("유효하지 않은 종목이 포함되어 있습니다.");
  if (stockRows.some((stock) => stock.country !== "KR"))
    throw new Error("현재는 국내 주식만 분석할 수 있습니다.");
  if (
    stockRows.some(
      (stock) => !["STOCK", "ETF", "ETN"].includes(stock.security_type),
    )
  )
    throw new Error("지원하지 않는 상품 유형이 포함되어 있습니다.");

  const marketData = [];
  for (const holding of input.holdings) {
    const stock = stockRows.find((row) => row.stock_id === holding.stockId)!;
    const data = await getDomesticMarketData(
      stock.stock_id,
      stock.ticker,
      stock.security_type as "STOCK" | "ETF" | "ETN",
    );
    marketData.push({ holding, stock, data });
  }

  const holdingResults = marketData.map(({ holding, stock, data }) => {
    const cost = holding.averagePrice * holding.quantity;
    const value = data.currentPrice * holding.quantity;
    return {
      name: stock.name,
      ticker: stock.ticker,
      currentPrice: data.currentPrice,
      currency: "KRW" as const,
      valueKrw: value,
      returnRate: ((value - cost) / cost) * 100,
      cost,
    };
  });

  const totalCost = holdingResults.reduce((sum, item) => sum + item.cost, 0);
  const currentValue = holdingResults.reduce(
    (sum, item) => sum + item.valueKrw,
    0,
  );
  const weights = holdingResults.map((item) => item.valueKrw / currentValue);

  const returnMaps = marketData.map(({ data }) => {
    const map = new Map<string, number>();
    for (let i = 1; i < data.history.length; i++) {
      const previous = data.history[i - 1];
      const current = data.history[i];
      const rate = current.close / previous.close - 1;
      if (Number.isFinite(rate))
        map.set(current.date.slice(0, 6), Math.max(-0.8, Math.min(1, rate)));
    }
    return map;
  });

  const commonMonths = [...returnMaps[0].keys()]
    .filter((month) => returnMaps.every((map) => map.has(month)))
    .sort();
  const portfolioReturns = commonMonths.map((month) =>
    returnMaps.reduce(
      (sum, map, index) => sum + map.get(month)! * weights[index],
      0,
    ),
  );
  if (portfolioReturns.length < 24)
    throw new Error("시나리오 계산에 필요한 과거 데이터가 부족합니다.");

  const valuesByMonth = Array.from(
    { length: MONTHS + 1 },
    () => new Float64Array(PATHS),
  );
  const goalMonths = new Int16Array(PATHS).fill(-1);
  const random = seededRandom(ids.reduce((sum, id) => sum + id, 2_026));

  for (let path = 0; path < PATHS; path++) {
    let value = currentValue;
    let blockStart = 0;
    for (let month = 0; month <= MONTHS; month++) {
      valuesByMonth[month][path] = value;
      if (value >= input.goalAmount && goalMonths[path] === -1)
        goalMonths[path] = month;
      if (month === MONTHS) break;
      if (month % 6 === 0)
        blockStart = Math.floor(random() * portfolioReturns.length);
      const rate =
        portfolioReturns[(blockStart + (month % 6)) % portfolioReturns.length];
      value = Math.max(0, value * (1 + rate));
    }
  }

  const chart = [];
  for (let month = 0; month <= MONTHS; month += 6) {
    chart.push({
      month,
      conservative: quantile(valuesByMonth[month], 0.2),
      base: quantile(valuesByMonth[month], 0.5),
      optimistic: quantile(valuesByMonth[month], 0.8),
    });
  }

  const scenarioConfig = [
    ["conservative", "보수적", 0.2] as const,
    ["base", "평균", 0.5] as const,
    ["optimistic", "낙관적", 0.8] as const,
  ];
  const scenarios = scenarioConfig.map(([key, label, percentile]) => {
    let goalMonth: number | null = null;
    for (let month = 0; month <= MONTHS; month++) {
      if (quantile(valuesByMonth[month], percentile) >= input.goalAmount) {
        goalMonth = month;
        break;
      }
    }
    return {
      key,
      label,
      percentile,
      goalMonth,
      valueAt10Years: quantile(valuesByMonth[120], percentile),
    };
  });

  const probabilityAt = (months: number) =>
    (Array.from(goalMonths).filter((month) => month >= 0 && month <= months)
      .length /
      PATHS) *
    100;
  const profit = currentValue - totalCost;
  const returnRate = (profit / totalCost) * 100;
  const baseGoal = scenarios[1].goalMonth;
  const leveragedProducts = stockRows.filter(
    (stock) =>
      stock.security_type === "ETF" &&
      /(레버리지|인버스|2X|곱버스)/i.test(stock.name),
  );

  return {
    asOf: marketData
      .map(({ data }) => data.asOf)
      .sort()
      .at(0)!,
    goalAmount: input.goalAmount,
    totalCost,
    currentValue,
    profit,
    returnRate,
    priceBasis: "raw_close",
    holdings: holdingResults.map(({ cost: _cost, ...item }) => item),
    cagr: {
      oneYear: cagr(portfolioReturns, 12),
      threeYear: cagr(portfolioReturns, 36),
      fiveYear: cagr(portfolioReturns, 60),
      available: cagr(portfolioReturns, portfolioReturns.length),
    },
    scenarios,
    chart,
    probability: {
      tenYears: probabilityAt(120),
      twentyYears: probabilityAt(240),
      thirtyYears: probabilityAt(360),
    },
    riskWarnings:
      leveragedProducts.length > 0
        ? [
            `${leveragedProducts.map((stock) => stock.name).join(", ")}: 레버리지·인버스 상품은 일일 수익률을 추종하므로 장기 성과가 기초지수 수익률의 단순 배수와 다를 수 있고 변동성 손실이 커질 수 있습니다.`,
          ]
        : [],
    summary: [
      `현재 평가금액은 약 ${Math.round(currentValue).toLocaleString("ko-KR")}원이며, 매수 원금 대비 수익률은 ${returnRate.toFixed(1)}%입니다.`,
      baseGoal === null
        ? `평균 시나리오에서는 30년 안에 ${goalLabel(input.goalAmount)} 도달이 확인되지 않습니다.`
        : `평균 시나리오에서는 약 ${periodLabel(baseGoal)} 후 ${goalLabel(input.goalAmount)} 도달이 예상됩니다.`,
      `20년 안에 ${goalLabel(input.goalAmount)}을 넘은 시뮬레이션 비율은 ${probabilityAt(240).toFixed(1)}%입니다.`,
      "금융위원회 공공데이터의 종가를 사용하므로 액면분할·병합 같은 기업행사가 과거 수익률에 영향을 줄 수 있습니다.",
    ],
  };
}
