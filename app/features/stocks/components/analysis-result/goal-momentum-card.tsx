import type { AnalysisResult } from "../../analysis.types";

import { useState } from "react";

import { useChartRevealOnce } from "./chart-animation";
import { goalDurationLabel, goalLabel } from "./formatters";
import { colors } from "./scenario-series";

export function GoalMomentumCard({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  type MomentumSeries = "base" | "contribution" | "market";
  const [dimmedSeries, setDimmedSeries] = useState<MomentumSeries[]>([]);
  const toggleSeries = (series: MomentumSeries) =>
    setDimmedSeries((current) =>
      current.includes(series)
        ? current.filter((item) => item !== series)
        : [...current, series],
    );
  const seriesOpacity = (series: MomentumSeries, visible = true) =>
    !visible || dimmedSeries.includes(series) ? 0.16 : 1;
  const baseGoalMonth = result.scenarios[1].goalMonth;
  const contributionGoalMonth =
    result.contributionScenarios.find((scenario) => scenario.key === "base")
      ?.goalMonth ?? null;
  const hasContributionPath = (result.contributionChart?.length ?? 0) > 0;
  const marketGoalMonth = result.benchmark?.goalMonth ?? null;
  const hasBenchmark =
    result.benchmark !== null && result.benchmark !== undefined;
  const hasComparableGoals =
    hasBenchmark && baseGoalMonth !== null && marketGoalMonth !== null;
  const speedRatio = hasComparableGoals
    ? baseGoalMonth === 0
      ? Number.POSITIVE_INFINITY
      : marketGoalMonth / baseGoalMonth
    : null;
  const speedScore =
    speedRatio === null
      ? null
      : speedRatio === Number.POSITIVE_INFINITY
        ? 100
        : Math.round(Math.min(100, Math.max(0, (speedRatio - 0.5) * 100)));
  const speedLabel = !hasBenchmark
    ? "시장 기준 없음"
    : baseGoalMonth === null && marketGoalMonth === null
      ? "50년 내 도달 어려움"
      : baseGoalMonth !== null && marketGoalMonth === null
        ? "시장보다 빠른 편"
        : baseGoalMonth === null && marketGoalMonth !== null
          ? "시장보다 느린 편"
          : speedScore === null
            ? "비교할 수 없음"
            : speedScore >= 85
              ? "매우 빠른 편"
              : speedScore >= 60
                ? "빠른 편"
                : speedScore >= 40
                  ? "시장과 비슷한 편"
                  : speedScore >= 15
                    ? "느린 편"
                    : "매우 느린 편";
  const isFaster =
    (baseGoalMonth !== null && marketGoalMonth === null) ||
    (speedRatio !== null && speedRatio > 1.01);
  const isSlower =
    (baseGoalMonth === null && marketGoalMonth !== null) ||
    (speedRatio !== null && speedRatio < 0.99);
  const lineColor = isFaster ? "#ef4444" : isSlower ? "#3b82f6" : "#10b981";
  const endCandidates = [
    baseGoalMonth,
    marketGoalMonth,
    hasContributionPath ? contributionGoalMonth : null,
  ].filter((month): month is number => month !== null);
  const endMonth = Math.max(
    12,
    Math.min(
      360,
      endCandidates.length > 0 ? Math.max(...endCandidates) + 12 : 120,
    ),
  );
  const width = 720;
  const height = 210;
  const left = 18;
  const right = 18;
  const top = 18;
  const bottom = 28;
  const x = (month: number) =>
    left + (month / endMonth) * (width - left - right);
  const y = (value: number) =>
    top +
    (1 - Math.min(1, Math.max(0, value / result.goalAmount))) *
      (height - top - bottom);
  const pathPoints = (key: MomentumSeries, goalMonth: number | null) => {
    const points: Array<{ month: number; value: number }> =
      key === "contribution"
        ? (result.contributionChart ?? [])
            .filter(
              (point) =>
                point.month <= endMonth &&
                (goalMonth === null || point.month <= goalMonth),
            )
            .map((point) => ({ month: point.month, value: point.base }))
        : result.chart
            .filter(
              (point) =>
                point.month <= endMonth &&
                (goalMonth === null || point.month <= goalMonth) &&
                (key === "base" || point.market !== null),
            )
            .map((point) => ({
              month: point.month,
              value: key === "base" ? point.base : point.market!,
            }));
    if (
      goalMonth !== null &&
      goalMonth <= endMonth &&
      points.at(-1)?.month !== goalMonth
    )
      points.push({ month: goalMonth, value: result.goalAmount });
    return points;
  };
  const basePoints = pathPoints("base", baseGoalMonth);
  const contributionPoints = hasContributionPath
    ? pathPoints("contribution", contributionGoalMonth)
    : [];
  const marketPoints = result.benchmark
    ? pathPoints("market", marketGoalMonth)
    : [];
  const polyline = (points: Array<{ month: number; value: number }>) =>
    points.map((point) => `${x(point.month)},${y(point.value)}`).join(" ");
  const baseArea =
    basePoints.length > 0
      ? `${x(basePoints[0].month)},${height - bottom} ${polyline(basePoints)} ${x(basePoints.at(-1)!.month)},${height - bottom}`
      : "";
  const comparisonText = !hasBenchmark
    ? "시장 기준 데이터가 없어 상대 속도를 계산하지 못했어요."
    : baseGoalMonth === null && marketGoalMonth === null
      ? "내 평균 시나리오와 시장 기준 모두 50년 안에 목표 도달이 확인되지 않았어요."
      : baseGoalMonth !== null && marketGoalMonth === null
        ? "내 평균 시나리오는 50년 안에 목표에 도달하지만 시장 기준은 도달하지 못했어요."
        : baseGoalMonth === null && marketGoalMonth !== null
          ? "시장 기준은 50년 안에 목표에 도달하지만 내 평균 시나리오는 도달하지 못했어요."
          : speedRatio === null
            ? "목표 도달 속도를 비교할 수 없어요."
            : speedRatio === Number.POSITIVE_INFINITY
              ? "평균 시나리오 기준으로 이미 목표에 도착했어요."
              : isFaster
                ? `시장보다 약 ${speedRatio.toFixed(2)}배 빠르게 목표에 접근하고 있어요.`
                : isSlower
                  ? `현재 목표 접근 속도는 시장의 약 ${speedRatio.toFixed(2)}배예요.`
                  : "시장과 거의 같은 속도로 목표에 접근하고 있어요.";
  const contributionSpeedRatio =
    hasBenchmark && contributionGoalMonth !== null && marketGoalMonth !== null
      ? contributionGoalMonth === 0
        ? Number.POSITIVE_INFINITY
        : marketGoalMonth / contributionGoalMonth
      : null;
  const contributionComparisonText = !hasContributionPath
    ? null
    : !hasBenchmark
      ? "월 투자금 반영 경로는 시장 기준 데이터가 없어 속도를 비교하지 못했어요."
      : contributionGoalMonth === null && marketGoalMonth === null
        ? "월 투자금 반영 경로와 시장 기준 모두 50년 안에 목표 도달이 확인되지 않았어요."
        : contributionGoalMonth !== null && marketGoalMonth === null
          ? "월 투자금 반영 시 50년 안에 도달하지만 시장 기준은 도달하지 못했어요."
          : contributionGoalMonth === null && marketGoalMonth !== null
            ? "월 투자금 반영 시에도 50년 안에 목표 도달이 확인되지 않았어요."
            : contributionSpeedRatio === Number.POSITIVE_INFINITY
              ? "월 투자금 반영 기준으로 이미 목표에 도착했어요."
              : contributionSpeedRatio === null
                ? "월 투자금 반영 시 시장과의 목표 접근 속도를 비교하지 못했어요."
                : contributionSpeedRatio > 1.01
                  ? `월 투자금 반영 시 시장보다 약 ${contributionSpeedRatio.toFixed(2)}배 빠르게 목표에 접근해요.`
                  : contributionSpeedRatio < 0.99
                    ? `월 투자금 반영 시 목표 접근 속도는 시장의 약 ${contributionSpeedRatio.toFixed(2)}배예요.`
                    : "월 투자금 반영 시 시장과 거의 같은 속도로 목표에 접근해요.";

  return (
    <section
      ref={ref}
      className="from-background via-background to-muted/40 mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.16em]">
            GOAL MOMENTUM
          </p>
          <h3 className="mt-1 text-xl font-black">목표 접근 속도</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            평균 시나리오, 월 투자금 반영 경로와 시장 기준을 비교했어요.
          </p>
        </div>
        <div className="sm:text-right">
          <strong className="text-2xl font-black" style={{ color: lineColor }}>
            {speedLabel}
          </strong>
          {speedScore !== null && (
            <p className="text-muted-foreground mt-1 text-xs">
              속도 점수 {speedScore}/100
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-black/[0.03] p-2 dark:bg-black/20">
        <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1 text-xs font-bold">
          {(
            [
              ["base", "내 평균", lineColor, false, true],
              [
                "contribution",
                "월 투자금 반영",
                "#38bdf8",
                false,
                hasContributionPath,
              ],
              ["market", "시장 기준", colors.market, true, hasBenchmark],
            ] as const
          ).map(([key, label, color, dashed, visible]) =>
            visible ? (
              <button
                key={key}
                type="button"
                aria-pressed={!dimmedSeries.includes(key)}
                onClick={() => toggleSeries(key)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all ${
                  dimmedSeries.includes(key)
                    ? "opacity-40 hover:opacity-65"
                    : "shadow-sm ring-1"
                }`}
                style={
                  dimmedSeries.includes(key)
                    ? {
                        color,
                        backgroundColor: `${color}08`,
                        borderColor: `${color}25`,
                      }
                    : {
                        color,
                        backgroundColor: `${color}18`,
                        borderColor: `${color}55`,
                        boxShadow: `inset 0 0 0 1px ${color}22`,
                      }
                }
              >
                <i
                  className={`h-0 w-4 border-t-2 ${dashed ? "border-dashed" : ""}`}
                  style={{ borderColor: color }}
                />
                {label}
              </button>
            ) : null,
          )}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`목표 접근 속도 ${speedLabel}`}
        >
          <defs>
            <linearGradient id="goal-momentum-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={left}
              x2={width - right}
              y1={y(result.goalAmount * ratio)}
              y2={y(result.goalAmount * ratio)}
              className="stroke-border"
              strokeDasharray="4 7"
            />
          ))}
          {baseArea && (
            <polygon
              points={baseArea}
              fill="url(#goal-momentum-area)"
              style={{
                opacity: isRevealed ? seriesOpacity("base") : 0,
                transition: "opacity 700ms ease-out 350ms",
              }}
            />
          )}
          {marketPoints.length > 0 && (
            <polyline
              points={polyline(marketPoints)}
              fill="none"
              stroke={colors.market}
              strokeWidth="3"
              strokeDasharray="9 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              style={{
                strokeDasharray: "0.025 0.02",
                strokeDashoffset: isRevealed ? 0 : 1,
                opacity: isRevealed ? seriesOpacity("market") * 0.8 : 0,
                transition:
                  "stroke-dashoffset 1100ms ease-out 180ms, opacity 200ms ease",
              }}
            />
          )}
          {contributionPoints.length > 0 && (
            <polyline
              points={polyline(contributionPoints)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: isRevealed ? 0 : 1,
                opacity: isRevealed ? seriesOpacity("contribution") : 0,
                transition:
                  "stroke-dashoffset 1050ms cubic-bezier(0.4, 0, 0.2, 1) 100ms, opacity 200ms ease",
              }}
            />
          )}
          <polyline
            points={polyline(basePoints)}
            fill="none"
            stroke={lineColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              opacity: isRevealed ? seriesOpacity("base") : 0,
              transition:
                "stroke-dashoffset 1050ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease",
            }}
          />
          {basePoints.length > 0 && (
            <circle
              cx={x(basePoints.at(-1)!.month)}
              cy={y(basePoints.at(-1)!.value)}
              r="6"
              fill={lineColor}
              stroke="white"
              strokeWidth="2"
              style={{
                opacity: isRevealed ? seriesOpacity("base") : 0,
                transform: isRevealed ? "scale(1)" : "scale(0)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition:
                  "opacity 250ms ease-out 850ms, transform 350ms ease-out 850ms",
              }}
            />
          )}
          <text
            x={left}
            y={height - 8}
            className="fill-muted-foreground text-[12px]"
          >
            현재
          </text>
          <text
            x={width - right}
            y={height - 8}
            textAnchor="end"
            className="fill-muted-foreground text-[12px]"
          >
            목표 {goalLabel(result.goalAmount)}
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-bold">{comparisonText}</p>
          {contributionComparisonText && (
            <p className="text-xs font-bold text-sky-500">
              {contributionComparisonText}
            </p>
          )}
        </div>
        {hasContributionPath && contributionGoalMonth !== null && (
          <p className="text-muted-foreground text-xs font-bold sm:text-right">
            월 투자금 반영 시 {goalDurationLabel(contributionGoalMonth)}
          </p>
        )}
      </div>
      <p className="text-muted-foreground mt-3 text-[11px]">
        실제 과거 자산 차트가 아니라 목표 도달 예상 경로를 요약한 그래프예요.
      </p>
    </section>
  );
}
