export function quantile(values: Float64Array, percentile: number) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * percentile)];
}

export function priceRangePosition(prices: number[], averagePrice: number) {
  if (prices.length === 0) return 50;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (high === low) return 50;
  const position = ((averagePrice - low) / (high - low)) * 100;
  return Math.round(Math.min(100, Math.max(0, position)) * 10) / 10;
}

export function cagr(returns: number[], months: number) {
  if (returns.length < months) return null;
  const selected = returns.slice(-months);
  const growth = selected.reduce((value, rate) => value * (1 + rate), 1);
  return (growth ** (12 / months) - 1) * 100;
}

export const clampStyleScore = (score: number) =>
  Math.round(Math.max(0, Math.min(100, score)));

export function annualizedVolatility(returns: number[]) {
  if (returns.length < 2) return 0;
  const average = returns.reduce((sum, rate) => sum + rate, 0) / returns.length;
  const variance =
    returns.reduce((sum, rate) => sum + (rate - average) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(12) * 100;
}

export function maximumDrawdown(returns: number[]) {
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

export function positiveRollingYearRatio(returns: number[]) {
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

export function longTermAnnualReturn(
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

export type PriceHistory = Array<{ date: string; close: number }>;

export function monthlyReturnMap(history: PriceHistory) {
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

export function weightedMonthlyReturns(
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
