import type { Route } from "./+types/dashboard";

import { inArray } from "drizzle-orm";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  AwardIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  Clock3Icon,
  CrownIcon,
  FlameIcon,
  HeartCrackIcon,
  PartyPopperIcon,
  PiggyBankIcon,
  RefreshCwIcon,
  ScaleIcon,
  ShieldAlertIcon,
  SparklesIcon,
  TargetIcon,
  TimerResetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useLocation } from "react-router";

import { Button } from "~/core/components/ui/button";
import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import {
  FREE_HISTORY_LIMIT,
  getAnalysisHistory,
  getPreferredGoalAmount,
  setPreferredGoalAmount,
} from "~/features/stocks/history/analysis-history.server";
import { stocks } from "~/features/stocks/schema";

export const meta: Route.MetaFunction = () => [
  { title: `내 투자 대시보드 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();

  const [allHistory, savedPreferredGoal] = user
    ? await Promise.all([
        getAnalysisHistory(user.id),
        getPreferredGoalAmount(user.id),
      ])
    : [[], null];
  const goalOptions = [
    ...new Set(allHistory.map((item) => item.goalAmount)),
  ].sort((a, b) => a - b);
  const oneEokGoal = 100_000_000;
  const preferredGoal =
    (savedPreferredGoal && goalOptions.includes(savedPreferredGoal)
      ? savedPreferredGoal
      : goalOptions.includes(oneEokGoal)
        ? oneEokGoal
        : goalOptions[0]) ?? null;
  const goalHistory = preferredGoal
    ? allHistory.filter((item) => item.goalAmount === preferredGoal)
    : [];
  const history = Array.from(
    new Map(goalHistory.map((item) => [item.savedOn, item])).values(),
  );
  const latestResult = history.at(-1)?.result;
  const tickers = latestResult?.holdings.map((holding) => holding.ticker) ?? [];
  const stockRows =
    tickers.length > 0
      ? await db.select().from(stocks).where(inArray(stocks.ticker, tickers))
      : [];
  const exchangeRate = latestResult?.exchangeRate ?? 1;
  const updateDraft = latestResult
    ? latestResult.holdings.flatMap((holding, index) => {
        const stock = stockRows.find(
          (item) =>
            item.ticker === holding.ticker &&
            item.currency === holding.currency,
        );
        if (!stock || holding.currentPrice <= 0) return [];
        const valueRate = holding.currency === "USD" ? exchangeRate : 1;
        const quantity = holding.valueKrw / (holding.currentPrice * valueRate);
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        const averagePrice = holding.costKrw / (quantity * valueRate);
        if (!Number.isFinite(averagePrice) || averagePrice <= 0) return [];
        return [
          {
            id: index + 1,
            symbol: stock.name,
            averagePrice: String(Math.round(averagePrice)),
            currency: stock.currency as "KRW" | "USD",
            quantity: String(Number(quantity.toFixed(6))),
            selectedStock: {
              stockId: stock.stock_id,
              name: stock.name,
              nameEn: stock.name_en,
              ticker: stock.ticker,
              country: stock.country as "KR" | "US",
              exchange: stock.exchange as
                | "KOSPI"
                | "KOSDAQ"
                | "NASDAQ"
                | "NYSE"
                | "AMEX",
              currency: stock.currency as "KRW" | "USD",
              securityType: stock.security_type as "STOCK" | "ETF" | "ETN",
            },
          },
        ];
      })
    : [];

  return {
    history,
    goalOptions,
    preferredGoal,
    updateDraft,
    name:
      user?.user_metadata.name ??
      user?.user_metadata.full_name ??
      user?.email?.split("@")[0] ??
      "사용자",
    historyLimit: FREE_HISTORY_LIMIT,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const goalAmount = Number(formData.get("goalAmount"));
  const history = await getAnalysisHistory(user.id);
  const validGoals = new Set(history.map((item) => item.goalAmount));
  if (!Number.isSafeInteger(goalAmount) || !validGoals.has(goalAmount)) {
    throw new Response("Invalid goal amount", { status: 400 });
  }

  await setPreferredGoalAmount(user.id, goalAmount);
  return redirect("/dashboard");
}

type History = Awaited<ReturnType<typeof getAnalysisHistory>>;

const won = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatWon(value: number) {
  return `${won.format(value)}원`;
}

function formatGoalAmount(value: number) {
  if (value >= 100_000_000 && value % 100_000_000 === 0) {
    return `${(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }
  return formatWon(value);
}

function formatRate(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatMonths(months: number | null) {
  if (months === null) return "50년 이상";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}년 ${rest}개월` : `${years}년`;
}

function difference(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

function calculateHistoryInsights(history: History) {
  const first = history[0];
  const latest = history.at(-1)!;
  const changes = history.slice(1).map((item, index) => ({
    savedOn: item.savedOn,
    asset: item.currentValue - history[index].currentValue,
    returnRate: item.returnRate - history[index].returnRate,
  }));
  const increasingChanges = changes.filter((change) => change.asset > 0);
  const decreasingChanges = changes.filter((change) => change.asset < 0);
  const bestChange = increasingChanges.length
    ? [...increasingChanges].sort((a, b) => b.asset - a.asset)[0]
    : null;
  const worstChange = decreasingChanges.length
    ? [...decreasingChanges].sort((a, b) => a.asset - b.asset)[0]
    : null;
  const peakRecord = [...history].sort(
    (a, b) => b.currentValue - a.currentValue,
  )[0];
  const lowestRecord = [...history].sort(
    (a, b) => a.currentValue - b.currentValue,
  )[0];
  const bestReturnRecord = [...history].sort(
    (a, b) => b.returnRate - a.returnRate,
  )[0];
  const worstReturnRecord = [...history].sort(
    (a, b) => a.returnRate - b.returnRate,
  )[0];
  const upCount = changes.filter((change) => change.asset > 0).length;
  const downCount = changes.filter((change) => change.asset < 0).length;
  const flatCount = changes.length - upCount - downCount;
  let longestUpStreak = 0;
  let currentUpStreak = 0;
  let runningPeak = first.currentValue;
  let maximumDrawdown = 0;
  for (const item of history) {
    runningPeak = Math.max(runningPeak, item.currentValue);
    if (runningPeak > 0) {
      maximumDrawdown = Math.max(
        maximumDrawdown,
        ((runningPeak - item.currentValue) / runningPeak) * 100,
      );
    }
  }
  for (const change of changes) {
    currentUpStreak = change.asset > 0 ? currentUpStreak + 1 : 0;
    longestUpStreak = Math.max(longestUpStreak, currentUpStreak);
  }
  const averageMovement = changes.length
    ? changes.reduce((sum, change) => sum + Math.abs(change.asset), 0) /
      changes.length
    : 0;
  const firstGoalMonth = first.goalMonth;
  const latestGoalMonth = latest.goalMonth;
  const goalMonthImprovement =
    firstGoalMonth !== null && latestGoalMonth !== null
      ? firstGoalMonth - latestGoalMonth
      : null;
  const currentTopHolding = [...latest.result.holdings].sort(
    (a, b) => b.valueKrw - a.valueKrw,
  )[0];
  const currentTopWeight =
    currentTopHolding && latest.currentValue > 0
      ? (currentTopHolding.valueKrw / latest.currentValue) * 100
      : null;
  const initialMatchingHolding = first.result.holdings.find(
    (holding) => holding.ticker === currentTopHolding?.ticker,
  );
  const initialTopWeight =
    initialMatchingHolding && first.currentValue > 0
      ? (initialMatchingHolding.valueKrw / first.currentValue) * 100
      : null;
  const concentrationChange =
    currentTopWeight !== null && initialTopWeight !== null
      ? currentTopWeight - initialTopWeight
      : null;
  const elapsedDays = Math.max(
    0,
    Math.round(
      (new Date(`${latest.savedOn}T12:00:00+09:00`).getTime() -
        new Date(`${first.savedOn}T12:00:00+09:00`).getTime()) /
        86_400_000,
    ),
  );
  const latestTimestamp = new Date(
    `${latest.savedOn}T12:00:00+09:00`,
  ).getTime();
  const weekStartTimestamp = latestTimestamp - 6 * 86_400_000;
  const weeklyHistory = history.filter(
    (item) =>
      new Date(`${item.savedOn}T12:00:00+09:00`).getTime() >=
      weekStartTimestamp,
  );
  const weeklyFirst = weeklyHistory[0];
  const weeklyChanges = weeklyHistory.slice(1).map((item, index) => ({
    savedOn: item.savedOn,
    asset: item.currentValue - weeklyHistory[index].currentValue,
  }));
  const weeklyFirstHoldings = new Map(
    weeklyFirst?.result.holdings.map((holding) => [
      holding.ticker,
      holding.valueKrw,
    ]) ?? [],
  );
  const weeklyHoldingChanges = latest.result.holdings
    .filter((holding) => weeklyFirstHoldings.has(holding.ticker))
    .map((holding) => ({
      name: holding.name,
      change:
        holding.valueKrw -
        (weeklyFirstHoldings.get(holding.ticker) ?? holding.valueKrw),
    }));
  const weeklyWinner =
    [...weeklyHoldingChanges]
      .filter((holding) => holding.change > 0)
      .sort((a, b) => b.change - a.change)[0] ?? null;
  const weeklyLoser =
    [...weeklyHoldingChanges]
      .filter((holding) => holding.change < 0)
      .sort((a, b) => a.change - b.change)[0] ?? null;
  const weeklyDramaticChange =
    [...weeklyChanges].sort(
      (a, b) => Math.abs(b.asset) - Math.abs(a.asset),
    )[0] ?? null;
  const weeklyLow = weeklyHistory.length
    ? [...weeklyHistory].sort((a, b) => a.currentValue - b.currentValue)[0]
    : latest;
  const weeklyRecovery = Math.max(
    0,
    latest.currentValue - weeklyLow.currentValue,
  );
  const weeklyUpCount = weeklyChanges.filter(
    (change) => change.asset > 0,
  ).length;
  const weeklyGoalMonthChange =
    weeklyFirst?.goalMonth !== null &&
    weeklyFirst?.goalMonth !== undefined &&
    latest.goalMonth !== null
      ? weeklyFirst.goalMonth - latest.goalMonth
      : null;

  return {
    first,
    latest,
    changes,
    bestChange,
    worstChange,
    peakRecord,
    lowestRecord,
    bestReturnRecord,
    worstReturnRecord,
    upCount,
    downCount,
    flatCount,
    longestUpStreak,
    maximumDrawdown,
    averageMovement,
    goalMonthImprovement,
    currentTopHolding,
    currentTopWeight,
    concentrationChange,
    elapsedDays,
    totalAssetChange: latest.currentValue - first.currentValue,
    totalReturnRateChange: latest.returnRate - first.returnRate,
    holdingCountChange:
      latest.result.holdings.length - first.result.holdings.length,
    weekly: {
      history: weeklyHistory,
      changes: weeklyChanges,
      winner: weeklyWinner,
      loser: weeklyLoser,
      dramaticChange: weeklyDramaticChange,
      recovery: weeklyRecovery,
      upCount: weeklyUpCount,
      goalMonthChange: weeklyGoalMonthChange,
    },
  };
}

function Change({
  value,
  suffix,
  inverse = false,
}: {
  value: number | null;
  suffix: string;
  inverse?: boolean;
}) {
  if (value === null || value === 0)
    return <span className="text-muted-foreground text-xs">변화 없음</span>;
  const improved = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const direction = inverse
    ? value < 0
      ? "단축"
      : "증가"
    : value > 0
      ? "상승"
      : "하락";
  const formattedValue =
    suffix === "원"
      ? formatWon(Math.abs(value))
      : `${Math.abs(value).toFixed(suffix === "%p" ? 1 : 0)}${suffix}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold",
        improved ? "text-rose-500" : "text-blue-500",
      )}
    >
      <Icon className="size-3.5" />
      전일보다 {formattedValue} {direction}
    </span>
  );
}

