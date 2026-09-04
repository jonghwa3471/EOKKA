import type { Route } from "./+types/analysis-history";

import {
  AwardIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  Clock3Icon,
  PieChartIcon,
  SparklesIcon,
  TargetIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";
import { Form, Link, redirect, useNavigate } from "react-router";

import { DestructiveConfirmDialog } from "~/core/components/destructive-confirm-dialog";
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

type DailyHoldingMove = {
  name: string;
  returnRate: number;
};

function SavedAnalysisResult({
  record,
  dailyMovements,
}: {
  record: AnalysisRecord;
  dailyMovements: DailyHoldingMove[];
}) {
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
            <span>
              {progress.toFixed(1)}% · {goalLabel(record.goalAmount)}
            </span>
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

        <DailyAnalysisInsights
          record={record}
          progress={progress}
          dailyMovements={dailyMovements}
        />
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
          <AnalysisResultView
            result={record.result}
            showAuthCta={false}
            showContributionDetails
          />
        </div>
      )}
    </>
  );
}

function DailyAnalysisInsights({
  record,
  progress,
  dailyMovements,
}: {
  record: AnalysisRecord;
  progress: number;
  dailyMovements: DailyHoldingMove[];
}) {
  const holdings = record.result.holdings;
  const topWeightHolding = [...holdings].sort(
    (a, b) => b.valueKrw - a.valueKrw,
  )[0];
  const bestPerformer = [...holdings].sort(
    (a, b) => b.returnRate - a.returnRate,
  )[0];
  const weakestPerformer = [...holdings].sort(
    (a, b) => a.returnRate - b.returnRate,
  )[0];
  const dailyWinner = [...dailyMovements].sort(
    (a, b) => b.returnRate - a.returnRate,
  )[0];
  const dailyLoser = [...dailyMovements].sort(
    (a, b) => a.returnRate - b.returnRate,
  )[0];
  const topWeight =
    topWeightHolding && record.currentValue > 0
      ? (topWeightHolding.valueKrw / record.currentValue) * 100
      : 0;
  const investmentStyle = record.result.investmentStyle;
  const cagr =
    record.result.cagr.oneYear ??
    record.result.cagr.threeYear ??
    record.result.cagr.fiveYear ??
    record.result.cagr.available;

  const goalMessage =
    progress >= 100
      ? "목표선을 이미 통과했어요. 다음 목표를 정해도 좋아요."
      : progress >= 50
        ? "절반을 넘었어요. 복리의 힘이 더 눈에 띄기 시작하는 구간이에요."
        : progress >= 20
          ? "목표의 5분의 1을 넘었어요. 지금의 흐름을 꾸준히 쌓아가요."
          : "아직 출발 구간이에요. 작은 상승도 목표 거리에는 분명한 변화예요.";

  return (
    <section className="mt-5 border-t pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-500">
            <SparklesIcon className="size-4" /> THIS DAY&apos;S INSIGHT
          </div>
          <h4 className="mt-1 text-lg font-black">
            이날의 포트폴리오 인사이트
          </h4>
          <p className="text-muted-foreground mt-1 text-sm">
            {record.savedOn.replaceAll("-", ".")}에 저장된 분석 결과만 바탕으로
            정리했어요.
          </p>
        </div>
        {investmentStyle && (
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-300">
            {investmentStyle.title}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DailyInsightCard
          icon={PieChartIcon}
          eyebrow="포트폴리오 중심축"
          title={topWeightHolding?.name ?? "종목 정보 없음"}
          value={topWeightHolding ? `${topWeight.toFixed(1)}%` : "—"}
          detail={
            topWeightHolding
              ? `이날 평가금액 중 가장 큰 비중을 차지했어요.`
              : "보유 종목 정보가 없어요."
          }
          tone="violet"
        />
        <DailyInsightCard
          icon={AwardIcon}
          eyebrow="수익률 리더"
          title={bestPerformer?.name ?? "종목 정보 없음"}
          value={
            bestPerformer
              ? `${bestPerformer.returnRate >= 0 ? "+" : ""}${bestPerformer.returnRate.toFixed(1)}%`
              : "—"
          }
          detail="이날 보유 종목 가운데 수익률이 가장 높았어요."
          tone="rose"
        />
        <DailyInsightCard
          icon={TrendingDownIcon}
          eyebrow="수익률 꼴등"
          title={weakestPerformer?.name ?? "종목 정보 없음"}
          value={
            weakestPerformer
              ? `${weakestPerformer.returnRate >= 0 ? "+" : ""}${weakestPerformer.returnRate.toFixed(1)}%`
              : "—"
          }
          detail="이날 보유 종목 가운데 수익률이 가장 낮았어요."
          tone="blue"
        />
        <DailyInsightCard
          icon={TargetIcon}
          eyebrow="목표와의 거리"
          title={progress >= 100 ? "목표 달성" : `${progress.toFixed(1)}% 진행`}
          value={durationLabel(record.goalMonth)}
          detail={goalMessage}
          tone="emerald"
        />
        <DailyInsightCard
          icon={TrendingUpIcon}
          eyebrow="당일 상승 1위"
          title={dailyWinner?.name ?? "비교 기록이 더 필요해요"}
          value={
            dailyWinner
              ? `${dailyWinner.returnRate >= 0 ? "+" : ""}${dailyWinner.returnRate.toFixed(1)}%`
              : "—"
          }
          detail={
            dailyWinner
              ? "직전 저장 기록과 비교한 해당 종목의 당일 가격 변화예요."
              : "같은 목표의 직전 분석 기록이 있어야 계산할 수 있어요."
          }
          tone="rose"
        />
        <DailyInsightCard
          icon={TrendingDownIcon}
          eyebrow="당일 하락 1위"
          title={dailyLoser?.name ?? "비교 기록이 더 필요해요"}
          value={dailyLoser ? `${dailyLoser.returnRate.toFixed(1)}%` : "—"}
          detail={
            dailyLoser
              ? "직전 저장 기록과 비교한 해당 종목의 당일 가격 변화예요."
              : "같은 목표의 직전 분석 기록이 있어야 계산할 수 있어요."
          }
          tone="blue"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="bg-muted/45 rounded-2xl border p-4 text-sm leading-6">
          <div className="flex items-center gap-2 font-black">
            <TrendingUpIcon className="size-4 text-emerald-500" />
            이날의 흐름 한 줄
          </div>
          <p className="text-muted-foreground mt-2">
            {cagr === null
              ? "충분한 과거 가격 데이터가 쌓이면 장기 수익 흐름도 함께 비교할 수 있어요."
              : `이 포트폴리오의 확보된 과거 수익 흐름은 연 ${cagr.toFixed(1)}% 수준이에요. 미래 수익을 보장하는 값은 아니지만, 목표 시나리오의 출발점으로 활용돼요.`}
          </p>
        </div>
        <div className="bg-muted/45 rounded-2xl border p-4 text-sm leading-6">
          <div className="flex items-center gap-2 font-black">
            <SparklesIcon className="size-4 text-violet-500" />
            투자 성향 메모
          </div>
          <p className="text-muted-foreground mt-2">
            {investmentStyle?.description ??
              "저장된 종목 구성으로 투자 성향을 계산하는 중이에요."}
          </p>
        </div>
      </div>
    </section>
  );
}

function DailyInsightCard({
  icon: Icon,
  eyebrow,
  title,
  value,
  detail,
  tone,
}: {
  icon: typeof SparklesIcon;
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "rose" | "blue" | "violet";
}) {
  const tones = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-500",
    rose: "border-rose-500/20 bg-rose-500/[0.06] text-rose-500",
    blue: "border-blue-500/20 bg-blue-500/[0.06] text-blue-500",
    violet: "border-violet-500/20 bg-violet-500/[0.06] text-violet-500",
  } as const;

  return (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>
      <div className="flex items-center gap-2 text-xs font-bold">
        <Icon className="size-3.5" /> {eyebrow}
      </div>
      <p className="text-foreground mt-4 truncate font-black">{title}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-3 text-xs leading-5">{detail}</p>
    </div>
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
    .sort(
      (a, b) =>
        Number(b.analysisMode === "managed") -
          Number(a.analysisMode === "managed") || a.goalAmount - b.goalAmount,
    );
  const requestedId = Number(url.searchParams.get("analysis"));
  const selected =
    dayRecords.find((item) => item.id === requestedId) ??
    dayRecords.find((item) => item.goalAmount === preferredGoalAmount) ??
    dayRecords[0] ??
    null;

  const previousSameGoal = selected
    ? [...history]
        .reverse()
        .find(
          (item) =>
            item.goalAmount === selected.goalAmount &&
            item.analysisMode === selected.analysisMode &&
            item.savedOn < selected.savedOn,
        )
    : null;
  const previousPrices = new Map(
    previousSameGoal?.result.holdings.map((holding) => [
      holding.ticker,
      holding.currentPrice,
    ]) ?? [],
  );
  const dailyMovements = selected
    ? selected.result.holdings.flatMap((holding) => {
        const previousPrice = previousPrices.get(holding.ticker);
        if (!previousPrice || previousPrice <= 0) return [];
        return [
          {
            name: holding.name,
            returnRate:
              ((holding.currentPrice - previousPrice) / previousPrice) * 100,
          },
        ];
      })
    : [];

  return {
    history,
    availableDates,
    selectedDate,
    month,
    dayRecords,
    selected,
    dailyMovements,
    hasQuickHistory: history.some((item) => item.analysisMode === "quick"),
    managedStartedOn: history.find((item) => item.analysisMode === "managed")
      ?.savedOn,
  };
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
  const {
    availableDates,
    selectedDate,
    month,
    dayRecords,
    selected,
    dailyMovements,
    hasQuickHistory,
    managedStartedOn,
  } = loaderData;
  const dates = calendarDates(month);
  const available = new Set(availableDates);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const navigate = useNavigate();
  const calendarYear = Number(month.slice(0, 4));
  const calendarMonth = Number(month.slice(5));
  const todayYear = Number(seoulToday().slice(0, 4));
  const earliestYear = availableDates.length
    ? Math.min(...availableDates.map((date) => Number(date.slice(0, 4))))
    : todayYear;
  const firstSelectableYear = Math.min(
    earliestYear,
    calendarYear,
    todayYear - 10,
  );
  const lastSelectableYear = Math.max(todayYear, calendarYear);
  const calendarYears = Array.from(
    { length: Math.max(1, lastSelectableYear - firstSelectableYear + 1) },
    (_, index) => lastSelectableYear - index,
  );
  const moveToMonth = (year: number, monthNumber: number) =>
    navigate(`?month=${year}-${String(monthNumber).padStart(2, "0")}`);

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
            <DestructiveConfirmDialog
              title="분석 기록을 전부 삭제할까요?"
              description="모든 날짜와 목표 금액의 분석 기록이 삭제됩니다. 삭제한 기록은 복구할 수 없으며, 다시 분석하기 전까지 자동 기록도 중단돼요."
              confirmLabel="분석 기록 전체 삭제"
              fields={{ intent: "delete-all-history" }}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-red-500/25 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2Icon /> 전체 기록 삭제
                </Button>
              }
            />
          )}
        </header>

        {managedStartedOn && hasQuickHistory && (
          <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-sm leading-6">
            <p className="font-black">
              {managedStartedOn.replaceAll("-", ".")}부터 정밀 분석을 사용
              중이에요.
            </p>
            <p className="text-muted-foreground mt-1">
              전환 이전 기록은 빠른 분석 기준으로 보관되며, 대시보드와 인사이트
              통계에는 포함되지 않아요.
            </p>
          </div>
        )}

        <section className="mt-7 grid items-start gap-5 xl:grid-cols-[380px_1fr]">
          <div className="bg-card rounded-3xl border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full"
              >
                <Link
                  to={`?month=${previousMonth}`}
                  aria-label="이전 달"
                  title="이전 달"
                >
                  <ChevronLeftIcon />
                </Link>
              </Button>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(calendarYear)}
                  onValueChange={(value) =>
                    moveToMonth(Number(value), calendarMonth)
                  }
                >
                  <SelectTrigger
                    aria-label="연도 선택"
                    className="w-[108px] rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(calendarMonth)}
                  onValueChange={(value) =>
                    moveToMonth(calendarYear, Number(value))
                  }
                >
                  <SelectTrigger
                    aria-label="월 선택"
                    className="w-[84px] rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (monthNumber) => (
                        <SelectItem
                          key={monthNumber}
                          value={String(monthNumber)}
                        >
                          {monthNumber}월
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full"
              >
                <Link
                  to={`?month=${nextMonth}`}
                  aria-label="다음 달"
                  title="다음 달"
                >
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
                            <div className="mt-2 flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black",
                                  record.analysisMode === "managed"
                                    ? "bg-emerald-500/12 text-emerald-500"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {record.analysisMode === "managed"
                                  ? "정밀 분석"
                                  : managedStartedOn
                                    ? "빠른 분석 · 정밀 분석 전환 이전"
                                    : "빠른 분석"}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground min-w-0 flex-1 cursor-help truncate text-xs">
                                    {stockNames} ·{" "}
                                    {record.result.holdings.length}개 종목
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={6}
                                  className="max-w-sm leading-5 break-keep"
                                >
                                  {stockNames} · {record.result.holdings.length}
                                  개 종목
                                </TooltipContent>
                              </Tooltip>
                            </div>
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
                      <div className="mr-3 shrink-0">
                        <DestructiveConfirmDialog
                          title={`${goalLabel(record.goalAmount)} 목표 분석을 삭제할까요?`}
                          description={`${selectedDate.replaceAll("-", ".")}에 저장한 목표 분석 하나를 삭제합니다. 삭제한 기록은 복구할 수 없어요.`}
                          confirmLabel="분석 삭제"
                          fields={{
                            intent: "delete-analysis",
                            snapshotId: record.id,
                            savedOn: selectedDate,
                          }}
                          trigger={
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground size-9 rounded-full hover:text-rose-500"
                              aria-label={`${goalLabel(record.goalAmount)} 목표 분석 삭제`}
                              title="이 분석 삭제"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          }
                        />
                      </div>
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
            <SavedAnalysisResult
              key={selected.id}
              record={selected}
              dailyMovements={dailyMovements}
            />
          </section>
        )}
      </div>
    </main>
  );
}
