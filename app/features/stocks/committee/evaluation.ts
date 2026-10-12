import type { AiStrategy, AnalysisResult } from "../analysis.types";

export function period(months: number | null) {
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

export function purchasePositionBand(position: number | null) {
  if (position === null) return "가격 범위 데이터 없음";
  if (position <= 20) return "낮은 가격 구간";
  if (position <= 40) return "비교적 낮은 구간";
  if (position <= 60) return "중간 가격 구간";
  if (position <= 80) return "비교적 높은 구간";
  return "높은 가격 구간";
}

export function inferBroadBusinessCategory(
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

export function buildStrategyScores(
  result: AnalysisResult,
): AiStrategy["scores"] {
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

export function buildCommitteeEvaluation(result: AnalysisResult) {
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

export function buildAssessmentDomains(
  result: AnalysisResult,
): AssessmentDomain[] {
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
