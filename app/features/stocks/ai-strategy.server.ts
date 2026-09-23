import type { AiStrategy, AnalysisResult } from "./analysis.types";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const aiStrategySchema = z.object({
  framework: z.literal("investment_committee"),
  headline: z.string().min(1).max(200),
  diagnosis: z.string().min(1).max(900),
  committeeDiscussion: z.object({
    warrenBuffett: z.string().min(1).max(320),
    charlieMunger: z.string().min(1).max(320),
    benjaminGraham: z.string().min(1).max(320),
    peterLynch: z.string().min(1).max(320),
    philipFisher: z.string().min(1).max(320),
    johnTempleton: z.string().min(1).max(320),
    johnBogle: z.string().min(1).max(320),
    howardMarks: z.string().min(1).max(320),
    rayDalio: z.string().min(1).max(320),
    joelGreenblatt: z.string().min(1).max(320),
  }),
  committeeAdvice: z.object({
    warrenBuffett: z.string().min(1).max(420),
    charlieMunger: z.string().min(1).max(420),
    benjaminGraham: z.string().min(1).max(420),
    peterLynch: z.string().min(1).max(420),
    philipFisher: z.string().min(1).max(420),
    johnTempleton: z.string().min(1).max(420),
    johnBogle: z.string().min(1).max(420),
    howardMarks: z.string().min(1).max(420),
    rayDalio: z.string().min(1).max(420),
    joelGreenblatt: z.string().min(1).max(420),
  }),
  committeeConclusion: z.string().min(1).max(220),
  strengths: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(400),
      }),
    )
    .length(2),
  improvements: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(500),
      }),
    )
    .length(2),
  holdingInsights: z
    .array(
      z.object({
        holdingAlias: z.string().min(1).max(20),
        evidence: z.string().min(1).max(300),
        strategy: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(20),
  monthlyPlan: z.string().min(1).max(600),
  diversification: z.string().min(1).max(600),
  actions: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(400),
        priority: z.enum(["높음", "보통", "낮음"]),
      }),
    )
    .length(3),
  disclaimer: z.string().min(1).max(200),
});

