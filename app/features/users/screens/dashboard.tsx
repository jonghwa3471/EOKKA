import type { Route } from "./+types/dashboard";

import { inArray } from "drizzle-orm";
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  Clock3Icon,
  CrownIcon,
  PiggyBankIcon,
  RefreshCwIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import {
  FREE_HISTORY_DAYS,
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
    freeHistoryDays: FREE_HISTORY_DAYS,
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold",
        improved ? "text-rose-500" : "text-blue-500",
      )}
    >
      <Icon className="size-3.5" />
      전일보다 {Math.abs(value).toFixed(suffix === "%p" ? 1 : 0)}
      {suffix} {direction}
    </span>
  );
}

function TrendChart({ history }: { history: History }) {
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
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[280px] w-full min-w-[680px]"
        role="img"
        aria-label="최근 7일 포트폴리오 평가금액 추이"
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
        <polygon points={area} fill="url(#dashboard-area)" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#10b981"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {history.map((item, index) => (
          <g key={item.id}>
            <circle
              cx={x(index)}
              cy={y(item.currentValue)}
              r="7"
              fill="#10b981"
            />
            <circle
              cx={x(index)}
              cy={y(item.currentValue)}
              r="3"
              fill="white"
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

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const {
    history,
    name,
    freeHistoryDays,
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
              마지막 분석 {latest.savedOn} · 최근 {freeHistoryDays}일 기록
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
                  최근 {freeHistoryDays}일
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
            <div className="bg-muted/60 mt-6 rounded-2xl p-4">
              <div className="flex justify-between text-xs font-bold">
                <span>목표까지의 여정</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

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
            <div className="mt-5 divide-y">
              {[...history].reverse().map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-3 items-center gap-2 py-3 text-sm"
                >
                  <span className="font-bold">
                    {item.savedOn.slice(5).replace("-", ".")}
                  </span>
                  <span className="text-center font-semibold">
                    {formatRate(item.returnRate)}
                  </span>
                  <span className="text-muted-foreground text-right">
                    {formatMonths(item.goalMonth)}
                  </span>
                </div>
              ))}
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
                무료 베타에서는 최근 {freeHistoryDays}일의 변화만 저장해요. 향후
                EOKKA Pro에서는 기록을 기간 제한 없이 보관하고 월간·연간 투자
                리포트까지 확인할 수 있게 준비할 예정이에요.
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
  change,
}: {
  icon: typeof TrendingUpIcon;
  label: string;
  value: string;
  valueClass?: string;
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
