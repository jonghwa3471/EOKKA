import type { AnalysisResult } from "../../analysis.types";

import { useChartRevealOnce } from "./chart-animation";
import { goalLabel } from "./formatters";

export function GoalProbabilityChart({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const values = [
    [10, result.probability.tenYears],
    [20, result.probability.twentyYears],
    [30, result.probability.thirtyYears],
    [40, result.probability.fortyYears],
    [50, result.probability.fiftyYears],
  ] as const;

  return (
    <div ref={ref} className="rounded-2xl border p-5">
      <h3 className="font-bold">
        기간 내 {goalLabel(result.goalAmount)} 도달 확률
      </h3>
      <dl className="mt-4 space-y-3">
        {values.map(([year, value], index) => (
          <div key={year} className="text-sm">
            <div className="flex items-center justify-between">
              <dt>{year}년 이내</dt>
              <dd className="font-bold">
                {typeof value === "number"
                  ? `${value.toFixed(1)}%`
                  : "재분석 필요"}
              </dd>
            </div>
            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                style={{
                  width:
                    isRevealed && typeof value === "number"
                      ? `${Math.min(100, Math.max(0, value))}%`
                      : "0%",
                  transition: `width 750ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
