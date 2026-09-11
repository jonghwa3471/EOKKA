import {
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  MicroscopeIcon,
  PanelLeftIcon,
  SparklesIcon,
} from "lucide-react";

import { EokkaLogo } from "~/core/components/eokka-logo";
import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";

export type RouteSkeletonVariant =
  | "dashboard"
  | "history"
  | "portfolio"
  | "precise-analysis"
  | "insights"
  | "automatic-analysis"
  | "account"
  | "coming-soon"
  | "generic";

interface RouteTransitionSkeletonProps {
  withinDashboard?: boolean;
  withDashboardShell?: boolean;
  variant?: RouteSkeletonVariant;
}

const dashboardMenu = [
  [ChartNoAxesCombinedIcon, "대시보드"],
  [BriefcaseBusinessIcon, "내 포트폴리오"],
  [MicroscopeIcon, "정밀 분석"],
  [CalendarClockIcon, "자동 분석 설정"],
  [SparklesIcon, "투자 인사이트"],
  [CalendarDaysIcon, "분석 기록"],
] as const;

function ImmediateDashboardSidebar() {
  return (
    <aside className="hidden h-svh w-64 shrink-0 p-2 md:block">
      <div className="bg-sidebar/92 border-sidebar-border/70 flex h-full w-full flex-col overflow-hidden rounded-2xl border shadow-[0_20px_55px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:shadow-[0_24px_65px_-30px_rgba(0,0,0,0.9)]">
        <div className="border-sidebar-border/60 border-b p-3">
          <div className="flex h-12 items-center gap-3 px-2">
            <EokkaLogo className="size-10" priority />
            <div className="leading-tight">
              <p className="bg-gradient-to-r from-emerald-500 to-violet-500 bg-clip-text font-black tracking-[-0.03em] text-transparent">
                EOKKA
              </p>
              <p className="text-sidebar-foreground/50 text-[10px] font-bold tracking-[0.08em]">
                INVESTMENT LAB
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-3 py-3">
          <p className="text-sidebar-foreground/50 mb-2 flex h-8 items-center gap-2 px-2 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-emerald-500" />내 투자
          </p>
          <div className="space-y-1">
            {dashboardMenu.map(([Icon, label], index) => (
              <div
                key={label}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium",
                  index === 0
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
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

function PageHeading({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="w-full max-w-xl space-y-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-full max-w-md rounded-full" />
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
      <PageHeading />
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
      <PageHeading action />
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
      <PageHeading action />
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-full" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-32 rounded-full" />
      </div>
      <div className="bg-card mt-5 rounded-3xl border p-6">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-full" />
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
      <PageHeading />
      <Skeleton className="mt-5 h-20 w-full max-w-3xl rounded-2xl" />
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-3 w-60 rounded-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
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
      <PageHeading />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
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

function SettingsSkeleton({ account = false }: { account?: boolean }) {
  return (
    <>
      <PageHeading />
      <div className={cn("mt-7 grid gap-5", account && "lg:grid-cols-2")}>
        {Array.from({ length: account ? 3 : 1 }, (_, card) => (
          <div key={card} className="bg-card rounded-3xl border p-6">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full rounded-full" />
            <div className="mt-6 space-y-5">
              {[0, 1, account ? 2 : 3].map((item) => (
                <div key={item} className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-6 h-11 w-32 rounded-full" />
          </div>
        ))}
      </div>
    </>
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
    case "automatic-analysis":
      return <SettingsSkeleton />;
    case "account":
      return <SettingsSkeleton account />;
    case "coming-soon":
      return <ComingSoonSkeleton />;
    default:
      return <GenericPageSkeleton />;
  }
}

export function RouteTransitionSkeleton({
  withinDashboard = false,
  withDashboardShell = false,
  variant = "generic",
}: RouteTransitionSkeletonProps) {
  if (withDashboardShell)
    return (
      <div
        className="fixed inset-0 z-[9998] flex min-h-svh w-full overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_22%_85%,rgba(139,92,246,0.08),transparent_30%)]"
        role="status"
        aria-live="polite"
        aria-label="대시보드 이동 중"
      >
        <ImmediateDashboardSidebar />
        <div className="bg-background border-border/60 m-0 flex min-w-0 flex-1 flex-col overflow-hidden md:m-2 md:ml-0 md:rounded-2xl md:border md:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.4)]">
          <div className="bg-background/80 border-border/60 relative flex h-16 shrink-0 items-center border-b px-5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl">
            <span className="border-border/60 bg-background/70 -ml-1 flex size-8 items-center justify-center rounded-xl border shadow-sm">
              <PanelLeftIcon className="size-4" />
            </span>
            <span className="ml-3 text-sm font-black tracking-[-0.02em]">
              내 투자 대시보드
            </span>
            <span className="ml-3 size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-12">
            <SkeletonContent variant={variant} />
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={cn(
        "bg-background overflow-hidden",
        withinDashboard
          ? "absolute inset-x-0 top-16 z-10 min-h-[calc(100svh-4rem)] group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-12 group-has-[[data-collapsible=icon]]/sidebar-wrapper:min-h-[calc(100svh-3rem)]"
          : "fixed inset-0 z-[9998] pt-16",
      )}
      role="status"
      aria-live="polite"
      aria-label="페이지 이동 중"
    >
      <span className="sr-only">페이지를 불러오고 있어요.</span>
      <div
        className={cn(
          "mx-auto w-full px-5 py-8 md:px-8 md:py-12",
          variant === "precise-analysis" || variant === "automatic-analysis"
            ? "max-w-5xl"
            : "max-w-7xl",
        )}
      >
        <SkeletonContent variant={variant} />
      </div>
    </div>
  );
}
