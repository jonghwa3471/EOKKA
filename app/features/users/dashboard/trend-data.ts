import { type History } from "./history-insights";

export type TrendSeries =
  | "actual"
  | "currentExpected"
  | "expected"
  | "market"
  | "actualMarket";

export type TrendInterval = "daily" | "weekly" | "monthly" | "yearly";

export function calendarTrendHistory(history: History, endDate: string) {
  const latest = history.at(-1);
  if (!latest) return [];
  const byDate = new Map(history.map((item) => [item.savedOn, item]));
  const start = history[0].savedOn;
  const totalDays =
    Math.max(
      0,
      Math.round(
        (new Date(`${endDate}T00:00:00Z`).getTime() -
          new Date(`${start}T00:00:00Z`).getTime()) /
          86_400_000,
      ),
    ) + 1;
  let carried = history[0];

  return Array.from({ length: totalDays }, (_, index) => {
    const savedOn = shiftDate(start, index);
    const actual = byDate.get(savedOn) ?? null;
    if (actual) carried = actual;
    const weekday = new Date(`${savedOn}T00:00:00Z`).getUTCDay();
    return {
      item: actual ?? { ...carried, savedOn },
      isCarried: actual === null,
      closedReason:
        actual !== null
          ? null
          : weekday === 0 || weekday === 6
            ? "휴장일"
            : "분석 미갱신일",
      periodLabel: savedOn,
    };
  });
}

function trendPeriodKey(savedOn: string, interval: TrendInterval) {
  if (interval === "daily") return savedOn;
  if (interval === "monthly") return savedOn.slice(0, 7);
  if (interval === "yearly") return savedOn.slice(0, 4);
  const date = new Date(`${savedOn}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return shiftDate(savedOn, -mondayOffset);
}

function chartDateWithWeekday(savedOn: string) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[new Date(`${savedOn}T00:00:00Z`).getUTCDay()];
  return `${savedOn.replaceAll("-", ".")} (${weekday})`;
}

export function chartPeriodWithWeekday(
  savedOn: string,
  interval: TrendInterval,
) {
  const key = trendPeriodKey(savedOn, interval);
  if (interval === "daily") return chartDateWithWeekday(savedOn);
  if (interval === "weekly")
    return `${chartDateWithWeekday(key)}~${chartDateWithWeekday(shiftDate(key, 6))}`;
  if (interval === "monthly") return `${key.replace("-", ".")}월`;
  return `${key}년`;
}

export function aggregateTrendHistory(
  calendarHistory: ReturnType<typeof calendarTrendHistory>,
  interval: TrendInterval,
) {
  if (interval === "daily") return calendarHistory;
  const groups = new Map<
    string,
    (typeof calendarHistory)[number] & { hasActualRecord: boolean }
  >();
  for (const record of calendarHistory) {
    const key = trendPeriodKey(record.item.savedOn, interval);
    const previous = groups.get(key);
    const hasActualRecord =
      (previous?.hasActualRecord ?? false) || !record.isCarried;
    groups.set(key, {
      ...record,
      isCarried: !hasActualRecord,
      closedReason: hasActualRecord ? null : record.closedReason,
      hasActualRecord,
      periodLabel:
        interval === "weekly"
          ? `${key.replaceAll("-", ".")}~${shiftDate(key, 6).replaceAll("-", ".")}`
          : interval === "monthly"
            ? `${key.replace("-", ".")}월`
            : `${key}년`,
    });
  }
  return [...groups.values()].map(
    ({ hasActualRecord: _, ...record }) => record,
  );
}

export function actualMarketValue(
  item: History[number],
  baseline: History[number] | undefined,
) {
  const baselineComponents = baseline?.result.benchmark?.observedComponents;
  const currentComponents = item.result.benchmark?.observedComponents;
  if (!baseline || !baselineComponents?.length || !currentComponents?.length)
    return null;

  const currentByLabel = new Map(
    currentComponents.map((component) => [component.label, component]),
  );
  let matchedWeight = 0;
  let weightedGrowth = 0;
  for (const component of baselineComponents) {
    const current = currentByLabel.get(component.label);
    if (!current || component.close <= 0 || current.close <= 0) continue;
    matchedWeight += component.weight;
    weightedGrowth += component.weight * (current.close / component.close);
  }
  if (matchedWeight <= 0) return null;
  return baseline.currentValue * (weightedGrowth / matchedWeight);
}

export function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
