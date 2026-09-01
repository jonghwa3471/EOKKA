import type { Route } from "./+types/investment-insights";

import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  MinusIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  FREE_HISTORY_LIMIT,
  getAnalysisHistory,
  getPreferredGoalAmount,
  setPreferredGoalAmount,
} from "~/features/stocks/history/analysis-history.server";

import { HistoricalInsights } from "./dashboard";

type InsightPeriod = "weekly" | "monthly";
const INSIGHT_PERIOD_STORAGE_KEY = "eokka:investment-insight-period";

function koreanToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, days: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function calendarRange(today: string, period: InsightPeriod) {
  const date = parseIsoDate(today);
  if (period === "weekly") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = addDays(today, -mondayOffset);
    const end = addDays(start, 6);
    return {
      start,
      end,
      previousStart: addDays(start, -7),
      previousEnd: addDays(start, -1),
    };
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = isoDate(new Date(Date.UTC(year, month, 1)));
  const end = isoDate(new Date(Date.UTC(year, month + 1, 0)));
  return {
    start,
    end,
    previousStart: isoDate(new Date(Date.UTC(year, month - 1, 1))),
    previousEnd: isoDate(new Date(Date.UTC(year, month, 0))),
  };
}

function rangeLabel(start: string, end: string) {
  return `${start.replaceAll("-", ".")}~${end.replaceAll("-", ".")}`;
}

export const meta: Route.MetaFunction = () => [
  { title: `투자 인사이트 | ${import.meta.env.VITE_APP_NAME}` },
];

