import type { AiStrategy, AnalysisResult } from "./analysis.types";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const aiStrategySchema = z.object({
  headline: z.string().min(1).max(80),
  diagnosis: z.string().min(1).max(400),
  strengths: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(240),
      }),
    )
    .length(2),
  improvements: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(240),
      }),
    )
    .length(2),
  monthlyPlan: z.string().min(1).max(400),
  diversification: z.string().min(1).max(400),
  actions: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(240),
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
  const holdings = result.holdings.map((holding) => ({
    name: holding.name,
    ticker: holding.ticker,
    portfolioWeightPercent:
      result.currentValue > 0
        ? Number(((holding.valueKrw / result.currentValue) * 100).toFixed(1))
        : 0,
    returnRatePercent: Number(holding.returnRate.toFixed(1)),
  }));
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
    holdings,
    investmentCriteriaScores: scores,
    investmentStyle: result.investmentStyle,
    riskWarnings: result.riskWarnings,
  };

  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 15_000 });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    store: false,
    max_output_tokens: 1_400,
    input: [
      {
        role: "system",
        content: [
          "당신은 EOKKA의 포트폴리오 분석 해설자입니다.",
          "반드시 제공된 계산 결과만 해석하고 가격, 뉴스, 재무 상태, 미래 수익률을 새로 만들지 마세요.",
          "목표 기간과 기간 단축 수치는 입력 데이터의 값을 그대로 사용하세요.",
          "개별 종목을 단정적으로 매수·매도하라고 지시하지 마세요.",
          "종목별 과거 수익률만으로 우수 종목을 판정하지 말고, 비중 쏠림과 분산 위험 관점에서 설명하세요.",
          "추가 매수 전략은 특정 종목 추천 대신 과도한 집중 완화, 정기 점검, 감당 가능한 월 투자금 유지에 초점을 맞추세요.",
          "strengths에는 계산 결과로 확인되는 잘하고 있는 점을 정확히 2개 작성하세요.",
          "improvements에는 개선 여지가 있는 아쉬운 점을 정확히 2개 작성하되 비난하지 말고 개선 방향을 함께 제시하세요.",
          "근거가 부족하면 추측하지 말고 확인 가능한 범위가 제한적이라는 사실 자체를 솔직하게 설명하세요.",
          "짧고 구체적인 한국어 존댓말로 작성하세요.",
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

  return response.output_parsed ? { ...response.output_parsed, scores } : null;
}
