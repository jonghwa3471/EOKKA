import {
  ArrowRightIcon,
  BarChart3Icon,
  ChevronRightIcon,
  Clock3Icon,
  PieChartIcon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";
import { cn } from "~/core/lib/utils";

import {
  formatGoalPeriod,
  formatKoreanMoney,
  koreanParticle,
} from "../formatters";

type MoneyInsight = {
  goalAmount: number;
  latestUpdatedAt: string;
  marketAsOf: string;
  isLatestToday: boolean;
  dailyProfitChange: number | null;
  monthlyProfitChange: number | null;
  recordCount: number;
  currentValue: number;
  profit: number;
  returnRate: number;
  remainingAmount: number;
  progressPercent: number;
  goalMonth: number | null;
  goalMonthChange: number | null;
  profitableHoldingCount: number;
  holdingCount: number;
  topHoldingName: string | null;
  topHoldingWeight: number | null;
  leadingHolding: { name: string; change: number } | null;
  comparisonDate: string | null;
  portfolioChanges: Array<{
    ticker: string;
    name: string;
    currentValue: number;
    previousValue: number | null;
    change: number | null;
    weight: number;
    returnRateChange: number | null;
    status: "added" | "held" | "removed";
  }>;
  trend: Array<{ savedOn: string; currentValue: number }>;
};

function GoalTrend({ points }: { points: MoneyInsight["trend"] }) {
  if (points.length < 2) {
    return (
      <div className="text-muted-foreground flex h-28 items-center justify-center text-sm">
        기록이 하나 더 쌓이면 흐름을 그려드려요.
      </div>
    );
  }

  const values = points.map((point) => point.currentValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  const chartWidth = 640;
  const chartHeight = 240;
  const horizontalPadding = 18;
  const chartTop = 28;
  const chartBottom = 204;
  const coordinates = points.map((point, index) => ({
    x:
      horizontalPadding +
      (index / (points.length - 1)) * (chartWidth - horizontalPadding * 2),
    y:
      chartBottom -
      ((point.currentValue - minimum) / range) * (chartBottom - chartTop),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="최근 평가금액 변화"
        className="block h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="home-goal-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((index) => {
          const y = chartTop + ((chartBottom - chartTop) / 2) * index;
          return (
            <line
              key={y}
              x1={horizontalPadding}
              x2={chartWidth - horizontalPadding}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border/55"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <polygon
          points={`${horizontalPadding},${chartBottom} ${line} ${chartWidth - horizontalPadding},${chartBottom}`}
          fill="url(#home-goal-trend)"
        />
        <polyline
          points={line}
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coordinates.map((point, index) => (
          <circle
            key={points[index].savedOn}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="rgb(16 185 129)"
            stroke="var(--background)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{points[0].savedOn.slice(5).replace("-", ".")}</span>
        <span>{points.at(-1)!.savedOn.slice(5).replace("-", ".")}</span>
      </div>
    </div>
  );
}

const MONEY_METAPHORS = [
  {
    max: 10_000,
    label: "커피 한 잔",
    image: "/images/money-metaphors/coffee.png",
  },
  {
    max: 50_000,
    label: "치킨 한 마리",
    image: "/images/money-metaphors/chicken.png",
  },
  {
    max: 300_000,
    label: "운동화 한 켤레",
    image: "/images/money-metaphors/sneakers.png",
  },
  {
    max: 500_000,
    label: "무선 이어폰 한 세트",
    image: "/images/money-metaphors/earbuds.png",
  },
  {
    max: 1_000_000,
    label: "태블릿 한 대",
    image: "/images/money-metaphors/tablet.png",
  },
  {
    max: 2_000_000,
    label: "게임기 한 대",
    image: "/images/money-metaphors/console.png",
  },
  {
    max: 5_000_000,
    label: "가까운 여행 한 번",
    image: "/images/money-metaphors/travel.png",
  },
  {
    max: 30_000_000,
    label: "프리미엄 시계 하나",
    image: "/images/money-metaphors/watch.png",
  },
  {
    max: 100_000_000,
    label: "자동차 한 대",
    image: "/images/money-metaphors/car.png",
  },
  {
    max: Number.POSITIVE_INFINITY,
    label: "집 한 채",
    image: "/images/money-metaphors/house.png",
  },
] as const;

function moneyMetaphor(amount: number) {
  const absoluteAmount = Math.abs(amount);
  return (
    MONEY_METAPHORS.find((metaphor) => absoluteAmount < metaphor.max) ??
    MONEY_METAPHORS.at(-1)!
  );
}

function ProfitMetaphorCard({
  amount,
  period,
  periodLabel: customPeriodLabel,
}: {
  amount: number | null;
  period: "daily" | "monthly";
  periodLabel?: string;
}) {
  const periodLabel =
    customPeriodLabel ?? (period === "daily" ? "오늘" : "이번 달");

  if (amount === null) {
    return (
      <div className="bg-muted/35 flex min-h-56 flex-col justify-center rounded-2xl border border-dashed p-6 text-left">
        <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
          {period === "daily" ? "Today" : "This month"}
        </p>
        <p className="mt-3 text-lg font-black">비교 기록이 하나 더 필요해요</p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          다음 분석이 저장되면 {periodLabel} 손익을 친숙한 물건으로
          바꿔드릴게요.
        </p>
      </div>
    );
  }

  const metaphor = moneyMetaphor(amount);
  const isGain = amount > 0;
  const isFlat = amount === 0;
  const message = isFlat
    ? `${periodLabel}은 자산이 제자리예요`
    : isGain
      ? `${periodLabel} ${metaphor.label}값을 벌었어요!`
      : `${periodLabel} ${metaphor.label}값을 날렸어요 ㅠㅠ`;

  return (
    <div
      className={cn(
        "relative min-h-56 overflow-hidden rounded-2xl border p-6 text-left",
        isGain
          ? "via-background border-red-500/20 bg-gradient-to-br from-red-500/10 to-amber-500/10"
          : isFlat
            ? "bg-muted/35"
            : "via-background border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-sky-500/10",
      )}
    >
      <div className="relative z-10 max-w-[68%]">
        <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
          {period === "daily" ? "Today" : "This month"}
        </p>
        <p className="mt-3 text-xl leading-snug font-black text-balance sm:text-2xl">
          {message}
        </p>
        <p
          className={cn(
            "mt-4 text-lg font-black tabular-nums",
            isGain
              ? "text-red-500"
              : isFlat
                ? "text-muted-foreground"
                : "text-blue-500",
          )}
        >
          {isGain ? "+" : amount < 0 ? "-" : ""}
          {formatKoreanMoney(Math.abs(amount))}
        </p>
      </div>
      <img
        src={metaphor.image}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -bottom-6 size-40 object-contain drop-shadow-2xl sm:size-48"
      />
    </div>
  );
}

export function MyEokkaSummary({ insight }: { insight: MoneyInsight }) {
  const latestUpdatedAt = new Date(insight.latestUpdatedAt);
  const latestUpdateLabel = new Intl.DateTimeFormat("ko-KR", {
    ...(insight.isLatestToday
      ? {}
      : { month: "long" as const, day: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(latestUpdatedAt);
  const marketDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${insight.marketAsOf}T12:00:00+09:00`));

  return (
    <div className="bg-card/90 rounded-3xl border p-5 text-left shadow-2xl shadow-black/5 backdrop-blur sm:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-500 uppercase">
            My EOKKA
          </p>
          <h2 className="mt-2 text-2xl font-black">내 돈의 오늘을 쉽게 봐요</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {formatKoreanMoney(insight.goalAmount)} 목표 · 최근{" "}
            {insight.recordCount}개 기록 기준
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {insight.isLatestToday
            ? `오늘 ${latestUpdateLabel} 업데이트`
            : `${latestUpdateLabel} 업데이트`}
        </p>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <Clock3Icon className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>{marketDate} 종가 기준</strong>이에요. 실시간 가격이 아닌 해당
          거래일의 마감 가격으로 계산했어요.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            현재 평가금액
          </p>
          <p className="mt-2 text-xl font-black tabular-nums">
            {formatKoreanMoney(insight.currentValue)}
          </p>
        </div>
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            평가손익
          </p>
          <p
            className={cn(
              "mt-2 text-xl font-black tabular-nums",
              insight.profit > 0
                ? "text-red-500"
                : insight.profit < 0
                  ? "text-blue-500"
                  : "text-muted-foreground",
            )}
          >
            {insight.profit > 0 ? "+" : insight.profit < 0 ? "-" : ""}
            {formatKoreanMoney(Math.abs(insight.profit))}
          </p>
        </div>
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            현재 수익률
          </p>
          <p
            className={cn(
              "mt-2 text-xl font-black tabular-nums",
              insight.returnRate > 0
                ? "text-red-500"
                : insight.returnRate < 0
                  ? "text-blue-500"
                  : "text-muted-foreground",
            )}
          >
            {insight.returnRate > 0 ? "+" : ""}
            {insight.returnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ProfitMetaphorCard
          amount={insight.dailyProfitChange}
          period="daily"
          periodLabel={insight.isLatestToday ? "오늘" : "최근 하루"}
        />
        <ProfitMetaphorCard
          amount={insight.monthlyProfitChange}
          period="monthly"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                <TargetIcon className="size-4 text-emerald-500" /> Goal progress
              </p>
              <p className="mt-3 text-2xl font-black sm:text-3xl">
                {formatGoalPeriod(insight.goalMonth)}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                평균 시나리오 기준 목표 도달 예상 기간
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-emerald-500 tabular-nums">
                {insight.progressPercent.toFixed(1)}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">목표 달성률</p>
            </div>
          </div>
          <div className="bg-muted mt-5 h-2.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${insight.progressPercent}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col justify-between gap-2 text-sm sm:flex-row">
            <span className="text-muted-foreground">
              현재 {formatKoreanMoney(insight.currentValue)}
            </span>
            <strong>
              목표까지 {formatKoreanMoney(insight.remainingAmount)}
            </strong>
          </div>
        </section>

        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
            <Clock3Icon className="size-4 text-emerald-500" /> Time change
          </p>
          {insight.goalMonthChange === null ? (
            <>
              <p className="mt-4 text-xl font-black">비교 기록이 필요해요</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                다음 기록부터 목표가 얼마나 가까워졌는지 알려드려요.
              </p>
            </>
          ) : insight.goalMonthChange === 0 ? (
            <>
              <p className="mt-4 text-xl font-black">예상 기간이 그대로예요</p>
              <p className="text-muted-foreground mt-2 text-sm">
                이전 기록과 같은 예상 기간이에요.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-xl leading-snug font-black">
                목표가 {Math.abs(insight.goalMonthChange)}개월{" "}
                <span
                  className={
                    insight.goalMonthChange > 0
                      ? "text-red-500"
                      : "text-blue-500"
                  }
                >
                  {insight.goalMonthChange > 0 ? "가까워졌어요" : "멀어졌어요"}
                </span>
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                이전 분석의 평균 시나리오와 비교했어요.
              </p>
            </>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="bg-muted/25 group w-full cursor-pointer rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-emerald-500/[0.05] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:outline-none sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                    <TrophyIcon className="size-4 text-amber-500" /> Portfolio
                    check
                  </p>
                  <h3 className="mt-2 text-lg font-black">
                    오늘의 포트폴리오 한눈에
                  </h3>
                </div>
                <span className="bg-background/70 text-muted-foreground flex size-9 items-center justify-center rounded-xl border transition-all group-hover:border-emerald-500/30 group-hover:text-emerald-500">
                  <ChevronRightIcon className="size-5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <strong>
                    {insight.holdingCount}개 종목 중{" "}
                    {insight.profitableHoldingCount}개
                  </strong>
                  가 수익 구간이에요.
                </p>
                {insight.topHoldingName &&
                  insight.topHoldingWeight !== null && (
                    <p className="text-muted-foreground leading-6">
                      <strong className="text-foreground">
                        {insight.topHoldingName}
                      </strong>
                      {koreanParticle(insight.topHoldingName, "이", "가")} 현재
                      자산의{" "}
                      <strong className="text-foreground">
                        {insight.topHoldingWeight.toFixed(1)}%
                      </strong>
                      를 차지해요.
                    </p>
                  )}
                {insight.leadingHolding && (
                  <p className="text-muted-foreground leading-6">
                    최근 변화에 가장 크게 영향을 준 종목은{" "}
                    <strong className="text-foreground">
                      {insight.leadingHolding.name}
                    </strong>
                    {koreanParticle(
                      insight.leadingHolding.name,
                      "이에요",
                      "예요",
                    )}
                    <span
                      className={
                        insight.leadingHolding.change >= 0
                          ? "text-red-500"
                          : "text-blue-500"
                      }
                    >
                      {" "}
                      ({insight.leadingHolding.change >= 0 ? "+" : "-"}
                      {formatKoreanMoney(
                        Math.abs(insight.leadingHolding.change),
                      )}
                      )
                    </span>
                    .
                  </p>
                )}
              </div>
              <p className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-emerald-500 opacity-80">
                변경 사항 자세히 보기 <ChevronRightIcon className="size-3.5" />
              </p>
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl p-0 sm:max-w-2xl">
            <DialogHeader className="border-b bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10 p-6 pr-14 text-left">
              <p className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-emerald-500 uppercase">
                <PieChartIcon className="size-4" /> Portfolio changes
              </p>
              <DialogTitle className="mt-1 text-2xl font-black">
                포트폴리오 변경 사항
              </DialogTitle>
              <DialogDescription className="leading-6">
                {insight.comparisonDate
                  ? `${insight.comparisonDate.replaceAll("-", ".")} 기록과 ${insight.marketAsOf.replaceAll("-", ".")} 종가 기록을 비교했어요.`
                  : `${insight.marketAsOf.replaceAll("-", ".")} 첫 기록의 현재 보유 현황이에요.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-5 sm:p-6">
              {!insight.comparisonDate && (
                <div className="bg-muted/30 text-muted-foreground rounded-2xl border border-dashed p-4 text-sm leading-6">
                  아직 비교할 이전 기록이 없어요. 다음 종가 기록이 쌓이면 종목별
                  평가금액 변화를 보여드릴게요.
                </div>
              )}
              {insight.portfolioChanges.map((holding) => {
                const isGain = (holding.change ?? 0) > 0;
                const isLoss = (holding.change ?? 0) < 0;
                return (
                  <article
                    key={holding.ticker}
                    className="bg-muted/20 rounded-2xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-black">
                            {holding.name}
                          </h4>
                          {holding.status !== "held" && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-black",
                                holding.status === "added"
                                  ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                  : "bg-blue-500/12 text-blue-600 dark:text-blue-400",
                              )}
                            >
                              {holding.status === "added"
                                ? "새로 추가"
                                : "보유 종료"}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs font-bold">
                          {holding.ticker}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-black tabular-nums">
                          {formatKoreanMoney(holding.currentValue)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          현재 비중 {holding.weight.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {holding.change !== null && (
                      <div className="mt-4 space-y-2 border-t pt-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            이전 평가금액{" "}
                            {formatKoreanMoney(holding.previousValue ?? 0)}
                          </span>
                          <strong
                            className={cn(
                              "tabular-nums",
                              isGain
                                ? "text-red-500"
                                : isLoss
                                  ? "text-blue-500"
                                  : "text-muted-foreground",
                            )}
                          >
                            {isGain ? "+" : isLoss ? "-" : ""}
                            {formatKoreanMoney(Math.abs(holding.change))}
                          </strong>
                        </div>
                        {holding.returnRateChange !== null && (
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">
                              수익률 변화
                            </span>
                            <strong
                              className={cn(
                                "tabular-nums",
                                holding.returnRateChange > 0
                                  ? "text-red-500"
                                  : holding.returnRateChange < 0
                                    ? "text-blue-500"
                                    : "text-muted-foreground",
                              )}
                            >
                              {holding.returnRateChange > 0
                                ? "+"
                                : holding.returnRateChange < 0
                                  ? "-"
                                  : ""}
                              {Math.abs(holding.returnRateChange).toFixed(2)}%p
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                <BarChart3Icon className="size-4 text-emerald-500" /> Recent
                records
              </p>
              <h3 className="mt-2 text-lg font-black">최근 자산 흐름</h3>
            </div>
            <span className="text-muted-foreground text-xs">
              최근 {insight.trend.length}개
            </span>
          </div>
          <div className="mt-3">
            <GoalTrend points={insight.trend} />
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-xs leading-5">
          저장된 분석의 평가금액 변화를 비교한 값이에요. 매수·매도나 입출금이
          있으면 실제 투자 수익과 차이가 날 수 있어요.
        </p>
        <div className="flex shrink-0">
          <Button asChild>
            <Link to="/dashboard">
              대시보드 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