function DailyRecordChange({
  value,
  suffix,
  inverse = false,
  isFirst = false,
}: {
  value: number | null;
  suffix: string;
  inverse?: boolean;
  isFirst?: boolean;
}) {
  if (isFirst)
    return <span className="text-muted-foreground text-[11px]">첫 기록</span>;
  if (value === null)
    return <span className="text-muted-foreground text-[11px]">비교 불가</span>;
  if (value === 0)
    return <span className="text-muted-foreground text-[11px]">변화 없음</span>;

  const improved = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const direction = inverse
    ? value < 0
      ? "단축"
      : "증가"
    : value > 0
      ? "상승"
      : "하락";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 text-[11px] font-bold",
        improved ? "text-rose-500" : "text-blue-500",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(suffix === "%p" ? 1 : 0)}
      {suffix} {direction}
    </span>
  );
}

function useRevealOncePerVisit<T extends Element>() {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const { key: pageVisitKey } = useLocation();
  const previousPageVisitKey = useRef(pageVisitKey);

  useEffect(() => {
    if (previousPageVisitKey.current === pageVisitKey) return;
    previousPageVisitKey.current = pageVisitKey;
    setIsRevealed(false);
  }, [pageVisitKey]);

  useEffect(() => {
    const element = ref.current;
    if (!element || isRevealed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isRevealed, pageVisitKey]);

  return { ref, isRevealed };
}

function TrendChart({ history }: { history: History }) {
  const { ref: chartRef, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();

  const width = 900;
  const height = 280;
  const padding = { top: 28, right: 24, bottom: 45, left: 24 };
  const values = history.map((item) => item.currentValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const x = (index: number) =>
    padding.left +
    (history.length === 1
      ? (width - padding.left - padding.right) / 2
      : (index / (history.length - 1)) *
        (width - padding.left - padding.right));
  const y = (value: number) =>
    padding.top +
    (1 - (value - min) / span) * (height - padding.top - padding.bottom);
  const points = history.map(
    (item, index) => `${x(index)},${y(item.currentValue)}`,
  );
  const area = `${padding.left},${height - padding.bottom} ${points.join(" ")} ${x(history.length - 1)},${height - padding.bottom}`;

  return (
    <div ref={chartRef} className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[280px] w-full min-w-[680px]"
        role="img"
        aria-label="최근 30개 포트폴리오 평가금액 추이"
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
            opacity: isRevealed ? 1 : 0,
            transition: "opacity 700ms ease-out 300ms",
          }}
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#10b981"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: isRevealed ? 0 : 1,
            transition: "stroke-dashoffset 1000ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        {history.map((item, index) => (
          <g key={item.id}>
            <circle
              cx={x(index)}
              cy={y(item.currentValue)}
              r="7"
              fill="#10b981"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? "scale(1)" : "scale(0)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition: `opacity 220ms ease-out ${650 + index * 90}ms, transform 300ms ease-out ${650 + index * 90}ms`,
              }}
            />
            <circle
              cx={x(index)}
              cy={y(item.currentValue)}
              r="3"
              fill="white"
              style={{
                opacity: isRevealed ? 1 : 0,
                transition: `opacity 200ms ease-out ${720 + index * 90}ms`,
              }}
            />
            <text
              x={x(index)}
              y={height - 14}
              textAnchor="middle"
              fill="currentColor"
              className="text-muted-foreground text-[13px]"
            >
              {Number(item.savedOn.slice(5, 7))}/
              {Number(item.savedOn.slice(8, 10))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function GoalJourney({ progress }: { progress: number }) {
  const { ref, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();

  return (
    <div ref={ref} className="bg-muted/60 mt-6 rounded-2xl p-4">
      <div className="flex justify-between text-xs font-bold">
        <span>목표까지의 여정</span>
        <span>{progress.toFixed(1)}%</span>
      </div>
      <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          style={{
            width: isRevealed ? `${progress}%` : "0%",
            transition: "width 950ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

function recordDate(value: string) {
  return value.slice(5).replace("-", ".");
}

function HistoricalInsights({ history }: { history: History }) {
  const insight = calculateHistoryInsights(history);
  const transitions = insight.changes.length;
  const risingRatio = transitions
    ? (insight.upCount / transitions) * 100
    : null;
  const assetImproved = insight.totalAssetChange >= 0;

  return (
    <section className="bg-card mt-5 rounded-3xl border p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <ActivityIcon className="size-4" /> ALL RECORDS INSIGHT
          </div>
          <h2 className="mt-2 text-2xl font-black">
            전체 기록에서 발견한 투자 흐름
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {insight.first.savedOn}부터 {insight.latest.savedOn}까지 저장된{" "}
            <strong className="text-foreground">{history.length}개 기록</strong>
            을 모두 비교했어요.
          </p>
        </div>
        <div className="bg-muted/50 rounded-2xl px-4 py-3 text-sm">
          <span className="text-muted-foreground">관찰 기간 </span>
          <strong>{insight.elapsedDays}일</strong>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 rounded-2xl border p-5",
          assetImproved
            ? "border-rose-500/20 bg-rose-500/5"
            : "border-blue-500/20 bg-blue-500/5",
        )}
      >
        <p className="text-lg leading-8 font-black md:text-xl">
          첫 기록보다 평가금액이{" "}
          <span className={assetImproved ? "text-rose-500" : "text-blue-500"}>
            {formatWon(Math.abs(insight.totalAssetChange))}{" "}
            {assetImproved ? "늘었고" : "줄었고"}
          </span>
          , 수익률은{" "}
          <span
            className={
              insight.totalReturnRateChange >= 0
                ? "text-rose-500"
                : "text-blue-500"
            }
          >
            {Math.abs(insight.totalReturnRateChange).toFixed(1)}%p{" "}
            {insight.totalReturnRateChange >= 0 ? "높아졌어요" : "낮아졌어요"}
          </span>
          .
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightStat
          icon={AwardIcon}
          label="기록 중 최고 평가금액"
          value={formatWon(insight.peakRecord.currentValue)}
          detail={`${recordDate(insight.peakRecord.savedOn)} 기록`}
          tone="emerald"
        />
        <InsightStat
          icon={ArrowUpRightIcon}
          label="가장 크게 늘어난 기록"
          value={
            insight.bestChange
              ? `+${formatWon(insight.bestChange.asset)}`
              : "비교 준비 중"
          }
          detail={
            insight.bestChange
              ? `${recordDate(insight.bestChange.savedOn)} · 직전 기록 대비`
              : "기록이 하나 더 필요해요"
          }
          tone="rose"
        />
        <InsightStat
          icon={ArrowDownRightIcon}
          label="가장 크게 줄어든 기록"
          value={
            insight.worstChange
              ? `-${formatWon(Math.abs(insight.worstChange.asset))}`
              : "비교 준비 중"
          }
          detail={
            insight.worstChange
              ? `${recordDate(insight.worstChange.savedOn)} · 직전 기록 대비`
              : "기록이 하나 더 필요해요"
          }
          tone="blue"
        />
        <InsightStat
          icon={ScaleIcon}
          label="기록당 평균 변동 금액"
          value={
            transitions ? formatWon(insight.averageMovement) : "비교 준비 중"
          }
          detail="상승·하락 금액의 절댓값 평균"
          tone="violet"
        />
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-amber-500">
            <PartyPopperIcon className="size-4" /> WEEKLY AWARDS
          </div>
          <h3 className="mt-2 text-xl font-black">이번 주 포트폴리오 시상식</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            최신 기록일을 포함한 최근 7일의 변화를 재미있게 정리했어요.
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          이번 주 기록 {insight.weekly.history.length}개
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <WeeklyAwardCard
          icon={AwardIcon}
          eyebrow="이번 주 수익 기여 1위"
          title={insight.weekly.winner?.name ?? "아직 주인공을 찾는 중이에요"}
          value={
            insight.weekly.winner
              ? `+${formatWon(insight.weekly.winner.change)}`
              : "상승한 비교 종목 없음"
          }
          description="동일하게 보유한 종목 중 평가금액이 가장 많이 늘었어요."
          tone="rose"
        />
        <WeeklyAwardCard
          icon={HeartCrackIcon}
          eyebrow="이번 주 손실 기여 1위"
          title={insight.weekly.loser?.name ?? "이번 주는 방어에 성공했어요"}
          value={
            insight.weekly.loser
              ? `-${formatWon(Math.abs(insight.weekly.loser.change))}`
              : "하락한 비교 종목 없음"
          }
          description="동일하게 보유한 종목 중 평가금액이 가장 많이 줄었어요."
          tone="blue"
        />
        <WeeklyAwardCard
          icon={FlameIcon}
          eyebrow="이번 주 가장 요동친 날"
          title={
            insight.weekly.dramaticChange
              ? `${recordDate(insight.weekly.dramaticChange.savedOn)}의 포트폴리오`
              : "비교 기록이 더 필요해요"
          }
          value={
            insight.weekly.dramaticChange
              ? `${insight.weekly.dramaticChange.asset >= 0 ? "+" : "-"}${formatWon(Math.abs(insight.weekly.dramaticChange.asset))}`
              : "—"
          }
          description="직전 기록과 비교해 평가금액이 가장 크게 움직인 날이에요."
          tone="amber"
        />
        <WeeklyAwardCard
          icon={TrendingUpIcon}
          eyebrow="이번 주 초록불 확률"
          title={
            insight.weekly.changes.length
              ? `${insight.weekly.changes.length}번 중 ${insight.weekly.upCount}번 상승`
              : "비교 기록이 더 필요해요"
          }
          value={
            insight.weekly.changes.length
              ? `${((insight.weekly.upCount / insight.weekly.changes.length) * 100).toFixed(0)}%`
              : "—"
          }
          description="최근 7일의 연속된 저장 기록 사이에서 상승한 비율이에요."
          tone="emerald"
        />
        <WeeklyAwardCard
          icon={TimerResetIcon}
          eyebrow="이번 주 저점 회복"
          title={
            insight.weekly.recovery > 0
              ? "저점에서 이만큼 되찾았어요"
              : "최신 기록이 이번 주 저점이에요"
          }
          value={formatWon(insight.weekly.recovery)}
          description="이번 주 가장 낮았던 평가금액과 최신 기록을 비교했어요."
          tone="violet"
        />
        <WeeklyAwardCard
          icon={TargetIcon}
          eyebrow="이번 주 목표 시간 여행"
          title={
            insight.weekly.goalMonthChange === null
              ? "목표 기간을 비교하기 어려워요"
              : insight.weekly.goalMonthChange === 0
                ? "목표 도착 예정일이 그대로예요"
                : insight.weekly.goalMonthChange > 0
                  ? "목표가 더 가까워졌어요"
                  : "목표가 조금 멀어졌어요"
          }
          value={
            insight.weekly.goalMonthChange === null
              ? "—"
              : insight.weekly.goalMonthChange === 0
                ? "변화 없음"
                : `${Math.abs(insight.weekly.goalMonthChange)}개월 ${insight.weekly.goalMonthChange > 0 ? "단축" : "증가"}`
          }
          description="이번 주 첫 기록과 최신 기록의 평균 시나리오를 비교했어요."
          tone="emerald"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="bg-muted/30 rounded-2xl border p-5 md:p-6">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="size-5 text-emerald-500" />
            <h3 className="font-black">상승 흐름의 빈도</h3>
          </div>
          <p className="mt-5 text-3xl font-black">
            {risingRatio === null ? "—" : `${risingRatio.toFixed(0)}%`}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            비교 가능한 {transitions}번 중 상승 {insight.upCount}번, 하락{" "}
            {insight.downCount}번, 보합 {insight.flatCount}번이었어요.
          </p>
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">최장 연속 상승</span>
            <strong>{insight.longestUpStreak}회</strong>
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl border p-5 md:p-6">
          <div className="flex items-center gap-2">
            <TargetIcon className="size-5 text-emerald-500" />
            <h3 className="font-black">목표 접근 속도의 변화</h3>
          </div>
          <p
            className={cn(
              "mt-5 text-3xl font-black",
              insight.goalMonthImprovement === null
                ? "text-muted-foreground"
                : insight.goalMonthImprovement >= 0
                  ? "text-rose-500"
                  : "text-blue-500",
            )}
          >
            {insight.goalMonthImprovement === null
              ? "비교 불가"
              : insight.goalMonthImprovement === 0
                ? "변화 없음"
                : `${Math.abs(insight.goalMonthImprovement)}개월 ${insight.goalMonthImprovement > 0 ? "단축" : "증가"}`}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            첫 기록과 최신 기록의 평균 시나리오 도달 기간을 비교했어요.
          </p>
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">현재 예상 기간</span>
            <strong>{formatMonths(insight.latest.goalMonth)}</strong>
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl border p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="size-5 text-amber-500" />
            <h3 className="font-black">기록에서 관찰된 하락 폭</h3>
          </div>
          <p className="mt-5 text-3xl font-black text-blue-500">
            {insight.maximumDrawdown.toFixed(1)}%
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            기록 중 고점 이후 가장 크게 낮아졌던 평가금액의 비율이에요.
          </p>
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">최저 평가금액</span>
            <strong>{formatWon(insight.lowestRecord.currentValue)}</strong>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="bg-muted/30 rounded-2xl border p-5 md:p-6">
          <h3 className="font-black">수익률이 움직인 범위</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-rose-500/5 p-4">
              <p className="text-muted-foreground text-xs">가장 높았을 때</p>
              <p className="mt-2 text-xl font-black text-rose-500">
                {formatRate(insight.bestReturnRecord.returnRate)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {recordDate(insight.bestReturnRecord.savedOn)}
              </p>
            </div>
            <div className="rounded-xl border bg-blue-500/5 p-4">
              <p className="text-muted-foreground text-xs">가장 낮았을 때</p>
              <p className="mt-2 text-xl font-black text-blue-500">
                {formatRate(insight.worstReturnRecord.returnRate)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {recordDate(insight.worstReturnRecord.savedOn)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl border p-5 md:p-6">
          <h3 className="font-black">포트폴리오 구조의 변화</h3>
          <div className="mt-5 space-y-4 text-sm leading-6">
            {insight.currentTopHolding && insight.currentTopWeight !== null && (
              <p>
                현재 가장 비중이 큰 종목은{" "}
                <strong>{insight.currentTopHolding.name}</strong>이며 전체의{" "}
                <strong>{insight.currentTopWeight.toFixed(1)}%</strong>예요.
              </p>
            )}
            {insight.concentrationChange !== null && (
              <p className="text-muted-foreground">
                첫 기록보다 해당 종목의 비중이{" "}
                <strong
                  className={
                    insight.concentrationChange > 0
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }
                >
                  {Math.abs(insight.concentrationChange).toFixed(1)}%p{" "}
                  {insight.concentrationChange > 0 ? "커졌어요" : "작아졌어요"}
                </strong>
                .
              </p>
            )}
            <p className="text-muted-foreground">
              보유 종목 수는 첫 기록보다{" "}
              <strong className="text-foreground">
                {insight.holdingCountChange === 0
                  ? "같아요"
                  : `${Math.abs(insight.holdingCountChange)}개 ${insight.holdingCountChange > 0 ? "늘었어요" : "줄었어요"}`}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-5 text-xs leading-5">
        평가금액 변화에는 시세뿐 아니라 추가 매수·매도와 보유 수량 변경도 함께
        반영될 수 있어요. 이 영역은 선택한 기준 목표에 저장된 기록 전체를 분석한
        참고 정보예요.
      </p>
    </section>
  );
}

function InsightStat({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof TrendingUpIcon;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "rose" | "blue" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    rose: "bg-rose-500/10 text-rose-500",
    blue: "bg-blue-500/10 text-blue-500",
    violet: "bg-violet-500/10 text-violet-500",
  };

  return (
    <div className="bg-muted/30 rounded-2xl border p-5">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="size-4" />
      </div>
      <p className="text-muted-foreground mt-4 text-xs font-semibold">
        {label}
      </p>
      <p className="mt-2 text-xl font-black tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-2 text-xs">{detail}</p>
    </div>
  );
}

function WeeklyAwardCard({
  icon: Icon,
  eyebrow,
  title,
  value,
  description,
  tone,
}: {
  icon: typeof TrendingUpIcon;
  eyebrow: string;
  title: string;
  value: string;
  description: string;
  tone: "rose" | "blue" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-500",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-500",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-500",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-500",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-500",
  };

  return (
    <div className={cn("rounded-2xl border p-5", tones[tone])}>
      <div className="flex items-center gap-2 text-xs font-black">
        <Icon className="size-4" /> {eyebrow}
      </div>
      <p className="text-foreground mt-4 text-lg font-black">{title}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {description}
      </p>
    </div>
  );
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const {
    history,
    name,
    historyLimit,
    goalOptions,
    preferredGoal,
    updateDraft,
  } = loaderData;
  const latest = history.at(-1);
  const previous = history.at(-2);

  if (!latest) {
    return (
      <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
          <section className="border-border/70 bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#10b98120,transparent_45%)]" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <ChartNoAxesCombinedIcon className="size-8" />
            </div>
            <p className="mt-8 text-sm font-bold tracking-[0.2em] text-emerald-500">
              MY EOKKA
            </p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              첫 분석 기록을 만들어 보세요
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl leading-7">
              로그인 상태로 홈에서 포트폴리오를 분석하면 오늘의 결과가 자동
              저장되고, 내일부터 목표 달성 기간과 수익률의 변화를 비교할 수
              있어요.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-7">
              <Link to="/">
                지금 분석하기 <ArrowRightIcon />
              </Link>
            </Button>
          </section>
        </div>
      </main>
    );
  }

  const assetChange = difference(
    latest.currentValue,
    previous?.currentValue ?? null,
  );
  const returnChange = difference(
    latest.returnRate,
    previous?.returnRate ?? null,
  );
  const periodChange = difference(
    latest.goalMonth,
    previous?.goalMonth ?? null,
  );
  const contributionGoalMonth =
    latest.monthlyContribution > 0
      ? (latest.result.contributionScenarios.find(
          (scenario) => scenario.key === "base",
        )?.goalMonth ?? null)
      : null;
  const first = history[0];
  const weekAssetChange = latest.currentValue - first.currentValue;
  const weekReturnChange = latest.returnRate - first.returnRate;
  const weekPeriodChange = difference(latest.goalMonth, first.goalMonth);
  const progress = Math.min(
    100,
    (latest.currentValue / latest.goalAmount) * 100,
  );

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
              <SparklesIcon className="size-4" /> 오늘의 투자 리포트
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              {name}님의 목표 현황
            </h1>
            <p className="text-muted-foreground mt-2">
              마지막 분석 {latest.savedOn} · 최근 {historyLimit}개 기록
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link
              to="/"
              state={{
                portfolioDraft: {
                  holdings: updateDraft,
                  targetEok: String(latest.goalAmount / 100_000_000),
                  monthlyContribution: String(latest.monthlyContribution || ""),
                },
              }}
            >
              <RefreshCwIcon /> 오늘 분석 업데이트
            </Link>
          </Button>
        </header>

        {goalOptions.length > 1 && (
          <section className="bg-card mt-7 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div>
              <p className="font-black">대시보드 기준 목표</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                선택한 목표의 최근 기록을 대시보드에서 우선 표시해요.
              </p>
            </div>
            <Form method="post" className="flex flex-wrap gap-2">
              {goalOptions.map((goal) => (
                <Button
                  key={goal}
                  type="submit"
                  name="goalAmount"
                  value={goal}
                  size="sm"
                  variant={goal === preferredGoal ? "default" : "outline"}
                  className="rounded-full px-4"
                >
                  {formatGoalAmount(goal)}
                </Button>
              ))}
            </Form>
          </section>
        )}

        <section
          className={cn(
            "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
            goalOptions.length > 1 ? "mt-5" : "mt-7",
          )}
        >
          <SummaryCard
            icon={PiggyBankIcon}
            label="현재 평가금액"
            value={formatWon(latest.currentValue)}
            change={<Change value={assetChange} suffix="원" />}
          />
          <SummaryCard
            icon={TrendingUpIcon}
            label="현재 수익률"
            value={formatRate(latest.returnRate)}
            valueClass={
              latest.returnRate >= 0 ? "text-rose-500" : "text-blue-500"
            }
            change={<Change value={returnChange} suffix="%p" />}
          />
          <SummaryCard
            icon={Clock3Icon}
            label={`${formatGoalAmount(latest.goalAmount)} 목표 도달 예상`}
            value={formatMonths(latest.goalMonth)}
            detail={
              latest.monthlyContribution > 0
                ? `매월 ${formatWon(latest.monthlyContribution)} 투자 시 ${formatMonths(contributionGoalMonth)}`
                : undefined
            }
            change={<Change value={periodChange} suffix="개월" inverse />}
          />
          <SummaryCard
            icon={TargetIcon}
            label={`${formatGoalAmount(latest.goalAmount)} 목표 달성률`}
            value={`${progress.toFixed(1)}%`}
            change={
              <span className="text-muted-foreground text-xs">
                {formatWon(
                  Math.max(0, latest.goalAmount - latest.currentValue),
                )}{" "}
                남음
              </span>
            }
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-semibold">
                  최근 {historyLimit}개 기록
                </p>
                <h2 className="mt-1 text-xl font-black">내 자산 성장 추이</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500">
                <span className="size-2 rounded-full bg-emerald-500" /> 평가금액
              </div>
            </div>
            <div className="mt-4">
              <TrendChart history={history} />
            </div>
          </div>

          <div className="bg-card rounded-3xl border p-6 shadow-sm md:p-7">
            <p className="text-muted-foreground text-sm font-semibold">
              첫 기록과 비교
            </p>
            <h2 className="mt-1 text-xl font-black">기간 변화 요약</h2>
            <div className="mt-6 space-y-3">
              <ComparisonRow
                label="평가금액"
                value={`${weekAssetChange >= 0 ? "+" : "-"}${formatWon(Math.abs(weekAssetChange))}`}
                improved={weekAssetChange >= 0}
              />
              <ComparisonRow
                label="수익률"
                value={`${weekReturnChange >= 0 ? "+" : ""}${weekReturnChange.toFixed(1)}%p`}
                improved={weekReturnChange >= 0}
              />
              <ComparisonRow
                label="목표 기간"
                value={
                  weekPeriodChange === null
                    ? "비교 불가"
                    : weekPeriodChange === 0
                      ? "변화 없음"
                      : `${Math.abs(weekPeriodChange)}개월 ${weekPeriodChange < 0 ? "단축" : "증가"}`
                }
                improved={weekPeriodChange !== null && weekPeriodChange < 0}
              />
            </div>
            <GoalJourney progress={progress} />
          </div>
        </section>

        <HistoricalInsights history={history} />

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <div className="bg-card rounded-3xl border p-6 shadow-sm md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
                <CalendarDaysIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-black">일별 분석 기록</h2>
                <p className="text-muted-foreground text-xs">
                  날짜별 마지막 분석을 대표 기록으로 표시
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-muted-foreground grid grid-cols-[72px_1fr_1fr] gap-2 border-b pb-2 text-[11px] font-bold">
                <span>날짜</span>
                <span className="text-right">수익률</span>
                <span className="text-right">목표 기간</span>
              </div>
              <div className="divide-y">
                {history
                  .map((item, index) => ({
                    item,
                    previous: history[index - 1],
                  }))
                  .reverse()
                  .map(({ item, previous }) => {
                    const returnRateChange = difference(
                      item.returnRate,
                      previous?.returnRate ?? null,
                    );
                    const goalMonthChange = difference(
                      item.goalMonth,
                      previous?.goalMonth ?? null,
                    );

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[72px_1fr_1fr] items-center gap-2 py-3 text-sm"
                      >
                        <span className="font-bold">
                          {item.savedOn.slice(5).replace("-", ".")}
                        </span>
                        <span className="flex min-w-0 flex-col items-end gap-0.5 font-semibold">
                          {formatRate(item.returnRate)}
                          <DailyRecordChange
                            value={returnRateChange}
                            suffix="%p"
                            isFirst={!previous}
                          />
                        </span>
                        <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                          <span className="text-muted-foreground">
                            {formatMonths(item.goalMonth)}
                          </span>
                          <DailyRecordChange
                            value={goalMonthChange}
                            suffix="개월"
                            inverse
                            isFirst={!previous}
                          />
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="via-card relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-violet-500/10 p-6 shadow-sm md:p-8">
            <CrownIcon className="absolute -top-5 -right-5 size-32 rotate-12 text-amber-400/10" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-500">
                COMING SOON
              </span>
              <h2 className="mt-5 text-2xl font-black">
                더 긴 투자 흐름이 필요하다면
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                무료 베타에서는 목표별 최신 {historyLimit}개 분석 기록을
                저장해요. 향후 EOKKA Pro에서는 기록을 개수 제한 없이 보관하고
                월간·연간 투자 리포트까지 확인할 수 있게 준비할 예정이에요.
              </p>
              <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                <div className="bg-background/50 rounded-2xl border p-4 font-semibold">
                  전체 분석 기록 보관
                </div>
                <div className="bg-background/50 rounded-2xl border p-4 font-semibold">
                  월간·연간 변화 리포트
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-xs">
                아직 결제되거나 자동으로 구독되지 않습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  valueClass,
  detail,
  change,
}: {
  icon: typeof TrendingUpIcon;
  label: string;
  value: string;
  valueClass?: string;
  detail?: string;
  change: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-3xl border p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-semibold">
          {label}
        </span>
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className={cn("mt-4 text-2xl font-black", valueClass)}>{value}</p>
      {detail && (
        <p className="mt-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {detail}
        </p>
      )}
      <div className="mt-2">{change}</div>
    </div>
  );
}

function ComparisonRow({
  label,
  value,
  improved,
}: {
  label: string;
  value: string;
  improved: boolean;
}) {
  return (
    <div className="bg-background/40 flex items-center justify-between rounded-2xl border p-4">
      <span className="text-sm font-semibold">{label}</span>
      <span
        className={cn(
          "text-sm font-black",
          improved ? "text-rose-500" : "text-blue-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}
