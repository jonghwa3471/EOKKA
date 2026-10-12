import type { getActiveAnalysisHistory } from "~/features/stocks/history/analysis-history.server";

export type History = Awaited<ReturnType<typeof getActiveAnalysisHistory>>;

export function difference(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function calculateHistoryInsights(
  history: History,
  baseline?: History[number],
) {
  const first = history[0];
  const latest = history.at(-1)!;
  const comparisonHistory = baseline ? [baseline, ...history] : history;
  const comparisonStart = baseline ?? first;
  const changes = comparisonHistory.slice(1).map((item, index) => ({
    savedOn: item.savedOn,
    asset: item.currentValue - comparisonHistory[index].currentValue,
    profit: item.profit - comparisonHistory[index].profit,
    returnRate: item.returnRate - comparisonHistory[index].returnRate,
  }));
  const increasingChanges = changes.filter((change) => change.asset > 0);
  const decreasingChanges = changes.filter((change) => change.asset < 0);
  const bestChange = increasingChanges.length
    ? [...increasingChanges].sort((a, b) => b.asset - a.asset)[0]
    : null;
  const worstChange = decreasingChanges.length
    ? [...decreasingChanges].sort((a, b) => a.asset - b.asset)[0]
    : null;
  const peakRecord = [...history].sort(
    (a, b) => b.currentValue - a.currentValue,
  )[0];
  const lowestRecord = [...history].sort(
    (a, b) => a.currentValue - b.currentValue,
  )[0];
  const bestReturnRecord = [...history].sort(
    (a, b) => b.returnRate - a.returnRate,
  )[0];
  const worstReturnRecord = [...history].sort(
    (a, b) => a.returnRate - b.returnRate,
  )[0];
  const upCount = changes.filter((change) => change.asset > 0).length;
  const downCount = changes.filter((change) => change.asset < 0).length;
  const flatCount = changes.length - upCount - downCount;
  let longestUpStreak = 0;
  let currentUpStreak = 0;
  let runningPeak = comparisonStart.currentValue;
  let maximumDrawdown = 0;
  for (const item of history) {
    runningPeak = Math.max(runningPeak, item.currentValue);
    if (runningPeak > 0) {
      maximumDrawdown = Math.max(
        maximumDrawdown,
        ((runningPeak - item.currentValue) / runningPeak) * 100,
      );
    }
  }
  for (const change of changes) {
    currentUpStreak = change.asset > 0 ? currentUpStreak + 1 : 0;
    longestUpStreak = Math.max(longestUpStreak, currentUpStreak);
  }
  const averageMovement = changes.length
    ? changes.reduce((sum, change) => sum + Math.abs(change.asset), 0) /
      changes.length
    : 0;
  const firstGoalMonth = comparisonStart.goalMonth;
  const latestGoalMonth = latest.goalMonth;
  const goalMonthImprovement =
    firstGoalMonth !== null && latestGoalMonth !== null
      ? firstGoalMonth - latestGoalMonth
      : null;
  const currentTopHolding = [...latest.result.holdings].sort(
    (a, b) => b.valueKrw - a.valueKrw,
  )[0];
  const currentTopWeight =
    currentTopHolding && latest.currentValue > 0
      ? (currentTopHolding.valueKrw / latest.currentValue) * 100
      : null;
  const initialMatchingHolding = comparisonStart.result.holdings.find(
    (holding) => holding.ticker === currentTopHolding?.ticker,
  );
  const initialTopWeight =
    initialMatchingHolding && comparisonStart.currentValue > 0
      ? (initialMatchingHolding.valueKrw / comparisonStart.currentValue) * 100
      : null;
  const concentrationChange =
    currentTopWeight !== null && initialTopWeight !== null
      ? currentTopWeight - initialTopWeight
      : null;
  const elapsedDays = Math.max(
    0,
    Math.round(
      (new Date(`${latest.savedOn}T12:00:00+09:00`).getTime() -
        new Date(`${first.savedOn}T12:00:00+09:00`).getTime()) /
        86_400_000,
    ),
  );
  const weeklyHistory = history;
  const weeklyFirst = comparisonStart;
  const weeklyChanges = changes.map(({ savedOn, asset }) => ({
    savedOn,
    asset,
  }));
  const weeklyFirstHoldings = new Map(
    weeklyFirst?.result.holdings.map((holding) => [
      holding.ticker,
      holding.valueKrw,
    ]) ?? [],
  );
  const weeklyFirstPrices = new Map(
    weeklyFirst?.result.holdings.map((holding) => [
      holding.ticker,
      holding.currentPrice,
    ]) ?? [],
  );
  const weeklyHoldingChanges = latest.result.holdings
    .filter((holding) => weeklyFirstHoldings.has(holding.ticker))
    .map((holding) => ({
      name: holding.name,
      change:
        holding.valueKrw -
        (weeklyFirstHoldings.get(holding.ticker) ?? holding.valueKrw),
    }));
  const weeklyWinner =
    [...weeklyHoldingChanges]
      .filter((holding) => holding.change > 0)
      .sort((a, b) => b.change - a.change)[0] ?? null;
  const weeklyLoser =
    [...weeklyHoldingChanges]
      .filter((holding) => holding.change < 0)
      .sort((a, b) => a.change - b.change)[0] ?? null;
  const weeklyReturnRankings =
    weeklyHistory.length < (baseline ? 1 : 2)
      ? []
      : latest.result.holdings
          .flatMap((holding) => {
            const previousPrice = weeklyFirstPrices.get(holding.ticker);
            if (!previousPrice || previousPrice <= 0) return [];
            return [
              {
                name: holding.name,
                returnRate:
                  ((holding.currentPrice - previousPrice) / previousPrice) *
                  100,
              },
            ];
          })
          .sort((a, b) => b.returnRate - a.returnRate)
          .slice(0, 3);
  const weeklyDramaticChange =
    [...weeklyChanges].sort(
      (a, b) => Math.abs(b.asset) - Math.abs(a.asset),
    )[0] ?? null;
  const weeklyLow = weeklyHistory.length
    ? [...weeklyHistory].sort((a, b) => a.currentValue - b.currentValue)[0]
    : latest;
  const weeklyRecovery = Math.max(
    0,
    latest.currentValue - weeklyLow.currentValue,
  );
  const weeklyUpCount = weeklyChanges.filter(
    (change) => change.asset > 0,
  ).length;
  const weeklyGoalMonthChange =
    weeklyFirst?.goalMonth !== null &&
    weeklyFirst?.goalMonth !== undefined &&
    latest.goalMonth !== null
      ? weeklyFirst.goalMonth - latest.goalMonth
      : null;

  return {
    first,
    latest,
    changes,
    bestChange,
    worstChange,
    peakRecord,
    lowestRecord,
    bestReturnRecord,
    worstReturnRecord,
    upCount,
    downCount,
    flatCount,
    longestUpStreak,
    maximumDrawdown,
    averageMovement,
    goalMonthImprovement,
    currentTopHolding,
    currentTopWeight,
    concentrationChange,
    elapsedDays,
    totalAssetChange: latest.currentValue - comparisonStart.currentValue,
    totalProfitChange: changes.reduce((sum, change) => sum + change.profit, 0),
    totalReturnRateChange: changes.reduce(
      (sum, change) => sum + change.returnRate,
      0,
    ),
    holdingCountChange:
      latest.result.holdings.length - comparisonStart.result.holdings.length,
    weekly: {
      history: weeklyHistory,
      changes: weeklyChanges,
      winner: weeklyWinner,
      loser: weeklyLoser,
      returnRankings: weeklyReturnRankings,
      dramaticChange: weeklyDramaticChange,
      recovery: weeklyRecovery,
      upCount: weeklyUpCount,
      goalMonthChange: weeklyGoalMonthChange,
    },
  };
}
