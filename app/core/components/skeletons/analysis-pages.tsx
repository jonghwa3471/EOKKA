import {
  BookOpenIcon,
  CalendarDaysIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";

import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
} from "~/features/users/achievements";

import { ChartCard, MetricCard, PageHeading } from "./primitives";

export function DashboardSkeleton() {
  return (
    <>
      <PageHeading variant="dashboard" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <MetricCard key={item} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <ChartCard />
        <div className="bg-card space-y-4 rounded-3xl border p-5">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </>
  );
}

export function HistorySkeleton() {
  return (
    <>
      <PageHeading variant="history" action />
      <div className="mt-7 grid items-start gap-5 xl:grid-cols-[380px_1fr]">
        <div className="bg-card rounded-3xl border p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="size-9 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }, (_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-3xl border p-6">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
          <ChartCard compact />
        </div>
      </div>
    </>
  );
}

export function PortfolioSkeleton() {
  return (
    <>
      <PageHeading variant="portfolio" action />
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <h2 className="text-xl font-black">매매일지 추가</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          해외주식 환율은 거래 날짜를 기준으로 자동 적용해요. 주말과 휴장일은
          직전 기준 환율을 사용해요.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            "종목명 또는 티커",
            "거래 유형",
            "거래 날짜",
            "수량",
            "주당 체결 가격",
            "메모",
          ].map((label) => (
            <div key={label} className="space-y-2">
              <p className="text-sm font-medium">{label}</p>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-xl" />
      </div>
      <div className="bg-card mt-5 rounded-3xl border p-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-black">현재 보유 현황</h2>
            <Skeleton className="mt-2 h-3 w-28 rounded-full" />
          </div>
          <BookOpenIcon className="size-5 text-violet-500" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    </>
  );
}

export function PreciseAnalysisSkeleton() {
  return (
    <>
      <PageHeading variant="precise-analysis" />
      <Skeleton className="mt-5 h-20 w-full max-w-3xl rounded-2xl" />
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-black">분석 설정</h2>
            <p className="text-muted-foreground text-sm">
              현재 매매일지에서 계산된 보유 종목을 사용해요.
            </p>
          </div>
          <span className="rounded-full border px-4 py-2 text-sm font-semibold">
            매매일지 확인
          </span>
        </div>
        <div className="mt-6 border-t pt-5">
          <h3 className="font-black">이번 분석에 사용할 보유 종목</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            매매일지의 매수·매도를 반영해 계산한 현재 보유 정보예요.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    </>
  );
}

export function InsightsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-500">
            <SparklesIcon className="size-4" /> PORTFOLIO INSIGHTS
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            기록 속에서 찾은 투자 인사이트
          </h1>
          <p className="text-muted-foreground mt-2">
            선택한 목표로 저장된 모든 기록을 함께 분석했어요.
          </p>
        </div>
        <span className="hidden rounded-full border px-4 py-2 text-sm font-semibold sm:inline-flex">
          날짜별 기록 보기
        </span>
      </div>

      <div className="bg-card mt-7 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <p className="font-black">인사이트 기준 목표</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            선택한 목표와 연결된 기록만 모아서 분석해요.
          </p>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="bg-card mt-7 grid grid-cols-3 gap-2 rounded-3xl border p-2 shadow-sm">
        {[
          ["주간 인사이트", "월요일부터 일요일"],
          ["월간 인사이트", "매월 1일부터 마지막 날"],
          ["연간 인사이트", "매년 1월부터 12월"],
        ].map(([label, description], index) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl px-4 py-3",
              index === 0 && "bg-foreground text-background",
            )}
          >
            <strong className="block text-sm sm:text-base">{label}</strong>
            <span className="mt-0.5 block text-[11px] opacity-70">
              {description}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-card mt-4 rounded-3xl border p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <CalendarDaysIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-black">이번 주 기록 현황</p>
              <Skeleton className="mt-1 h-3 w-32 rounded-full" />
            </div>
          </div>
          <div className="text-muted-foreground flex gap-3 text-[11px] font-semibold">
            <span>● 수익</span>
            <span>● 손해</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[74px] min-w-28 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="bg-card mt-5 rounded-3xl border p-5 shadow-sm md:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-500">WEEKLY INSIGHT</p>
            <h2 className="mt-2 text-2xl font-black">
              주간 기록에서 발견한 투자 흐름
            </h2>
            <Skeleton className="mt-3 h-3 w-64 max-w-full rounded-full" />
          </div>
          <Skeleton className="h-11 w-28 rounded-2xl" />
        </div>
        <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
        <div className="mt-6 rounded-3xl border p-5 md:p-7">
          <p className="text-xs font-black tracking-[0.14em] text-violet-500 uppercase">
            이번 주 경기 리포트
          </p>
          <h3 className="mt-2 text-xl font-black">
            짧은 승부에서 어떤 힘이 돋보였을까요?
          </h3>
          <Skeleton className="mt-3 h-3 w-3/4 rounded-full" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="mt-8">
          <p className="text-sm font-bold text-amber-500">WEEKLY AWARDS</p>
          <h3 className="mt-2 text-xl font-black">주간 포트폴리오 시상식</h3>
        </div>
        <div className="mt-5 rounded-3xl border p-5">
          <div className="flex items-end justify-center gap-3 pt-10">
            <Skeleton className="h-28 w-1/4 rounded-t-2xl" />
            <Skeleton className="h-40 w-1/4 rounded-t-2xl" />
            <Skeleton className="h-20 w-1/4 rounded-t-2xl" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, item) => (
            <Skeleton key={item} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </>
  );
}

export function AchievementsSkeleton() {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
          <TrophyIcon className="size-4" /> EOKKA CHALLENGES
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          도전과제
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
          분석과 기록을 이어가며 투자 습관을 뱃지로 모아보세요. 한 번 획득한
          뱃지는 계속 보관되고 프로필에도 표시돼요.
        </p>
      </div>

      <div className="bg-card relative mt-7 overflow-hidden rounded-[2rem] border p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.13),transparent_45%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-bold">
              지금까지 모은 뱃지
            </p>
            <Skeleton className="mt-3 h-10 w-24 rounded-xl" />
          </div>
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs font-black">
              <span>수집 진행도</span>
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
      </div>

      <div className="bg-muted/55 mt-5 flex w-fit max-w-full gap-1 rounded-2xl border p-1.5">
        {["전체", "획득 완료", "도전 중"].map((label, index) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black",
              index === 0
                ? "bg-background text-foreground border shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {label}
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-8">
        {ACHIEVEMENT_CATEGORIES.slice(0, 2).map((category) => {
          const categoryAchievements = ACHIEVEMENTS.filter(
            (achievement) => achievement.category === category,
          );
          return (
            <section key={category}>
              <div className="mb-3 flex items-end justify-between gap-4 px-1">
                <div>
                  <h2 className="text-xl font-black">{category}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    쉬운 도전부터 차례대로 모아보세요.
                  </p>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryAchievements.slice(0, 3).map((achievement, index) => (
                  <div
                    key={achievement.id}
                    className="bg-card rounded-3xl border p-5 shadow-sm md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="bg-muted flex size-14 items-center justify-center rounded-2xl text-3xl grayscale">
                        {achievement.emoji}
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <p className="text-muted-foreground mt-4 text-[11px] font-black tracking-[0.12em]">
                      난이도 {index + 1} / {categoryAchievements.length}
                    </p>
                    <h3 className="mt-1.5 text-xl font-black">
                      {achievement.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 font-bold">
                      {achievement.mission}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {achievement.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
