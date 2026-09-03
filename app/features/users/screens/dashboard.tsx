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
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  CoinsIcon,
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
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useLocation } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
import {
  FREE_HISTORY_LIMIT,
  getActiveAnalysisHistory,
  getPreferredGoalAmount,
  saveDailyAnalysisSnapshot,
  seoulDate,
  setPreferredGoalAmount,
} from "~/features/stocks/history/analysis-history.server";
import {
  calculateManagedHoldings,
  getManagedPortfolio,
  investmentMonthsSince,
} from "~/features/stocks/portfolio/portfolio.server";
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
        getActiveAnalysisHistory(user.id),
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
  const today = seoulDate();
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
            costKrw: holding.costKrw,
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
    today,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "set-preferred-goal");
  if (intent === "refresh-managed-analysis") {
    const [history, preferredGoalAmount, managed] = await Promise.all([
      getActiveAnalysisHistory(user.id),
      getPreferredGoalAmount(user.id),
      getManagedPortfolio(user.id),
    ]);
    if (!managed || managed.portfolio.status !== "active")
      throw new Response("Managed portfolio is not active", { status: 400 });
    const goalOptions = [
      ...new Set(history.map((item) => item.goalAmount)),
    ].sort((a, b) => a - b);
    const goalAmount =
      (preferredGoalAmount && goalOptions.includes(preferredGoalAmount)
        ? preferredGoalAmount
        : goalOptions.includes(100_000_000)
          ? 100_000_000
          : goalOptions[0]) ?? null;
    const latest = goalAmount
      ? history.filter((item) => item.goalAmount === goalAmount).at(-1)
      : null;
    if (!goalAmount || !latest)
      throw new Response("Managed analysis configuration not found", {
        status: 400,
      });
    const holdings = calculateManagedHoldings(managed.transactions);
    const firstBoughtOn = managed.transactions.find(
      (transaction) => transaction.type === "BUY",
    )?.tradedOn;
    if (!holdings.length || !firstBoughtOn)
      throw new Response("Managed portfolio holdings not found", {
        status: 400,
      });
    const result = await analyzePortfolio({
      goalAmount,
      monthlyContribution: latest.monthlyContribution,
      investmentPeriodMonths: investmentMonthsSince(firstBoughtOn, seoulDate()),
      holdings: holdings.map((holding) => ({
        stockId: holding.stockId,
        averagePrice: holding.averagePrice,
        quantity: holding.quantity,
        currency: holding.currency,
        costKrw: holding.costKrw,
      })),
    });
    await saveDailyAnalysisSnapshot({
      userId: user.id,
      result,
      analysisMode: "managed",
      managedPortfolioId: managed.portfolio.managed_portfolio_id,
    });
    return redirect("/dashboard");
  }
  const goalAmount = Number(formData.get("goalAmount"));
  const history = await getActiveAnalysisHistory(user.id);
  const validGoals = new Set(history.map((item) => item.goalAmount));
  if (!Number.isSafeInteger(goalAmount) || !validGoals.has(goalAmount)) {
    throw new Response("Invalid goal amount", { status: 400 });
  }

  await setPreferredGoalAmount(user.id, goalAmount);
  return redirect("/dashboard");
}

