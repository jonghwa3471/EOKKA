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
import { calculatePersonalReturnAdjustment } from "./scenario-adjustment";
import { stocks } from "./schema";

const PATHS = 5_000;
const GOAL_MONTHS = 360;
const SIMULATION_MONTHS = 600;

export interface AnalysisInput {
  goalAmount: number;
  monthlyContribution: number;
  investmentPeriodMonths: number | null;
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

function priceRangePosition(prices: number[], averagePrice: number) {
  if (prices.length === 0) return 50;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (high === low) return 50;
  const position = ((averagePrice - low) / (high - low)) * 100;
  return Math.round(Math.min(100, Math.max(0, position)) * 10) / 10;
}

function cagr(returns: number[], months: number) {
  if (returns.length < months) return null;
  const selected = returns.slice(-months);
  const growth = selected.reduce((value, rate) => value * (1 + rate), 1);
  return (growth ** (12 / months) - 1) * 100;
}

const clampStyleScore = (score: number) =>
  Math.round(Math.max(0, Math.min(100, score)));

function annualizedVolatility(returns: number[]) {
  if (returns.length < 2) return 0;
  const average = returns.reduce((sum, rate) => sum + rate, 0) / returns.length;
  const variance =
    returns.reduce((sum, rate) => sum + (rate - average) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(12) * 100;
}

function maximumDrawdown(returns: number[]) {
  let value = 1;
  let peak = 1;
  let drawdown = 0;
  for (const rate of returns) {
    value *= 1 + rate;
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, (peak - value) / peak);
  }
  return drawdown * 100;
}

function positiveRollingYearRatio(returns: number[]) {
  if (returns.length < 12) return 0;
  let positive = 0;
  let windows = 0;
  for (let end = 12; end <= returns.length; end++) {
    const growth = returns
      .slice(end - 12, end)
      .reduce((value, rate) => value * (1 + rate), 1);
    if (growth > 1) positive++;
    windows++;
  }
  return windows ? positive / windows : 0;
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
  monthlyContribution = 0,
  personalMonthlyLogAdjustment = 0,
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
        month <= SIMULATION_MONTHS &&
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
        monthlyDrift +
        personalMonthlyLogAdjustment +
        residual * residualVolatilityWeight(month);
      value = Math.max(
        0,
        value * Math.exp(projectedLogReturn) + monthlyContribution,
      );
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
  if (
    !Number.isInteger(input.monthlyContribution) ||
    input.monthlyContribution < 0 ||
    input.monthlyContribution > 1_000_000_000
  )
    throw new Error("월 추가 투자금은 0원 이상 10억원 이하로 입력해 주세요.");
  if (
    input.investmentPeriodMonths !== null &&
    (!Number.isInteger(input.investmentPeriodMonths) ||
      input.investmentPeriodMonths < 1 ||
      input.investmentPeriodMonths > 1_200)
  )
    throw new Error("투자 기간은 1개월 이상 100년 이하로 입력해 주세요.");
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
    const averagePriceInStockCurrency =
      (holding.averagePrice * costRate) / valueRate;
    const tenYearPrices = data.history
      .slice(-120)
      .map((point) => point.close)
      .filter((price) => Number.isFinite(price) && price > 0);
    const oneYearPrices = tenYearPrices.slice(-12);
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
      purchasePosition: {
        tenYearPosition: priceRangePosition(
          tenYearPrices,
          averagePriceInStockCurrency,
        ),
        oneYearPosition: priceRangePosition(
          oneYearPrices,
          averagePriceInStockCurrency,
        ),
        tenYearObservations: tenYearPrices.length,
        oneYearObservations: oneYearPrices.length,
        tenYearLow: Math.min(...tenYearPrices),
        tenYearHigh: Math.max(...tenYearPrices),
        oneYearLow: Math.min(...oneYearPrices),
        oneYearHigh: Math.max(...oneYearPrices),
      },
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

  const volatility = annualizedVolatility(portfolioReturns);
  const historicalGrowth =
    cagr(portfolioReturns, Math.min(60, portfolioReturns.length)) ?? 0;
  const profit = currentValue - totalCost;
  const returnRate = (profit / totalCost) * 100;
  const annualizedReturnRate =
    currentValue > 0 && totalCost > 0 && input.investmentPeriodMonths !== null
      ? ((currentValue / totalCost) ** (12 / input.investmentPeriodMonths) -
          1) *
        100
      : null;
  const rawSimulationMonthlyDrift =
    portfolioReturns.reduce((sum, rate) => sum + Math.log1p(rate), 0) /
    portfolioReturns.length;
  const cappedSimulationMonthlyDrift = Math.min(
    Math.log1p(0.2) / 12,
    Math.max(Math.log1p(-0.1) / 12, rawSimulationMonthlyDrift),
  );
  const {
    adjustment: personalReturnAdjustment,
    monthlyLogAdjustment: personalMonthlyLogAdjustment,
  } = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: input.investmentPeriodMonths,
    personalAnnualizedReturn: annualizedReturnRate,
    historicalAnnualReturn: historicalGrowth,
    simulationHistoricalAnnualReturn:
      Math.expm1(cappedSimulationMonthlyDrift * 12) * 100,
  });
  const concentration = weights.reduce((sum, weight) => sum + weight ** 2, 0);
  const effectiveHoldings = concentration > 0 ? 1 / concentration : 1;
  const largestWeight = Math.max(0, ...weights) * 100;
  const etfWeight = marketData.reduce(
    (sum, { stock }, index) =>
      sum + (["ETF", "ETN"].includes(stock.security_type) ? weights[index] : 0),
    0,
  );
  const leverageWeight = marketData.reduce(
    (sum, { stock }, index) =>
      sum +
      (/(레버리지|인버스|2X|곱버스)/i.test(stock.name) ? weights[index] : 0),
    0,
  );
  const buildInvestmentStyle = (benchmarkReturns: number[]) => {
    const benchmarkVolatility = annualizedVolatility(benchmarkReturns);
    const relativeVolatility =
      benchmarkVolatility > 0
        ? volatility / benchmarkVolatility
        : volatility / 22;
    const drawdown = maximumDrawdown(portfolioReturns);
    const benchmarkDrawdown = benchmarkReturns.length
      ? maximumDrawdown(benchmarkReturns)
      : 25;
    const excessDrawdown = Math.max(0, drawdown - benchmarkDrawdown);
    const upwardRatio = positiveRollingYearRatio(portfolioReturns);
    const benchmarkGrowth =
      benchmarkReturns.length >= 12
        ? (cagr(benchmarkReturns, Math.min(60, benchmarkReturns.length)) ?? 0)
        : 0;
    const excessGrowth = historicalGrowth - benchmarkGrowth;
    const riskLevel = clampStyleScore(
      25 +
        (relativeVolatility - 0.8) * 45 +
        excessDrawdown * 0.8 +
        leverageWeight * 60,
    );
    const investmentStyleScores: AnalysisResult["investmentStyle"]["scores"] = [
      {
        key: "stability",
        label: "변동 안정성",
        score: clampStyleScore(
          75 - (relativeVolatility - 0.7) * 50 - excessDrawdown * 0.6,
        ),
      },
      {
        key: "growth",
        label: "성장 지속성",
        score: clampStyleScore(
          35 + historicalGrowth * 1.4 + upwardRatio * 30 + excessGrowth * 0.5,
        ),
      },
      {
        key: "concentration",
        label: "비중 균형",
        score: clampStyleScore(100 - Math.max(0, largestWeight - 25) * 1.6),
      },
      {
        key: "diversification",
        label: "분산 구성",
        score: clampStyleScore(20 + (effectiveHoldings - 1) * 20),
      },
      {
        key: "etf",
        label: "낙폭 방어",
        score: clampStyleScore(70 + (benchmarkDrawdown - drawdown) * 1.5),
      },
      {
        key: "aggression",
        label: "위험 관리",
        score: 100 - riskLevel,
      },
    ];
    const style = Object.fromEntries(
      investmentStyleScores.map(({ key, score }) => [key, score]),
    ) as Record<
      AnalysisResult["investmentStyle"]["scores"][number]["key"],
      number
    >;
    const styleResult = (() => {
      if (leverageWeight >= 0.3)
        return {
          title: "파도를 타는 레버리지 서퍼",
          description:
            "레버리지·인버스 비중이 높아 빠른 움직임을 선호하는 유형이에요.",
          reason: `현재 평가금액 중 레버리지·인버스 상품 비중이 ${Math.round(leverageWeight * 100)}%로 높게 나타났어요.`,
        };
      if (
        riskLevel >= 75 &&
        relativeVolatility >= 1.45 &&
        (excessDrawdown >= 8 || upwardRatio < 0.55)
      )
        return {
          title: "급등락을 즐기는 롤러코스터 헌터",
          description:
            "시장보다 큰 등락과 낙폭을 감수하며 높은 성장 가능성을 추구하는 유형이에요.",
          reason: `과거 변동성이 시장 기준의 ${relativeVolatility.toFixed(2)}배이고 최대 낙폭은 ${drawdown.toFixed(1)}%로 나타났어요.`,
        };
      if (etfWeight >= 0.6)
        return {
          title: "지수를 모으는 ETF 항해사",
          description:
            "개별 종목보다 ETF·ETN을 활용해 시장의 흐름을 따라가는 유형이에요.",
          reason: `현재 평가금액 중 ETF·ETN 비중이 ${Math.round(etfWeight * 100)}%로 포트폴리오의 절반 이상을 차지해요.`,
        };
      if (
        historicalGrowth > 0 &&
        upwardRatio >= 0.7 &&
        relativeVolatility <= 1.35 &&
        drawdown <= benchmarkDrawdown + 10
      )
        return {
          title: "꾸준한 우상향 수집가",
          description:
            "시장과 크게 다르지 않은 변동 범위에서 장기 상승 흐름을 이어온 종목을 모은 유형이에요.",
          reason: `최근 최대 5년 연평균 성장률은 ${historicalGrowth.toFixed(1)}%이고, 12개월 단위 관측 구간의 ${Math.round(upwardRatio * 100)}%에서 상승했어요. 변동성은 시장 기준의 ${relativeVolatility.toFixed(2)}배예요.`,
        };
      if (largestWeight >= 60)
        return {
          title: "한 종목을 믿는 집중 승부사",
          description:
            "가장 큰 확신을 가진 종목에 포트폴리오의 힘을 모으는 유형이에요.",
          reason: `가장 비중이 큰 한 종목이 현재 포트폴리오의 ${largestWeight.toFixed(1)}%를 차지해요.`,
        };
      if (style.diversification >= 75)
        return {
          title: "바구니를 나누는 분산 설계자",
          description:
            "여러 종목에 비중을 나눠 특정 종목의 영향을 줄이는 유형이에요.",
          reason: `종목별 평가 비중을 반영한 유효 종목 수가 약 ${effectiveHoldings.toFixed(1)}개로 분산 구성 점수가 ${style.diversification}점이에요.`,
        };
      if (style.stability >= 70)
        return {
          title: "흔들림을 줄이는 방어형 항해사",
          description:
            "큰 변동보다 비교적 안정적인 흐름을 선호하는 유형이에요.",
          reason: `포트폴리오 변동성이 시장 기준의 ${relativeVolatility.toFixed(2)}배이고 최대 낙폭은 ${drawdown.toFixed(1)}%로 나타났어요.`,
        };
      if (style.growth >= 70)
        return {
          title: "성장을 좇는 복리 탐험가",
          description:
            "과거 성장 흐름이 강한 자산을 중심으로 복리의 힘을 기대하는 유형이에요.",
          reason: `최근 최대 5년의 과거 연평균 성장률이 ${historicalGrowth.toFixed(1)}%로 성장 추구 점수가 ${style.growth}점이에요.`,
        };
      return {
        title: "균형을 다듬는 포트폴리오 조율사",
        description:
          "안정과 성장, 집중과 분산 사이에서 균형점을 찾아가는 유형이에요.",
        reason: `여섯 가지 평가 항목 중 하나에 크게 치우치지 않아 변동 안정성 ${style.stability}점·성장 지속성 ${style.growth}점·비중 균형 ${style.concentration}점으로 나타났어요.`,
      };
    })();
    return {
      ...styleResult,
      scores: investmentStyleScores,
    };
  };

  const { valuesByMonth, goalMonths } = simulatePaths(
    portfolioReturns,
    currentValue,
    input.goalAmount,
    ids.reduce((sum, id) => sum + id, 2_026),
    expectedLongTermReturn,
    0,
    personalMonthlyLogAdjustment,
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
  let benchmarkHistoricalReturns: number[] = [];
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
      benchmarkHistoricalReturns = benchmarkReturns;
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
        investmentPeriodCagr:
          input.investmentPeriodMonths === null
            ? null
            : cagr(benchmarkReturns, input.investmentPeriodMonths),
        componentAnnualReturns: components.map(({ name, history }) => ({
          label: name,
          annualReturn:
            input.investmentPeriodMonths === null
              ? null
              : cagr(
                  [...monthlyReturnMap(history).values()],
                  input.investmentPeriodMonths,
                ),
        })),
      };
    }
  } catch (error) {
    console.warn("Market benchmark calculation skipped", error);
  }

  const investmentStyle = buildInvestmentStyle(benchmarkHistoricalReturns);

  const scenarioConfig = [
    ["conservative", "보수적", 0.2] as const,
    ["base", "평균", 0.5] as const,
    ["optimistic", "낙관적", 0.8] as const,
  ];
  const buildScenarios = (scenarioValues: Float64Array[]) =>
    scenarioConfig.map(([key, label, percentile]) => {
      let goalMonth: number | null = null;
      for (let month = 0; month <= GOAL_MONTHS; month++) {
        if (quantile(scenarioValues[month], percentile) >= input.goalAmount) {
          goalMonth = month;
          break;
        }
      }
      const valueAt10Years = quantile(scenarioValues[120], percentile);
      const valueAt30Years = quantile(scenarioValues[360], percentile);
      const valueAt50Years = quantile(scenarioValues[600], percentile);

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
  const scenarios = buildScenarios(valuesByMonth);

  const contributionAnalysis = input.monthlyContribution
    ? (() => {
        const { valuesByMonth: contributionValues } = simulatePaths(
          portfolioReturns,
          currentValue,
          input.goalAmount,
          ids.reduce((sum, id) => sum + id, 2_026),
          expectedLongTermReturn,
          input.monthlyContribution,
          personalMonthlyLogAdjustment,
        );

        const contributedScenarios = buildScenarios(contributionValues);
        return contributedScenarios.map((scenario, index) => {
          const baselineGoalMonth = scenarios[index].goalMonth;
          return {
            key: scenario.key,
            label: scenario.label,
            percentile: scenario.percentile,
            goalMonth: scenario.goalMonth,
            valueAt10Years: scenario.valueAt10Years,
            valueAt30Years: scenario.valueAt30Years,
            valueAt50Years: scenario.valueAt50Years,
            shortenedByMonths:
              scenario.goalMonth !== null && baselineGoalMonth !== null
                ? Math.max(0, baselineGoalMonth - scenario.goalMonth)
                : null,
          };
        });
      })()
    : null;
  const contributionScenarios = contributionAnalysis ?? [];

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

  const probabilityAt = (months: number) =>
    (Array.from(goalMonths).filter((month) => month >= 0 && month <= months)
      .length /
      PATHS) *
    100;
  const baseGoal = scenarios[1].goalMonth;
  const investmentPeriodDescription =
    input.investmentPeriodMonths === null
      ? null
      : periodLabel(input.investmentPeriodMonths);
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
    monthlyContribution: input.monthlyContribution,
    investmentPeriodMonths: input.investmentPeriodMonths,
    totalCost,
    currentValue,
    profit,
    returnRate,
    annualizedReturnRate,
    personalReturnAdjustment,
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
    contributionScenarios,
    benchmark,
    chart,
    probability: {
      tenYears: probabilityAt(120),
      twentyYears: probabilityAt(240),
      thirtyYears: probabilityAt(360),
      fortyYears: probabilityAt(480),
      fiftyYears: probabilityAt(600),
    },
    investmentStyle,
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
      ...(input.monthlyContribution > 0
        ? [
            (() => {
              const contributedBase = contributionScenarios[1];
              if (contributedBase.goalMonth === null)
                return `매월 ${Math.round(input.monthlyContribution).toLocaleString("ko-KR")}원을 추가 투자해도 평균 시나리오에서는 30년 안에 목표 도달이 확인되지 않습니다.`;
              if (baseGoal === null)
                return `매월 ${Math.round(input.monthlyContribution).toLocaleString("ko-KR")}원을 추가 투자하면 평균 시나리오에서 약 ${periodLabel(contributedBase.goalMonth)} 후 목표에 도달합니다.`;
              if (baseGoal <= contributedBase.goalMonth)
                return `매월 ${Math.round(input.monthlyContribution).toLocaleString("ko-KR")}원을 추가 투자해도 평균 시나리오의 목표 도달 시점은 현재 계산과 같습니다.`;
              return `매월 ${Math.round(input.monthlyContribution).toLocaleString("ko-KR")}원을 추가 투자하면 평균 시나리오의 목표 도달 시점이 약 ${periodLabel(baseGoal - contributedBase.goalMonth)} 당겨집니다.`;
            })(),
          ]
        : []),
      ...(benchmarkComparison ? [benchmarkComparison] : []),
      personalReturnAdjustment.confidenceWeight === 0
        ? investmentPeriodDescription === null
          ? "투자 기간을 입력하지 않아 개인 연환산 수익률은 미래 시나리오에 반영하지 않았습니다."
          : "투자 기간이 6개월 미만이라 개인 연환산 수익률은 미래 시나리오에 반영하지 않았습니다."
        : `투자 기간 ${investmentPeriodDescription}의 신뢰 가중치 ${(personalReturnAdjustment.confidenceWeight * 100).toFixed(0)}%를 적용해 개인 성과를 미래 경로의 연 수익률에 ${personalReturnAdjustment.appliedAnnualAdjustment >= 0 ? "+" : ""}${personalReturnAdjustment.appliedAnnualAdjustment.toFixed(2)}%p 제한적으로 반영했습니다.`,
      `20년 안에 ${goalLabel(input.goalAmount)}을 넘은 시뮬레이션 비율은 ${probabilityAt(240).toFixed(1)}%입니다.`,
      marketMode === "domestic"
        ? "금융위원회 공공데이터의 종가를 사용하므로 액면분할·병합 같은 기업행사가 과거 수익률에 영향을 줄 수 있습니다."
        : "로컬 테스트 모드에서는 KIS 수정주가와 조회 시점 환율을 사용합니다.",
    ],
  };
}
