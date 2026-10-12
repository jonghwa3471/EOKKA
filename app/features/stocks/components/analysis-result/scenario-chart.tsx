import type { AnalysisResult } from "../../analysis.types";

import { useState } from "react";

import { useChartRevealOnce } from "./chart-animation";
import { goalLabel, won } from "./formatters";
import { type ScenarioSeries, colors } from "./scenario-series";

export function ScenarioChart({
  result,
  dimmedSeries,
}: {
  result: AnalysisResult;
  dimmedSeries: ScenarioSeries[];
}) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const goal = result.goalAmount;
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const width = 900,
    height = 320,
    left = 72,
    right = 20,
    top = 24,
    bottom = 42;
  const finiteGoalMonths = result.scenarios.flatMap((scenario) =>
    scenario.goalMonth === null ? [] : [scenario.goalMonth],
  );
  if (
    result.benchmark?.goalMonth !== null &&
    result.benchmark?.goalMonth !== undefined
  )
    finiteGoalMonths.push(result.benchmark.goalMonth);
  const endMonth = Math.min(
    360,
    finiteGoalMonths.length > 0 ? Math.max(...finiteGoalMonths) + 12 : 360,
  );
  const visibleChart = result.chart.filter((point) => point.month <= endMonth);
  const max = goal * 1.2;
  const x = (month: number) =>
    left + (month / endMonth) * (width - left - right);
  const y = (value: number) =>
    top + (1 - Math.min(value, max) / max) * (height - top - bottom);
  const seriesOpacity = (series: ScenarioSeries) =>
    dimmedSeries.includes(series) ? 0.14 : 1;
  type ScenarioKey = "conservative" | "base" | "optimistic";
  const scenarioPoints = (key: ScenarioKey) => {
    const goalMonth = result.scenarios.find(
      (scenario) => scenario.key === key,
    )?.goalMonth;
    const points = visibleChart
      .filter((point) => goalMonth == null || point.month < goalMonth)
      .map((point) => ({ month: point.month, value: point[key] }));
    if (typeof goalMonth === "number")
      points.push({ month: goalMonth, value: goal });
    return points.sort((a, b) => a.month - b.month);
  };
  const marketPoints = () => {
    if (!result.benchmark) return [];
    const points = visibleChart
      .filter(
        (point) =>
          point.market !== null &&
          (result.benchmark!.goalMonth === null ||
            point.month < result.benchmark!.goalMonth),
      )
      .map((point) => ({ month: point.month, value: point.market! }));
    if (result.benchmark.goalMonth !== null)
      points.push({ month: result.benchmark.goalMonth, value: goal });
    return points.sort((a, b) => a.month - b.month);
  };
  const valueAtMonth = (key: ScenarioKey, month: number) => {
    const points = scenarioPoints(key);
    if (points.length === 0 || month > points.at(-1)!.month) return null;
    const nextIndex = points.findIndex((point) => point.month >= month);
    if (nextIndex <= 0) return points[0].value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio = (month - previous.month) / (next.month - previous.month);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const marketValueAtMonth = (month: number) => {
    const points = marketPoints();
    if (points.length === 0 || month > points.at(-1)!.month) return null;
    const nextIndex = points.findIndex((point) => point.month >= month);
    if (nextIndex <= 0) return points[0].value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio = (month - previous.month) / (next.month - previous.month);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const periodAt = (month: number) => {
    const years = Math.floor(month / 12);
    const months = month % 12;
    if (years === 0) return `${months}개월 후`;
    return months === 0 ? `${years}년 후` : `${years}년 ${months}개월 후`;
  };
  const hoverX = hoverMonth === null ? null : x(hoverMonth);
  const tooltipItems =
    hoverMonth === null
      ? []
      : result.scenarios.flatMap((scenario) => {
          if (dimmedSeries.includes(scenario.key)) return [];
          const value = valueAtMonth(scenario.key, hoverMonth);
          return value === null ? [] : [{ scenario, value }];
        });
  const marketTooltipValue =
    hoverMonth === null || dimmedSeries.includes("market")
      ? null
      : marketValueAtMonth(hoverMonth);

  return (
    <div ref={ref} className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[700px]"
        role="img"
        aria-label={`${goalLabel(goal)} 도달 미래 자산 시나리오 차트`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const value = max * ratio;
          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                className="stroke-border"
                strokeDasharray="4 5"
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[12px]"
              >
                {value === 0 ? "0" : `${(value / 100_000_000).toFixed(1)}억`}
              </text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={width - right}
          y1={y(goal)}
          y2={y(goal)}
          stroke="#ef4444"
          strokeDasharray="7 5"
          opacity=".8"
        />
        <text
          x={width - right}
          y={y(goal) - 8}
          textAnchor="end"
          fill="#ef4444"
          className="text-[12px] font-bold"
        >
          {goalLabel(goal)} 목표
        </text>
        {(["conservative", "base", "optimistic"] as const).map((key, index) => (
          <polyline
            key={key}
            points={scenarioPoints(key)
              .map((point) => `${x(point.month)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={colors[key]}
            strokeWidth={key === "base" ? 4 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity(key),
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: `stroke-dashoffset 1100ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 120}ms`,
            }}
          />
        ))}
        {result.benchmark && (
          <polyline
            points={marketPoints()
              .map((point) => `${x(point.month)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={colors.market}
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity("market"),
              strokeDasharray: "0.025 0.018",
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: "stroke-dashoffset 1200ms ease-out 300ms",
            }}
          />
        )}
        {result.scenarios.map(
          (scenario) =>
            scenario.goalMonth !== null && (
              <g key={`${scenario.key}-goal`}>
                <circle
                  cx={x(scenario.goalMonth)}
                  cy={y(goal)}
                  r="6"
                  fill={colors[scenario.key]}
                  stroke="white"
                  strokeWidth="2"
                  opacity={seriesOpacity(scenario.key)}
                />
                <text
                  x={x(scenario.goalMonth)}
                  y={y(goal) - 12}
                  textAnchor="middle"
                  fill={colors[scenario.key]}
                  className="text-[11px] font-bold"
                  opacity={seriesOpacity(scenario.key)}
                >
                  달성!
                </text>
              </g>
            ),
        )}
        {result.benchmark?.goalMonth !== null &&
          result.benchmark?.goalMonth !== undefined && (
            <g>
              <circle
                cx={x(result.benchmark.goalMonth)}
                cy={y(goal)}
                r="6"
                fill={colors.market}
                stroke="white"
                strokeWidth="2"
                opacity={seriesOpacity("market")}
              />
              <text
                x={x(result.benchmark.goalMonth)}
                y={y(goal) - 12}
                textAnchor="middle"
                fill={colors.market}
                className="text-[11px] font-bold"
                opacity={seriesOpacity("market")}
              >
                시장
              </text>
            </g>
          )}
        {Array.from(
          { length: Math.floor(endMonth / 60) + 1 },
          (_, index) => index * 5,
        ).map((year) => (
          <text
            key={year}
            x={x(year * 12)}
            y={height - 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[12px]"
          >
            {year === 0 ? "현재" : `${year}년`}
          </text>
        ))}
        <rect
          x={left}
          y={top}
          width={width - left - right}
          height={height - top - bottom}
          fill="transparent"
          onMouseMove={(event) => {
            const rect =
              event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            const svgX = ((event.clientX - rect.left) / rect.width) * width;
            const month = Math.round(
              ((Math.min(width - right, Math.max(left, svgX)) - left) /
                (width - left - right)) *
                endMonth,
            );
            setHoverMonth(month);
          }}
          onMouseLeave={() => setHoverMonth(null)}
        />
        {hoverMonth !== null &&
          hoverX !== null &&
          (tooltipItems.length > 0 || marketTooltipValue !== null) && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                x2={hoverX}
                y1={top}
                y2={height - bottom}
                className="stroke-muted-foreground"
                strokeDasharray="3 4"
                opacity=".6"
              />
              {tooltipItems.map(({ scenario, value }) => (
                <circle
                  key={scenario.key}
                  cx={hoverX}
                  cy={y(value)}
                  r="4"
                  fill={colors[scenario.key]}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
              {marketTooltipValue !== null && (
                <circle
                  cx={hoverX}
                  cy={y(marketTooltipValue)}
                  r="4"
                  fill={colors.market}
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              <g
                transform={`translate(${hoverX > width - 210 ? hoverX - 188 : hoverX + 12}, ${top + 8})`}
              >
                <rect
                  width="176"
                  height={
                    34 +
                    (tooltipItems.length +
                      (marketTooltipValue === null ? 0 : 1)) *
                      21
                  }
                  rx="10"
                  className="fill-background stroke-border"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="20"
                  className="fill-foreground text-[11px] font-bold"
                >
                  {periodAt(hoverMonth)}
                </text>
                {tooltipItems.map(({ scenario, value }, index) => (
                  <text
                    key={scenario.key}
                    x="12"
                    y={42 + index * 21}
                    fill={colors[scenario.key]}
                    className="text-[11px] font-semibold"
                  >
                    {scenario.label} · {won(value)}
                  </text>
                ))}
                {marketTooltipValue !== null && result.benchmark && (
                  <text
                    x="12"
                    y={42 + tooltipItems.length * 21}
                    fill={colors.market}
                    className="text-[11px] font-semibold"
                  >
                    시장 기준 · {won(marketTooltipValue)}
                  </text>
                )}
              </g>
            </g>
          )}
      </svg>
    </div>
  );
}