type History = Awaited<ReturnType<typeof getActiveAnalysisHistory>>;

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
    profit: item.profit - history[index].profit,
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
  const weeklyHistory = history;
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
  const weeklyFirstPrices = new Map(
    weeklyFirst?.result.holdings.map((holding) => [
      holding.ticker,
      holding.currentPrice,
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
  const weeklyReturnRankings =
    weeklyHistory.length < 2
      ? []
      : latest.result.holdings
          .flatMap((holding) => {
            const previousPrice = weeklyFirstPrices.get(holding.ticker);
            if (!previousPrice || previousPrice <= 0) return [];
            return [
              {
                name: holding.name,
                returnRate:
                  ((holding.currentPrice - previousPrice) / previousPrice) *
                  100,
              },
            ];
          })
          .sort((a, b) => b.returnRate - a.returnRate)
          .slice(0, 3);
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
    totalProfitChange: changes.reduce((sum, change) => sum + change.profit, 0),
    totalReturnRateChange: changes.reduce(
      (sum, change) => sum + change.returnRate,
      0,
    ),
    holdingCountChange:
      latest.result.holdings.length - first.result.holdings.length,
    weekly: {
      history: weeklyHistory,
      changes: weeklyChanges,
      winner: weeklyWinner,
      loser: weeklyLoser,
      returnRankings: weeklyReturnRankings,
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
  showDailyPrefix = true,
}: {
  value: number | null;
  suffix: string;
  inverse?: boolean;
  showDailyPrefix?: boolean;
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
      {showDailyPrefix && "전일보다 "}
      {formattedValue} {direction}
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

type TrendSeries = "actual" | "expected" | "market";

function TrendChart({
  history,
  dimmedSeries,
}: {
  history: History;
  dimmedSeries: TrendSeries[];
}) {
  const { ref: chartRef, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const width = 900;
  const height = 330;
  const padding = { top: 28, right: 24, bottom: 45, left: 24 };
  const first = history[0];
  const startTime = new Date(`${first.savedOn}T00:00:00Z`).getTime();
  const projectionValue = (
    savedOn: string,
    key: "base" | "market",
  ): number | null => {
    const elapsedDays = Math.max(
      0,
      (new Date(`${savedOn}T00:00:00Z`).getTime() - startTime) / 86_400_000,
    );
    const elapsedMonth = elapsedDays / 30.4375;
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
  const records = history.map((item) => ({
    item,
    expected: projectionValue(item.savedOn, "base"),
    market: projectionValue(item.savedOn, "market"),
  }));
  const values = records.flatMap(({ item, expected, market }) => [
    item.currentValue,
    ...(expected === null ? [] : [expected]),
    ...(market === null ? [] : [market]),
  ]);
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
  const visibleRecords = records.map((record, index) => ({
    ...record,
    index,
  }));
  const actualPoints = visibleRecords.map(
    ({ item, index }) => `${x(index)},${y(item.currentValue)}`,
  );
  const expectedPoints = visibleRecords.flatMap(({ expected, index }) =>
    expected === null ? [] : [`${x(index)},${y(expected)}`],
  );
  const marketPoints = visibleRecords.flatMap(({ market, index }) =>
    market === null ? [] : [`${x(index)},${y(market)}`],
  );
  const area = `${x(visibleRecords[0].index)},${height - padding.bottom} ${actualPoints.join(" ")} ${x(visibleRecords.at(-1)!.index)},${height - padding.bottom}`;
  const hovered = hoveredIndex === null ? null : records[hoveredIndex];
  const hoverX = hoveredIndex === null ? null : x(hoveredIndex);
  const tooltipHeight = hovered?.market === null ? 76 : 94;
  const seriesOpacity = (series: TrendSeries) =>
    dimmedSeries.includes(series) ? 0.16 : 1;
  const updateZoom = (nextZoom: number, anchorRatio = 0.5) => {
    const clampedZoom = Math.min(6, Math.max(1, nextZoom));
    const container = scrollRef.current;
    const contentRatio = container
      ? (container.scrollLeft + anchorRatio * container.clientWidth) /
        Math.max(1, container.scrollWidth)
      : anchorRatio;
    setZoom(clampedZoom);
    setHoveredIndex(null);
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

  return (
    <div ref={chartRef} className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex justify-end">
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
            disabled={zoom >= 5.99}
            onClick={() => updateZoom(zoom * 1.5)}
          >
            <ZoomInIcon className="size-4" />
          </button>
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
          aria-label="실제 평가금액과 최초 예상 및 시장 기준의 비교 추이"
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
          {history.map((item, index) => (
            <g key={item.id}>
              <circle
                cx={x(index)}
                cy={y(item.currentValue)}
                r="7"
                fill="#10b981"
                style={{
                  opacity: isRevealed ? seriesOpacity("actual") : 0,
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
                  opacity: isRevealed ? seriesOpacity("actual") : 0,
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
                {(index === 0 ||
                  index === history.length - 1 ||
                  index % Math.max(1, Math.ceil(history.length / 6)) === 0) && (
                  <>
                    {Number(item.savedOn.slice(5, 7))}/
                    {Number(item.savedOn.slice(8, 10))}
                  </>
                )}
              </text>
            </g>
          ))}
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
              const ratio =
                (Math.min(width - padding.right, Math.max(padding.left, svgX)) -
                  padding.left) /
                (width - padding.left - padding.right);
              setHoveredIndex(
                history.length === 1
                  ? 0
                  : Math.min(
                      history.length - 1,
                      Math.max(0, Math.round(ratio * (history.length - 1))),
                    ),
              );
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          />
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
                fill="#10b981"
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
              <g
                transform={`translate(${hoverX > width - 225 ? hoverX - 212 : hoverX + 12}, ${padding.top + 8})`}
              >
                <rect
                  width="200"
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
                  {hovered.item.savedOn}
                </text>
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
                    y="77"
                    fill="#a78bfa"
                    className="text-[11px] font-semibold"
                  >
                    시장 기준 · {won.format(hovered.market)}원
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>
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

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function profitTileTone(change: number | null, intensity: number) {
  if (change === null || Math.abs(change) < 1) {
    return "border-border/70 bg-muted/70 hover:bg-muted";
  }
  const gainTones = [
    "border-rose-300/60 bg-rose-300/55 hover:bg-rose-300/75 dark:border-rose-800 dark:bg-rose-950/70",
    "border-rose-400/70 bg-rose-400/65 hover:bg-rose-400/85 dark:border-rose-700 dark:bg-rose-900/75",
    "border-rose-500/80 bg-rose-500/75 hover:bg-rose-500/90 dark:border-rose-600 dark:bg-rose-800/80",
    "border-rose-600 bg-rose-600 hover:bg-rose-500 dark:border-rose-500 dark:bg-rose-700",
  ];
  const lossTones = [
    "border-blue-300/60 bg-blue-300/55 hover:bg-blue-300/75 dark:border-blue-800 dark:bg-blue-950/70",
    "border-blue-400/70 bg-blue-400/65 hover:bg-blue-400/85 dark:border-blue-700 dark:bg-blue-900/75",
    "border-blue-500/80 bg-blue-500/75 hover:bg-blue-500/90 dark:border-blue-600 dark:bg-blue-800/80",
    "border-blue-600 bg-blue-600 hover:bg-blue-500 dark:border-blue-500 dark:bg-blue-700",
  ];
  return (change > 0 ? gainTones : lossTones)[
    Math.min(3, Math.max(0, intensity - 1))
  ];
}

function ProfitContributionGrid({ history }: { history: History }) {
  const records = history;
  const latestDate = records.at(-1)?.savedOn;
  if (!latestDate) return null;

  const availableYears = [
    ...new Set(records.map((item) => Number(item.savedOn.slice(0, 4)))),
  ].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  const recordsWithChanges = records.map((item, index) => {
    const previous = records[index - 1];
    return {
      item,
      previous,
      profitChange: previous ? item.profit - previous.profit : null,
      returnChange: previous ? item.returnRate - previous.returnRate : null,
    };
  });
  const recordByDate = new Map(
    recordsWithChanges.map((record) => [record.item.savedOn, record]),
  );
  const magnitudes = recordsWithChanges
    .flatMap(({ profitChange }) =>
      profitChange === null || Math.abs(profitChange) < 1
        ? []
        : [Math.abs(profitChange)],
    )
    .sort((a, b) => a - b);
  const intensityFor = (change: number | null) => {
    if (change === null || Math.abs(change) < 1 || magnitudes.length === 0) {
      return 0;
    }
    const rank = magnitudes.findIndex((value) => value >= Math.abs(change));
    const percentile = (Math.max(0, rank) + 1) / magnitudes.length;
    return Math.min(4, Math.max(1, Math.ceil(percentile * 4)));
  };
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const startWeekday = new Date(`${yearStart}T12:00:00Z`).getUTCDay();
  const calendarStart = shiftDate(yearStart, -startWeekday);
  const endWeekday = new Date(`${yearEnd}T12:00:00Z`).getUTCDay();
  const calendarEnd = shiftDate(yearEnd, 6 - endWeekday);
  const calendarDays =
    Math.round(
      (new Date(`${calendarEnd}T12:00:00Z`).getTime() -
        new Date(`${calendarStart}T12:00:00Z`).getTime()) /
        86_400_000,
    ) + 1;
  const dates = Array.from({ length: calendarDays }, (_, index) =>
    shiftDate(calendarStart, index),
  );
  const monthMarkers = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const offset = Math.round(
      (new Date(`${date}T12:00:00Z`).getTime() -
        new Date(`${calendarStart}T12:00:00Z`).getTime()) /
        86_400_000,
    );
    return { month: monthIndex + 1, week: Math.floor(offset / 7) };
  });

  return (
    <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <ChartNoAxesCombinedIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-black">연도별 손익 흐름</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {selectedYear}년 · 직전 저장 기록 대비 평가손익 변화
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label
            className="text-muted-foreground text-xs font-bold"
            htmlFor="profit-grid-year"
          >
            연도
          </label>
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger id="profit-grid-year" className="w-[108px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="relative ml-9 h-5">
            {monthMarkers.map(({ month, week }) => (
              <span
                key={month}
                className="text-muted-foreground absolute text-[10px] font-bold"
                style={{ left: `${week * 14}px` }}
              >
                {month}월
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2">
            <div className="text-muted-foreground grid h-[90px] w-7 shrink-0 grid-rows-7 text-[9px] font-semibold">
              <span />
              <span className="self-center">월</span>
              <span />
              <span className="self-center">수</span>
              <span />
              <span className="self-center">금</span>
              <span />
            </div>
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
              {dates.map((date) => {
                const isSelectedYear = date.startsWith(String(selectedYear));
                const record = recordByDate.get(date);
                const change = record?.profitChange ?? null;
                const intensity = intensityFor(change);
                const tileClass = cn(
                  "size-[11px] rounded-[3px] border transition duration-200",
                  !isSelectedYear
                    ? "border-transparent bg-transparent"
                    : record
                      ? profitTileTone(change, intensity)
                      : "border-border/40 bg-muted/35 hover:bg-muted/55",
                );
                const month = Number(date.slice(5, 7));
                const day = Number(date.slice(8, 10));

                return (
                  <Tooltip key={date}>
                    <TooltipTrigger asChild>
                      {record && isSelectedYear ? (
                        <Link
                          to={`/dashboard/history?month=${date.slice(0, 7)}&date=${date}`}
                          className={tileClass}
                          aria-label={`${month}월 ${day}일 분석 기록 보기`}
                        />
                      ) : isSelectedYear ? (
                        <span
                          className={tileClass}
                          aria-label={`${month}월 ${day}일 분석 기록 없음`}
                        />
                      ) : (
                        <span className={tileClass} aria-hidden="true" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={8}
                      className="max-w-64 p-3"
                    >
                      <p className="font-black">
                        {date.replaceAll("-", ".")}{" "}
                        {record ? "분석" : "기록 없음"}
                      </p>
                      {record && change !== null ? (
                        <div className="mt-1.5 space-y-1 text-[11px]">
                          <p>
                            평가손익 {change >= 0 ? "+" : "-"}
                            {formatWon(Math.abs(change))}
                          </p>
                          <p>
                            수익률 {record.returnChange! >= 0 ? "+" : ""}
                            {record.returnChange!.toFixed(1)}%p
                          </p>
                          <p className="opacity-70">
                            {record.previous?.savedOn === shiftDate(date, -1)
                              ? "전일 기록과 비교했어요."
                              : "직전 저장 기록과 비교했어요."}
                          </p>
                        </div>
                      ) : record ? (
                        <p className="mt-1.5 text-[11px] opacity-70">
                          비교할 이전 기록이 없는 첫 분석이에요.
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] opacity-70">
                          이 날짜에는 저장된 분석이 없어요.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div className="text-muted-foreground mt-4 flex items-center justify-end gap-1.5 text-[10px] font-semibold">
            <span>손해</span>
            <span className="size-3 rounded-[3px] bg-blue-600" />
            <span className="size-3 rounded-[3px] bg-blue-300/70 dark:bg-blue-950" />
            <span className="bg-muted size-3 rounded-[3px] border" />
            <span className="size-3 rounded-[3px] bg-rose-300/70 dark:bg-rose-950" />
            <span className="size-3 rounded-[3px] bg-rose-600" />
            <span>수익</span>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground mt-4 text-xs leading-5">
        추가 매수·매도나 보유 수량 변경이 있었다면 평가손익 변화에도 함께 반영될
        수 있어요. 타일을 누르면 해당 날짜의 분석 기록으로 이동해요.
      </p>
    </div>
  );
}

function recordDate(value: string) {
  return value.slice(5).replace("-", ".");
}

export function HistoricalInsights({
  history,
  previousHistory = [],
  period = "weekly",
  rangeLabel,
}: {
  history: History;
  previousHistory?: History;
  period?: "weekly" | "monthly";
  rangeLabel?: string;
}) {
  const insight = calculateHistoryInsights(history);
  const isWeekly = period === "weekly";
  const periodLabel = isWeekly ? "주간" : "월간";
  const transitions = insight.changes.length;
  const risingRatio = transitions
    ? (insight.upCount / transitions) * 100
    : null;
  const profitImproved = insight.totalProfitChange >= 0;
  const previousLatest = previousHistory.at(-1) ?? null;
  const previousPeriodLabel = isWeekly ? "지난주" : "지난달";
  const currentPeriodLabel = isWeekly ? "이번 주" : "이번 달";
  const previousAssetChange = previousLatest
    ? insight.latest.currentValue - previousLatest.currentValue
    : null;
  const previousReturnChange = previousLatest
    ? insight.latest.returnRate - previousLatest.returnRate
    : null;
  const previousGoalChange = previousLatest
    ? difference(insight.latest.goalMonth, previousLatest.goalMonth)
    : null;

  return (
    <section className="bg-card mt-5 rounded-3xl border p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <ActivityIcon className="size-4" /> {period.toUpperCase()} INSIGHT
          </div>
          <h2 className="mt-2 text-2xl font-black">
            {periodLabel} 기록에서 발견한 투자 흐름
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {rangeLabel
              ? `${rangeLabel} 중 저장된 `
              : `${insight.first.savedOn}부터 ${insight.latest.savedOn}까지의 `}
            <strong className="text-foreground">{history.length}개 기록</strong>
            을 비교했어요.
          </p>
        </div>
        <div className="bg-muted/50 rounded-2xl px-4 py-3 text-sm">
          <span className="text-muted-foreground">관찰 기간 </span>
          <strong>{insight.elapsedDays}일</strong>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-violet-500/5 p-4 md:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black">{previousPeriodLabel}와 비교</p>
          <span className="text-muted-foreground text-xs">
            {previousLatest
              ? `${previousLatest.savedOn} → ${insight.latest.savedOn}`
              : `${previousPeriodLabel} 비교 기록 없음`}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="bg-background/70 rounded-xl border p-3">
            <p className="text-muted-foreground text-xs">평가금액</p>
            <div className="mt-2 font-black">
              <Change
                value={previousAssetChange}
                suffix="원"
                showDailyPrefix={false}
              />
            </div>
          </div>
          <div className="bg-background/70 rounded-xl border p-3">
            <p className="text-muted-foreground text-xs">수익률</p>
            <div className="mt-2 font-black">
              <Change
                value={previousReturnChange}
                suffix="%p"
                showDailyPrefix={false}
              />
            </div>
          </div>
          <div className="bg-background/70 rounded-xl border p-3">
            <p className="text-muted-foreground text-xs">목표 도달 기간</p>
            <div className="mt-2 font-black">
              <Change
                value={previousGoalChange}
                suffix="개월"
                inverse
                showDailyPrefix={false}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 rounded-2xl border p-5",
          profitImproved
            ? "border-rose-500/20 bg-rose-500/5"
            : "border-blue-500/20 bg-blue-500/5",
        )}
      >
        <p className="text-lg leading-8 font-black md:text-xl">
          {currentPeriodLabel}에는 평가손익이{" "}
          <span className={profitImproved ? "text-rose-500" : "text-blue-500"}>
            {insight.totalProfitChange === 0
              ? "변동 없었고"
              : `${formatWon(Math.abs(insight.totalProfitChange))} ${profitImproved ? "늘었고" : "줄었고"}`}
          </span>
          , 수익률은{" "}
          <span
            className={
              insight.totalReturnRateChange >= 0
                ? "text-rose-500"
                : "text-blue-500"
            }
          >
            {insight.totalReturnRateChange === 0
              ? "변동 없었어요"
              : `${Math.abs(insight.totalReturnRateChange).toFixed(1)}%p ${insight.totalReturnRateChange > 0 ? "높아졌어요" : "낮아졌어요"}`}
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
            <PartyPopperIcon className="size-4" /> {period.toUpperCase()} AWARDS
          </div>
          <h3 className="mt-2 text-xl font-black">
            {periodLabel} 포트폴리오 시상식
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            이 {periodLabel}에 저장된 기록의 변화를 재미있게 정리했어요.
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          {periodLabel} 기록 {insight.weekly.history.length}개
        </span>
      </div>

      <WeeklyReturnPodium
        rankings={insight.weekly.returnRankings}
        periodLabel={periodLabel}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <WeeklyAwardCard
          icon={AwardIcon}
          eyebrow={`${periodLabel} 수익 기여 1위`}
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
          eyebrow={`${periodLabel} 손실 기여 1위`}
          title={insight.weekly.loser?.name ?? "이 기간에는 방어에 성공했어요"}
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
          eyebrow={`${periodLabel} 가장 요동친 날`}
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
          eyebrow={`${periodLabel} 초록불 확률`}
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
          description={`이 ${periodLabel}의 연속된 저장 기록 사이에서 상승한 비율이에요.`}
          tone="emerald"
        />
        <WeeklyAwardCard
          icon={TimerResetIcon}
          eyebrow={`${periodLabel} 저점 회복`}
          title={
            insight.weekly.recovery > 0
              ? "저점에서 이만큼 되찾았어요"
              : `최신 기록이 ${periodLabel} 저점이에요`
          }
          value={formatWon(insight.weekly.recovery)}
          description={`${periodLabel} 가장 낮았던 평가금액과 최신 기록을 비교했어요.`}
          tone="violet"
        />
        <WeeklyAwardCard
          icon={TargetIcon}
          eyebrow={`${periodLabel} 목표 시간 여행`}
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
          description={`${periodLabel} 첫 기록과 최신 기록의 평균 시나리오를 비교했어요.`}
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
        반영될 수 있어요. 이 영역은 선택한 기준 목표의 {periodLabel} 기록을
        분석한 참고 정보예요.
      </p>
    </section>
  );
}

function WeeklyReturnPodium({
  rankings,
  periodLabel,
}: {
  rankings: Array<{ name: string; returnRate: number }>;
  periodLabel: "주간" | "월간";
}) {
  const { ref, isRevealed } = useRevealOncePerVisit<HTMLElement>();
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (
      !isRevealed ||
      rankings.length === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void import("canvas-confetti").then(({ default: confetti }) => {
        const canvas = confettiCanvasRef.current;
        if (cancelled || !canvas) return;

        const fireConfetti = confetti.create(canvas, {
          resize: true,
          useWorker: true,
          disableForReducedMotion: true,
        });
        const burst = (x: number, particleCount: number) =>
          fireConfetti({
            particleCount,
            spread: 62,
            startVelocity: 28,
            gravity: 1.08,
            scalar: 0.82,
            ticks: 150,
            origin: { x, y: 0.78 },
            colors: ["#fbbf24", "#f97316", "#2dd4bf", "#a78bfa", "#fef3c7"],
          });

        burst(0.42, 34);
        burst(0.5, 46);
        burst(0.58, 34);
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isRevealed, rankings.length, ref]);

  const podiums = [
    {
      place: 2,
      label: "2ND",
      rank: rankings[1],
      className:
        "order-1 min-h-28 bg-gradient-to-b from-slate-300/90 to-slate-500/90 text-slate-950 dark:from-slate-300 dark:to-slate-500",
    },
    {
      place: 1,
      label: "1ST",
      rank: rankings[0],
      className:
        "order-2 min-h-40 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-amber-950 shadow-[0_0_42px_-15px_rgba(251,191,36,0.95)]",
    },
    {
      place: 3,
      label: "3RD",
      rank: rankings[2],
      className:
        "order-3 min-h-20 bg-gradient-to-b from-orange-300/90 to-orange-700/90 text-orange-950 dark:from-orange-300 dark:to-orange-700",
    },
  ];

  return (
    <section
      ref={ref}
      className="relative mt-5 overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.16),transparent_62%)] p-4 sm:p-6"
    >
      {rankings.length > 0 && (
        <canvas
          ref={confettiCanvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 size-full"
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-500 uppercase">
            <CrownIcon className="size-4" /> PODIUM
          </div>
          <h4 className="mt-2 text-lg font-black">
            {periodLabel} 수익률 TOP 3
          </h4>
          <p className="text-muted-foreground mt-1 text-sm">
            {periodLabel} 첫 기록과 최신 기록의 종목별 현재가를 비교했어요.
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-300">
          {rankings.length ? `${rankings.length}개 순위 산정` : "비교 준비 중"}
        </span>
      </div>

      {rankings.length === 0 ? (
        <div className="bg-background/65 mt-7 rounded-2xl border border-dashed border-amber-500/25 px-5 py-9 text-center">
          <div className="text-4xl" aria-hidden="true">
            🏁
          </div>
          <h5 className="mt-4 text-base font-black">
            아직 순위를 정할 수 없어요
          </h5>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
            이 {periodLabel}에 분석 기록이 두 개 이상 쌓이면, 처음과 최신
            기록에서 함께 보유한 종목의 수익률을 비교해 TOP 3를 선정할게요.
          </p>
        </div>
      ) : (
        <div className="mx-auto mt-7 grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-3">
          {podiums.map(({ place, label, rank, className }) => (
            <div
              key={place}
              className="flex min-w-0 flex-col items-center text-center"
            >
              <div className="mb-2 flex min-h-12 flex-col justify-end">
                {place === 1 && (
                  <CrownIcon className="mx-auto mb-1 size-5 text-amber-400" />
                )}
                <p className="truncate px-1 text-sm font-black sm:text-base">
                  {rank?.name ?? "—"}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs font-bold tabular-nums",
                    rank && rank.returnRate >= 0
                      ? "text-rose-500"
                      : "text-blue-500",
                  )}
                >
                  {rank
                    ? `${rank.returnRate >= 0 ? "+" : ""}${rank.returnRate.toFixed(1)}%`
                    : "비교 종목 부족"}
                </p>
              </div>
              <div
                className={cn(
                  "relative flex w-full items-end justify-center rounded-t-2xl border border-white/20 px-2 pt-8 pb-3 sm:pb-4",
                  className,
                )}
              >
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-[0.18em] opacity-70">
                  {label}
                </span>
                <span className="text-2xl font-black tabular-nums sm:text-3xl">
                  {place}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
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
    today,
  } = loaderData;
  const [dimmedTrendSeries, setDimmedTrendSeries] = useState<TrendSeries[]>([]);
  const toggleTrendSeries = (series: TrendSeries) =>
    setDimmedTrendSeries((current) =>
      current.includes(series)
        ? current.filter((item) => item !== series)
        : [...current, series],
    );
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

  const todayAnalysis = history.find((item) => item.savedOn === today);
  const todayAnalysisHref = todayAnalysis
    ? `/dashboard/history?month=${today.slice(0, 7)}&date=${today}&analysis=${todayAnalysis.id}`
    : null;

  const assetChange = difference(
    latest.currentValue,
    previous?.currentValue ?? null,
  );
  const returnChange = difference(
    latest.returnRate,
    previous?.returnRate ?? null,
  );
  const profitChange = difference(latest.profit, previous?.profit ?? null);
  const costChange = difference(
    latest.result.totalCost,
    previous?.result.totalCost ?? null,
  );
  const hasForeignHolding = latest.result.holdings.some(
    (holding) => holding.currency === "USD",
  );
  const annualizedReturnRate = latest.result.annualizedReturnRate ?? null;
  const previousAnnualizedReturnRate =
    previous?.result.annualizedReturnRate ?? null;
  const annualizedReturnChange = difference(
    annualizedReturnRate,
    previousAnnualizedReturnRate,
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground">
                마지막 분석 {latest.savedOn} · 최근 {historyLimit}개 기록
              </p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-black",
                  latest.analysisMode === "managed"
                    ? "bg-emerald-500/12 text-emerald-500"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {latest.analysisMode === "managed"
                  ? "정밀 분석 사용 중"
                  : "빠른 분석 사용 중"}
              </span>
            </div>
          </div>
          {latest.analysisMode === "managed" ? (
            <Form method="post">
              <input
                type="hidden"
                name="intent"
                value="refresh-managed-analysis"
              />
              <Button type="submit" className="rounded-full">
                <RefreshCwIcon /> 오늘 분석 업데이트
              </Button>
            </Form>
          ) : (
            <Button asChild className="rounded-full">
              <Link
                to="/"
                state={{
                  portfolioDraft: {
                    holdings: updateDraft,
                    targetEok: String(latest.goalAmount / 100_000_000),
                    monthlyContribution: String(
                      latest.monthlyContribution || "",
                    ),
                    investmentYears: latest.result.investmentPeriodMonths
                      ? String(
                          Math.floor(latest.result.investmentPeriodMonths / 12),
                        )
                      : "",
                    investmentMonths: latest.result.investmentPeriodMonths
                      ? String(latest.result.investmentPeriodMonths % 12)
                      : "",
                    investmentPeriodUnknown:
                      latest.result.investmentPeriodMonths == null,
                  },
                }}
              >
                <RefreshCwIcon /> 오늘 분석 업데이트
              </Link>
            </Button>
          )}
        </header>

        <section
          className={cn(
            "mt-6 flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
            todayAnalysis
              ? "border-emerald-500/25 bg-emerald-500/[0.07]"
              : "border-amber-500/25 bg-amber-500/[0.07]",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                todayAnalysis
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-amber-500/15 text-amber-500",
              )}
            >
              {todayAnalysis ? (
                <CheckCircle2Icon className="size-5" />
              ) : (
                <RefreshCwIcon className="size-5" />
              )}
            </span>
            <div>
              <p className="font-black">
                {todayAnalysis
                  ? "오늘 분석을 완료했어요"
                  : "오늘은 아직 분석하지 않았어요"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {todayAnalysis
                  ? "오늘 저장된 최신 결과와 변화를 분석 기록에서 확인할 수 있어요."
                  : "오늘의 가격과 포트폴리오 변화를 반영하려면 분석을 업데이트해 주세요."}
              </p>
            </div>
          </div>
          {todayAnalysisHref && (
            <Link
              to={todayAnalysisHref}
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-black text-emerald-500 transition-colors hover:text-emerald-400 sm:self-center"
            >
              해당 분석 보러가기 <ArrowRightIcon className="size-4" />
            </Link>
          )}
        </section>

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
            "grid gap-4 md:grid-cols-2 xl:grid-cols-6",
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
            icon={CoinsIcon}
            label="현재 평가손익"
            value={formatWon(latest.profit)}
            valueClass={latest.profit >= 0 ? "text-rose-500" : "text-blue-500"}
            change={<Change value={profitChange} suffix="원" />}
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
            icon={ChartNoAxesCombinedIcon}
            label="총 연평균 수익률"
            value={
              annualizedReturnRate === null
                ? "기간 입력 필요"
                : formatRate(annualizedReturnRate)
            }
            valueClass={
              annualizedReturnRate === null
                ? "text-muted-foreground"
                : annualizedReturnRate >= 0
                  ? "text-rose-500"
                  : "text-blue-500"
            }
            change={
              annualizedReturnRate === null ? (
                <span className="text-muted-foreground text-xs">
                  투자 기간을 입력해 주세요
                </span>
              ) : (
                <Change value={annualizedReturnChange} suffix="%p" />
              )
            }
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
            detailAfterChange
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

        <details className="group bg-card mt-4 overflow-hidden rounded-3xl border shadow-sm">
          <summary className="hover:bg-muted/35 flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors marker:hidden md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <ScaleIcon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="font-black">계산 내역 보기</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  평가금액·매입원금·평가손익과 환율 적용 기준
                </p>
              </div>
            </div>
            <ChevronDownIcon className="text-muted-foreground size-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>

          <div className="border-t px-5 py-5 md:px-6 md:py-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CalculationValue
                label="현재 평가금액"
                value={formatWon(latest.currentValue)}
                description="현재가 × 수량을 원화로 합산"
              />
              <CalculationValue
                label="원화 매입원금"
                value={formatWon(latest.result.totalCost)}
                description="보유 종목의 원화 매입금액 합계"
              />
              <CalculationValue
                label="현재 평가손익"
                value={formatWon(latest.profit)}
                valueClass={
                  latest.profit >= 0 ? "text-rose-500" : "text-blue-500"
                }
                description="평가금액 − 원화 매입원금"
              />
              <CalculationValue
                label="현재 수익률"
                value={formatRate(latest.returnRate)}
                valueClass={
                  latest.returnRate >= 0 ? "text-rose-500" : "text-blue-500"
                }
                description="평가손익 ÷ 원화 매입원금"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="bg-muted/25 rounded-2xl border p-4">
                <p className="text-sm font-black">직전 기록과 비교</p>
                {previous ? (
                  <>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {previous.savedOn} → {latest.savedOn}
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <CalculationChange label="평가금액" value={assetChange} />
                      <CalculationChange label="매입원금" value={costChange} />
                      <CalculationChange
                        label="평가손익"
                        value={profitChange}
                      />
                    </dl>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    기록이 하나 더 쌓이면 각 금액이 왜 변했는지 비교해 드려요.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
                <p className="text-sm font-black">환율과 매입원금 기준</p>
                {hasForeignHolding ? (
                  <div className="text-muted-foreground mt-2 space-y-2 text-xs leading-5">
                    <p>
                      현재 해외주식 평가에는{" "}
                      <strong className="text-foreground">
                        1달러당{" "}
                        {(latest.result.exchangeRate ?? 0).toLocaleString(
                          "ko-KR",
                        )}
                        원
                      </strong>
                      을 적용했어요.
                    </p>
                    <p>
                      첫 분석은 입력한 달러 평균가를 분석일 환율로 환산하며,
                      이후 종목·수량·평균가가 같으면 저장된 원화 매입원금을
                      유지해요.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    국내 종목만 포함되어 있어 별도의 환율 환산을 적용하지
                    않았어요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </details>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="bg-card flex min-h-[430px] flex-col rounded-3xl border p-5 shadow-sm md:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-semibold">
                  최근 {historyLimit}개 기록
                </p>
                <h2 className="mt-1 text-xl font-black">내 자산 성장 추이</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => toggleTrendSeries("actual")}
                  aria-pressed={!dimmedTrendSeries.includes("actual")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition",
                    dimmedTrendSeries.includes("actual")
                      ? "bg-muted text-emerald-500 opacity-40 hover:opacity-65"
                      : "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30",
                  )}
                >
                  <span className="size-2 rounded-full bg-emerald-500" /> 실제
                  평가금액
                </button>
                <button
                  type="button"
                  onClick={() => toggleTrendSeries("expected")}
                  aria-pressed={!dimmedTrendSeries.includes("expected")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition",
                    dimmedTrendSeries.includes("expected")
                      ? "bg-muted text-amber-500 opacity-40 hover:opacity-65"
                      : "bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30",
                  )}
                >
                  <span className="h-0.5 w-4 bg-amber-500" /> 최초 예상
                </button>
                {history[0]?.result.benchmark && (
                  <button
                    type="button"
                    onClick={() => toggleTrendSeries("market")}
                    aria-pressed={!dimmedTrendSeries.includes("market")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition",
                      dimmedTrendSeries.includes("market")
                        ? "bg-muted text-violet-500 opacity-40 hover:opacity-65"
                        : "bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/30",
                    )}
                  >
                    <span className="w-4 border-t-2 border-dashed border-violet-500" />
                    시장 기준
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 min-h-0 flex-1">
              <TrendChart history={history} dimmedSeries={dimmedTrendSeries} />
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

        <section className="mt-5 space-y-5">
          <div className="bg-card rounded-3xl border p-6 shadow-sm md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
                <CalendarDaysIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-black">일별 분석 기록</h2>
                <p className="text-muted-foreground text-xs">
                  날짜별 마지막 분석을 최대 {historyLimit}개까지 표시
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-muted-foreground grid grid-cols-[72px_1fr_1fr] gap-2 border-b pb-2 text-[11px] font-bold">
                <span>날짜</span>
                <span className="text-right">수익률</span>
                <span className="text-right">목표 기간</span>
              </div>
              <div className="max-h-[480px] divide-y overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                {history
                  .slice(-historyLimit)
                  .map((item, index, records) => ({
                    item,
                    previous: records[index - 1],
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

          <ProfitContributionGrid history={history} />

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

function CalculationValue({
  label,
  value,
  description,
  valueClass,
}: {
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-muted/25 rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className={cn("mt-2 text-lg font-black tabular-nums", valueClass)}>
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-[11px] leading-5">
        {description}
      </p>
    </div>
  );
}

function CalculationChange({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const tone =
    value === null || value === 0
      ? "text-muted-foreground"
      : value > 0
        ? "text-rose-500"
        : "text-blue-500";

  return (
    <div>
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className={cn("mt-1 font-black tabular-nums", tone)}>
        {value === null
          ? "비교 불가"
          : value === 0
            ? "변화 없음"
            : `${value > 0 ? "+" : ""}${formatWon(value)}`}
      </dd>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  valueClass,
  detail,
  detailAfterChange = false,
  change,
}: {
  icon: typeof TrendingUpIcon;
  label: string;
  value: string;
  valueClass?: string;
  detail?: string;
  detailAfterChange?: boolean;
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
      {detail && !detailAfterChange && (
        <p className="mt-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {detail}
        </p>
      )}
      <div className="mt-2">{change}</div>
      {detail && detailAfterChange && (
        <p className="mt-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {detail}
        </p>
      )}
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
