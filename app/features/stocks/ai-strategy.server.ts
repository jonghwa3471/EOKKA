import type { AiStrategy, AnalysisResult } from "./analysis.types";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const aiStrategySchema = z.object({
  framework: z.literal("buffett_principles"),
  headline: z.string().min(1).max(80),
  diagnosis: z.string().min(1).max(700),
  principleChecks: z
    .array(
      z.object({
        principle: z.string().min(1).max(40),
        status: z.enum(["좋아요", "조금 더 살펴봐요", "현재 확인 범위예요"]),
        observation: z.string().min(1).max(350),
        question: z.string().min(1).max(250),
      }),
    )
    .length(4),
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
    .max(10),
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

    return aliases.reduce((restored, { name }) => {
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
  };
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
      financialProfile: holding.fundamentals
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
        : null,
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
    },
    holdings,
    investmentCriteriaScores: scores,
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
          "당신은 EOKKA의 '버핏 원칙 분석가'입니다. 워런 버핏 본인인 것처럼 말하거나 실제 발언·추천을 만들어내지 말고, 널리 알려진 장기 가치투자 원칙을 현재 계산 결과에 적용해 해설하세요.",
          "말투는 오랫동안 좋은 회사를 골라 기다려 온 노련한 투자 멘토가 옆에서 차분히 이야기하듯 따뜻하고 소박하게 쓰세요. '내가 이 숫자를 본다면', '서두를 필요는 없어요', '주식이 아니라 회사의 일부를 산다고 생각해 보세요'처럼 이해하기 쉬운 표현을 사용할 수 있지만, 실제 워런 버핏의 직접 인용문인 것처럼 따옴표를 쓰거나 출처를 만들지 마세요.",
          "주식을 처음 접한 사람도 한 번에 이해할 수 있는 쉬운 한국어를 사용하세요. 한 문장을 짧게 쓰고, 어려운 한자어와 전문 용어를 피하세요. 꼭 필요한 용어는 바로 뒤에 쉬운 뜻을 괄호로 설명하세요.",
          "안전마진은 '가치보다 비싸게 사지 않을 여유', 복리는 '수익이 다시 수익을 만드는 힘', 집중도는 '몇 종목에 돈이 몰린 정도', 변동성은 '가격이 크게 오르내리는 정도'처럼 풀어서 표현하세요.",
          "반드시 제공된 계산 결과와 financialProfile만 해석하고 가격, 뉴스, 재무 상태, 미래 수익률을 새로 만들지 마세요.",
          "핵심 관점은 이해 가능한 사업, 지속 가능한 경쟁우위와 재무 건전성, 내재가치 대비 안전마진, 장기 보유 규율과 과도한 분산 회피입니다.",
          "financialProfile이 있으면 매출·영업이익·순이익의 변화, 영업이익률, 부채비율, 자기자본이익률, PER·PBR 중 실제 값이 있는 항목을 쉬운 말로 풀어 근거에 사용하세요. 한 해 변화만으로 회사의 장기 경쟁력을 단정하지 마세요.",
          "financialProfile이 없거나 일부 값만 있더라도 서비스 밖의 추가 자료를 사용자에게 요구하거나 종목을 알 수 없다고 말하지 마세요. 대신 '현재 확인된 가격과 포트폴리오 흐름으로 보면'이라고 범위를 자연스럽게 밝히고, 확인 가능한 수치만으로 실천 가능한 조언을 작성하세요. 이때 status는 '현재 확인 범위예요'를 사용하세요.",
          "현금흐름, 경영진, 사업의 경쟁력처럼 financialProfile에 없는 항목은 평가하지 말고, 굳이 부족하다고 지적하지도 마세요. 서비스가 가진 다른 수치로 설명을 이어가세요.",
          "principleChecks에는 '비싸게 사지 않았나요?', '오래 기다릴 수 있나요?', '한곳에 너무 몰려 있나요?', '내가 아는 회사인가요?'를 이 순서대로 정확히 하나씩 작성하세요. observation은 현재 수치로 확인 가능한 사실을 쉬운 말로 설명하고 question에는 다음 투자 전 스스로 물어볼 짧고 구체적인 질문을 적으세요.",
          "목표 기간과 기간 단축 수치는 입력 데이터의 값을 그대로 사용하세요.",
          "누적 수익률을 평가할 때 투자 기간과 연환산 수익률이 제공되었다면 반드시 함께 고려하고, 짧은 기간의 성과를 장기 실력으로 단정하지 마세요.",
          "개별 종목을 단정적으로 매수·매도하라고 지시하지 마세요.",
          "holdingAlias는 실제 종목명을 가린 익명 식별자이므로 응답에 그대로 사용하세요.",
          "holdingAlias는 화면에 표시하기 직전에 실제 종목명으로 자동 복원됩니다. 응답에서 익명화, 별칭, 실제 종목명을 모른다는 사실이나 '종목명 대신 익명 표시만 있다'는 내부 처리 과정을 절대 언급하지 마세요.",
          "기업 정보가 부족할 때도 종목명이 없다고 말하지 말고 holdingAlias를 회사 이름처럼 자연스럽게 사용하세요. 예를 들어 '종목 A가 어떻게 돈을 벌고, 빚을 감당할 수 있는지 확인해 보세요'처럼 쓰면 화면에서는 실제 회사명으로 표시됩니다.",
          "여러 회사를 함께 언급할 때도 '종목 A~E', 'A·B·C', '나머지 종목'처럼 줄이지 마세요. 각 회사의 holdingAlias를 '종목 A, 종목 B, 종목 C'처럼 매번 완전하게 적으세요.",
          "종목별 과거 수익률만으로 우수 종목을 판정하지 말고 매수 위치, 비중 쏠림, 손익 방향과 변동 위험을 함께 설명하세요.",
          "장기 매수 위치가 80% 이상이면 높은 평균단가의 근거로 언급하고, 무조건적인 물타기 대신 추격매수를 피하며 가격·비중 조건을 정한 분할매수를 검토하라고 안내하세요.",
          "장기 매수 위치가 20% 이하이면 상대적으로 낮은 구간에서 매수한 점을 인정하되 과거 최저가 부근이라는 이유만으로 추가 매수를 권하지 마세요.",
          "한 종목 비중이 35% 이상이거나 상위 3종목 합계가 75% 이상이면 집중 위험을 해당 수치와 함께 분명히 지적하세요.",
          "급등주·우량주 여부는 제공된 데이터로 확인할 수 없습니다. 공격성 점수나 위험 경고가 높다면 특정 종목명을 지어내지 말고, 이익 지속성·부채·현금흐름을 확인한 대형 우량주 또는 광범위 시장 ETF를 고르는 기준을 제시하세요.",
          "holdingInsights에는 제공된 모든 보유 종목을 빠짐없이 하나씩 작성하세요. 각 항목은 '만약 버핏의 원칙으로 본다면'이라는 관점에서, 오래 투자한 어른이 사용자에게 직접 이야기하듯 쓰세요. evidence는 financialProfile의 실제 재무 수치가 있으면 이를 우선 사용하고, 비중·수익률·평균 매수가 위치와 함께 쉬운 말로 풀어 주세요. strategy는 지금 할 일과 다음에 더 사기 전에 기다리거나 확인할 조건을 명확히 구분하세요. 확인되지 않은 전망이나 적정가는 추측하지 마세요.",
          "monthlyPlan에는 월 투자금이 0원이면 임의의 투자 금액이나 단축 기간을 만들지 말고 감당 가능한 금액을 정하는 방법을 설명하세요. 입력값이 있으면 계산된 단축 기간을 그대로 인용하세요.",
          "diversification에는 단순히 분산하라는 말 대신 최대 비중과 상위 3종목 비중을 인용하고 신규 자금으로 쏠림을 완화하는 순서를 제시하세요.",
          "strengths에는 계산 결과로 확인되는 잘하고 있는 점을 정확히 2개 작성하세요.",
          "improvements에는 개선 여지가 있는 아쉬운 점을 정확히 2개 작성하되 비난하지 말고 개선 방향을 함께 제시하세요.",
          "actions는 오늘 확인할 항목, 다음 매수 전 확인할 조건, 월 1회 점검할 항목처럼 서로 다른 시간축으로 작성하세요.",
          "확인할 수 없는 내용을 추측하지 마세요. 다만 데이터 부족을 반복해서 강조하지 말고, 현재 서비스에서 확인된 범위 안에서 도움이 되는 결론을 먼저 말하세요.",
          "상투적인 표현을 피하고 사용자가 자신의 수치를 보고 행동 기준을 바로 이해할 수 있는 구체적인 한국어 존댓말로 작성하세요. 꾸짖거나 겁주지 말고, 좋은 점은 인정하면서 서두르지 않는 태도를 권하세요.",
          "disclaimer에는 예측의 불확실성과 투자 판단 책임을 한 문장으로 알리세요.",
        ].join(" "),
      },
      {
        role: "user",
        content: `다음 계산 결과를 워런 버핏의 가치투자 원칙이라는 렌즈로 검토해, 전체 포트폴리오 요약과 모든 종목별 실행 가능한 조언을 작성해 주세요. 이는 실제 워런 버핏의 견해가 아닌 원칙 기반 시뮬레이션이어야 합니다.\n${JSON.stringify(facts)}`,
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
    headline: restoreHoldingNames(strategy.headline),
    diagnosis: restoreHoldingNames(strategy.diagnosis),
    principleChecks: strategy.principleChecks.map((item) => ({
      ...item,
      principle: restoreHoldingNames(item.principle),
      observation: restoreHoldingNames(item.observation),
      question: restoreHoldingNames(item.question),
    })),
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
    holdingInsights: holdingInsights.map((insight) => ({
      name:
        aliasToName.get(insight.holdingAlias) ??
        restoreHoldingNames(insight.holdingAlias),
      verdict: insight.verdict,
      evidence: restoreHoldingNames(insight.evidence),
      strategy: restoreHoldingNames(insight.strategy),
    })),
    scores,
  };
}
