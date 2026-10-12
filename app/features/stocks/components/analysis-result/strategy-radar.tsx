import type { AnalysisResult } from "../../analysis.types";

import { RollingNumber, useChartRevealOnce } from "./chart-animation";

type StrategyScores = NonNullable<AnalysisResult["aiStrategy"]>["scores"];

export function AiStrategyRadar({ scores }: { scores: StrategyScores }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const size = 340;
  const center = size / 2;
  const radius = 105;
  const point = (index: number, score: number, extraRadius = 0) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / scores.length;
    const distance = radius * (score / 100) + extraRadius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const polygonPoints = scores
    .map((item, index) => {
      const { x, y } = point(index, item.score);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div ref={ref} className="h-full px-5 py-5 sm:px-6">
      <div>
        <h4 className="text-sm font-black">투자 균형 한눈에 보기</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          현재 계산 결과를 EOKKA 내부 기준으로 100점 환산했어요.
        </p>
      </div>
      <div className="mt-4 grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto w-full max-w-[360px] overflow-visible"
          role="img"
          aria-label={scores
            .map((item) => `${item.label} ${item.score}점`)
            .join(", ")}
        >
          <defs>
            <linearGradient id="ai-radar-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80, 100].map((level) => (
            <polygon
              key={level}
              points={scores
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
          {scores.map((_, index) => {
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
            points={polygonPoints}
            fill="url(#ai-radar-fill)"
            stroke="#8b5cf6"
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
          {scores.map((item, index) => {
            const dataPoint = point(index, item.score);
            const labelPoint = point(index, 100, 28);
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
                  fill="#8b5cf6"
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
          {scores.map((item) => (
            <li
              key={item.key}
              className="bg-background/70 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold">{item.label}</span>
                <span className="text-muted-foreground mt-0.5 block text-[10px] leading-4">
                  {item.description}
                </span>
              </span>
              <strong
                className={`text-sm tabular-nums ${
                  item.score >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : item.score < 40
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-violet-600 dark:text-violet-400"
                }`}
              >
                <RollingNumber
                  value={item.score}
                  isActive={isRevealed}
                  delay={160 + scores.indexOf(item) * 70}
                  format={(value) => `${Math.round(value)}점`}
                />
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
