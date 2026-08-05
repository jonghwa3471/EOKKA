import type { AnalysisResult } from "./analysis.types";

import { inArray } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { getDomesticMarketData } from "./fsc-client.server";
import {
  type KisBenchmarkKind,
  getKisBenchmarkHistory,
} from "./kis-client.server";
import { getMarketData } from "./market-data.server";
import { getStockMarketMode } from "./market-mode.server";
import { stocks } from "./schema";

const PATHS = 5_000;
const GOAL_MONTHS = 360;
const SIMULATION_MONTHS = 600;

export interface AnalysisInput {
  goalAmount: number;
  holdings: Array<{
    stockId: number;
    averagePrice: number;
    quantity: number;
    currency: "KRW" | "USD";
  }>;
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

function historicalDriftWeight(month: number) {
  if (month <= 120) return 0.6 - (month / 120) * 0.25;
  if (month <= 360) return 0.35 - ((month - 120) / 240) * 0.25;
  return 0.1 - ((month - 360) / 240) * 0.05;
}

function residualVolatilityWeight(month: number) {
  if (month <= 120) return 1;
  return 1 - ((month - 120) / 480) * 0.2;
}

function longTermAnnualReturn(
  marketData: Array<{ stock: { country: string; exchange: string } }>,
  weights: number[],
) {
  return marketData.reduce((sum, { stock }, index) => {
    const expected =
      stock.country === "KR"
        ? stock.exchange === "KOSDAQ"
          ? 0.075
          : 0.07
        : stock.exchange === "NASDAQ"
          ? 0.08
          : 0.07;
    return sum + expected * weights[index];
  }, 0);
}

type PriceHistory = Array<{ date: string; close: number }>;

function monthlyReturnMap(history: PriceHistory) {
  const map = new Map<string, number>();
  for (let index = 1; index < history.length; index++) {
    const previous = history[index - 1];
    const current = history[index];
    const rate = current.close / previous.close - 1;
    if (Number.isFinite(rate))
      map.set(current.date.slice(0, 6), Math.max(-0.8, Math.min(1, rate)));
  }
  return map;
}

function weightedMonthlyReturns(
  components: Array<{ weight: number; history: PriceHistory }>,
) {
  if (!components.length) return [];
  const maps = components.map(({ history }) => monthlyReturnMap(history));
  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const commonMonths = [...maps[0].keys()]
    .filter((month) => maps.every((map) => map.has(month)))
    .sort();
  return commonMonths.map((month) =>
    maps.reduce(
      (sum, map, index) =>
        sum + map.get(month)! * (components[index].weight / totalWeight),
      0,
    ),
  );
}

function simulatePaths(
  returns: number[],
  initialValue: number,
  goalAmount: number,
  seed: number,
  longTermAnnualReturn: number,
) {
  const logReturns = returns.map((rate) => Math.log1p(rate));
  const rawHistoricalMonthlyDrift =
    logReturns.reduce((sum, rate) => sum + rate, 0) / logReturns.length;
  const historicalMonthlyDrift = Math.min(
    Math.log1p(0.2) / 12,
    Math.max(Math.log1p(-0.1) / 12, rawHistoricalMonthlyDrift),
  );
  const longTermMonthlyDrift = Math.log1p(longTermAnnualReturn) / 12;
  const valuesByMonth = Array.from(
    { length: SIMULATION_MONTHS + 1 },
    () => new Float64Array(PATHS),
  );
  const goalMonths = new Int16Array(PATHS).fill(-1);
  const random = seededRandom(seed);

  for (let path = 0; path < PATHS; path++) {
    let value = initialValue;
    let blockStart = 0;
    for (let month = 0; month <= SIMULATION_MONTHS; month++) {
      valuesByMonth[month][path] = value;
      if (
        month <= GOAL_MONTHS &&
        value >= goalAmount &&
        goalMonths[path] === -1
      )
        goalMonths[path] = month;
      if (month === SIMULATION_MONTHS) break;
      if (month % 6 === 0)
        blockStart = Math.floor(random() * logReturns.length);
      const sampledLogReturn =
        logReturns[(blockStart + (month % 6)) % logReturns.length];
      const residual = sampledLogReturn - rawHistoricalMonthlyDrift;
      const driftWeight = historicalDriftWeight(month);
      const monthlyDrift =
        historicalMonthlyDrift * driftWeight +
        longTermMonthlyDrift * (1 - driftWeight);
      const projectedLogReturn =
        monthlyDrift + residual * residualVolatilityWeight(month);
      value = Math.max(0, value * Math.exp(projectedLogReturn));
    }
  }

  return { valuesByMonth, goalMonths };
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
  if (!input.holdings.length || input.holdings.length > 10)
    throw new Error("분석할 종목은 1개 이상 10개 이하로 입력해 주세요.");
  if (
    input.holdings.some(
      ({ stockId, averagePrice, quantity, currency }) =>
        !Number.isInteger(stockId) ||
        averagePrice <= 0 ||
        quantity <= 0 ||
        !["KRW", "USD"].includes(currency),
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
  const marketMode = getStockMarketMode();
  if (
    marketMode === "domestic" &&
    stockRows.some((stock) => stock.country !== "KR")
  )
    throw new Error("현재는 국내 주식만 분석할 수 있습니다.");
  if (
    marketMode === "domestic" &&
    input.holdings.some((holding) => holding.currency !== "KRW")
  )
    throw new Error("국내 모드에서는 원화 매수가만 입력할 수 있습니다.");
  if (
    stockRows.some(
      (stock) => !["STOCK", "ETF", "ETN"].includes(stock.security_type),
    )
  )
    throw new Error("지원하지 않는 상품 유형이 포함되어 있습니다.");

  const marketData = [];
  for (const holding of input.holdings) {
    const stock = stockRows.find((row) => row.stock_id === holding.stockId)!;
    const data = await getMarketData(stock);
    marketData.push({ holding, stock, data });
  }

  const holdingResults = marketData.map(({ holding, stock, data }) => {
    const costRate = holding.currency === "USD" ? data.exchangeRate : 1;
    const valueRate = stock.currency === "USD" ? data.exchangeRate : 1;
    const cost = holding.averagePrice * holding.quantity * costRate;
    const value = data.currentPrice * holding.quantity * valueRate;
    return {
      name: stock.name,
      ticker: stock.ticker,
      currentPrice: data.currentPrice,
      currency: stock.currency as "KRW" | "USD",
      costKrw: cost,
      valueKrw: value,
      profitKrw: value - cost,
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
  const expectedLongTermReturn = longTermAnnualReturn(marketData, weights);

  const portfolioReturns = weightedMonthlyReturns(
    marketData.map(({ data }, index) => ({
      weight: weights[index],
      history: data.history,
    })),
  );
  if (portfolioReturns.length < 24)
    throw new Error("시나리오 계산에 필요한 과거 데이터가 부족합니다.");

  const { valuesByMonth, goalMonths } = simulatePaths(
    portfolioReturns,
    currentValue,
    input.goalAmount,
    ids.reduce((sum, id) => sum + id, 2_026),
    expectedLongTermReturn,
  );

  const benchmarkWeights = new Map<KisBenchmarkKind, number>();
  marketData.forEach(({ stock }, index) => {
    const kind: KisBenchmarkKind =
      stock.country === "KR"
        ? stock.exchange === "KOSDAQ"
          ? "KOSDAQ"
          : "KOSPI"
        : stock.exchange === "NASDAQ"
          ? "NASDAQ"
          : "S&P 500";
    benchmarkWeights.set(
      kind,
      (benchmarkWeights.get(kind) ?? 0) + weights[index],
    );
  });

  let benchmark: AnalysisResult["benchmark"] = null;
  let benchmarkValues: Float64Array[] | null = null;
  try {
    const components: Array<{
      name: string;
      weight: number;
      history: PriceHistory;
    }> = [];
    if (marketMode === "global-test") {
      for (const [kind, weight] of benchmarkWeights) {
        components.push({
          name:
            kind === "NASDAQ"
              ? "NASDAQ 100 ETF"
              : kind === "S&P 500"
                ? "S&P 500 ETF"
                : kind,
          weight,
          history: await getKisBenchmarkHistory(kind),
        });
      }
    } else {
      const proxyTickers = new Map<KisBenchmarkKind, string>([
        ["KOSPI", "069500"],
        ["KOSDAQ", "229200"],
      ]);
      const requestedTickers = [...benchmarkWeights.keys()].flatMap((kind) => {
        const ticker = proxyTickers.get(kind);
        return ticker ? [ticker] : [];
      });
      const proxyRows = requestedTickers.length
        ? await db
            .select()
            .from(stocks)
            .where(inArray(stocks.ticker, requestedTickers))
        : [];
      for (const [kind, weight] of benchmarkWeights) {
        const ticker = proxyTickers.get(kind);
        const proxy = proxyRows.find((row) => row.ticker === ticker);
        if (!ticker || !proxy) continue;
        const data = await getDomesticMarketData(proxy.stock_id, ticker, "ETF");
        components.push({
          name: `${kind} ETF`,
          weight,
          history: data.history,
        });
      }
    }

    const benchmarkReturns = weightedMonthlyReturns(components);
    if (benchmarkReturns.length >= 24) {
      const simulated = simulatePaths(
        benchmarkReturns,
        currentValue,
        input.goalAmount,
        7_031,
        expectedLongTermReturn,
      );
      benchmarkValues = simulated.valuesByMonth;
      let benchmarkGoalMonth: number | null = null;
      for (let month = 0; month <= GOAL_MONTHS; month++) {
        if (quantile(benchmarkValues[month], 0.5) >= input.goalAmount) {
          benchmarkGoalMonth = month;
          break;
        }
      }
      benchmark = {
        label:
          components.length === 1
            ? components[0].name
            : `${components.map(({ name }) => name).join("·")} 혼합`,
        components: components.map(({ name }) => name),
        goalMonth: benchmarkGoalMonth,
        valueAt10Years: quantile(benchmarkValues[120], 0.5),
        cagr: cagr(benchmarkReturns, benchmarkReturns.length),
      };
    }
  } catch (error) {
    console.warn("Market benchmark calculation skipped", error);
  }

  const chart = [];
  for (let month = 0; month <= GOAL_MONTHS; month += 6) {
    chart.push({
      month,
      conservative: quantile(valuesByMonth[month], 0.2),
      base: quantile(valuesByMonth[month], 0.5),
      optimistic: quantile(valuesByMonth[month], 0.8),
      market: benchmarkValues ? quantile(benchmarkValues[month], 0.5) : null,
    });
  }

  const scenarioConfig = [
    ["conservative", "보수적", 0.2] as const,
    ["base", "평균", 0.5] as const,
    ["optimistic", "낙관적", 0.8] as const,
  ];
  const scenarios = scenarioConfig.map(([key, label, percentile]) => {
    let goalMonth: number | null = null;
    for (let month = 0; month <= GOAL_MONTHS; month++) {
      if (quantile(valuesByMonth[month], percentile) >= input.goalAmount) {
        goalMonth = month;
        break;
      }
    }
    const valueAt10Years = quantile(valuesByMonth[120], percentile);
    const valueAt30Years = quantile(valuesByMonth[360], percentile);
    const valueAt50Years = quantile(valuesByMonth[600], percentile);

    return {
      key,
      label,
      percentile,
      goalMonth,
      valueAt10Years,
      valueAt30Years,
      valueAt50Years,
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
  const benchmarkComparison = (() => {
    if (!benchmark) return null;
    if (baseGoal === null && benchmark.goalMonth === null)
      return `내 평균 시나리오와 ${benchmark.label} 기준 모두 30년 안에 목표 도달이 확인되지 않습니다.`;
    if (baseGoal !== null && benchmark.goalMonth === null)
      return `내 평균 시나리오는 목표에 도달하지만 ${benchmark.label} 기준은 30년 안에 도달하지 못합니다.`;
    if (baseGoal === null && benchmark.goalMonth !== null)
      return `${benchmark.label} 기준은 약 ${periodLabel(benchmark.goalMonth)} 후 목표에 도달하지만 내 평균 시나리오는 30년 안에 도달하지 못합니다.`;
    const difference = benchmark.goalMonth! - baseGoal!;
    if (difference === 0)
      return `내 평균 시나리오와 ${benchmark.label} 기준의 목표 도달 시점이 비슷합니다.`;
    return difference > 0
      ? `내 평균 시나리오는 ${benchmark.label} 기준보다 약 ${periodLabel(difference)} 빠르게 목표에 도달합니다.`
      : `내 평균 시나리오는 ${benchmark.label} 기준보다 약 ${periodLabel(Math.abs(difference))} 늦게 목표에 도달합니다.`;
  })();
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
    marketMode,
    goalAmount: input.goalAmount,
    totalCost,
    currentValue,
    profit,
    returnRate,
    priceBasis: marketData[0].data.priceBasis,
    exchangeRate:
      marketData.find(({ stock }) => stock.country === "US")?.data
        .exchangeRate ?? null,
    holdings: holdingResults.map(({ cost: _cost, ...item }) => item),
    cagr: {
      oneYear: cagr(portfolioReturns, 12),
      threeYear: cagr(portfolioReturns, 36),
      fiveYear: cagr(portfolioReturns, 60),
      available: cagr(portfolioReturns, portfolioReturns.length),
    },
    scenarios,
    benchmark,
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
      ...(benchmarkComparison ? [benchmarkComparison] : []),
      `20년 안에 ${goalLabel(input.goalAmount)}을 넘은 시뮬레이션 비율은 ${probabilityAt(240).toFixed(1)}%입니다.`,
      marketMode === "domestic"
        ? "금융위원회 공공데이터의 종가를 사용하므로 액면분할·병합 같은 기업행사가 과거 수익률에 영향을 줄 수 있습니다."
        : "로컬 테스트 모드에서는 KIS 수정주가와 조회 시점 환율을 사용합니다.",
    ],
  };
}