function formatGoalAmount(value: number) {
  if (value >= 100_000_000 && value % 100_000_000 === 0) {
    return `${(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }
  return `${new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}원`;
}

function formatProfit(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${new Intl.NumberFormat(
    "ko-KR",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    },
  ).format(Math.abs(value))}원`;
}

function recordDateLabel(value: string) {
  const date = parseIsoDate(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()} ${weekday}`;
}

function PeriodRecordStrip({
  history,
  period,
}: {
  history: Route.ComponentProps["loaderData"]["history"];
  period: InsightPeriod;
}) {
  const profitChanges = new Map(
    history.map((item, index) => [
      item.savedOn,
      index === 0 ? null : item.profit - history[index - 1].profit,
    ]),
  );
  const periodChanges = history.map((item) => profitChanges.get(item.savedOn));
  const profitCount = periodChanges.filter(
    (change) => change !== null && change !== undefined && change > 0,
  ).length;
  const lossCount = periodChanges.filter(
    (change) => change !== null && change !== undefined && change < 0,
  ).length;

  return (
    <section className="bg-card mt-4 rounded-3xl border p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <CalendarDaysIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-black">
              {period === "weekly" ? "이번 주" : "이번 달"} 기록 현황
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              기록 {history.length}개 · 수익 {profitCount}일 · 손해 {lossCount}
              일
            </p>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" /> 수익
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500" /> 손해
          </span>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="scrollbar-thin mt-4 flex gap-2 overflow-x-auto pb-1">
          {history.map((item) => {
            const profitChange = profitChanges.get(item.savedOn);
            const isBaseline =
              profitChange === null || profitChange === undefined;
            const profitable = !isBaseline && profitChange > 0;
            const loss = !isBaseline && profitChange < 0;
            const Icon = profitable
              ? ArrowUpRightIcon
              : loss
                ? ArrowDownRightIcon
                : MinusIcon;

            return (
              <div
                key={item.savedOn}
                className={`min-w-[112px] rounded-2xl border px-3 py-2.5 ${
                  profitable
                    ? "border-rose-500/20 bg-rose-500/7"
                    : loss
                      ? "border-blue-500/20 bg-blue-500/7"
                      : "bg-muted/45"
                }`}
              >
                <p className="text-muted-foreground text-[11px] font-semibold">
                  {recordDateLabel(item.savedOn)}
                </p>
                <div
                  className={`mt-1.5 flex items-center gap-1 text-xs font-black ${
                    profitable
                      ? "text-rose-500"
                      : loss
                        ? "text-blue-500"
                        : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {isBaseline
                    ? "기준 기록"
                    : profitable
                      ? "수익"
                      : loss
                        ? "손해"
                        : "변동 없음"}
                </div>
                <p className="mt-1 truncate text-xs font-bold">
                  {isBaseline ? "첫 저장" : formatProfit(profitChange)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 rounded-2xl bg-violet-500/5 px-4 py-3 text-xs">
          이 기간에는 저장된 분석 기록이 없어요.
        </p>
      )}
    </section>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [allHistory, savedPreferredGoal] = await Promise.all([
    getAnalysisHistory(user.id),
    getPreferredGoalAmount(user.id),
  ]);
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

  return {
    history,
    goalOptions,
    preferredGoal,
    historyLimit: FREE_HISTORY_LIMIT,
    today: koreanToday(),
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
  return redirect("/dashboard/insights");
}

export default function InvestmentInsights({
  loaderData,
}: Route.ComponentProps) {
  const { history, goalOptions, preferredGoal, historyLimit, today } =
    loaderData;
  const [period, setPeriod] = useState<InsightPeriod>("weekly");

  useEffect(() => {
    const savedPeriod = window.localStorage.getItem(INSIGHT_PERIOD_STORAGE_KEY);
    if (savedPeriod === "weekly" || savedPeriod === "monthly") {
      setPeriod(savedPeriod);
    }
  }, []);

  const selectPeriod = (nextPeriod: InsightPeriod) => {
    setPeriod(nextPeriod);
    window.localStorage.setItem(INSIGHT_PERIOD_STORAGE_KEY, nextPeriod);
  };
  const range = calendarRange(today, period);
  const periodHistory = history.filter(
    (item) => item.savedOn >= range.start && item.savedOn <= range.end,
  );
  const previousHistory = history.filter(
    (item) =>
      item.savedOn >= range.previousStart && item.savedOn <= range.previousEnd,
  );

  if (history.length === 0) {
    return (
      <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
          <section className="bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#8b5cf620,transparent_48%)]" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
              <SparklesIcon className="size-8" />
            </div>
            <h1 className="relative mt-7 text-3xl font-black md:text-4xl">
              기록이 쌓이면 인사이트가 보여요
            </h1>
            <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl leading-7">
              포트폴리오를 분석하면 목표 접근 속도, 수익률 흐름, 주간 시상식과
              구조 변화를 기록 전체를 바탕으로 정리해 드려요.
            </p>
            <Button
              asChild
              size="lg"
              className="relative mt-7 rounded-full px-7"
            >
              <Link to="/">
                첫 분석 시작하기 <ArrowRightIcon />
              </Link>
            </Button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-violet-500">
              <SparklesIcon className="size-4" /> PORTFOLIO INSIGHTS
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              기록 속에서 찾은 투자 인사이트
            </h1>
            <p className="text-muted-foreground mt-2">
              선택한 목표의 최근 {historyLimit}개 기록을 함께 분석했어요.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/history">
              날짜별 기록 보기 <ArrowRightIcon />
            </Link>
          </Button>
        </header>

        {goalOptions.length > 1 && (
          <section className="bg-card mt-7 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div>
              <p className="font-black">인사이트 기준 목표</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                선택한 목표와 연결된 기록만 모아서 분석해요.
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

        <section className="bg-card mt-7 rounded-3xl border p-2 shadow-sm">
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="투자 인사이트 기간"
          >
            {(
              [
                ["weekly", "주간 인사이트", "월요일부터 일요일"],
                ["monthly", "월간 인사이트", "매월 1일부터 마지막 날"],
              ] as const
            ).map(([value, label, description]) => {
              const selected = period === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectPeriod(value)}
                  className={`rounded-2xl px-4 py-3 text-left transition-all sm:px-5 ${
                    selected
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <strong className="block text-sm sm:text-base">
                    {label}
                  </strong>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      selected ? "opacity-70" : "text-muted-foreground"
                    }`}
                  >
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <PeriodRecordStrip history={periodHistory} period={period} />

        {periodHistory.length > 0 ? (
          <HistoricalInsights
            history={periodHistory}
            previousHistory={previousHistory}
            period={period}
            rangeLabel={rangeLabel(range.start, range.end)}
          />
        ) : (
          <section className="bg-card mt-5 rounded-3xl border p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <SparklesIcon className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">
              이 {period === "weekly" ? "주" : "달"}의 분석 기록이 아직 없어요
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {rangeLabel(range.start, range.end)} · 한국 시간 기준
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">오늘 분석 시작하기</Link>
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}
