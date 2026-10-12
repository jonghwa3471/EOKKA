import { TimerResetIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/core/lib/utils";

import { won } from "./formatters";
import { type History } from "./history-insights";
import {
  type TrendInterval,
  type TrendSeries,
  actualMarketValue,
  aggregateTrendHistory,
  calendarTrendHistory,
  chartPeriodWithWeekday,
} from "./trend-data";
import { useRevealOncePerVisit } from "./use-reveal-once-per-visit";

export function TrendChart({
  history,
  endDate,
  dimmedSeries,
}: {
  history: History;
  endDate: string;
  dimmedSeries: TrendSeries[];
}) {
  const { ref: chartRef, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredFutureIndex, setHoveredFutureIndex] = useState<number | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [interval, setInterval] = useState<TrendInterval>("daily");
  const [latestPointVisible, setLatestPointVisible] = useState(false);

  useEffect(() => {
    setLatestPointVisible(false);
    if (!isRevealed) return;
    const timer = window.setTimeout(() => setLatestPointVisible(true), 1_100);
    return () => window.clearTimeout(timer);
  }, [isRevealed]);

  const width = 900;
  const height = 330;
  const padding = { top: 28, right: 24, bottom: 45, left: 24 };
  const calendarHistory = aggregateTrendHistory(
    calendarTrendHistory(history, endDate),
    interval,
  );
  const first = history[0];
  const latest = history.at(-1)!;
  const actualMarketBaseline = history.find(
    (item) => item.result.benchmark?.observedComponents?.length,
  );
  const startTime = new Date(`${first.savedOn}T00:00:00Z`).getTime();
  const projectionValueAtMonth = (
    elapsedMonth: number,
    key: "base" | "market",
  ): number | null => {
    const points = first.result.chart.flatMap((point) => {
      const value = point[key];
      return value === null ? [] : [{ month: point.month, value }];
    });
    if (points.length === 0) return null;
    const nextIndex = points.findIndex((point) => point.month >= elapsedMonth);
    if (nextIndex <= 0) return points[Math.max(0, nextIndex)].value;
    if (nextIndex === -1) return points.at(-1)!.value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio =
      (elapsedMonth - previous.month) / (next.month - previous.month || 1);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const projectionValue = (
    savedOn: string,
    key: "base" | "market",
  ): number | null => {
    const elapsedDays = Math.max(
      0,
      (new Date(`${savedOn}T00:00:00Z`).getTime() - startTime) / 86_400_000,
    );
    return projectionValueAtMonth(elapsedDays / 30.4375, key);
  };
  const currentProjectionValue = (elapsedMonth: number) => {
    const points = latest.result.chart.map((point) => ({
      month: point.month,
      value: point.base,
    }));
    if (points.length === 0) return latest.currentValue;
    const nextIndex = points.findIndex((point) => point.month >= elapsedMonth);
    if (nextIndex <= 0) return points[Math.max(0, nextIndex)].value;
    if (nextIndex === -1) return points.at(-1)!.value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio =
      (elapsedMonth - previous.month) / (next.month - previous.month || 1);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const records = calendarHistory.map(
    ({ item, isCarried, closedReason, periodLabel }) => ({
      item,
      isCarried,
      closedReason,
      periodLabel,
      expected: projectionValue(item.savedOn, "base"),
      market: projectionValue(item.savedOn, "market"),
      actualMarket: actualMarketValue(item, actualMarketBaseline),
    }),
  );
  const latestElapsedMonth =
    Math.max(
      0,
      (new Date(`${latest.savedOn}T00:00:00Z`).getTime() - startTime) /
        86_400_000,
    ) / 30.4375;
  const futureProjection = Array.from(
    {
      length:
        interval === "daily"
          ? 7
          : interval === "weekly"
            ? 4
            : interval === "monthly"
              ? 3
              : 1,
    },
    (_, index) => {
      const step = index + 1;
      const elapsedMonth =
        interval === "daily"
          ? step / 30.4375
          : interval === "weekly"
            ? (step * 7) / 30.4375
            : interval === "monthly"
              ? step
              : step * 12;
      return {
        elapsedMonth,
        value: currentProjectionValue(elapsedMonth),
        expected: projectionValueAtMonth(
          latestElapsedMonth + elapsedMonth,
          "base",
        ),
        market: projectionValueAtMonth(
          latestElapsedMonth + elapsedMonth,
          "market",
        ),
      };
    },
  );
  const values = [
    ...records.flatMap(({ item, expected, market, actualMarket }) => [
      item.currentValue,
      ...(expected === null ? [] : [expected]),
      ...(market === null ? [] : [market]),
      ...(actualMarket === null ? [] : [actualMarket]),
    ]),
    ...futureProjection.flatMap((point) => [
      point.value,
      ...(point.expected === null ? [] : [point.expected]),
      ...(point.market === null ? [] : [point.market]),
    ]),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const plotWidth = width - padding.left - padding.right;
  const historyEndX = padding.left + plotWidth * 0.78;
  const historyPlotWidth = historyEndX - padding.left;
  const maxZoom = Math.max(6, records.length / 10);
  const minimumDateLabelWidth =
    interval === "monthly" ? 72 : interval === "yearly" ? 52 : 54;
  const visibleDateLabelCount = Math.min(
    records.length,
    records.length <= 1
      ? 1
      : Math.max(
          2,
          Math.floor((historyPlotWidth * zoom) / minimumDateLabelWidth) + 1,
        ),
  );
  const dateLabelIndexes = new Set(
    Array.from({ length: visibleDateLabelCount }, (_, labelIndex) =>
      visibleDateLabelCount <= 1
        ? 0
        : Math.round(
            (labelIndex * (records.length - 1)) / (visibleDateLabelCount - 1),
          ),
    ),
  );
  const x = (index: number) => {
    if (index <= records.length - 1) {
      if (records.length === 1) return historyEndX;
      return (
        padding.left +
        (index / (records.length - 1)) * (historyEndX - padding.left)
      );
    }
    const futureIndex = index - records.length + 1;
    return (
      historyEndX +
      (futureIndex / futureProjection.length) *
        (width - padding.right - historyEndX)
    );
  };
  const y = (value: number) =>
    padding.top +
    (1 - (value - min) / span) * (height - padding.top - padding.bottom);
  const visibleRecords = records.map((record, index) => ({
    ...record,
    index,
  }));
  const actualPoints = visibleRecords.map(
    ({ item, index }) => `${x(index)},${y(item.currentValue)}`,
  );
  const expectedPoints = [
    ...visibleRecords.flatMap(({ expected, index }) =>
      expected === null ? [] : [`${x(index)},${y(expected)}`],
    ),
    ...futureProjection.flatMap((point, index) =>
      point.expected === null
        ? []
        : [`${x(records.length + index)},${y(point.expected)}`],
    ),
  ];
  const marketPoints = [
    ...visibleRecords.flatMap(({ market, index }) =>
      market === null ? [] : [`${x(index)},${y(market)}`],
    ),
    ...futureProjection.flatMap((point, index) =>
      point.market === null
        ? []
        : [`${x(records.length + index)},${y(point.market)}`],
    ),
  ];
  const actualMarketPoints = visibleRecords.flatMap(
    ({ actualMarket, index }) =>
      actualMarket === null ? [] : [`${x(index)},${y(actualMarket)}`],
  );
  const currentExpectedPoints = [
    `${x(records.length - 1)},${y(latest.currentValue)}`,
    ...futureProjection.map(
      (point, index) => `${x(records.length + index)},${y(point.value)}`,
    ),
  ];
  const area = `${x(visibleRecords[0].index)},${height - padding.bottom} ${actualPoints.join(" ")} ${x(visibleRecords.at(-1)!.index)},${height - padding.bottom}`;
  const hovered = hoveredIndex === null ? null : records[hoveredIndex];
  const hoverX = hoveredIndex === null ? null : x(hoveredIndex);
  const hoveredFuture =
    hoveredFutureIndex === null ? null : futureProjection[hoveredFutureIndex];
  const futureHoverX =
    hoveredFutureIndex === null ? null : x(records.length + hoveredFutureIndex);
  const futurePeriodLabel =
    hoveredFutureIndex === null
      ? ""
      : interval === "daily"
        ? `${hoveredFutureIndex + 1}일 뒤`
        : interval === "weekly"
          ? `${hoveredFutureIndex + 1}주 뒤`
          : interval === "monthly"
            ? `${hoveredFutureIndex + 1}개월 뒤`
            : `${hoveredFutureIndex + 1}년 뒤`;
  const tooltipHeight = hovered
    ? hovered.isCarried
      ? 58
      : 58 +
        (hovered.expected !== null ? 18 : 0) +
        (hovered.market !== null ? 18 : 0) +
        (hovered.actualMarket !== null ? 18 : 0)
    : 58;
  const tooltipWidth = interval === "weekly" ? 250 : 200;
  const seriesOpacity = (series: TrendSeries) =>
    dimmedSeries.includes(series) ? 0.16 : 1;
  const updateZoom = (nextZoom: number, anchorRatio = 0.5) => {
    const clampedZoom = Math.min(maxZoom, Math.max(1, nextZoom));
    const container = scrollRef.current;
    const contentRatio = container
      ? (container.scrollLeft + anchorRatio * container.clientWidth) /
        Math.max(1, container.scrollWidth)
      : anchorRatio;
    setZoom(clampedZoom);
    setHoveredIndex(null);
    setHoveredFutureIndex(null);
    window.requestAnimationFrame(() => {
      const updatedContainer = scrollRef.current;
      if (!updatedContainer) return;
      updatedContainer.scrollLeft = Math.max(
        0,
        contentRatio * updatedContainer.scrollWidth -
          anchorRatio * updatedContainer.clientWidth,
      );
    });
  };
  const selectInterval = (nextInterval: TrendInterval) => {
    setInterval(nextInterval);
    setHoveredIndex(null);
    setHoveredFutureIndex(null);
    setZoom(1);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };
  const resetZoom = () => updateZoom(1, 0);

  return (
    <div ref={chartRef} className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div
          className="bg-muted/60 flex items-center gap-1 rounded-full p-1"
          role="tablist"
          aria-label="자산 성장 차트 표시 간격"
        >
          {(
            [
              ["daily", "일"],
              ["weekly", "주"],
              ["monthly", "월"],
              ["yearly", "년"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={interval === value}
              onClick={() => selectInterval(value)}
              className={cn(
                "min-w-9 rounded-full px-3 py-1.5 text-xs font-black transition",
                interval === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-background flex items-center gap-1 rounded-full border p-1 shadow-sm">
            <button
              type="button"
              className="hover:bg-muted flex size-8 items-center justify-center rounded-full disabled:opacity-35"
              aria-label="차트 축소"
              disabled={zoom <= 1.01}
              onClick={() => updateZoom(zoom / 1.5)}
            >
              <ZoomOutIcon className="size-4" />
            </button>
            <span className="text-muted-foreground min-w-10 text-center text-[11px] font-bold">
              {zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              className="hover:bg-muted flex size-8 items-center justify-center rounded-full disabled:opacity-35"
              aria-label="차트 확대"
              disabled={zoom >= maxZoom - 0.01}
              onClick={() => updateZoom(zoom * 1.5)}
            >
              <ZoomInIcon className="size-4" />
            </button>
          </div>
          {zoom > 1.01 && (
            <button
              type="button"
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[11px] font-bold"
              aria-label="자산 성장 차트 확대 초기화"
              onClick={resetZoom}
            >
              <TimerResetIcon className="size-3.5" /> 초기화
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full min-h-[280px] max-w-none"
          style={{ width: `${zoom * 100}%` }}
          role="img"
          aria-label="실제 평가금액과 현재 예상, 최초 예상, 최초 시장 예상 및 시장 실제 추이의 비교"
        >
          <defs>
            <linearGradient id="dashboard-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => {
            const lineY =
              padding.top + ratio * (height - padding.top - padding.bottom);
            return (
              <line
                key={ratio}
                x1={padding.left}
                x2={width - padding.right}
                y1={lineY}
                y2={lineY}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="5 7"
              />
            );
          })}
          <polygon
            points={area}
            fill="url(#dashboard-area)"
            style={{
              opacity: isRevealed ? seriesOpacity("actual") : 0,
              transition: "opacity 700ms ease-out 300ms",
            }}
          />
          {marketPoints.length > 0 && (
            <polyline
              points={marketPoints.join(" ")}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 7"
              style={{
                opacity: isRevealed ? seriesOpacity("market") * 0.9 : 0,
                transition: "opacity 700ms ease-out 180ms",
              }}
            />
          )}
          <polyline
            points={expectedPoints.join(" ")}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity("expected"),
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: "stroke-dashoffset 900ms ease-out 100ms",
            }}
          />
          <polyline
            points={currentExpectedPoints.join(" ")}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="9 7"
            style={{
              opacity: isRevealed ? seriesOpacity("currentExpected") : 0,
              transition: "opacity 650ms ease-out 250ms",
            }}
          />
          <polyline
            points={actualPoints.join(" ")}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity("actual"),
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition:
                "stroke-dashoffset 1000ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {actualMarketPoints.length > 0 && (
            <>
              <polyline
                points={actualMarketPoints.join(" ")}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                style={{
                  opacity: seriesOpacity("actualMarket"),
                  strokeDasharray: 1,
                  strokeDashoffset: isRevealed ? 0 : 1,
                  filter: "drop-shadow(0 0 4px rgba(6,182,212,0.75))",
                  transition: "stroke-dashoffset 900ms ease-out 220ms",
                }}
              />
              {visibleRecords.map(({ actualMarket, index, item, isCarried }) =>
                actualMarket === null ? null : (
                  <g key={`actual-market-${item.savedOn}`}>
                    <circle
                      cx={x(index)}
                      cy={y(actualMarket)}
                      r={isCarried ? "4" : "7"}
                      fill={isCarried ? "#64748b" : "#06b6d4"}
                      style={{
                        opacity: isRevealed ? seriesOpacity("actualMarket") : 0,
                        filter: isCarried
                          ? undefined
                          : "drop-shadow(0 0 3px rgba(6,182,212,0.65))",
                        transition: `opacity 250ms ease-out ${300 + Math.min(index, 30) * 15}ms`,
                      }}
                    />
                    <circle
                      cx={x(index)}
                      cy={y(actualMarket)}
                      r={isCarried ? "1.5" : "3"}
                      fill="white"
                      style={{
                        opacity: isRevealed ? seriesOpacity("actualMarket") : 0,
                        transition: `opacity 250ms ease-out ${340 + Math.min(index, 30) * 15}ms`,
                      }}
                    />
                  </g>
                ),
              )}
            </>
          )}
          {records.map(({ item, isCarried }, index) => {
            const isLatest = item.savedOn === endDate;
            return (
              <g key={item.savedOn}>
                {isLatest && latestPointVisible && (
                  <>
                    <circle
                      cx={x(index)}
                      cy={y(item.currentValue)}
                      r="12"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2"
                      opacity={isRevealed ? seriesOpacity("actual") * 0.7 : 0}
                    />
                    <circle
                      cx={x(index)}
                      cy={y(item.currentValue)}
                      r="8"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2"
                      className="motion-reduce:hidden"
                      opacity={isRevealed ? seriesOpacity("actual") : 0}
                    >
                      <animate
                        attributeName="r"
                        values="8;22"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.75;0"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
                <circle
                  cx={x(index)}
                  cy={y(item.currentValue)}
                  r={isCarried ? "4" : "7"}
                  fill={
                    isLatest ? "#ec4899" : isCarried ? "#64748b" : "#10b981"
                  }
                  style={{
                    opacity:
                      isRevealed && (!isLatest || latestPointVisible)
                        ? seriesOpacity("actual")
                        : 0,
                    transform:
                      isRevealed && (!isLatest || latestPointVisible)
                        ? "scale(1)"
                        : "scale(0)",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transition: isLatest
                      ? "opacity 220ms ease-out, transform 300ms ease-out"
                      : `opacity 220ms ease-out ${650 + Math.min(index, 30) * 20}ms, transform 300ms ease-out ${650 + Math.min(index, 30) * 20}ms`,
                  }}
                />
                <circle
                  cx={x(index)}
                  cy={y(item.currentValue)}
                  r={isCarried ? "1.5" : "3"}
                  fill="white"
                  style={{
                    opacity:
                      isRevealed && (!isLatest || latestPointVisible)
                        ? seriesOpacity("actual")
                        : 0,
                    transition: isLatest
                      ? "opacity 200ms ease-out"
                      : `opacity 200ms ease-out ${720 + Math.min(index, 30) * 20}ms`,
                  }}
                />
                <text
                  x={x(index)}
                  y={height - 14}
                  textAnchor="middle"
                  fill="currentColor"
                  className={cn(
                    "text-[13px]",
                    isLatest
                      ? "fill-pink-500 font-black"
                      : "fill-muted-foreground",
                  )}
                >
                  {dateLabelIndexes.has(index) &&
                    (interval === "yearly" ? (
                      item.savedOn.slice(0, 4)
                    ) : interval === "monthly" ? (
                      item.savedOn.slice(0, 7).replace("-", ".")
                    ) : (
                      <>
                        {Number(item.savedOn.slice(5, 7))}/
                        {Number(item.savedOn.slice(8, 10))}
                      </>
                    ))}
                </text>
              </g>
            );
          })}
          <rect
            x={padding.left}
            y={padding.top}
            width={width - padding.left - padding.right}
            height={height - padding.top - padding.bottom}
            fill="transparent"
            onMouseMove={(event) => {
              const rect =
                event.currentTarget.ownerSVGElement!.getBoundingClientRect();
              const svgX = ((event.clientX - rect.left) / rect.width) * width;
              if (svgX > historyEndX) {
                setHoveredIndex(null);
                const futureRatio =
                  (Math.min(width - padding.right, svgX) - historyEndX) /
                  Math.max(1, width - padding.right - historyEndX);
                setHoveredFutureIndex(
                  Math.min(
                    futureProjection.length - 1,
                    Math.max(
                      0,
                      Math.round(futureRatio * futureProjection.length) - 1,
                    ),
                  ),
                );
                return;
              }
              setHoveredFutureIndex(null);
              const ratio =
                (Math.min(historyEndX, Math.max(padding.left, svgX)) -
                  padding.left) /
                Math.max(1, historyEndX - padding.left);
              setHoveredIndex(
                records.length === 1
                  ? 0
                  : Math.min(
                      records.length - 1,
                      Math.max(0, Math.round(ratio * (records.length - 1))),
                    ),
              );
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
              setHoveredFutureIndex(null);
            }}
          />
          {hoveredFuture && futureHoverX !== null && (
            <g pointerEvents="none">
              <line
                x1={futureHoverX}
                x2={futureHoverX}
                y1={padding.top}
                y2={height - padding.bottom}
                className="stroke-muted-foreground"
                strokeDasharray="3 4"
                opacity=".55"
              />
              <circle
                cx={futureHoverX}
                cy={y(hoveredFuture.value)}
                r="5"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
              {hoveredFuture.expected !== null && (
                <circle
                  cx={futureHoverX}
                  cy={y(hoveredFuture.expected)}
                  r="4"
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              {hoveredFuture.market !== null && (
                <circle
                  cx={futureHoverX}
                  cy={y(hoveredFuture.market)}
                  r="4"
                  fill="#a78bfa"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              <g
                transform={`translate(${futureHoverX > width - 225 ? futureHoverX - 212 : futureHoverX + 12}, ${padding.top + 8})`}
              >
                <rect
                  width="200"
                  height={
                    58 +
                    (hoveredFuture.expected !== null ? 18 : 0) +
                    (hoveredFuture.market !== null ? 18 : 0)
                  }
                  rx="12"
                  className="fill-background stroke-border"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="20"
                  className="fill-foreground text-[11px] font-bold"
                >
                  {futurePeriodLabel}
                </text>
                <text
                  x="12"
                  y="41"
                  fill="#3b82f6"
                  className="text-[11px] font-semibold"
                >
                  현재 예상 · {won.format(hoveredFuture.value)}원
                </text>
                {hoveredFuture.expected !== null && (
                  <text
                    x="12"
                    y="59"
                    fill="#f59e0b"
                    className="text-[11px] font-semibold"
                  >
                    최초 예상 · {won.format(hoveredFuture.expected)}원
                  </text>
                )}
                {hoveredFuture.market !== null && (
                  <text
                    x="12"
                    y={59 + (hoveredFuture.expected !== null ? 18 : 0)}
                    fill="#a78bfa"
                    className="text-[11px] font-semibold"
                  >
                    최초 시장 예상 · {won.format(hoveredFuture.market)}원
                  </text>
                )}
              </g>
            </g>
          )}
          {hovered && hoverX !== null && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                x2={hoverX}
                y1={padding.top}
                y2={height - padding.bottom}
                className="stroke-muted-foreground"
                strokeDasharray="3 4"
                opacity=".55"
              />
              <circle
                cx={hoverX}
                cy={y(hovered.item.currentValue)}
                r="5"
                fill={
                  hovered.isCarried
                    ? "#64748b"
                    : hovered.item.savedOn === endDate
                      ? "#ec4899"
                      : "#10b981"
                }
                stroke="white"
                strokeWidth="2"
              />
              {hovered.expected !== null && (
                <circle
                  cx={hoverX}
                  cy={y(hovered.expected)}
                  r="4"
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              {hovered.market !== null && (
                <circle
                  cx={hoverX}
                  cy={y(hovered.market)}
                  r="4"
                  fill="#a78bfa"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              {hovered.actualMarket !== null && (
                <circle
                  cx={hoverX}
                  cy={y(hovered.actualMarket)}
                  r="4"
                  fill={hovered.isCarried ? "#64748b" : "#06b6d4"}
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              <g
                transform={`translate(${hoverX > width - tooltipWidth - 25 ? hoverX - tooltipWidth - 12 : hoverX + 12}, ${padding.top + 8})`}
              >
                <rect
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="12"
                  className="fill-background stroke-border"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="20"
                  className="fill-foreground text-[11px] font-bold"
                >
                  {chartPeriodWithWeekday(hovered.item.savedOn, interval)}
                </text>
                {!hovered.isCarried && hovered.item.savedOn === endDate && (
                  <text
                    x="138"
                    y="20"
                    textAnchor="end"
                    fill="#ec4899"
                    className="text-[10px] font-black"
                  >
                    최신 종가
                  </text>
                )}
                {hovered.isCarried ? (
                  <text
                    x="12"
                    y="41"
                    className="fill-muted-foreground text-[11px] font-semibold"
                  >
                    {hovered.closedReason === "휴장일"
                      ? "휴장일이라 미갱신됐어요"
                      : "새 종가가 없어 미갱신됐어요"}
                  </text>
                ) : (
                  <>
                    <text
                      x="12"
                      y="41"
                      fill="#10b981"
                      className="text-[11px] font-semibold"
                    >
                      실제 평가금액 · {won.format(hovered.item.currentValue)}원
                    </text>
                    {hovered.expected !== null && (
                      <text
                        x="12"
                        y="59"
                        fill="#f59e0b"
                        className="text-[11px] font-semibold"
                      >
                        최초 예상 · {won.format(hovered.expected)}원
                      </text>
                    )}
                    {hovered.market !== null && (
                      <text
                        x="12"
                        y={
                          59 +
                          (hovered.expected !== null ? 18 : 0) +
                          (hovered.actualMarket !== null ? 18 : 0)
                        }
                        fill="#a78bfa"
                        className="text-[11px] font-semibold"
                      >
                        최초 시장 예상 · {won.format(hovered.market)}원
                      </text>
                    )}
                    {hovered.actualMarket !== null && (
                      <text
                        x="12"
                        y={59 + (hovered.expected !== null ? 18 : 0)}
                        fill="#06b6d4"
                        className="text-[11px] font-semibold"
                      >
                        시장 실제 추이 · {won.format(hovered.actualMarket)}원
                      </text>
                    )}
                  </>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
