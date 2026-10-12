export const PATHS = 5_000;

const SIMULATION_MONTHS = 600;

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

export function simulatePaths(
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
