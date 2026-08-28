export interface PersonalReturnAdjustment {
  historicalAnnualReturn: number;
  personalAnnualizedReturn: number | null;
  confidenceWeight: number;
  cappedExcessReturn: number;
  appliedAnnualAdjustment: number;
}

export function personalPerformanceWeight(
  investmentPeriodMonths: number | null,
) {
  if (investmentPeriodMonths === null) return 0;
  if (investmentPeriodMonths < 6) return 0;
  if (investmentPeriodMonths < 12) return 0.05;
  if (investmentPeriodMonths < 24) return 0.1;
  if (investmentPeriodMonths < 36) return 0.15;
  if (investmentPeriodMonths < 60) return 0.2;
  return 0.25;
}

export function calculatePersonalReturnAdjustment({
  investmentPeriodMonths,
  personalAnnualizedReturn,
  historicalAnnualReturn,
  simulationHistoricalAnnualReturn,
}: {
  investmentPeriodMonths: number | null;
  personalAnnualizedReturn: number | null;
  historicalAnnualReturn: number;
  simulationHistoricalAnnualReturn: number;
}) {
  const confidenceWeight = personalPerformanceWeight(investmentPeriodMonths);
  const cappedExcessReturn =
    personalAnnualizedReturn === null
      ? 0
      : Math.max(
          -10,
          Math.min(10, personalAnnualizedReturn - historicalAnnualReturn),
        );
  const appliedAnnualAdjustment = Math.max(
    -2.5,
    Math.min(2.5, cappedExcessReturn * confidenceWeight),
  );
  const historicalAnnualDecimal = Math.max(
    -0.95,
    simulationHistoricalAnnualReturn / 100,
  );
  const adjustedAnnualDecimal = Math.max(
    -0.95,
    historicalAnnualDecimal + appliedAnnualAdjustment / 100,
  );
  const monthlyLogAdjustment =
    (Math.log1p(adjustedAnnualDecimal) -
      Math.log1p(historicalAnnualDecimal)) /
    12;

  return {
    adjustment: {
      historicalAnnualReturn,
      personalAnnualizedReturn,
      confidenceWeight,
      cappedExcessReturn,
      appliedAnnualAdjustment,
    } satisfies PersonalReturnAdjustment,
    monthlyLogAdjustment,
  };
}
