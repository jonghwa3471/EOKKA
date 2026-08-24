import type { AiStrategy, AnalysisResult } from "./analysis.types";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const aiStrategySchema = z.object({
  headline: z.string().min(1).max(80),
  diagnosis: z.string().min(1).max(700),
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
        verdict: z.enum(["좋은 위치", "중립", "주의 필요"]),
        evidence: z.string().min(1).max(300),
        strategy: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(5),
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

function purchasePositionBand(position: number | null) {
  if (position === null) return "가격 범위 데이터 없음";
  if (position <= 20) return "낮은 가격 구간";
  if (position <= 40) return "비교적 낮은 구간";
  if (position <= 60) return "중간 가격 구간";
  if (position <= 80) return "비교적 높은 구간";
  return "높은 가격 구간";
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
  const holdings = result.holdings.map((holding, index) => {
    const longTermPosition = holding.purchasePosition?.tenYearPosition ?? null;
    const recentPosition = holding.purchasePosition?.oneYearPosition ?? null;
    return {
      holdingAlias: aliases[index].alias,
      portfolioWeightPercent:
        result.currentValue > 0
          ? Number(((holding.valueKrw / result.currentValue) * 100).toFixed(1))
          : 0,
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
  const scores = buildStrategyScores(result);

  const facts = {
    goalAmountWon: result.goalAmount,
    currentValueWon: Math.round(result.currentValue),
    goalProgressPercent: Number(
      ((result.currentValue / result.goalAmount) * 100).toFixed(1),
    ),
    totalReturnRatePercent: Number(result.returnRate.toFixed(1)),
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
    },
    holdings,
    investmentCriteriaScores: scores,
    investmentStyle: result.investmentStyle,
    riskWarnings: result.riskWarnings,
  };

  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 30_000 });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    store: false,
    max_output_tokens: 2_600,
    input: [
      {
        role: "system",
        content: [
          "당신은 EOKKA의 포트폴리오 분석 해설자입니다.",
          "반드시 제공된 계산 결과만 해석하고 가격, 뉴스, 재무 상태, 미래 수익률을 새로 만들지 마세요.",
          "목표 기간과 기간 단축 수치는 입력 데이터의 값을 그대로 사용하세요.",
          "개별 종목을 단정적으로 매수·매도하라고 지시하지 마세요.",
          "holdingAlias는 실제 종목명을 가린 익명 식별자이므로 응답에 그대로 사용하세요.",
          "종목별 과거 수익률만으로 우수 종목을 판정하지 말고 매수 위치, 비중 쏠림, 손익 방향과 변동 위험을 함께 설명하세요.",
          "장기 매수 위치가 80% 이상이면 높은 평균단가의 근거로 언급하고, 무조건적인 물타기 대신 추격매수를 피하며 가격·비중 조건을 정한 분할매수를 검토하라고 안내하세요.",
          "장기 매수 위치가 20% 이하이면 상대적으로 낮은 구간에서 매수한 점을 인정하되 과거 최저가 부근이라는 이유만으로 추가 매수를 권하지 마세요.",
          "한 종목 비중이 35% 이상이거나 상위 3종목 합계가 75% 이상이면 집중 위험을 해당 수치와 함께 분명히 지적하세요.",
          "급등주·우량주 여부는 제공된 데이터로 확인할 수 없습니다. 공격성 점수나 위험 경고가 높다면 특정 종목명을 지어내지 말고, 이익 지속성·부채·현금흐름을 확인한 대형 우량주 또는 광범위 시장 ETF를 고르는 기준을 제시하세요.",
          "holdingInsights에는 목표에 미치는 영향이 큰 종목을 최대 5개 골라 근거 수치를 포함하고, 지금 할 일과 다음 매수 전에 기다릴 조건을 구분해 작성하세요.",
          "monthlyPlan에는 월 투자금이 0원이면 임의의 투자 금액이나 단축 기간을 만들지 말고 감당 가능한 금액을 정하는 방법을 설명하세요. 입력값이 있으면 계산된 단축 기간을 그대로 인용하세요.",
          "diversification에는 단순히 분산하라는 말 대신 최대 비중과 상위 3종목 비중을 인용하고 신규 자금으로 쏠림을 완화하는 순서를 제시하세요.",
          "strengths에는 계산 결과로 확인되는 잘하고 있는 점을 정확히 2개 작성하세요.",
          "improvements에는 개선 여지가 있는 아쉬운 점을 정확히 2개 작성하되 비난하지 말고 개선 방향을 함께 제시하세요.",
          "actions는 오늘 확인할 항목, 다음 매수 전 확인할 조건, 월 1회 점검할 항목처럼 서로 다른 시간축으로 작성하세요.",
          "근거가 부족하면 추측하지 말고 확인 가능한 범위가 제한적이라는 사실 자체를 솔직하게 설명하세요.",
          "상투적인 표현을 피하고 사용자가 자신의 수치를 보고 행동 기준을 바로 이해할 수 있는 구체적인 한국어 존댓말로 작성하세요.",
          "disclaimer에는 예측의 불확실성과 투자 판단 책임을 한 문장으로 알리세요.",
        ].join(" "),
      },
      {
        role: "user",
        content: `다음 계산 결과를 바탕으로 실행 가능한 전략 요약을 작성해 주세요.\n${JSON.stringify(facts)}`,
      },
    ],
    text: {
      format: zodTextFormat(aiStrategySchema, "portfolio_strategy"),
    },
  });

  if (!response.output_parsed) return null;

  const { holdingInsights, ...strategy } = response.output_parsed;
  return {
    ...strategy,
    holdingInsights: holdingInsights.map((insight) => ({
      name: aliasToName.get(insight.holdingAlias) ?? insight.holdingAlias,
      verdict: insight.verdict,
      evidence: insight.evidence,
      strategy: insight.strategy,
    })),
    scores,
  };
}
