import {
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  CrownIcon,
  MicroscopeIcon,
  PanelLeftIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { EokkaLogo } from "~/core/components/eokka-logo";
import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";

export type RouteSkeletonVariant =
  | "dashboard"
  | "history"
  | "portfolio"
  | "precise-analysis"
  | "insights"
  | "account"
  | "pro"
  | "payments"
  | "notifications"
  | "admin"
  | "home"
  | "contact"
  | "about"
  | "methodology"
  | "auth"
  | "legal"
  | "coming-soon"
  | "generic";

interface RouteTransitionSkeletonProps {
  withinDashboard?: boolean;
  withDashboardShell?: boolean;
  dashboardSidebarCollapsed?: boolean;
  variant?: RouteSkeletonVariant;
}

const dashboardMenu = [
  [ChartNoAxesCombinedIcon, "대시보드"],
  [BriefcaseBusinessIcon, "내 포트폴리오"],
  [MicroscopeIcon, "정밀 분석"],
  [SparklesIcon, "투자 인사이트"],
  [CalendarDaysIcon, "분석 기록"],
] as const;

const dashboardShellTitles: Partial<Record<RouteSkeletonVariant, string>> = {
  dashboard: "내 투자 대시보드",
  history: "분석 기록",
  portfolio: "내 포트폴리오",
  "precise-analysis": "정밀 분석",
  insights: "투자 인사이트",
  account: "프로필",
  pro: "EOKKA Pro",
  payments: "결제내역",
  notifications: "알림",
  admin: "운영 관리",
};

function ImmediateDashboardSidebar({
  variant,
}: {
  variant: RouteSkeletonVariant;
}) {
  const activeIndex =
    variant === "portfolio"
      ? 1
      : variant === "precise-analysis"
        ? 2
        : variant === "insights"
          ? 3
          : variant === "history"
            ? 4
            : 0;
  return (
    <aside className="text-sidebar-foreground hidden h-svh w-64 shrink-0 p-2 font-sans md:block">
      <div className="bg-sidebar/92 border-sidebar-border/70 flex h-full w-full flex-col overflow-hidden rounded-2xl border shadow-[0_20px_55px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:shadow-[0_24px_65px_-30px_rgba(0,0,0,0.9)]">
        <div className="border-sidebar-border/60 border-b p-3">
          <div className="flex h-12 w-full items-center gap-3 overflow-hidden rounded-2xl p-2 text-left text-sm font-semibold tracking-[-0.012em]">
            <EokkaLogo
              className="size-10 shrink-0 drop-shadow-[0_8px_18px_rgba(16,185,129,0.18)]"
              priority
            />
            <div className="grid flex-1 text-left leading-tight">
              <p className="bg-gradient-to-r from-emerald-500 to-violet-500 bg-clip-text text-base font-black tracking-[-0.03em] text-transparent">
                EOKKA
              </p>
              <p className="text-sidebar-foreground/50 text-[10px] font-bold tracking-[0.08em]">
                INVESTMENT LAB
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-3 py-4">
          <p className="text-sidebar-foreground/55 mb-1 flex h-8 items-center rounded-lg px-3 text-[10px] font-black tracking-[0.14em] uppercase">
            <span className="mr-2 size-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            내 투자
          </p>
          <div className="space-y-1">
            {dashboardMenu.map(([Icon, label], index) => (
              <div
                key={label}
                className={cn(
                  "flex h-10 items-center gap-3 overflow-hidden rounded-xl p-2 text-sm font-semibold tracking-[-0.012em]",
                  index === activeIndex
                    ? "text-sidebar-accent-foreground bg-gradient-to-r from-emerald-500/15 to-violet-500/12 font-black shadow-[inset_3px_0_0_rgba(16,185,129,0.85)]"
                    : "text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn("size-[18px] shrink-0", {
                    "text-emerald-500": index === activeIndex,
                  })}
                />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-sidebar-border/60 border-t bg-gradient-to-t from-emerald-500/4 to-transparent p-3">
          <div className="flex h-[68px] items-center gap-3 rounded-2xl border px-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const pageCopy: Partial<
  Record<
    RouteSkeletonVariant,
    { eyebrow: string; title: string; description: string }
  >
> = {
  dashboard: {
    eyebrow: "투자 리포트",
    title: "",
    description: "",
  },
  history: {
    eyebrow: "MY ANALYSIS",
    title: "분석 기록",
    description:
      "날짜를 선택하면 해당일에 분석한 포트폴리오와 목표별 결과를 다시 볼 수 있어요.",
  },
  portfolio: {
    eyebrow: "MANAGED PORTFOLIO",
    title: "내 포트폴리오",
    description:
      "매수·매도 날짜와 당시 환율을 기록해 실제 원화 매입원금으로 분석해요.",
  },
  "precise-analysis": {
    eyebrow: "PRECISE ANALYSIS",
    title: "정밀 분석",
    description:
      "매매일지의 거래일과 당시 환율을 반영해 포트폴리오를 분석해요.",
  },
  insights: {
    eyebrow: "PORTFOLIO INSIGHTS",
    title: "기록 속에서 찾은 투자 인사이트",
    description: "선택한 목표로 저장된 모든 기록을 함께 분석했어요.",
  },
  account: {
    eyebrow: "MY PROFILE",
    title: "프로필",
    description: "내 정보와 연결된 로그인 수단을 한곳에서 확인해요.",
  },
  payments: {
    eyebrow: "PAYMENT HISTORY",
    title: "결제내역",
    description: "이용 중인 요금제와 결제 기록, 영수증을 한곳에서 확인하세요.",
  },
  notifications: {
    eyebrow: "NOTIFICATIONS",
    title: "알림",
    description:
      "분석 갱신과 기록 변경처럼 놓치면 안 되는 소식을 모아 보여드려요.",
  },
  admin: {
    eyebrow: "ADMIN ONLY",
    title: "EOKKA 운영 관리",
    description: "사용자의 목소리를 확인하고 서비스 소식을 관리해요.",
  },
  pro: {
    eyebrow: "EOKKA PRO",
    title: "기록이 쌓일수록 더 선명해지는 투자 흐름",
    description: "자동 분석과 장기 기록으로 포트폴리오 변화를 이어서 확인해요.",
  },
  home: {
    eyebrow: "EOKKA",
    title: "내 투자 목표를 더 쉽게 이해해요",
    description: "포트폴리오를 분석하고 목표까지의 흐름을 한눈에 살펴보세요.",
  },
  contact: {
    eyebrow: "SUPPORT",
    title: "함께 만드는 EOKKA",
    description: "불편했던 점이나 바라는 기능을 함께 나눠 주세요.",
  },
  about: {
    eyebrow: "ABOUT EOKKA",
    title: "투자 목표를 이해하기 쉽게",
    description: "EOKKA가 어떤 방식으로 투자 여정을 보여주는지 소개해요.",
  },
  methodology: {
    eyebrow: "METHODOLOGY",
    title: "분석 방법",
    description: "포트폴리오 분석과 시나리오 계산 기준을 알려드려요.",
  },
  auth: {
    eyebrow: "WELCOME TO EOKKA",
    title: "계정을 확인하고 있어요",
    description: "안전한 로그인을 위한 화면을 준비하고 있어요.",
  },
  legal: {
    eyebrow: "EOKKA POLICY",
    title: "서비스 정책",
    description: "안전한 서비스 이용을 위한 내용을 확인해요.",
  },
};

function PageHeading({
  variant,
  action = false,
}: {
  variant: RouteSkeletonVariant;
  action?: boolean;
}) {
  const copy = pageCopy[variant];
  const hasDynamicHeading = variant === "dashboard";
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="w-full max-w-xl">
        <p className="text-sm font-black text-emerald-500">{copy?.eyebrow}</p>
        {hasDynamicHeading ? (
          <>
            <Skeleton className="mt-2 h-10 w-72 max-w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              {copy?.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {copy?.description}
            </p>
          </>
        )}
      </div>
      {action && (
        <Skeleton className="hidden h-10 w-32 rounded-full sm:block" />
      )}
    </div>
  );
}

function MetricCard() {
  return (
    <div className="bg-card rounded-3xl border p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-4 w-24 rounded-full" />
      <Skeleton className="mt-3 h-8 w-36 rounded-lg" />
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
    </div>
  );
}

function ChartCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-card rounded-3xl border p-5">
      <Skeleton className="h-5 w-40 rounded-full" />
      <Skeleton className="mt-2 h-3 w-56 max-w-full rounded-full" />
      <div
        className={cn(
          "mt-7 flex items-end gap-3 border-b border-dashed pb-1",
          compact ? "h-36" : "h-52",
        )}
      >
        {[42, 68, 55, 82, 63, 91, 76].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-xl"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
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

function HistorySkeleton() {
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

function PortfolioSkeleton() {
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

function PreciseAnalysisSkeleton() {
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

function InsightsSkeleton() {
  return (
    <>
      <PageHeading variant="insights" />
      <div className="bg-card mt-7 grid grid-cols-3 gap-2 rounded-3xl border p-2">
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
      <Skeleton className="mt-5 h-16 w-full rounded-2xl" />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartCard compact />
        <div className="bg-card rounded-3xl border p-6">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <div className="mt-7 flex h-40 items-end justify-center gap-3">
            <Skeleton className="h-24 w-24 rounded-t-2xl" />
            <Skeleton className="h-36 w-24 rounded-t-2xl" />
            <Skeleton className="h-20 w-24 rounded-t-2xl" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-32 rounded-3xl" />
        ))}
      </div>
    </>
  );
}

function AccountCardSkeleton({
  height,
  danger = false,
  fields = 1,
}: {
  height: string;
  danger?: boolean;
  fields?: number;
}) {
  return (
    <div
      className={cn(
        "bg-card w-full rounded-xl border p-6 shadow-sm",
        height,
        danger && "border-red-500/35 bg-red-500/[0.04]",
      )}
    >
      <div className="flex items-start gap-3">
        {danger && <Skeleton className="size-10 shrink-0 rounded-xl" />}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40 max-w-full rounded-lg" />
          <Skeleton className="h-3 w-80 max-w-full rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {Array.from({ length: fields }, (_, field) => (
          <div key={field} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      {danger && <Skeleton className="mt-6 h-10 w-full rounded-md" />}
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-10">
      <div className="bg-card min-h-[25rem] w-full rounded-xl border p-6 shadow-sm">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full rounded-full" />
        <div className="mt-6 flex items-center gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-4 w-48 max-w-full rounded-full" />
          </div>
        </div>
        <div className="mt-7 space-y-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="mt-6 h-10 w-full rounded-md" />
      </div>
      <AccountCardSkeleton height="min-h-[13rem]" />
      <AccountCardSkeleton height="min-h-[16rem]" fields={2} />
      <AccountCardSkeleton height="min-h-[17rem]" danger />
      <AccountCardSkeleton height="min-h-[18rem]" danger />
    </div>
  );
}

function ComingSoonSkeleton() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <div className="bg-card w-full max-w-2xl rounded-[2rem] border p-8 text-center md:p-14">
        <Skeleton className="mx-auto size-16 rounded-2xl" />
        <Skeleton className="mx-auto mt-7 h-4 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-9 w-56 max-w-full rounded-xl" />
        <Skeleton className="mx-auto mt-4 h-4 w-full max-w-sm rounded-full" />
        <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full rounded-full" />
      </div>
    </div>
  );
}

function ProSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="via-background grid gap-8 rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-violet-500/[0.08] p-7 md:p-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
            <CrownIcon className="size-3.5" /> EOKKA Pro 베타
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
            기록은 자동으로,
            <br />
            투자 판단은 더 차분하게
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 break-keep md:text-base">
            거래일마다 최신 종가로 포트폴리오를 기록하고, 쌓인 변화를 주간과
            월간 인사이트로 확인하세요. 아직 성장 중인 베타 서비스라 부담 없는
            가격으로 시작해요.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["자동 분석", "기간 제한 없음"].map((benefit) => (
              <span
                key={benefit}
                className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
              >
                <CheckIcon className="size-3.5 text-emerald-500" />
                {benefit}
              </span>
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
      <div className="mt-8 text-center">
        <p className="text-xs font-black tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">
          Plan comparison
        </p>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">
          무료와 Pro, 무엇이 다른가요?
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          무료로 분석 결과를 바로 확인하고, Pro에서는 결과를 저장해 시간에 따른
          변화까지 이어서 확인할 수 있어요.
        </p>
      </div>
      <div className="bg-card mt-6 rounded-3xl border p-6">
        <div className="grid grid-cols-3 gap-4 border-b pb-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-5 rounded-full" />
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((cell) => (
                <Skeleton key={cell} className="h-4 rounded-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeading variant="payments" action />
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <MetricCard key={item} />
        ))}
      </div>
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <div className="flex items-center justify-between border-b pb-5">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <div className="space-y-4 pt-5">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeading variant="notifications" action />
      <div className="bg-card mt-7 overflow-hidden rounded-3xl border">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="divide-y px-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-start gap-4 py-5">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-3 w-full max-w-xl rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <>
      <PageHeading variant="admin" />
      <div className="mt-7 grid grid-cols-2 gap-4">
        <MetricCard />
        <MetricCard />
      </div>
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="bg-card mt-6 overflow-hidden rounded-3xl border">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-72 rounded-full" />
        </div>
        <div className="divide-y px-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="my-4 h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}

function GenericPageSkeleton() {
  return (
    <div className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Skeleton className="mx-auto h-4 w-28 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-12 w-3/4 rounded-2xl" />
        <Skeleton className="mx-auto mt-4 h-5 w-full max-w-xl rounded-full" />
        <Skeleton className="mx-auto mt-2 h-5 w-2/3 rounded-full" />
        <div className="mt-8 flex justify-center gap-3">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="mx-auto mt-14 h-72 w-full max-w-5xl rounded-[2rem]" />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="min-h-svh">
      <div className="border-border/60 flex h-16 items-center border-b px-5 md:px-8">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="hidden h-9 w-20 rounded-full sm:block" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <Skeleton className="mx-auto h-7 w-36 rounded-full" />
          <Skeleton className="mx-auto mt-6 h-14 w-4/5 rounded-2xl md:h-20" />
          <Skeleton className="mx-auto mt-4 h-5 w-full max-w-2xl rounded-full" />
          <Skeleton className="mx-auto mt-2 h-5 w-3/5 rounded-full" />
          <div className="mt-8 flex justify-center gap-3">
            <Skeleton className="h-12 w-36 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-[25rem] rounded-[2rem]" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <Skeleton className="h-[12rem] rounded-[2rem]" />
            <Skeleton className="h-[12rem] rounded-[2rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonContent({ variant }: { variant: RouteSkeletonVariant }) {
  switch (variant) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "history":
      return <HistorySkeleton />;
    case "portfolio":
      return <PortfolioSkeleton />;
    case "precise-analysis":
      return <PreciseAnalysisSkeleton />;
    case "insights":
      return <InsightsSkeleton />;
    case "account":
      return <AccountSkeleton />;
    case "pro":
      return <ProSkeleton />;
    case "payments":
      return <PaymentsSkeleton />;
    case "notifications":
      return <NotificationsSkeleton />;
    case "admin":
      return <AdminSkeleton />;
    case "home":
      return <HomeSkeleton />;
    case "contact":
    case "about":
    case "methodology":
    case "auth":
    case "legal":
      return <GenericPageSkeleton />;
    case "coming-soon":
      return <ComingSoonSkeleton />;
    default:
      return <GenericPageSkeleton />;
  }
}

export function RouteTransitionSkeleton({
  withinDashboard = false,
  withDashboardShell = false,
  dashboardSidebarCollapsed = false,
  variant = "generic",
}: RouteTransitionSkeletonProps) {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0)
      document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  const skeleton = withDashboardShell ? (
    <div
      className="bg-background fixed -inset-px z-[9998] flex min-h-[calc(100svh+2px)] overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_22%_85%,rgba(139,92,246,0.08),transparent_30%)]"
      role="status"
      aria-live="polite"
      aria-label="대시보드 이동 중"
    >
      <ImmediateDashboardSidebar variant={variant} />
      <div className="bg-background border-border/60 m-0 flex min-w-0 flex-1 flex-col overflow-hidden md:m-2 md:ml-0 md:rounded-2xl md:border md:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.4)]">
        <div className="bg-background/80 border-border/60 relative flex h-16 shrink-0 items-center border-b px-5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <span className="border-border/60 bg-background/70 -ml-1 flex size-8 items-center justify-center rounded-xl border shadow-sm">
            <PanelLeftIcon className="size-4" />
          </span>
          <span className="ml-3 text-sm font-black tracking-[-0.02em]">
            {dashboardShellTitles[variant] ?? "내 투자 대시보드"}
          </span>
          <span className="ml-3 size-1.5 rounded-full bg-emerald-500" />
        </div>
        <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-12">
          <SkeletonContent variant={variant} />
        </div>
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "bg-background overflow-hidden",
        variant === "home"
          ? "fixed inset-0 z-[9998]"
          : withinDashboard
            ? cn(
                "fixed inset-x-0 top-16 bottom-0 z-40",
                dashboardSidebarCollapsed
                  ? "md:left-[4.5rem]"
                  : "md:left-[17rem]",
              )
            : "fixed inset-x-0 top-16 bottom-0 z-[9998]",
      )}
      role="status"
      aria-live="polite"
      aria-label="페이지 이동 중"
    >
      <span className="sr-only">페이지를 불러오고 있어요.</span>
      <div
        className={cn(
          variant === "home"
            ? "w-full"
            : "mx-auto w-full px-5 py-8 md:px-8 md:py-12",
          variant === "home"
            ? null
            : variant === "precise-analysis"
              ? "max-w-5xl"
              : "max-w-7xl",
        )}
      >
        <SkeletonContent variant={variant} />
      </div>
    </div>
  );

  return typeof document === "undefined"
    ? skeleton
    : createPortal(skeleton, document.body);
}
