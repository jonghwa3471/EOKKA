import type { Route } from "./+types/analysis-history";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  TargetIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import { getAnalysisHistory } from "~/features/stocks/history/analysis-history.server";

export const meta: Route.MetaFunction = () => [
  { title: `분석 기록 | ${import.meta.env.VITE_APP_NAME}` },
];

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function seoulToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function validMonth(value: string | null) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : null;
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calendarDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from(
      { length: days },
      (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
}

function goalLabel(value: number) {
  return value % 100_000_000 === 0
    ? `${(value / 100_000_000).toLocaleString("ko-KR")}억`
    : `${value.toLocaleString("ko-KR")}원`;
}

function durationLabel(months: number | null) {
  if (months === null) return "50년 이상";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest}개월`;
  return rest ? `${years}년 ${rest}개월` : `${years}년`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const history = user ? await getAnalysisHistory(user.id) : [];
  const url = new URL(request.url);
  const today = seoulToday();
  const availableDates = [...new Set(history.map((item) => item.savedOn))];
  const requestedDate = validDate(url.searchParams.get("date"));
  const selectedDate =
    (requestedDate && availableDates.includes(requestedDate)
      ? requestedDate
      : availableDates.at(-1)) ?? today;
  const month =
    validMonth(url.searchParams.get("month")) ?? selectedDate.slice(0, 7);
  const dayRecords = history.filter((item) => item.savedOn === selectedDate);
  const requestedId = Number(url.searchParams.get("analysis"));
  const selected =
    dayRecords.find((item) => item.id === requestedId) ??
    dayRecords.at(-1) ??
    null;

  return { history, availableDates, selectedDate, month, dayRecords, selected };
}

export default function AnalysisHistory({ loaderData }: Route.ComponentProps) {
  const { availableDates, selectedDate, month, dayRecords, selected } =
    loaderData;
  const dates = calendarDates(month);
  const available = new Set(availableDates);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-14 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <CalendarDaysIcon className="size-4" /> MY ANALYSIS
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            분석 기록
          </h1>
          <p className="text-muted-foreground mt-2">
            날짜를 선택하면 해당일에 분석한 포트폴리오와 목표별 결과를 다시 볼
            수 있어요.
          </p>
        </header>

        <section className="mt-7 grid items-start gap-5 xl:grid-cols-[380px_1fr]">
          <div className="bg-card rounded-3xl border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full"
              >
                <Link to={`?month=${previousMonth}`} aria-label="이전 달">
                  <ChevronLeftIcon />
                </Link>
              </Button>
              <h2 className="text-lg font-black">
                {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
              </h2>
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full"
              >
                <Link to={`?month=${nextMonth}`} aria-label="다음 달">
                  <ChevronRightIcon />
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-7 text-center text-xs font-bold">
              {weekdays.map((weekday, index) => (
                <span
                  key={weekday}
                  className={cn(
                    "py-2",
                    index === 0 && "text-rose-500",
                    index === 6 && "text-blue-500",
                  )}
                >
                  {weekday}
                </span>
              ))}
              {dates.map((date, index) =>
                date ? (
                  <Link
                    key={date}
                    to={`?month=${month}&date=${date}`}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                      available.has(date)
                        ? "hover:bg-emerald-500/15"
                        : "text-muted-foreground/45 pointer-events-none",
                      date === selectedDate &&
                        "bg-emerald-500 text-black hover:bg-emerald-500",
                    )}
                  >
                    {Number(date.slice(8))}
                    {available.has(date) && date !== selectedDate && (
                      <span className="absolute bottom-1.5 size-1 rounded-full bg-emerald-500" />
                    )}
                  </Link>
                ) : (
                  <span key={`empty-${index}`} />
                ),
              )}
            </div>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                {selectedDate.replaceAll("-", ".")}
              </p>
              <h2 className="mt-1 text-xl font-black">
                분석 결과 {dayRecords.length}개
              </h2>
            </div>
            {dayRecords.length ? (
              <div className="mt-5 grid grid-cols-1 gap-3">
                {[...dayRecords]
                  .sort((a, b) => a.goalAmount - b.goalAmount)
                  .map((record) => {
                    const stockNames = record.result.holdings
                      .map((holding) => holding.name)
                      .join(" · ");
                    return (
                      <Link
                        key={record.id}
                        to={`?month=${month}&date=${selectedDate}&analysis=${record.id}`}
                        className={cn(
                          "rounded-2xl border p-4 transition-colors hover:border-emerald-500/50",
                          selected?.id === record.id &&
                            "border-emerald-500 bg-emerald-500/[0.07]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-black">
                              {goalLabel(record.goalAmount)} 목표 분석
                            </p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground mt-1 inline-block max-w-full cursor-help truncate align-bottom text-xs">
                                  {stockNames} · {record.result.holdings.length}
                                  개 종목
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                sideOffset={6}
                                className="max-w-sm leading-5 break-keep"
                              >
                                {stockNames} · {record.result.holdings.length}개
                                종목
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <TargetIcon className="size-5 shrink-0 text-emerald-500" />
                        </div>
                        <div className="text-muted-foreground mt-4 flex gap-4 text-xs font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock3Icon className="size-3.5" />
                            {durationLabel(record.goalMonth)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TargetIcon className="size-3.5" />
                            {record.returnRate >= 0 ? "+" : ""}
                            {record.returnRate.toFixed(1)}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="text-muted-foreground mt-8 rounded-2xl border border-dashed p-10 text-center text-sm">
                이 날짜에 저장된 분석 결과가 없어요.
              </div>
            )}
          </div>
        </section>

        {selected && (
          <section className="mt-7">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-500">
                  저장된 분석 결과
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {goalLabel(selected.goalAmount)} 목표 분석
                </h2>
              </div>
              <span className="text-muted-foreground text-sm">
                기준일 {selected.result.asOf}
              </span>
            </div>
            <AnalysisResultView result={selected.result} showAuthCta={false} />
          </section>
        )}
      </div>
    </main>
  );
}
