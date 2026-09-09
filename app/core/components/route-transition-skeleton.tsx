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
  variant?: RouteSkeletonVariant;
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
  variant = "generic",
}: RouteTransitionSkeletonProps) {
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
