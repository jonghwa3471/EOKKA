import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  AwardIcon,
  CoinsIcon,
  CrownIcon,
  FlameIcon,
  HeartCrackIcon,
  PartyPopperIcon,
  PiggyBankIcon,
  ScaleIcon,
  ShieldAlertIcon,
  TargetIcon,
  TimerResetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "~/core/lib/utils";

import { formatMonths, formatRate, formatWon, recordDate } from "./formatters";
import {
  type History,
  calculateHistoryInsights,
  difference,
} from "./history-insights";
import { Change } from "./summary-components";
import { useRevealOncePerVisit } from "./use-reveal-once-per-visit";

export function HistoricalInsights({
  history,
  previousHistory = [],
  period = "weekly",
  rangeLabel,
}: {
  history: History;
  previousHistory?: History;
  period?: "weekly" | "monthly" | "annual";
  rangeLabel?: string;
}) {
  const previousLatest = previousHistory.at(-1) ?? null;
  const insight = calculateHistoryInsights(
    history,
    previousLatest ?? undefined,
  );
  const isWeekly = period === "weekly";
  const periodLabel = isWeekly
    ? "주간"
    : period === "monthly"
      ? "월간"
      : "연간";
  const transitions = insight.changes.length;
  const risingRatio = transitions
    ? (insight.upCount / transitions) * 100
    : null;
  const profitImproved = insight.totalProfitChange >= 0;
  const previousPeriodLabel = isWeekly
    ? "지난주"
    : period === "monthly"
      ? "지난달"
      : "지난해";
  const currentPeriodLabel = isWeekly
    ? "이번 주"
    : period === "monthly"
      ? "이번 달"
      : "올해";
  const previousAssetChange = previousLatest
    ? insight.latest.currentValue - previousLatest.currentValue
    : null;
  const previousReturnChange = previousLatest
    ? insight.latest.returnRate - previousLatest.returnRate
    : null;
  const previousGoalChange = previousLatest
    ? difference(insight.latest.goalMonth, previousLatest.goalMonth)
    : null;
  const comparisonStartLabel = previousLatest
    ? `${previousPeriodLabel} 마지막 기록`
    : `${periodLabel} 첫 기록`;
  const periodTheme =
    period === "weekly"
      ? {
          eyebrow: "이번 주 경기 리포트",
          title: "짧은 승부에서 어떤 힘이 돋보였을까요?",
          description:
            "한 주를 한 경기처럼 보고, 상승한 날과 흔들린 날의 리듬을 빠르게 훑어봤어요.",
          cards: [
            {
              icon: TrendingUpIcon,
              label: "이번 주 승률",
              value: transitions ? `${insight.upCount}/${transitions}일` : "—",
              detail:
                risingRatio === null
                  ? "비교할 기록이 더 필요해요."
                  : `기록 사이 움직임의 ${risingRatio.toFixed(0)}%가 상승이었어요.`,
              tone: "emerald" as const,
            },
            {
              icon: FlameIcon,
              label: "가장 뜨거웠던 하루",
              value: insight.weekly.dramaticChange
                ? recordDate(insight.weekly.dramaticChange.savedOn)
                : "—",
              detail: insight.weekly.dramaticChange
                ? `${formatWon(Math.abs(insight.weekly.dramaticChange.asset))} 움직인 이번 주의 승부처예요.`
                : "이번 주의 승부처를 찾고 있어요.",
              tone: "rose" as const,
            },
            {
              icon: AwardIcon,
              label: "연속 득점",
              value: `${insight.longestUpStreak}회`,
              detail:
                insight.longestUpStreak > 1
                  ? "상승 흐름이 연달아 이어진 구간이에요."
                  : "아직 연승보다는 하루하루 다른 흐름이에요.",
              tone: "violet" as const,
            },
          ],
        }
      : period === "monthly"
        ? {
            eyebrow: "이번 달 투자 가계부",
            title: "한 달 동안 자산의 생활 리듬은 어땠을까요?",
            description:
              "하루의 소음보다 한 달의 습관에 집중해, 평소 흔들림과 쏠림 변화를 살펴봤어요.",
            cards: [
              {
                icon: CoinsIcon,
                label: "한 달 손익 통장",
                value:
                  insight.totalProfitChange === 0
                    ? "변화 없음"
                    : `${insight.totalProfitChange > 0 ? "+" : "-"}${formatWon(Math.abs(insight.totalProfitChange))}`,
                detail:
                  insight.totalProfitChange >= 0
                    ? "월초 기준보다 통장이 두툼해졌어요."
                    : "월초 기준보다 통장이 가벼워졌어요.",
                tone:
                  insight.totalProfitChange >= 0
                    ? ("rose" as const)
                    : ("blue" as const),
              },
              {
                icon: ActivityIcon,
                label: "평소 하루 파도",
                value: transitions ? formatWon(insight.averageMovement) : "—",
                detail: "기록 사이에서 자산이 오르내린 금액의 평균이에요.",
                tone: "violet" as const,
              },
              {
                icon: ScaleIcon,
                label: "쏠림 온도",
                value:
                  insight.concentrationChange === null
                    ? "비교 준비 중"
                    : `${Math.abs(insight.concentrationChange).toFixed(1)}%p`,
                detail:
                  insight.concentrationChange === null
                    ? "월초 비교 기록이 더 필요해요."
                    : insight.concentrationChange > 0
                      ? "가장 큰 종목에 무게가 더 실렸어요."
                      : insight.concentrationChange < 0
                        ? "가장 큰 종목의 쏠림이 한결 가벼워졌어요."
                        : "가장 큰 종목의 비중이 그대로예요.",
                tone: "violet" as const,
              },
            ],
          }
        : {
            eyebrow: "올해 투자 성적표",
            title: "긴 레이스에서 얼마나 멀리, 안정적으로 왔을까요?",
            description:
              "올해를 마라톤처럼 보고 자산 성장, 가장 깊었던 내리막, 목표까지 당겨진 시간을 정리했어요.",
            cards: [
              {
                icon: PiggyBankIcon,
                label: "올해 자산 성장",
                value:
                  insight.totalAssetChange === 0
                    ? "변화 없음"
                    : `${insight.totalAssetChange > 0 ? "+" : "-"}${formatWon(Math.abs(insight.totalAssetChange))}`,
                detail:
                  insight.totalAssetChange >= 0
                    ? "출발선보다 앞에서 올해 레이스를 달리고 있어요."
                    : "출발선 회복이 올해 남은 과제예요.",
                tone:
                  insight.totalAssetChange >= 0
                    ? ("emerald" as const)
                    : ("blue" as const),
              },
              {
                icon: ShieldAlertIcon,
                label: "가장 깊었던 내리막",
                value: `${insight.maximumDrawdown.toFixed(1)}%`,
                detail: "올해 고점에서 가장 크게 내려왔던 순간의 낙폭이에요.",
                tone: "blue" as const,
              },
              {
                icon: TargetIcon,
                label: "목표까지 당긴 시간",
                value:
                  insight.goalMonthImprovement === null
                    ? "비교 불가"
                    : insight.goalMonthImprovement === 0
                      ? "변화 없음"
                      : `${Math.abs(insight.goalMonthImprovement)}개월`,
                detail:
                  insight.goalMonthImprovement === null
                    ? "연초 비교 기록이 더 필요해요."
                    : insight.goalMonthImprovement > 0
                      ? "목표 도착 시계를 이만큼 앞으로 당겼어요."
                      : insight.goalMonthImprovement < 0
                        ? "목표 도착 시계가 이만큼 뒤로 밀렸어요."
                        : "목표 도착 예상 시점이 그대로예요.",
                tone: "violet" as const,
              },
            ],
          };

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

      <div className="mt-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/8 via-transparent to-emerald-500/8 p-5 md:p-7">
        <p className="text-xs font-black tracking-[0.14em] text-violet-500 uppercase">
          {periodTheme.eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-black md:text-2xl">
          {periodTheme.title}
        </h3>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
          {periodTheme.description}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {periodTheme.cards.map((card) => (
            <InsightStat key={card.label} {...card} />
          ))}
        </div>
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
        comparisonStartLabel={comparisonStartLabel}
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
          description={`${comparisonStartLabel}과 최신 기록의 평균 시나리오를 비교했어요.`}
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
            {comparisonStartLabel}과 최신 기록의 평균 시나리오 도달 기간을
            비교했어요.
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
                {comparisonStartLabel}보다 해당 종목의 비중이{" "}
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
              <strong className="text-foreground">
                {insight.holdingCountChange === 0
                  ? `보유 종목 수는 ${comparisonStartLabel}과 같아요`
                  : `보유 종목 수는 ${comparisonStartLabel}보다 ${Math.abs(insight.holdingCountChange)}개 ${insight.holdingCountChange > 0 ? "늘었어요" : "줄었어요"}`}
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
  comparisonStartLabel,
}: {
  rankings: Array<{ name: string; returnRate: number }>;
  periodLabel: "주간" | "월간" | "연간";
  comparisonStartLabel: string;
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
            {comparisonStartLabel}과 최신 기록의 종목별 현재가를 비교했어요.
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
            비교할 이전 기록과 현재 {periodLabel} 기록이 쌓이면, 함께 보유한
            종목의 수익률을 비교해 TOP 3를 선정할게요.
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
