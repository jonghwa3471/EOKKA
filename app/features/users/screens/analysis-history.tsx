import type { Route } from "./+types/analysis-history";

import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  Clock3Icon,
  TargetIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import {
  deleteAllAnalysisSnapshots,
  deleteAnalysisSnapshot,
  getAnalysisHistory,
  getPreferredGoalAmount,
} from "~/features/stocks/history/analysis-history.server";

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

const won = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function wonLabel(value: number) {
  return `${won.format(Math.round(value))}원`;
}

type AnalysisRecord = Awaited<ReturnType<typeof getAnalysisHistory>>[number];

function SavedAnalysisResult({ record }: { record: AnalysisRecord }) {
  const [showDetails, setShowDetails] = useState(false);
  const progress = Math.min(
    100,
    Math.max(0, (record.currentValue / record.goalAmount) * 100),
  );
  const holdings = record.result.holdings.map((holding) => holding.name);

  return (
    <>
      <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-emerald-500">분석 요약</p>
            <h3 className="mt-1 text-xl font-black">
              {goalLabel(record.goalAmount)}을 향한 현재 위치
            </h3>
          </div>
          <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs font-semibold">
            {record.result.holdings.length}개 종목
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem
            label="현재 평가금액"
            value={wonLabel(record.currentValue)}
          />
          <SummaryItem
            label="평가손익"
            value={`${record.profit >= 0 ? "+" : ""}${wonLabel(record.profit)}`}
            valueClass={record.profit >= 0 ? "text-rose-500" : "text-blue-500"}
          />
          <SummaryItem
            label="현재 수익률"
            value={`${record.returnRate >= 0 ? "+" : ""}${record.returnRate.toFixed(1)}%`}
            valueClass={
              record.returnRate >= 0 ? "text-rose-500" : "text-blue-500"
            }
          />
          <SummaryItem
            label="목표 도달 예상"
            value={durationLabel(record.goalMonth)}
          />
          <SummaryItem label="목표 달성률" value={`${progress.toFixed(1)}%`} />
          <SummaryItem
            label="목표까지 남은 금액"
            value={wonLabel(
              Math.max(0, record.goalAmount - record.currentValue),
            )}
          />
        </div>

        <div className="bg-muted/55 mt-5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 text-xs font-bold">
            <span>목표 진행 상황</span>
            <span>{goalLabel(record.goalAmount)}</span>
          </div>
          <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-3 truncate text-xs">
            {holdings.join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <Button
          type="button"
          size="lg"
          variant={showDetails ? "outline" : "default"}
          className="rounded-full px-7"
          onClick={() => setShowDetails((current) => !current)}
          aria-expanded={showDetails}
        >
          {showDetails ? (
            <>
              <ChevronUpIcon /> 분석 상세 접기
            </>
          ) : (
            <>
              <ChevronDownIcon /> 분석 상세보기
            </>
          )}
        </Button>
      </div>

      {showDetails && (
        <div className="mt-7">
          <AnalysisResultView result={record.result} showAuthCta={false} />
        </div>
      )}
    </>
  );
}

function SummaryItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-background/55 rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className={cn("mt-2 text-lg font-black", valueClass)}>{value}</p>
    </div>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const [history, preferredGoalAmount] = user
    ? await Promise.all([
        getAnalysisHistory(user.id),
        getPreferredGoalAmount(user.id),
      ])
    : [[], null];
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
  const dayRecords = history
    .filter((item) => item.savedOn === selectedDate)
    .sort((a, b) => a.goalAmount - b.goalAmount);
  const requestedId = Number(url.searchParams.get("analysis"));
  const selected =
    dayRecords.find((item) => item.id === requestedId) ??
    dayRecords.find((item) => item.goalAmount === preferredGoalAmount) ??
    dayRecords[0] ??
    null;

  return { history, availableDates, selectedDate, month, dayRecords, selected };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "delete-all-history") {
    await deleteAllAnalysisSnapshots(user.id);
    return redirect("/dashboard/history");
  }

  if (intent === "delete-analysis") {
    const savedOn = validDate(String(formData.get("savedOn") ?? ""));
    const snapshotId = Number(formData.get("snapshotId"));
    const history = await getAnalysisHistory(user.id);
    if (
      !savedOn ||
      !Number.isSafeInteger(snapshotId) ||
      !history.some(
        (item) => item.id === snapshotId && item.savedOn === savedOn,
      )
    ) {
      throw new Response("Invalid analysis snapshot", { status: 400 });
    }
    await deleteAnalysisSnapshot({ userId: user.id, snapshotId });

    const remainingHistory = history.filter((item) => item.id !== snapshotId);
    const nextDate = remainingHistory.some((item) => item.savedOn === savedOn)
      ? savedOn
      : remainingHistory.at(-1)?.savedOn;
    return redirect(
      nextDate
        ? `/dashboard/history?month=${nextDate.slice(0, 7)}&date=${nextDate}`
        : "/dashboard/history",
    );
  }

  throw new Response("Invalid action", { status: 400 });
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
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
          </div>
          {availableDates.length > 0 && (
            <Form
              method="post"
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "모든 목표의 분석 기록을 전부 삭제할까요? 삭제한 기록은 복구할 수 없고, 홈에서 다시 분석하기 전까지 자동 기록도 중단돼요.",
                  )
                )
                  event.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete-all-history" />
              <Button
                type="submit"
                variant="outline"
                className="rounded-full text-rose-500 hover:text-rose-500"
              >
                <Trash2Icon /> 전체 기록 삭제
              </Button>
            </Form>
          )}
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
                {dayRecords.map((record) => {
                  const stockNames = record.result.holdings
                    .map((holding) => holding.name)
                    .join(" · ");
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "flex items-center rounded-2xl border transition-colors hover:border-emerald-500/50",
                        selected?.id === record.id &&
                          "border-emerald-500 bg-emerald-500/[0.07]",
                      )}
                    >
                      <Link
                        to={`?month=${month}&date=${selectedDate}&analysis=${record.id}`}
                        className="min-w-0 flex-1 p-4"
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
                      <Form
                        method="post"
                        className="mr-3 shrink-0"
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `${selectedDate}의 ${goalLabel(record.goalAmount)} 목표 분석을 삭제할까요?`,
                            )
                          )
                            event.preventDefault();
                        }}
                      >
                        <input
                          type="hidden"
                          name="intent"
                          value="delete-analysis"
                        />
                        <input
                          type="hidden"
                          name="snapshotId"
                          value={record.id}
                        />
                        <input
                          type="hidden"
                          name="savedOn"
                          value={selectedDate}
                        />
                        <Button
                          type="submit"
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground size-9 rounded-full hover:text-rose-500"
                          aria-label={`${goalLabel(record.goalAmount)} 목표 분석 삭제`}
                          title="이 분석 삭제"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </Form>
                    </div>
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
            <SavedAnalysisResult key={selected.id} record={selected} />
          </section>
        )}
      </div>
    </main>
  );
}
