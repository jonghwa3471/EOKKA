import { TimerResetIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import { cn } from "~/core/lib/utils";

import { formatWon } from "./formatters";
import { type History } from "./history-insights";
import {
  type TrendInterval,
  aggregateTrendHistory,
  calendarTrendHistory,
  chartPeriodWithWeekday,
} from "./trend-data";
import { useRevealOncePerVisit } from "./use-reveal-once-per-visit";

export function CostBasisComparisonChart({
  history,
  endDate,
}: {
  history: History;
  endDate: string;
}) {
  const { ref, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [interval, setInterval] = useState<TrendInterval>("daily");
  const [dimmedSeries, setDimmedSeries] = useState<Array<"cost" | "value">>([]);
  const baseWidth = 900;
  const width = baseWidth * zoom;
  const height = 240;
  const padding = { top: 20, right: 24, bottom: 38, left: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const chartHistory = aggregateTrendHistory(
    calendarTrendHistory(history, endDate),
    interval,
  ).map(({ item }) => item);
  const values = chartHistory.flatMap((item) => [
    item.currentValue,
    item.result.totalCost,
  ]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = Math.max(1, rawMax - rawMin);
  const min = Math.max(0, rawMin - rawSpan * 0.12);
  const max = rawMax + rawSpan * 0.12;
  const span = Math.max(1, max - min);
  const x = (index: number) =>
    chartHistory.length <= 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (chartHistory.length - 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - min) / span) * plotHeight;
  const valuePoints = chartHistory.map(
    (item, index) => `${x(index)},${y(item.currentValue)}`,
  );
  const costPoints = chartHistory.map(
    (item, index) => `${x(index)},${y(item.result.totalCost)}`,
  );
  const maxZoom = Math.max(6, chartHistory.length / 10);
  const minimumDateLabelWidth =
    interval === "monthly" ? 72 : interval === "yearly" ? 52 : 54;
  const dateLabelCount = Math.min(
    chartHistory.length,
    chartHistory.length <= 1
      ? 1
      : Math.max(2, Math.floor(plotWidth / minimumDateLabelWidth) + 1),
  );
  const dateLabelIndexes = new Set(
    Array.from({ length: dateLabelCount }, (_, labelIndex) =>
      dateLabelCount <= 1
        ? 0
        : Math.round(
            (labelIndex * (chartHistory.length - 1)) / (dateLabelCount - 1),
          ),
    ),
  );
  const hovered = hoveredIndex === null ? null : chartHistory[hoveredIndex];
  const hoverX = hoveredIndex === null ? null : x(hoveredIndex);
  const tooltipWidth = interval === "weekly" ? 250 : 186;
  const tooltipX =
    hoverX === null
      ? 0
      : hoverX > width - tooltipWidth - 20
        ? hoverX - tooltipWidth - 12
        : hoverX + 12;
  const seriesOpacity = (series: "cost" | "value") =>
    dimmedSeries.includes(series) ? 0.16 : 1;
  const toggleSeries = (series: "cost" | "value") =>
    setDimmedSeries((current) =>
      current.includes(series)
        ? current.filter((item) => item !== series)
        : [...current, series],
    );
  const updateZoom = (nextZoom: number) => {
    const container = scrollRef.current;
    const centerRatio = container
      ? (container.scrollLeft + container.clientWidth / 2) /
        Math.max(1, container.scrollWidth)
      : 0.5;
    setZoom(Math.min(maxZoom, Math.max(1, nextZoom)));
    setHoveredIndex(null);
    window.requestAnimationFrame(() => {
      const updatedContainer = scrollRef.current;
      if (!updatedContainer) return;
      updatedContainer.scrollLeft = Math.max(
        0,
        centerRatio * updatedContainer.scrollWidth -
          updatedContainer.clientWidth / 2,
      );
    });
  };
  const resetZoom = () => {
    setZoom(1);
    setHoveredIndex(null);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };
  const selectInterval = (nextInterval: TrendInterval) => {
    setInterval(nextInterval);
    resetZoom();
  };

  return (
    <div ref={ref} className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="bg-muted/60 flex items-center gap-1 rounded-full p-1"
            role="tablist"
            aria-label="원금 비교 차트 표시 간격"
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
                  "min-w-9 cursor-pointer rounded-full px-3 py-1.5 text-xs font-black transition",
                  interval === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={!dimmedSeries.includes("cost")}
                  onClick={() => toggleSeries("cost")}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 transition",
                    dimmedSeries.includes("cost")
                      ? "bg-muted text-amber-500 opacity-40 hover:opacity-65"
                      : "bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-300",
                  )}
                >
                  <span className="size-2 rounded-full bg-amber-500" /> 매입
                  원금
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                해당 시점까지 주식을 사는 데 실제로 들어간 원금이에요.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={!dimmedSeries.includes("value")}
                  onClick={() => toggleSeries("value")}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 transition",
                    dimmedSeries.includes("value")
                      ? "bg-muted text-emerald-500 opacity-40 hover:opacity-65"
                      : "bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-300",
                  )}
                >
                  <span className="size-2 rounded-full bg-emerald-500" />{" "}
                  평가금액
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                해당 시점의 종가로 계산한 포트폴리오 전체 가치예요.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-background flex items-center gap-1 rounded-full border p-1 shadow-sm">
            <button
              type="button"
              className="hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="원금 비교 차트 축소"
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
              className="hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="원금 비교 차트 확대"
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
              aria-label="원금 비교 차트 확대 초기화"
              onClick={resetZoom}
            >
              <TimerResetIcon className="size-3.5" /> 초기화
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="h-[250px] overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full max-w-none"
          style={{ width: `${zoom * 100}%` }}
          role="img"
          aria-label="투자 기간 동안 매입 원금과 평가금액 비교"
        >
          {[0, 0.5, 1].map((ratio) => {
            const lineY = padding.top + ratio * plotHeight;
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

          {chartHistory.slice(0, -1).map((item, index) => {
            const next = chartHistory[index + 1];
            const averageDifference =
              (item.currentValue -
                item.result.totalCost +
                (next.currentValue - next.result.totalCost)) /
              2;
            return (
              <polygon
                key={`${item.savedOn}-${next.savedOn}`}
                points={`${x(index)},${y(item.currentValue)} ${x(index + 1)},${y(next.currentValue)} ${x(index + 1)},${y(next.result.totalCost)} ${x(index)},${y(item.result.totalCost)}`}
                fill={averageDifference >= 0 ? "#10b981" : "#3b82f6"}
                opacity={
                  isRevealed
                    ? 0.1 *
                      Math.min(seriesOpacity("cost"), seriesOpacity("value"))
                    : 0
                }
                className="transition-opacity duration-700"
              />
            );
          })}

          <polyline
            points={costPoints.join(" ")}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity("cost"),
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: "stroke-dashoffset 900ms ease-out 100ms",
            }}
          />
          <polyline
            points={valuePoints.join(" ")}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              opacity: seriesOpacity("value"),
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: "stroke-dashoffset 1s ease-out 220ms",
            }}
          />

          {chartHistory.map((item, index) => (
            <g key={item.savedOn}>
              <circle
                cx={x(index)}
                cy={y(item.result.totalCost)}
                r="4.5"
                fill="#f59e0b"
                opacity={isRevealed ? seriesOpacity("cost") : 0}
                className="transition-opacity duration-500"
              />
              <circle
                cx={x(index)}
                cy={y(item.currentValue)}
                r="5.5"
                fill="#10b981"
                opacity={isRevealed ? seriesOpacity("value") : 0}
                className="transition-opacity duration-500"
              />
              {dateLabelIndexes.has(index) && (
                <text
                  x={x(index)}
                  y={height - 13}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[12px]"
                >
                  {interval === "yearly" ? (
                    item.savedOn.slice(0, 4)
                  ) : interval === "monthly" ? (
                    item.savedOn.slice(0, 7).replace("-", ".")
                  ) : (
                    <>
                      {Number(item.savedOn.slice(5, 7))}/
                      {Number(item.savedOn.slice(8, 10))}
                    </>
                  )}
                </text>
              )}
            </g>
          ))}

          {hovered && hoverX !== null && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                x2={hoverX}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="currentColor"
                className="text-muted-foreground"
                strokeDasharray="4 5"
                opacity="0.45"
              />
              <circle
                cx={hoverX}
                cy={y(hovered.result.totalCost)}
                r="5"
                fill="#f59e0b"
                stroke="white"
                strokeWidth="2"
              />
              <circle
                cx={hoverX}
                cy={y(hovered.currentValue)}
                r="6"
                fill="#10b981"
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x={tooltipX}
                y="10"
                width={tooltipWidth}
                height="92"
                rx="14"
                className="fill-popover stroke-border"
              />
              <text
                x={tooltipX + 14}
                y="31"
                className="fill-foreground text-[12px] font-black"
              >
                {chartPeriodWithWeekday(hovered.savedOn, interval)}
              </text>
              <text
                x={tooltipX + 14}
                y="52"
                className="fill-amber-500 text-[11px] font-bold"
              >
                매입 원금 · {formatWon(hovered.result.totalCost)}
              </text>
              <text
                x={tooltipX + 14}
                y="71"
                className="fill-emerald-500 text-[11px] font-bold"
              >
                평가금액 · {formatWon(hovered.currentValue)}
              </text>
              <text
                x={tooltipX + 14}
                y="90"
                className={cn(
                  "text-[11px] font-bold",
                  hovered.currentValue - hovered.result.totalCost >= 0
                    ? "fill-rose-500"
                    : "fill-blue-500",
                )}
              >
                평가손익 ·{" "}
                {formatWon(hovered.currentValue - hovered.result.totalCost)}
              </text>
            </g>
          )}

          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={(event) => {
              const svg = event.currentTarget.ownerSVGElement!;
              const matrix = svg.getScreenCTM();
              if (!matrix) return;
              const pointer = svg.createSVGPoint();
              pointer.x = event.clientX;
              pointer.y = event.clientY;
              const svgX = pointer.matrixTransform(matrix.inverse()).x;
              const ratio =
                (Math.min(width - padding.right, Math.max(padding.left, svgX)) -
                  padding.left) /
                Math.max(1, plotWidth);
              setHoveredIndex(
                chartHistory.length <= 1
                  ? 0
                  : Math.min(
                      chartHistory.length - 1,
                      Math.max(
                        0,
                        Math.round(ratio * (chartHistory.length - 1)),
                      ),
                    ),
              );
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        </svg>
      </div>
    </div>
  );
}