function period(months: number | null) {
  if (months === null) return "30년 내 도달 확인 안 됨";
  if (months === 0) return "이미 달성";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years ? `${years}년` : "",
    remainingMonths ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const clampScore = (score: number) =>
  Math.round(Math.max(0, Math.min(100, score)));

type CommitteeVote = "positive" | "neutral" | "cautious";

export interface HoldingConsensusInput {
  portfolioWeightPercent: number;
  returnRatePercent: number;
  longTermPurchasePositionPercent: number | null;
  recentPurchasePositionPercent: number | null;
  financialProfile: {
    revenueGrowthPercent: number | null;
    operatingProfitGrowthPercent: number | null;
    netIncomeGrowthPercent: number | null;
    operatingMarginPercent: number | null;
    debtRatioPercent: number | null;
    returnOnEquityPercent: number | null;
  } | null;
}

function thresholdVote(
  value: number | null | undefined,
  positive: (value: number) => boolean,
  cautious: (value: number) => boolean,
): CommitteeVote {
  if (value == null || !Number.isFinite(value)) return "neutral";
  if (positive(value)) return "positive";
  if (cautious(value)) return "cautious";
  return "neutral";
}

export function calculateHoldingConsensus(input: HoldingConsensusInput) {
  const financial = input.financialProfile;
  const ballots: CommitteeVote[] = [
    thresholdVote(
      input.longTermPurchasePositionPercent,
      (value) => value <= 40,
      (value) => value >= 75,
    ),
    thresholdVote(
      input.recentPurchasePositionPercent,
      (value) => value <= 35,
      (value) => value >= 75,
    ),
    thresholdVote(
      input.returnRatePercent,
      (value) => value >= 10,
      (value) => value <= -10,
    ),
    thresholdVote(
      input.portfolioWeightPercent,
      (value) => value >= 5 && value <= 30,
      (value) => value >= 35,
    ),
    thresholdVote(
      financial?.revenueGrowthPercent,
      (value) => value >= 5,
      (value) => value < 0,
    ),
    thresholdVote(
      financial?.operatingProfitGrowthPercent,
      (value) => value >= 5,
      (value) => value < 0,
    ),
    thresholdVote(
      financial?.netIncomeGrowthPercent,
      (value) => value >= 5,
      (value) => value < 0,
    ),
    thresholdVote(
      financial?.operatingMarginPercent,
      (value) => value >= 10,
      (value) => value < 0,
    ),
    thresholdVote(
      financial?.debtRatioPercent,
      (value) => value <= 100,
      (value) => value >= 200,
    ),
    thresholdVote(
      financial?.returnOnEquityPercent,
      (value) => value >= 10,
      (value) => value < 0,
    ),
  ];
  const votes = ballots.reduce(
    (counts, ballot) => ({ ...counts, [ballot]: counts[ballot] + 1 }),
    { positive: 0, neutral: 0, cautious: 0 },
  );
  const consensus =
    votes.positive > votes.neutral && votes.positive > votes.cautious
      ? ("긍정" as const)
      : votes.cautious > votes.positive && votes.cautious > votes.neutral
        ? ("신중" as const)
        : ("중립" as const);
  return {
    votes,
    consensus,
    verdict:
      consensus === "긍정"
        ? ("좋은 위치" as const)
        : consensus === "신중"
          ? ("주의 필요" as const)
          : ("중립" as const),
  };
}

function purchasePositionBand(position: number | null) {
  if (position === null) return "가격 범위 데이터 없음";
  if (position <= 20) return "낮은 가격 구간";
  if (position <= 40) return "비교적 낮은 구간";
  if (position <= 60) return "중간 가격 구간";
  if (position <= 80) return "비교적 높은 구간";
  return "높은 가격 구간";
}

function inferBroadBusinessCategory(
  holding: AnalysisResult["holdings"][number],
) {
  const value = `${holding.ticker} ${holding.name}`.toUpperCase();
  const categories = [
    [
      "기술·디지털",
      /AAPL|MSFT|NVDA|GOOGL|GOOG|META|ORCL|AMD|SOFTWARE|SEMICONDUCTOR|TECH|전자|반도체|소프트웨어|인터넷|IT/,
    ],
    ["금융", /BANK|FINANC|INSURANCE|은행|금융|증권|보험|카드/],
    ["헬스케어", /HEALTH|PHARMA|BIO|제약|바이오|헬스/],
    ["소비재·유통", /RETAIL|CONSUMER|FOOD|BEVERAGE|유통|식품|음료|화장품/],
    ["산업재·자동차", /INDUSTRIAL|AUTO|MOTOR|MACHIN|자동차|기계|조선|건설/],
    ["에너지·소재", /ENERGY|OIL|GAS|CHEMICAL|STEEL|에너지|정유|화학|철강|소재/],
    ["통신·미디어", /TELECOM|MEDIA|ENTERTAINMENT|통신|미디어|엔터/],
    ["부동산", /REIT|REAL ESTATE|리츠|부동산/],
  ] as const;
  return categories.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
}

function buildStrategyScores(result: AnalysisResult): AiStrategy["scores"] {
  const weights = result.holdings.map((holding) =>
    result.currentValue > 0 ? holding.valueKrw / result.currentValue : 0,
  );
  const concentration = weights.reduce((sum, weight) => sum + weight ** 2, 0);
  const effectiveHoldings = concentration > 0 ? 1 / concentration : 1;
  const currentAssetScore =
    result.goalAmount > 0
      ? Math.sqrt(Math.min(1, result.currentValue / result.goalAmount)) * 100
      : 0;
  const remainingToGoal = Math.max(1, result.goalAmount - result.currentValue);
  const monthlyInvestmentScore =
    Math.sqrt(
      Math.min(1, (result.monthlyContribution * 120) / remainingToGoal),
    ) * 100;
  const conservative = result.scenarios.find(
    (scenario) => scenario.key === "conservative",
  )!;
  const base = result.scenarios.find((scenario) => scenario.key === "base")!;
  const optimistic = result.scenarios.find(
    (scenario) => scenario.key === "optimistic",
  )!;
  const tenYearGrowthRate =
    result.currentValue > 0 && base.valueAt10Years > 0
      ? ((base.valueAt10Years / result.currentValue) ** (1 / 10) - 1) * 100
      : 0;
  const scenarioSpread =
    base.valueAt10Years > 0
      ? (optimistic.valueAt10Years - conservative.valueAt10Years) /
        base.valueAt10Years
      : 2;

  return [
    {
      key: "currentAssets",
      label: "현재 자산",
      description: "목표 금액 대비 현재 평가금액",
      score: clampScore(currentAssetScore),
    },
    {
      key: "monthlyInvestment",
      label: "월 투자금",
      description: "10년간 목표 격차를 채울 수 있는 정도",
      score: clampScore(monthlyInvestmentScore),
    },
    {
      key: "profitability",
      label: "수익 상태",
      description: "매수 원금 대비 현재 평가손익",
      score: clampScore(50 + result.returnRate * 1.5),
    },
    {
      key: "growthPotential",
      label: "성장 기대",
      description: "평균 시나리오의 10년 연환산 성장률",
      score: clampScore(30 + tenYearGrowthRate * 5),
    },
    {
      key: "diversification",
      label: "분산 수준",
      description: "종목 수와 평가 비중의 분산 정도",
      score: clampScore(20 + ((effectiveHoldings - 1) / 4) * 80),
    },
    {
      key: "stability",
      label: "변동 안정성",
      description: "보수적·낙관적 시나리오 편차가 작은 정도",
      score: clampScore(100 - scenarioSpread * 50),
    },
  ];
}

function buildCommitteeEvaluation(result: AnalysisResult) {
  type CommitteeScores = NonNullable<AiStrategy["committeeScores"]>;
  const strategyScores = buildStrategyScores(result);
  const score = (key: AiStrategy["scores"][number]["key"]) =>
    strategyScores.find((item) => item.key === key)?.score ?? 50;
  const weightedPosition = (period: "tenYearPosition" | "oneYearPosition") => {
    const positions = result.holdings
      .map((holding) => ({
        value: holding.purchasePosition?.[period] ?? null,
        weight: Math.max(0, holding.valueKrw),
      }))
      .filter(
        (item): item is { value: number; weight: number } =>
          item.value !== null,
      );
    const totalWeight = positions.reduce((sum, item) => sum + item.weight, 0);
    return totalWeight > 0
      ? positions.reduce((sum, item) => sum + item.value * item.weight, 0) /
          totalWeight
      : 50;
  };
  const averageLongTermPosition = weightedPosition("tenYearPosition");
  const averageRecentPosition = weightedPosition("oneYearPosition");
  const longTermPriceDiscipline = clampScore(100 - averageLongTermPosition);
  const recentPriceDiscipline = clampScore(100 - averageRecentPosition);
  const categoryWeights = new Map<string, number>();
  result.holdings.forEach((holding) => {
    const category = inferBroadBusinessCategory(holding);
    if (!category || result.currentValue <= 0) return;
    categoryWeights.set(
      category,
      (categoryWeights.get(category) ?? 0) +
        (holding.valueKrw / result.currentValue) * 100,
    );
  });
  const largestCategoryWeight = Math.max(0, ...categoryWeights.values());
  const categoryBalance =
    categoryWeights.size === 0
      ? 50
      : clampScore(100 - Math.max(0, largestCategoryWeight - 30) * 1.7);
  const average = (...values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const toTen = (value: number) =>
    Number((Math.max(0, Math.min(100, value)) / 10).toFixed(1));

  const scores: CommitteeScores = {
    warrenBuffett: toTen(
      average(
        score("profitability"),
        score("growthPotential"),
        score("stability"),
      ),
    ),
    charlieMunger: toTen(average(score("stability"), score("diversification"))),
    benjaminGraham: toTen(longTermPriceDiscipline),
    peterLynch: toTen(
      average(score("profitability"), score("growthPotential")),
    ),
    philipFisher: toTen(score("growthPotential")),
    johnTempleton: toTen(
      average(longTermPriceDiscipline, recentPriceDiscipline),
    ),
    johnBogle: toTen(score("diversification")),
    howardMarks: toTen(average(score("stability"), score("diversification"))),
    rayDalio: toTen(average(categoryBalance, score("diversification"))),
    joelGreenblatt: toTen(
      average(score("profitability"), longTermPriceDiscipline),
    ),
  };
  const percent = (value: number) => `${value.toFixed(1)}%`;
  const reasons: Record<keyof CommitteeScores, string[]> = {
    warrenBuffett: [
      `수익 상태 점수 ${score("profitability")}점`,
      `성장 기대 점수 ${score("growthPotential")}점`,
      `변동 안정성 점수 ${score("stability")}점`,
    ],
    charlieMunger: [
      `변동 안정성 점수 ${score("stability")}점`,
      `분산 수준 점수 ${score("diversification")}점`,
    ],
    benjaminGraham: [
      `평가금액 비중을 반영한 최근 최대 10년 기준 평균 매수가 위치 ${percent(averageLongTermPosition)}`,
    ],
    peterLynch: [
      `수익 상태 점수 ${score("profitability")}점`,
      `성장 기대 점수 ${score("growthPotential")}점`,
    ],
    philipFisher: [`성장 기대 점수 ${score("growthPotential")}점`],
    johnTempleton: [
      `평가금액 비중을 반영한 최근 최대 10년 기준 평균 매수가 위치 ${percent(averageLongTermPosition)}`,
      `평가금액 비중을 반영한 최근 1년 기준 평균 매수가 위치 ${percent(averageRecentPosition)}`,
    ],
    johnBogle: [`분산 수준 점수 ${score("diversification")}점`],
    howardMarks: [
      `변동 안정성 점수 ${score("stability")}점`,
      `분산 수준 점수 ${score("diversification")}점`,
    ],
    rayDalio: [
      `가장 큰 사업군 비중 ${percent(largestCategoryWeight)}`,
      `분산 수준 점수 ${score("diversification")}점`,
    ],
    joelGreenblatt: [
      `수익 상태 점수 ${score("profitability")}점`,
      `평가금액 비중을 반영한 최근 최대 10년 기준 평균 매수가 위치 ${percent(averageLongTermPosition)}`,
    ],
  };

  return { scores, reasons };
}

type AssessmentDomain = NonNullable<AiStrategy["assessmentDomains"]>[number];

function domainStatus(score: number): AssessmentDomain["status"] {
  if (score >= 70) return "양호";
  if (score >= 45) return "점검";
  return "주의";
}

function buildAssessmentDomains(result: AnalysisResult): AssessmentDomain[] {
  const weights = result.holdings
    .map((holding) =>
      result.currentValue > 0
        ? (holding.valueKrw / result.currentValue) * 100
        : 0,
    )
    .sort((a, b) => b - a);
  const largestWeight = weights[0] ?? 0;
  const topThreeWeight = weights
    .slice(0, 3)
    .reduce((sum, value) => sum + value, 0);
  const concentration = weights.reduce(
    (sum, weight) => sum + (weight / 100) ** 2,
    0,
  );
  const effectiveHoldings = concentration > 0 ? 1 / concentration : 0;
  const categoryWeights = new Map<string, number>();
  result.holdings.forEach((holding) => {
    const category = inferBroadBusinessCategory(holding);
    if (!category || result.currentValue <= 0) return;
    categoryWeights.set(
      category,
      (categoryWeights.get(category) ?? 0) +
        (holding.valueKrw / result.currentValue) * 100,
    );
  });
  const largestCategory = [...categoryWeights.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const structureScore = clampScore(
    (20 + ((effectiveHoldings - 1) / 4) * 80) * 0.55 +
      (100 - Math.max(0, largestWeight - 25) * 1.6) * 0.25 +
      (largestCategory
        ? 100 - Math.max(0, largestCategory[1] - 30) * 1.7
        : 50) *
        0.2,
  );

  const strategyScores = buildStrategyScores(result);
  const strategyScore = (key: AiStrategy["scores"][number]["key"]) =>
    strategyScores.find((item) => item.key === key)?.score ?? 50;
  const riskScore = strategyScore("stability");

  const fundamentals = result.holdings
    .map((holding) => holding.fundamentals)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const qualitySignals = fundamentals
    .flatMap((item) => [
      item.revenueGrowthPercent == null
        ? null
        : item.revenueGrowthPercent >= 0
          ? 1
          : -1,
      item.operatingProfitGrowthPercent == null
        ? null
        : item.operatingProfitGrowthPercent >= 0
          ? 1
          : -1,
      item.operatingMarginPercent == null
        ? null
        : item.operatingMarginPercent >= 10
          ? 1
          : item.operatingMarginPercent < 0
            ? -1
            : 0,
      item.debtRatioPercent == null
        ? null
        : item.debtRatioPercent <= 100
          ? 1
          : item.debtRatioPercent >= 200
            ? -1
            : 0,
      item.returnOnEquityPercent == null
        ? null
        : item.returnOnEquityPercent >= 10
          ? 1
          : item.returnOnEquityPercent < 0
            ? -1
            : 0,
    ])
    .filter((value): value is number => value !== null);
  const qualityScore = qualitySignals.length
    ? clampScore(
        50 +
          (qualitySignals.reduce((sum, value) => sum + value, 0) /
            qualitySignals.length) *
            35,
      )
    : null;

  const pricedHoldings = result.holdings.filter(
    (holding) => holding.purchasePosition?.tenYearPosition != null,
  );
  const pricedValue = pricedHoldings.reduce(
    (sum, holding) => sum + holding.valueKrw,
    0,
  );
  const weightedPricePosition =
    pricedValue > 0
      ? pricedHoldings.reduce(
          (sum, holding) =>
            sum +
            (holding.purchasePosition?.tenYearPosition ?? 50) *
              holding.valueKrw,
          0,
        ) / pricedValue
      : null;
  const valuationRatios = fundamentals
    .flatMap((item) => [item.per, item.pbr])
    .filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
  const valuationStatus: AssessmentDomain["status"] =
    weightedPricePosition === null
      ? "정보 부족"
      : domainStatus(100 - weightedPricePosition);

  return [
    {
      key: "structure",
      label: "포트폴리오 구조",
      status: domainStatus(structureScore),
      summary:
        structureScore >= 70
          ? "종목과 사업군의 비중이 비교적 고르게 나뉘어 있어요."
          : structureScore >= 45
            ? "일부 종목이나 사업군에 비중이 몰려 있어 점검이 필요해요."
            : "소수 종목이나 한 사업군의 움직임이 전체 자산에 크게 영향을 줄 수 있어요.",
      evidence: [
        `가장 큰 종목 ${largestWeight.toFixed(1)}% · 상위 3종목 ${topThreeWeight.toFixed(1)}%`,
        `비중을 반영한 실질 종목 수 ${effectiveHoldings.toFixed(1)}개`,
        largestCategory
          ? `가장 큰 사업군 ${largestCategory[0]} ${largestCategory[1].toFixed(1)}%`
          : "사업군을 확인할 수 있는 종목 정보가 부족해요.",
      ],
    },
    {
      key: "risk",
      label: "가격 변동 위험",
      status: domainStatus(riskScore),
      summary:
        riskScore >= 70
          ? "시장 변화에도 포트폴리오 가격이 비교적 안정적으로 움직였어요."
          : riskScore >= 45
            ? "수익 기회와 가격 변동 위험이 함께 나타나고 있어요."
            : "가격 변동 폭이 커서 하락장에서 손실이 빠르게 커질 수 있어요.",
      evidence: [
        `시나리오 편차를 반영한 변동 안정성 ${riskScore}점`,
        result.benchmark
          ? `시장 비교 기준: ${result.benchmark.label}`
          : "비교 가능한 시장 기준이 없어요.",
      ],
    },
    {
      key: "quality",
      label: "기업 재무 품질",
      status: qualityScore === null ? "정보 부족" : domainStatus(qualityScore),
      summary:
        qualityScore === null
          ? "확인 가능한 재무제표가 없어 기업 품질을 점수로 단정하지 않았어요."
          : qualityScore >= 70
            ? "확인된 재무지표에서는 성장성과 건전성이 비교적 양호해요."
            : qualityScore >= 45
              ? "좋은 지표와 주의할 지표가 함께 보여요."
              : "이익 흐름이나 부채 등 확인된 재무지표를 주의 깊게 볼 필요가 있어요.",
      evidence: [
        `재무정보 확인 ${fundamentals.length}/${result.holdings.length}개 종목`,
        qualitySignals.length
          ? `매출·이익·이익률·부채·자기자본이익률 중 ${qualitySignals.length}개 지표 확인`
          : "평가 가능한 재무지표가 없어요.",
      ],
    },
    {
      key: "valuation",
      label: "매수 가격 수준",
      status: valuationStatus,
      summary:
        weightedPricePosition === null
          ? "과거 가격 범위와 비교할 자료가 부족해 가격 수준을 단정하지 않았어요."
          : weightedPricePosition <= 40
            ? "평균 매수가가 장기 가격 범위의 비교적 낮은 구간에 있어요."
            : weightedPricePosition <= 70
              ? "평균 매수가가 장기 가격 범위의 중간 구간에 있어요."
              : "평균 매수가가 장기 가격 범위의 높은 구간에 있어 추가 매수에 주의가 필요해요.",
      evidence: [
        weightedPricePosition === null
          ? "장기 가격 위치를 계산할 수 없어요."
          : `평가금액 가중 장기 매수가 위치 ${weightedPricePosition.toFixed(1)}%`,
        valuationRatios.length
          ? `PER·PBR ${valuationRatios.length}개 값 확인`
          : "PER·PBR이 없어 적정가치가 아닌 과거 가격 위치로만 평가했어요.",
      ],
    },
  ];
}

export async function generateAiStrategy(
  result: AnalysisResult,
): Promise<AiStrategy | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const base = result.scenarios.find((scenario) => scenario.key === "base");
  const contributedBase = result.contributionScenarios.find(
    (scenario) => scenario.key === "base",
  );
  const aliases = result.holdings.map((holding, index) => ({
    alias: `종목 ${String.fromCharCode(65 + index)}`,
    name: holding.name,
  }));
  const aliasToName = new Map(
    aliases.map(({ alias, name }) => [alias, name] as const),
  );
  const namesByLetter = new Map(
    aliases.map(({ alias, name }) => [alias.replace("종목 ", ""), name]),
  );
  const restoreHoldingNames = (text: string) => {
    const expandRange = (startLetter: string, endLetter: string) => {
      const start = startLetter.charCodeAt(0) - 65;
      const end = endLetter.charCodeAt(0) - 65;
      if (start < 0 || end < start || end >= aliases.length)
        return `${startLetter}~${endLetter}`;
      return aliases
        .slice(start, end + 1)
        .map(({ name }) => name)
        .join("·");
    };
    const rangesRestored = text
      .replace(
        /종목\s*([A-J])\s*[~～-]\s*(?:종목\s*)?([A-J])/g,
        (_, start: string, end: string) => expandRange(start, end),
      )
      .replace(
        /\b([A-J])\s*[~～-]\s*(?:종목\s*)?([A-J])\b/g,
        (_, start: string, end: string) => expandRange(start, end),
      );

    const namesRestored = rangesRestored.replace(
      /종목\s*([A-J])|\b([A-J])\s*종목|\b([A-J])\b/g,
      (matched, afterPrefix, beforeSuffix, standalone) =>
        namesByLetter.get(afterPrefix ?? beforeSuffix ?? standalone) ?? matched,
    );

    const particlesRestored = aliases.reduce((restored, { name }) => {
      const lastHangul = [...name]
        .reverse()
        .find((character) => /[가-힣]/.test(character));
      if (!lastHangul) return restored;
      const finalConsonant = (lastHangul.charCodeAt(0) - 0xac00) % 28;
      const hasFinalConsonant = finalConsonant > 0;
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const particles = [
        ["은|는", hasFinalConsonant ? "은" : "는"],
        ["이|가", hasFinalConsonant ? "이" : "가"],
        ["을|를", hasFinalConsonant ? "을" : "를"],
        ["과|와", hasFinalConsonant ? "과" : "와"],
        ["으로|로", hasFinalConsonant && finalConsonant !== 8 ? "으로" : "로"],
      ] as const;
      return particles.reduce(
        (sentence, [pattern, particle]) =>
          sentence.replace(
            new RegExp(`${escapedName}(?:${pattern})`, "g"),
            `${name}${particle}`,
          ),
        restored,
      );
    }, namesRestored);

    return particlesRestored
      .replace(
        /오래 들고 갈 생각이라면 종목별로 이익이 이어질지보다,? 한 종목이 흔들려도 전체가 버틸 수 있는 비중인지 먼저 보겠습니다\.?/g,
        "오래 보유하려면 기업의 이익이 꾸준히 이어질지와, 한 종목이 흔들려도 전체가 버틸 수 있는 비중인지 함께 봐야 해요.",
      )
      .replace(/현재 확인 범위(?:예요|입니다)[.!]?\s*/g, "")
      .replace(
        /tinyHoldingCountBelowFivePercent/g,
        "비중이 5%보다 작은 종목 수",
      )
      .replace(/effectiveHoldingCount/g, "실제 비중을 반영한 종목 수")
      .replace(/holdingCount/g, "보유 종목 수")
      .replace(/largestHoldingWeightPercent/g, "가장 큰 종목의 비중")
      .replace(/topThreeWeightPercent/g, "상위 3개 종목의 합산 비중")
      .replace(/averageValuePerHoldingWon/g, "종목당 평균 평가금액")
      .replace(/businessCategoryWeights/g, "사업군별 비중")
      .replace(/uncategorizedHoldingCount/g, "사업군을 구분하지 못한 종목 수")
      .replace(/calculatedConsensus/g, "계산된 종목 평가")
      .replace(/financialProfile/g, "재무정보")
      .replace(/\s{2,}/g, " ")
      .trim();
  };
  const holdings = result.holdings.map((holding, index) => {
    const longTermPosition = holding.purchasePosition?.tenYearPosition ?? null;
    const recentPosition = holding.purchasePosition?.oneYearPosition ?? null;
    const portfolioWeightPercent =
      result.currentValue > 0
        ? Number(((holding.valueKrw / result.currentValue) * 100).toFixed(1))
        : 0;
    const financialProfile = holding.fundamentals
      ? {
          source: holding.fundamentals.source,
          asOf: holding.fundamentals.asOf,
          coverage: holding.fundamentals.coverage,
          statementPeriods: holding.fundamentals.periods,
          revenueGrowthPercent: holding.fundamentals.revenueGrowthPercent,
          operatingProfitGrowthPercent:
            holding.fundamentals.operatingProfitGrowthPercent,
          netIncomeGrowthPercent: holding.fundamentals.netIncomeGrowthPercent,
          operatingMarginPercent: holding.fundamentals.operatingMarginPercent,
          debtRatioPercent: holding.fundamentals.debtRatioPercent,
          returnOnEquityPercent: holding.fundamentals.returnOnEquityPercent,
          priceEarningsRatio: holding.fundamentals.per,
          priceBookRatio: holding.fundamentals.pbr,
          earningsPerShare: holding.fundamentals.eps,
          bookValuePerShare: holding.fundamentals.bps,
        }
      : null;
    const consensus = calculateHoldingConsensus({
      portfolioWeightPercent,
      returnRatePercent: holding.returnRate,
      longTermPurchasePositionPercent: longTermPosition,
      recentPurchasePositionPercent: recentPosition,
      financialProfile,
    });
    return {
      holdingAlias: aliases[index].alias,
      broadBusinessCategory: inferBroadBusinessCategory(holding),
      portfolioWeightPercent,
      returnRatePercent: Number(holding.returnRate.toFixed(1)),
      profitDirection:
        holding.profitKrw > 0
          ? "수익"
          : holding.profitKrw < 0
            ? "손실"
            : "보합",
      longTermPurchasePositionPercent:
        longTermPosition === null ? null : Number(longTermPosition.toFixed(1)),
      longTermPurchasePositionBand: purchasePositionBand(longTermPosition),
      recentPurchasePositionPercent:
        recentPosition === null ? null : Number(recentPosition.toFixed(1)),
      recentPurchasePositionBand: purchasePositionBand(recentPosition),
      financialProfile,
      calculatedConsensus: consensus,
    };
  });
  const sortedWeights = holdings
    .map((holding) => holding.portfolioWeightPercent)
    .sort((a, b) => b - a);
  const topThreeWeightPercent = Number(
    sortedWeights
      .slice(0, 3)
      .reduce((sum, weight) => sum + weight, 0)
      .toFixed(1),
  );
  const concentrationIndex = sortedWeights.reduce(
    (sum, weight) => sum + (weight / 100) ** 2,
    0,
  );
  const effectiveHoldingCount = Number(
    (concentrationIndex > 0 ? 1 / concentrationIndex : 0).toFixed(1),
  );
  const tinyHoldingCount = holdings.filter(
    (holding) =>
      holding.portfolioWeightPercent > 0 && holding.portfolioWeightPercent < 5,
  ).length;
  const categorizedWeight = new Map<string, number>();
  holdings.forEach((holding) => {
    if (!holding.broadBusinessCategory) return;
    categorizedWeight.set(
      holding.broadBusinessCategory,
      (categorizedWeight.get(holding.broadBusinessCategory) ?? 0) +
        holding.portfolioWeightPercent,
    );
  });
  const businessCategoryWeights = [...categorizedWeight.entries()]
    .map(([category, weightPercent]) => ({
      category,
      weightPercent: Number(weightPercent.toFixed(1)),
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
  const scores = buildStrategyScores(result);
  const committeeEvaluation = buildCommitteeEvaluation(result);
  const assessmentDomains = buildAssessmentDomains(result);
  const committeeScores = committeeEvaluation.scores;
  const overallCommitteeScore = Number(
    (
      Object.values(committeeScores).reduce(
        (sum, committeeScore) => sum + committeeScore,
        0,
      ) / Object.values(committeeScores).length
    ).toFixed(1),
  );
  const responseSchema = aiStrategySchema.extend({
    holdingInsights: aiStrategySchema.shape.holdingInsights.length(
      holdings.length,
    ),
  });

  const facts = {
    goalAmountWon: result.goalAmount,
    currentValueWon: Math.round(result.currentValue),
    goalProgressPercent: Number(
      ((result.currentValue / result.goalAmount) * 100).toFixed(1),
    ),
    totalReturnRatePercent: Number(result.returnRate.toFixed(1)),
    investmentPeriodMonths: result.investmentPeriodMonths ?? null,
    annualizedReturnRatePercent:
      result.annualizedReturnRate == null
        ? null
        : Number(result.annualizedReturnRate.toFixed(1)),
    scenarioPersonalReturnAdjustment: result.personalReturnAdjustment
      ? {
          historicalAnnualReturnPercent: Number(
            result.personalReturnAdjustment.historicalAnnualReturn.toFixed(1),
          ),
          confidenceWeightPercent: Number(
            (result.personalReturnAdjustment.confidenceWeight * 100).toFixed(0),
          ),
          cappedExcessReturnPercentPoint: Number(
            result.personalReturnAdjustment.cappedExcessReturn.toFixed(1),
          ),
          appliedAnnualAdjustmentPercentPoint: Number(
            result.personalReturnAdjustment.appliedAnnualAdjustment.toFixed(2),
          ),
        }
      : null,
    averageScenarioGoalPeriod: period(base?.goalMonth ?? null),
    monthlyContributionWon: result.monthlyContribution,
    goalPeriodWithMonthlyContribution:
      result.monthlyContribution > 0
        ? period(contributedBase?.goalMonth ?? null)
        : "입력하지 않음",
    shortenedPeriod:
      contributedBase?.shortenedByMonths == null
        ? "계산되지 않음"
        : period(contributedBase.shortenedByMonths),
    benchmark: result.benchmark
      ? {
          label: result.benchmark.label,
          goalPeriod: period(result.benchmark.goalMonth),
        }
      : null,
    portfolioStructure: {
      holdingCount: holdings.length,
      largestHoldingWeightPercent: sortedWeights[0] ?? 0,
      topThreeWeightPercent,
      effectiveHoldingCount,
      tinyHoldingCountBelowFivePercent: tinyHoldingCount,
      averageValuePerHoldingWon:
        holdings.length > 0
          ? Math.round(result.currentValue / holdings.length)
          : 0,
      businessCategoryWeights,
      uncategorizedHoldingCount: holdings.filter(
        (holding) => !holding.broadBusinessCategory,
      ).length,
    },
    holdings,
    investmentCriteriaScores: scores,
    assessmentDomains,
    committeeScores,
    committeeScoreReasons: committeeEvaluation.reasons,
    overallCommitteeScore,
    committeeVerdict:
      overallCommitteeScore >= 7
        ? "좋음"
        : overallCommitteeScore >= 4.5
          ? "양호"
          : "위험",
    investmentStyle: result.investmentStyle,
    riskWarnings:
      result.riskWarnings.length > 0
        ? ["포트폴리오에 레버리지·인버스 상품이 포함되어 있음"]
        : [],
  };

  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 30_000 });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    store: false,
    max_output_tokens: 5_000,
    input: [
      {
        role: "system",
        content: [
          "당신은 EOKKA의 '10인 투자위원회'입니다. 워런 버핏, 찰리 멍거, 벤저민 그레이엄, 피터 린치, 필립 피셔, 존 템플턴, 존 보글, 하워드 막스, 레이 달리오, 조엘 그린블라트의 널리 알려진 투자 원칙을 서로 다른 관점으로 적용한 뒤 하나의 합의된 분석을 작성하세요. 실제 인물들이 이 포트폴리오를 검토했거나 특정 종목을 추천한 것처럼 표현하지 마세요.",
          "이 섹션은 사용자의 현재 포트폴리오 상태를 10인 투자위원회에게 점검받고 각 관점의 조언을 듣는 컨셉입니다. overallCommitteeScore가 7점 이상이면 '좋음', 4.5점 이상 7점 미만이면 '양호', 4.5점 미만이면 '위험'이며 committeeVerdict에 판정이 제공됩니다. headline은 판정을 포함한 짧은 총평 한 문장으로 작성하세요. diagnosis는 '좋음'이면 유지할 강점과 더 나아질 점, '양호'면 괜찮은 점과 우선 보완할 점, '위험'이면 가장 큰 위험과 먼저 고칠 점을 쉬운 말로 설명하세요. 점수나 판정을 임의로 바꾸지 마세요.",
          "위원회는 가치와 안전마진, 좋은 기업과 장기 성장, 이해 가능한 사업, 역발상, 낮은 비용과 분산, 시장 사이클과 위험, 여러 경제 환경에 대한 대비를 함께 검토하세요. 의견이 갈릴 수 있는 지점은 숨기지 말고, 최종 결론은 주식을 처음 접한 사람도 이해할 수 있는 따뜻하고 쉬운 존댓말로 정리하세요. 실제 인물의 직접 인용문이나 가상의 발언은 만들지 마세요.",
          "assessmentDomains의 네 영역(포트폴리오 구조, 가격 변동 위험, 기업 재무 품질, 매수 가격 수준)을 투자위원회 판단의 우선 근거로 사용하세요. 단일 균형 점수나 총점만으로 좋고 나쁨을 단정하지 말고, 각 영역의 status와 evidence를 서로 연결해 장점과 위험을 토론하세요. '정보 부족' 영역은 추측하지 마세요.",
          "주식을 처음 접한 사람도 한 번에 이해할 수 있는 쉬운 한국어를 사용하세요. 한 문장을 짧게 쓰고, 어려운 한자어와 전문 용어를 피하세요. 꼭 필요한 용어는 바로 뒤에 쉬운 뜻을 괄호로 설명하세요.",
          "안전마진은 '가치보다 비싸게 사지 않을 여유', 복리는 '수익이 다시 수익을 만드는 힘', 집중도는 '몇 종목에 돈이 몰린 정도', 변동성은 '가격이 크게 오르내리는 정도'처럼 풀어서 표현하세요.",
          "반드시 제공된 계산 결과와 financialProfile만 해석하고 가격, 뉴스, 재무 상태, 미래 수익률을 새로 만들지 마세요.",
          "핵심 관점은 가격 대비 가치, 지속 가능한 경쟁우위와 성장, 재무 건전성, 장기 보유 규율, 분산과 비용, 시장 사이클, 여러 경제 환경에서의 회복력입니다.",
          "financialProfile이 있으면 매출·영업이익·순이익의 변화, 영업이익률, 부채비율, 자기자본이익률, PER·PBR 중 실제 값이 있는 항목을 쉬운 말로 풀어 근거에 사용하세요. 한 해 변화만으로 회사의 장기 경쟁력을 단정하지 마세요.",
          "financialProfile이 없거나 일부 값만 있더라도 서비스 밖의 추가 자료를 사용자에게 요구하거나 종목을 알 수 없다고 말하지 마세요. 별도의 제한 안내 문구를 붙이지 말고, 확인 가능한 가격과 포트폴리오 수치만으로 바로 실천 가능한 조언을 작성하세요.",
          "현금흐름, 경영진, 사업의 경쟁력처럼 financialProfile에 없는 항목은 평가하지 말고, 굳이 부족하다고 지적하지도 마세요. 서비스가 가진 다른 수치로 설명을 이어가세요.",
          "committeeDiscussion은 열 명이 현재 포트폴리오가 전반적으로 좋은지, 어떤 장점이 있고 무엇이 아쉬운지를 함께 판단하는 실제 회의처럼 작성하세요. 각자 자기 역할의 기준으로 근거를 찾되, 자신의 담당 항목을 따로 발표하거나 채점 결과를 해설하는 글처럼 쓰지 마세요. 친한 사람들이 단체 메시지방에서 짧은 문자를 주고받듯, 첫 메시지 이후에는 '그 장점에는 저도 동의해요.', '맞아요. 다만 가격 쪽에서는 조금 다르게 보여요.', '그 위험을 줄이려면 이런 방법도 있겠네요.'처럼 앞사람의 구체적인 의견에 공감하거나 반론하고 보완하세요. 각 메시지는 두세 문장으로 끝내고 문장 중간에서 끊지 마세요.",
          "committeeDiscussion은 최종 분석 결과를 다시 설명하는 영역이 아니라 그 결과에 도달하는 토론 과정입니다. 첫 인물이 포트폴리오의 핵심 쟁점을 제시하고, 다음 인물들은 앞선 발언의 특정 내용을 받아 동의·반론·질문·보완하면서 논의를 발전시키며, 마지막 인물은 앞선 의견이 어디에서 모였는지 정리하세요. 열 개의 독립된 조언문처럼 작성하지 마세요.",
          "committeeDiscussion의 열 인물은 모두 같은 AI 말투를 쓰지 마세요. 실제 인물의 문장을 베끼거나 고유한 말투를 그대로 흉내 내지는 말고, 공개적으로 알려진 투자 태도에서 가져온 대화 성격만 구분하세요. 워런 버핏 관점은 차분하고 쉬운 비유로 긴 시간을 이야기하고, 찰리 멍거 관점은 짧고 솔직하게 실수를 지적하며, 벤저민 그레이엄 관점은 숫자와 가격 여유를 조심스럽게 따지세요. 피터 린치 관점은 일상적인 말로 회사가 이해되는지 묻고, 필립 피셔 관점은 앞으로 오래 성장할 이유를 궁금해하며, 존 템플턴 관점은 모두가 같은 방향을 볼 때 반대 가능성을 꺼내세요. 존 보글 관점은 단순함과 분산을 담백하게 강조하고, 하워드 막스 관점은 좋은 면 뒤의 위험을 신중하게 짚으며, 레이 달리오 관점은 서로 다른 상황에서 균형이 버티는지 연결해 보세요. 조엘 그린블라트 관점은 좋은 회사와 좋은 가격을 짧고 명료하게 함께 정리하세요.",
          "대화를 자연스럽게 만들기 위해 매번 이름을 부르거나 '동의해요', '덧붙일게요', '살펴보면'으로 시작하지 마세요. 어떤 인물은 짧게 맞장구친 뒤 반론하고, 어떤 인물은 앞선 수치를 다시 물으며, 어떤 인물은 구체적인 예를 들고, 어떤 인물은 논의를 한 문장으로 정리하세요. '좋은 지적입니다', '중요한 관점입니다', '종합하면', '데이터를 보면' 같은 전형적인 AI 보고서 표현을 반복하지 마세요. 실제 메신저 대화처럼 문장 길이와 반응 방식을 조금씩 다르게 하되, 가벼운 말투 때문에 분석 근거가 흐려지지는 않게 하세요.",
          "committeeAdvice에는 각 인물이 토론이 끝난 뒤 사용자에게 따로 건네는 맞춤 조언을 작성하세요. 자기 담당 투자 원칙과 확인된 포트폴리오 수치를 근거로 잘한 점, 아쉬운 점, 앞으로 지킬 행동 한 가지를 쉬운 존댓말로 두세 문장에 담으세요. 이 조언은 캐릭터 상세 모달에서만 표시되므로 committeeDiscussion의 대화 문장을 그대로 반복하지 마세요.",
          "'살펴보겠습니다', '확인하겠습니다', '평가하겠습니다', '먼저 보겠습니다'처럼 발표하는 말투를 반복하지 마세요. 대신 '~해 보여요', '~도 같이 봐야 해요', '~는 조금 걱정돼요', '~라면 더 편하게 오래 가져갈 수 있어요'처럼 친근하고 자연스러운 존댓말을 사용하세요.",
          "확인된 수치에서 잘하고 있는 점이 보이면 '오, 이 부분은 정말 잘하고 있어요.', '이 선택은 꽤 든든하네요.', '이건 좋은 습관이에요.'처럼 먼저 구체적으로 반응한 뒤 이유를 말하세요. 아쉬운 점이 보이면 '음, 이 부분은 조금 아쉬워요.', '여기는 한 번만 더 생각해 보면 좋겠어요.', '이 정도 쏠림은 마음이 조금 쓰이네요.'처럼 부드럽게 반응하고 바로 개선 방법을 이어 주세요.",
          "모든 인물이 똑같은 감탄사를 쓰지 말고 반응의 표현과 강도를 다양하게 바꾸세요. 한 메시지에는 감탄이나 리액션을 최대 한 번만 사용하고, 느낌표와 이모지는 과하게 사용하지 마세요. 앞사람의 좋은 지적에는 짧게 공감하고, 다른 생각이 있으면 예의를 갖춰 자연스럽게 덧붙이세요.",
          "좋은 점과 아쉬운 점을 억지로 하나씩 만들 필요는 없습니다. 제공된 숫자로 확인되는 경우에만 반응하고, 칭찬이나 걱정 뒤에는 반드시 그 근거가 되는 수치와 사용자가 할 수 있는 행동을 붙이세요.",
          "문장 사이의 논리를 분명히 연결하세요. 기업의 이익 지속성과 포트폴리오 비중처럼 둘 다 중요한 항목을 'A보다 B를 먼저 본다'고 억지로 비교하지 말고, 왜 함께 봐야 하는지 쉬운 말로 설명하세요.",
          "열 명은 반드시 자기 담당 역할에 집중하되, 그 관점으로 포트폴리오 전체의 장점이나 단점을 토론에 보태고 다른 사람의 분석을 반복하지 마세요. 워런 버핏은 좋은 회사를 오래 보유할 수 있는지, 찰리 멍거는 성급한 판단과 피해야 할 실수, 벤저민 그레이엄은 매수 가격과 안전 여유, 피터 린치는 사업을 쉽게 이해할 수 있는지, 필립 피셔는 오래 성장할 힘, 존 템플턴은 공포·과열과 반대 기회, 존 보글은 종목 수·작은 비중·비용을 포함한 분산의 실효성, 하워드 막스는 손실 위험과 시장 흐름, 레이 달리오는 사업군 쏠림과 여러 경제 환경에서의 균형, 조엘 그린블라트는 회사의 질과 지불한 가격의 균형을 중심으로 의견을 내세요.",
          "committeeScores와 committeeScoreReasons는 대화의 판단 강도와 사실관계를 일치시키기 위한 내부 참고 자료이며 점수는 화면에서 이름 옆에 따로 표시됩니다. 대화에서는 점수가 나온 이유를 설명하거나 자신의 평가 항목을 소개하지 말고, 해당 근거를 활용해 이 포트폴리오의 좋은 점, 걱정되는 점, 다른 위원의 의견에 대한 공감이나 반론, 현실적인 개선 방향을 자연스럽게 말하세요. 점수를 바꾸거나 다른 인물의 점수를 평가하지 마세요.",
          "각 인물의 대화 내용은 같은 이름의 committeeScoreReasons와 모순되면 안 됩니다. 7점 이상이면 포트폴리오의 해당 장점을 분명히 인정하고, 4점 이상 7점 미만이면 장점과 아쉬움을 함께 토론하며, 4점 미만이면 짧게 인정할 점이 있더라도 개선이 더 필요한 상태로 의견을 이어가세요.",
          "JSON의 영문 필드명은 내부 계산용입니다. tinyHoldingCountBelowFivePercent, effectiveHoldingCount, holdingCount 같은 필드명을 응답에 절대 쓰지 말고 각각 '비중이 5%보다 작은 종목 수', '실제 비중을 반영한 종목 수', '보유 종목 수'처럼 자연스러운 한국어 문장으로 풀어 쓰세요.",
          "'현재 확인 범위예요', '정보가 더 필요해요', '데이터가 부족해요' 같은 서비스 내부 사정이나 제한을 알리는 문구는 사용하지 마세요. 확인된 사실을 먼저 말하고 곧바로 의미와 행동 기준을 설명하세요.",
          "존 보글은 holdingCount, tinyHoldingCountBelowFivePercent, effectiveHoldingCount를 사용해 종목을 너무 잘게 나눴는지 대화 속에서 설명하세요. 레이 달리오는 businessCategoryWeights를 사용해 기술·디지털 같은 특정 사업군 쏠림을 대화 속에서 설명하세요. 워런 버핏이나 하워드 막스는 largestHoldingWeightPercent와 topThreeWeightPercent를 사용해 특정 종목 의존도를 자연스럽게 짚으세요.",
          "committeeDiscussion에서 실제 인물의 고유한 말투를 흉내 내거나 가짜 인용문을 만들지는 마세요. 이는 각 투자 원칙을 맡은 AI 캐릭터들의 대화입니다. 어려운 용어는 쓰지 말고, 꼭 필요하면 괄호로 바로 풀어 설명하세요.",
          "committeeConclusion에는 열 명의 대화에서 가장 중요한 판단과 가장 먼저 할 일만 골라, 주식 초보자도 바로 이해할 수 있는 짧고 완결된 문장 딱 1개로 결론을 내리세요. 여러 문장이나 항목을 나열하지 말고, 대화에 없던 사실은 새로 만들지 마세요.",
          "headline과 diagnosis를 포함한 모든 텍스트는 반드시 완결된 문장으로 끝내세요. 글자 제한에 맞추기 위해 문장 중간을 잘라 제출하지 마세요.",
          "목표 기간과 기간 단축 수치는 입력 데이터의 값을 그대로 사용하세요.",
          "누적 수익률을 평가할 때 투자 기간과 연환산 수익률이 제공되었다면 반드시 함께 고려하고, 짧은 기간의 성과를 장기 실력으로 단정하지 마세요.",
          "개별 종목을 단정적으로 매수·매도하라고 지시하지 마세요.",
          "holdingAlias는 실제 종목명을 가린 익명 식별자이므로 응답에 그대로 사용하세요.",
          "holdingAlias는 화면에 표시하기 직전에 실제 종목명으로 자동 복원됩니다. 응답에서 익명화, 별칭, 실제 종목명을 모른다는 사실이나 '종목명 대신 익명 표시만 있다'는 내부 처리 과정을 절대 언급하지 마세요.",
          "기업 정보가 부족할 때도 종목명이 없다고 말하지 말고 holdingAlias를 회사 이름처럼 자연스럽게 사용하세요. 예를 들어 '종목 A가 어떻게 돈을 벌고, 빚을 감당할 수 있는지 확인해 보세요'처럼 쓰면 화면에서는 실제 회사명으로 표시됩니다.",
          "여러 회사를 함께 언급할 때도 '종목 A~E', 'A·B·C', '나머지 종목'처럼 줄이지 마세요. 각 회사의 holdingAlias를 '종목 A, 종목 B, 종목 C'처럼 매번 완전하게 적으세요.",
          "종목별 과거 수익률만으로 우수 종목을 판정하지 말고 매수 위치, 비중 쏠림, 손익 방향과 변동 위험을 함께 설명하세요.",
          "최근 최대 10년 기준 내 매수가 위치가 80% 이상이면 높은 평균단가의 근거로 언급하고, 무조건적인 물타기 대신 추격매수를 피하며 가격·비중 조건을 정한 분할매수를 검토하라고 안내하세요.",
          "최근 최대 10년 기준 내 매수가 위치가 20% 이하이면 상대적으로 낮은 구간에서 매수한 점을 인정하되 과거 최저가 부근이라는 이유만으로 추가 매수를 권하지 마세요. 사용자에게 보여주는 문장에서는 '장기 매수 위치', '최근 매수 위치'라는 줄임말 대신 각각 '최근 최대 10년 기준 내 매수가 위치', '최근 1년 기준 내 매수가 위치'라고 풀어 쓰세요.",
          "한 종목 비중이 35% 이상이거나 상위 3종목 합계가 75% 이상이면 집중 위험을 해당 수치와 함께 분명히 지적하세요.",
          "급등주·우량주 여부는 제공된 데이터로 확인할 수 없습니다. 공격성 점수나 위험 경고가 높다면 특정 종목명을 지어내지 말고, 이익 지속성·부채·현금흐름을 확인한 대형 우량주 또는 광범위 시장 ETF를 고르는 기준을 제시하세요.",
          "holdingInsights에는 제공된 모든 보유 종목을 빠짐없이 하나씩 작성하세요. 각 종목의 calculatedConsensus와 votes는 서버가 같은 입력에 항상 같은 결과가 나오도록 계산한 최종 판정입니다. 이를 바꾸거나 새 투표를 만들지 말고, evidence와 strategy에서 그 판정의 이유와 다음 행동만 설명하세요. evidence는 financialProfile의 실제 재무 수치가 있으면 우선 사용하고 비중·수익률·평균 매수가 위치까지 쉬운 말로 풀어 주세요. strategy에는 추가 매수 전에 확인할 조건을 명확히 적으세요. 확인되지 않은 전망이나 적정가는 추측하지 마세요.",
          "monthlyPlan에는 월 투자금이 0원이면 임의의 투자 금액이나 단축 기간을 만들지 말고 감당 가능한 금액을 정하는 방법을 설명하세요. 입력값이 있으면 계산된 단축 기간을 그대로 인용하세요. 생활비 점검, 투자 방법, 계산 결과처럼 서로 다른 내용은 각각 짧은 문장 하나로 분리하고, 한 문장에 여러 행동을 길게 이어 쓰지 마세요.",
          "monthlyPlan과 diversification은 각각 2~3개의 짧고 완결된 문장으로 작성하세요. 문장마다 핵심 내용은 하나만 담고 같은 조언을 표현만 바꾸어 반복하지 마세요.",
          "diversification에는 단순히 분산하라는 말 대신 최대 비중과 상위 3종목 비중을 인용하고 신규 자금으로 쏠림을 완화하는 순서를 제시하세요.",
          "strengths에는 계산 결과로 확인되는 잘하고 있는 점을 정확히 2개 작성하세요.",
          "improvements에는 개선 여지가 있는 아쉬운 점을 정확히 2개 작성하되 비난하지 말고 개선 방향을 함께 제시하세요.",
          "actions는 오늘 확인할 항목, 다음 매수 전 확인할 조건, 월 1회 점검할 항목처럼 서로 다른 시간축으로 작성하세요. title은 사용자가 바로 행동을 떠올릴 수 있는 짧은 문구로 쓰고, detail은 핵심 행동과 그 이유를 각각 짧은 문장으로 나누어 최대 2문장만 작성하세요. 하나의 카드에 여러 행동을 나열하지 마세요.",
          "확인할 수 없는 내용을 추측하지 마세요. 다만 데이터 부족을 반복해서 강조하지 말고, 현재 서비스에서 확인된 범위 안에서 도움이 되는 결론을 먼저 말하세요.",
          "상투적인 표현을 피하고 사용자가 자신의 수치를 보고 행동 기준을 바로 이해할 수 있는 구체적인 한국어 존댓말로 작성하세요. 꾸짖거나 겁주지 말고, 좋은 점은 인정하면서 서두르지 않는 태도를 권하세요.",
          "disclaimer에는 예측의 불확실성과 투자 판단 책임을 한 문장으로 알리세요.",
        ].join(" "),
      },
      {
        role: "user",
        content: `다음 계산 결과를 10인 투자위원회의 서로 다른 투자 원칙으로 검토하고 토론한 뒤, 전체 포트폴리오 회의 결론과 모든 종목별 투자 컨센서스 및 실행 가능한 조언을 작성해 주세요. 이는 실제 인물들의 견해가 아닌 공개된 투자 원칙을 조합한 AI 시뮬레이션이어야 합니다.\n${JSON.stringify(facts)}`,
      },
    ],
    text: {
      format: zodTextFormat(responseSchema, "portfolio_strategy"),
    },
  });

  if (!response.output_parsed) return null;

  const { holdingInsights, ...strategy } = response.output_parsed;
  return {
    ...strategy,
    assessmentDomains,
    headline: restoreHoldingNames(strategy.headline),
    diagnosis: restoreHoldingNames(strategy.diagnosis),
    committeeDiscussion: Object.fromEntries(
      Object.entries(strategy.committeeDiscussion).map(([key, message]) => [
        key,
        restoreHoldingNames(message),
      ]),
    ) as AiStrategy["committeeDiscussion"],
    committeeAdvice: Object.fromEntries(
      Object.entries(strategy.committeeAdvice).map(([key, advice]) => [
        key,
        restoreHoldingNames(advice),
      ]),
    ) as NonNullable<AiStrategy["committeeAdvice"]>,
    committeeConclusion: restoreHoldingNames(strategy.committeeConclusion),
    committeeScores,
    overallCommitteeScore,
    strengths: strategy.strengths.map((item) => ({
      title: restoreHoldingNames(item.title),
      detail: restoreHoldingNames(item.detail),
    })),
    improvements: strategy.improvements.map((item) => ({
      title: restoreHoldingNames(item.title),
      detail: restoreHoldingNames(item.detail),
    })),
    monthlyPlan: restoreHoldingNames(strategy.monthlyPlan),
    diversification: restoreHoldingNames(strategy.diversification),
    actions: strategy.actions.map((action) => ({
      ...action,
      title: restoreHoldingNames(action.title),
      detail: restoreHoldingNames(action.detail),
    })),
    disclaimer: restoreHoldingNames(strategy.disclaimer),
    holdingInsights: holdingInsights.map((insight) => {
      const calculated = holdings.find(
        (holding) => holding.holdingAlias === insight.holdingAlias,
      )?.calculatedConsensus ?? {
        votes: { positive: 0, neutral: 10, cautious: 0 },
        consensus: "중립" as const,
        verdict: "중립" as const,
      };
      return {
        name:
          aliasToName.get(insight.holdingAlias) ??
          restoreHoldingNames(insight.holdingAlias),
        verdict: calculated.verdict,
        consensus: calculated.consensus,
        votes: calculated.votes,
        evidence: restoreHoldingNames(insight.evidence),
        strategy: restoreHoldingNames(insight.strategy),
      };
    }),
    scores,
  };
}
