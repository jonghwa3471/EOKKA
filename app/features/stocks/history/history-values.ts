import type { AnalysisResult } from "~/features/stocks/analysis.types";

export function seoulDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function goalMonthFor(result: AnalysisResult) {
  return (
    result.scenarios.find((scenario) => scenario.key === "base")?.goalMonth ??
    null
  );
}

export function jsonSafeResult(result: AnalysisResult) {
  return JSON.parse(JSON.stringify(result)) as AnalysisResult;
}

export function compactHistoryResult(result: AnalysisResult): AnalysisResult {
  const sampledChart = result.chart.filter(
    (point, index, points) =>
      index === 0 || index === points.length - 1 || point.month % 12 === 0,
  );
  return jsonSafeResult({
    ...result,
    holdings: result.holdings.map(
      ({
        fundamentals: _fundamentals,
        purchasePosition: _position,
        ...holding
      }) => holding,
    ),
    chart: sampledChart,
    contributionChart: undefined,
    aiStrategy: null,
    summary: [],
    riskWarnings: [],
  });
}

export function notificationGoalLabel(value: number) {
  return value % 100_000_000 === 0
    ? `${(value / 100_000_000).toLocaleString("ko-KR")}억`
    : `${value.toLocaleString("ko-KR")}원`;
}
