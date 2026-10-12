import type { AnalysisResult } from "../../analysis.types";

import { useChartRevealOnce } from "./chart-animation";

const allocationColors = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#f97316",
  "#ec4899",
];

export function PortfolioAllocation({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  const totalValue = result.holdings.reduce(
    (sum, holding) => sum + Math.max(0, holding.valueKrw),
    0,
  );
  const allocations = result.holdings
    .map((holding, originalIndex) => ({
      ...holding,
      color: allocationColors[originalIndex % allocationColors.length],
      ratio:
        totalValue > 0 ? (Math.max(0, holding.valueKrw) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio);
  let cursor = 0;
  const gradient = allocations
    .map((holding) => {
      const start = cursor;
      cursor += holding.ratio;
      return `${holding.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <section
      ref={ref}
      className="mt-6 rounded-2xl border bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-5"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto shrink-0 sm:mx-0">
          <div
            className="relative size-40 rounded-full shadow-lg shadow-emerald-500/10"
            style={{
              background: gradient
                ? `conic-gradient(${gradient})`
                : "var(--muted)",
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed
                ? "rotate(0deg) scale(1)"
                : "rotate(-70deg) scale(0.72)",
              transition:
                "opacity 450ms ease-out, transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            role="img"
            aria-label={`현재 평가금액 기준 ${allocations
              .map(
                (holding) =>
                  `${holding.name} ${holding.ratio.toFixed(1)}퍼센트`,
              )
              .join(", ")}`}
          >
            <div className="bg-card absolute inset-[22%] flex flex-col items-center justify-center rounded-full border shadow-inner">
              <strong className="text-xl font-black tabular-nums">
                {allocations.length}
              </strong>
              <span className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                보유 종목
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div>
            <h3 className="font-black">포트폴리오 비중</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              현재 평가금액을 기준으로 계산했어요.
            </p>
          </div>
          <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {allocations.map((holding, index) => (
              <li
                key={`${holding.ticker}-${holding.name}`}
                className="flex min-w-0 items-center gap-2.5"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? "translateX(0)" : "translateX(12px)",
                  transition: `opacity 420ms ease-out ${180 + index * 55}ms, transform 420ms ease-out ${180 + index * 55}ms`,
                }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: holding.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{holding.name}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {holding.ticker}
                  </p>
                </div>
                <strong className="shrink-0 text-sm tabular-nums">
                  {holding.ratio.toFixed(1)}%
                </strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
