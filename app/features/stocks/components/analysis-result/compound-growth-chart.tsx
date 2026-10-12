import type { AnalysisResult } from "../../analysis.types";

import { useState } from "react";

import { useChartRevealOnce } from "./chart-animation";
import { compoundValueLabel } from "./formatters";

function CompoundGrowthChart({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const annualizedReturnRate = result.annualizedReturnRate ?? result.returnRate;
  const annualRate = Math.max(-0.99, annualizedReturnRate / 100);
  const startLog = Math.log10(Math.max(result.currentValue, 1));
  const annualLogGrowth = Math.log10(1 + annualRate);
  const points = Array.from({ length: 8 }, (_, index) => {
    const year = index * 10;
    const logValue = startLog + annualLogGrowth * year;
    return {
      year,
      logValue,
      value: logValue < 307 ? 10 ** logValue : Number.POSITIVE_INFINITY,
    };
  });
  const logValues = points.map((point) => point.logValue);
  const minLog = Math.min(...logValues);
  const maxLog = Math.max(...logValues);
  const width = 720;
  const height = 250;
  const left = 20;
  const right = 20;
  const top = 20;
  const bottom = 34;
  const x = (year: number) => left + (year / 70) * (width - left - right);
  const y = (logValue: number) => {
    const ratio =
      maxLog === minLog ? 0.5 : (logValue - minLog) / (maxLog - minLog);
    return top + (1 - ratio) * (height - top - bottom);
  };
  const polyline = points
    .map((point) => `${x(point.year)},${y(point.logValue)}`)
    .join(" ");
  const area = `${x(0)},${height - bottom} ${polyline} ${x(70)},${height - bottom}`;
  const hovered = points.find((point) => point.year === hoveredYear) ?? null;
  const rateTone =
    annualRate > 0
      ? "text-rose-500"
      : annualRate < 0
        ? "text-blue-500"
        : "text-muted-foreground";

  return (
    <section
      ref={ref}
      className="from-background via-background mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br to-rose-500/[0.04] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.16em]">
            COMPOUND EFFECT
          </p>
          <h3 className="mt-1 text-xl font-black">현 수익률이 계속된다면</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            현재 평가금액에 현 수익률을 매년 동일하게 복리 적용했어요.
          </p>
        </div>
        <div className="sm:text-right">
          <strong className={`text-2xl font-black ${rateTone}`}>
            연 {annualizedReturnRate >= 0 ? "+" : ""}
            {annualizedReturnRate.toFixed(1)}%
          </strong>
          <p className="text-muted-foreground mt-1 text-xs">
            {result.investmentPeriodMonths
              ? `${Math.floor(result.investmentPeriodMonths / 12) > 0 ? `${Math.floor(result.investmentPeriodMonths / 12)}년 ` : ""}${result.investmentPeriodMonths % 12 > 0 ? `${result.investmentPeriodMonths % 12}개월` : ""} 기준 연환산`
              : "누적 수익률 기준"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-black/[0.03] p-2 dark:bg-black/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`연평균 수익률 ${annualizedReturnRate.toFixed(1)}퍼센트의 70년 복리 성장 그래프`}
          onPointerLeave={() => setHoveredYear(null)}
        >
          <defs>
            <linearGradient
              id="compound-effect-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const guideY = top + ratio * (height - top - bottom);
            return (
              <line
                key={ratio}
                x1={left}
                x2={width - right}
                y1={guideY}
                y2={guideY}
                className="stroke-border"
                strokeDasharray="4 7"
              />
            );
          })}
          <polygon
            points={area}
            fill="url(#compound-effect-area)"
            style={{
              opacity: isRevealed ? 1 : 0,
              transition: "opacity 700ms ease-out 280ms",
            }}
          />
          <polyline
            points={polyline}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition:
                "stroke-dashoffset 1050ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {points.map((point, index) => (
            <g key={point.year}>
              <circle
                cx={x(point.year)}
                cy={y(point.logValue)}
                r={hoveredYear === point.year ? 6 : 4}
                fill="#f43f5e"
                stroke="white"
                strokeWidth="2"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transition: `opacity 250ms ease-out ${350 + index * 85}ms, r 150ms ease-out`,
                }}
                onPointerEnter={() => setHoveredYear(point.year)}
              />
              <text
                x={x(point.year)}
                y={height - 9}
                textAnchor={
                  point.year === 0
                    ? "start"
                    : point.year === 70
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground text-[11px]"
              >
                {point.year === 0 ? "현재" : `${point.year}년`}
              </text>
            </g>
          ))}
          {hovered && (
            <g
              transform={`translate(${Math.min(width - 180, Math.max(10, x(hovered.year) - 80))}, ${Math.max(8, y(hovered.logValue) - 55)})`}
            >
              <rect
                width="160"
                height="46"
                rx="10"
                className="fill-background stroke-border"
              />
              <text
                x="10"
                y="17"
                className="fill-muted-foreground text-[10px] font-bold"
              >
                {hovered.year === 0 ? "현재" : `${hovered.year}년 뒤`}
              </text>
              <text
                x="10"
                y="35"
                className="fill-foreground text-[12px] font-black"
              >
                {compoundValueLabel(hovered.value)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="text-muted-foreground mt-3 text-[11px] leading-5">
        장기 구간은 값 차이가 매우 커질 수 있어 세로축을 로그 기준으로 표시해요.
        실제 수익률은 매년 달라질 수 있으며, 이 그래프는 미래 수익을 보장하지
        않습니다.
      </p>
    </section>
  );
}
