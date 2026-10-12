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
