import type { AnalysisResult } from "../analysis.types";

import { useState } from "react";

const GOAL = 100_000_000;
const colors = {
  conservative: "#f59e0b",
  base: "#10b981",
  optimistic: "#0ea5e9",
};
const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const compactWon = (value: number) => {
  const rounded = Math.round(value);
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  if (eok > 0)
    return man > 0
      ? `${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만원`
      : `${eok.toLocaleString("ko-KR")}억원`;
  if (man > 0) return `${man.toLocaleString("ko-KR")}만원`;
  return won(rounded);
};
const percent = (value: number | null) =>
  value === null ? "데이터 부족" : `${value.toFixed(1)}%`;

function remainingPeriodLabel(month: number | null) {
  if (month === null) return "30년 내 도달이 어려워요";
  if (month === 0) return "목표를 달성했어요!";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${period} 남았어요`;
}

function goalDurationLabel(month: number | null) {
  if (month === null) return "30년 내 미도달";
  if (month === 0) return "현재 목표 달성";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `약 ${period}`;
}

function ScenarioChart({ result }: { result: AnalysisResult }) {
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
  const endMonth = Math.min(
    360,
    finiteGoalMonths.length > 0 ? Math.max(...finiteGoalMonths) + 12 : 360,
  );
  const visibleChart = result.chart.filter((point) => point.month <= endMonth);
  const max = GOAL * 1.2;
  const x = (month: number) =>
    left + (month / endMonth) * (width - left - right);
  const y = (value: number) =>
    top + (1 - Math.min(value, max) / max) * (height - top - bottom);
  type ScenarioKey = "conservative" | "base" | "optimistic";
  const scenarioPoints = (key: ScenarioKey) => {
    const goalMonth = result.scenarios.find(
      (scenario) => scenario.key === key,
    )?.goalMonth;
    const points = visibleChart
      .filter((point) => goalMonth == null || point.month < goalMonth)
      .map((point) => ({ month: point.month, value: point[key] }));
    if (typeof goalMonth === "number")
      points.push({ month: goalMonth, value: GOAL });
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
          const value = valueAtMonth(scenario.key, hoverMonth);
          return value === null ? [] : [{ scenario, value }];
        });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[700px]"
        role="img"
        aria-label="1억 도달 미래 자산 시나리오 차트"
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
          y1={y(GOAL)}
          y2={y(GOAL)}
          stroke="#ef4444"
          strokeDasharray="7 5"
          opacity=".8"
        />
        <text
          x={width - right}
          y={y(GOAL) - 8}
          textAnchor="end"
          fill="#ef4444"
          className="text-[12px] font-bold"
        >
          1억 목표
        </text>
        {(["conservative", "base", "optimistic"] as const).map((key) => (
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
          />
        ))}
        {result.scenarios.map(
          (scenario) =>
            scenario.goalMonth !== null && (
              <g key={`${scenario.key}-goal`}>
                <circle
                  cx={x(scenario.goalMonth)}
                  cy={y(GOAL)}
                  r="6"
                  fill={colors[scenario.key]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={x(scenario.goalMonth)}
                  y={y(GOAL) - 12}
                  textAnchor="middle"
                  fill={colors[scenario.key]}
                  className="text-[11px] font-bold"
                >
                  달성!
                </text>
              </g>
            ),
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
        {hoverMonth !== null && hoverX !== null && tooltipItems.length > 0 && (
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
            <g
              transform={`translate(${hoverX > width - 210 ? hoverX - 188 : hoverX + 12}, ${top + 8})`}
            >
              <rect
                width="176"
                height={34 + tooltipItems.length * 21}
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
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const remainingToGoal = Math.max(0, GOAL - result.currentValue);

  return (
    <section
      className="bg-card mt-8 rounded-3xl border p-5 shadow-xl sm:p-8"
      aria-labelledby="analysis-title"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-500">분석 완료</p>
          <h2 id="analysis-title" className="mt-1 text-2xl font-black">
            내 주식의 1억 도달 시나리오
          </h2>
        </div>
        <p className="text-muted-foreground text-xs">
          과거 수정주가 기반 확률 시뮬레이션 · 투자 조언이 아닙니다
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "매수 원금", value: won(result.totalCost) },
          { label: "현재 평가금액", value: won(result.currentValue) },
          {
            label: "평가손익",
            value: `${result.profit >= 0 ? "+" : ""}${won(result.profit)}`,
            tone: result.profit >= 0 ? "profit" : "loss",
          },
          {
            label: "현재 수익률",
            value: `${result.returnRate >= 0 ? "+" : ""}${result.returnRate.toFixed(1)}%`,
            tone: result.returnRate >= 0 ? "profit" : "loss",
          },
        ].map(({ label, value, tone }) => (
          <div key={label} className="bg-muted/40 rounded-2xl p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <strong
              className={`mt-1 block text-lg ${
                tone === "profit"
                  ? "text-red-500"
                  : tone === "loss"
                    ? "text-blue-500"
                    : ""
              }`}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center sm:py-8">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          평균 시나리오 기준 1억까지
        </p>
        <strong className="mt-2 block text-3xl font-black tracking-tight sm:text-4xl">
          {remainingToGoal === 0
            ? "목표를 달성했어요!"
            : remainingPeriodLabel(result.scenarios[1].goalMonth)}
        </strong>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          현재 평가금액 기준 {won(remainingToGoal)} 남았어요
        </p>
      </div>

      <div className="mt-7 rounded-2xl border p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold">
          {result.scenarios.map((scenario) => (
            <span key={scenario.key} className="flex items-center gap-1.5">
              <i
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colors[scenario.key] }}
              />
              <span style={{ color: colors[scenario.key] }}>
                {scenario.label}
              </span>
            </span>
          ))}
        </div>
        <ScenarioChart result={result} />
      </div>

      <div className="mt-5 rounded-2xl border p-5">
        <div>
          <h3 className="text-lg font-black">1억 도달 예상 기간</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            시나리오별로 목표 금액에 도달하기까지 걸리는 예상 기간이에요.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {result.scenarios.map((scenario) => (
            <div
              key={scenario.key}
              className="bg-muted/40 rounded-xl px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <strong style={{ color: colors[scenario.key] }}>
                  {scenario.label}
                </strong>
                <span className="text-muted-foreground text-xs">
                  P{scenario.percentile * 100}
                </span>
              </div>
              <p className="mt-2 text-xl font-black">
                {goalDurationLabel(scenario.goalMonth)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border p-5">
        <div>
          <h3 className="text-lg font-black">10년 뒤엔 얼마가 되어 있을까?</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            현재 보유 자산과 월 투자금을 유지했을 때의 시나리오별 예상
            금액이에요.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {result.scenarios.map((scenario) => (
            <div
              key={`${scenario.key}-ten-years`}
              className="bg-muted/40 rounded-xl px-4 py-4"
            >
              <p
                className="text-xs font-bold"
                style={{ color: colors[scenario.key] }}
              >
                {scenario.label}
              </p>
              <strong className="mt-1 block text-xl font-black">
                {compactWon(scenario.valueAt10Years)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-5">
          <h3 className="font-bold">과거 연평균 수익률</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">최근 1년</dt>
              <dd className="font-bold">{percent(result.cagr.oneYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">최근 3년</dt>
              <dd className="font-bold">{percent(result.cagr.threeYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">최근 5년</dt>
              <dd className="font-bold">{percent(result.cagr.fiveYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">가용 전체</dt>
              <dd className="font-bold">{percent(result.cagr.available)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border p-5">
          <h3 className="font-bold">기간 내 1억 도달 확률</h3>
          <dl className="mt-4 space-y-3">
            {[
              [10, result.probability.tenYears],
              [20, result.probability.twentyYears],
              [30, result.probability.thirtyYears],
            ].map(([year, value]) => (
              <div
                key={year}
                className="flex items-center justify-between text-sm"
              >
                <dt>{year}년 이내</dt>
                <dd className="font-bold">{value.toFixed(1)}%</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-emerald-500/10 p-5">
        <h3 className="font-bold text-emerald-600 dark:text-emerald-400">
          분석 요약
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {result.summary.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
      {result.exchangeRate && (
        <p className="text-muted-foreground mt-4 text-xs">
          미국 주식은 조회 시점 환율 1달러 ={" "}
          {result.exchangeRate.toLocaleString("ko-KR")}원으로 환산했습니다.
        </p>
      )}
    </section>
  );
}
