import type { AnalysisResult } from "../../analysis.types";

import { RollingNumber, useChartRevealOnce } from "./chart-animation";

export function InvestmentStyleRadar({
  style,
}: {
  style: AnalysisResult["investmentStyle"];
}) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const size = 320;
  const center = size / 2;
  const radius = 92;
  const point = (index: number, score: number, extraRadius = 0) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / style.scores.length;
    const distance = radius * (score / 100) + extraRadius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const dataPoints = style.scores
    .map((item, index) => {
      const { x, y } = point(index, item.score);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div ref={ref} className="h-full px-5 py-5 sm:px-6">
      <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.06] p-4 text-center">
        <p className="text-xs font-black tracking-[0.14em] text-fuchsia-600 uppercase dark:text-fuchsia-400">
          My Investment Type
        </p>
        <h4 className="mt-2 text-xl font-black">{style.title}</h4>
        <div className="bg-background/60 mx-auto mt-3 max-w-xl rounded-xl border border-fuchsia-500/20 px-4 py-3 text-left">
          <p className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400">
            투자 성향 분석
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {style.description} {style.reason}
          </p>
        </div>
      </div>

      <div className="mt-4 grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto w-full max-w-[340px] overflow-visible"
          role="img"
          aria-label={style.scores
            .map((item) => `${item.label} ${item.score}점`)
            .join(", ")}
        >
          <defs>
            <linearGradient
              id="investment-style-fill"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          {[25, 50, 75, 100].map((level) => (
            <polygon
              key={level}
              points={style.scores
                .map((_, index) => {
                  const { x, y } = point(index, level);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={level === 100 ? 1.2 : 0.7}
              className="text-border"
            />
          ))}
          {style.scores.map((_, index) => {
            const outer = point(index, 100);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth="0.7"
                className="text-border"
              />
            );
          })}
          <polygon
            points={dataPoints}
            fill="url(#investment-style-fill)"
            stroke="#ec4899"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? "scale(1)" : "scale(0.08)",
              transformOrigin: "50% 50%",
              transition:
                "opacity 350ms ease-out, transform 850ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {style.scores.map((item, index) => {
            const dataPoint = point(index, item.score);
            const labelPoint = point(index, 100, 27);
            const anchor =
              labelPoint.x < center - 10
                ? "end"
                : labelPoint.x > center + 10
                  ? "start"
                  : "middle";
            return (
              <g key={item.key}>
                <circle
                  cx={dataPoint.x}
                  cy={dataPoint.y}
                  r="4"
                  fill="#ec4899"
                  stroke="white"
                  strokeWidth="1.5"
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? "scale(1)" : "scale(0)",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transition: `opacity 250ms ease-out ${420 + index * 70}ms, transform 350ms ease-out ${420 + index * 70}ms`,
                  }}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[11px] font-bold"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {style.scores.map((item) => (
            <li
              key={item.key}
              className="bg-background/70 flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-xs font-bold">{item.label}</span>
              <strong className="text-sm text-fuchsia-600 tabular-nums dark:text-fuchsia-400">
                <RollingNumber
                  value={item.score}
                  isActive={isRevealed}
                  delay={160 + style.scores.indexOf(item) * 70}
                  format={(value) => `${Math.round(value)}`}
                />
              </strong>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-[10px] leading-4">
        투자 유형 점수는 높고 낮음의 우열이 아니라 현재 성향의 강도를 뜻해요.
      </p>
    </div>
  );
}
