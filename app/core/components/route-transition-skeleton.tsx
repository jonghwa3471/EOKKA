import { PanelLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/core/lib/utils";

import {
  AccountSkeleton,
  AdminSkeleton,
  CheckoutSkeleton,
  NotificationsSkeleton,
  PaymentsSkeleton,
  ProSkeleton,
} from "./skeletons/account-pages";
import {
  AchievementsSkeleton,
  DashboardSkeleton,
  HistorySkeleton,
  InsightsSkeleton,
  PortfolioSkeleton,
  PreciseAnalysisSkeleton,
} from "./skeletons/analysis-pages";
import {
  ImmediateDashboardSidebar,
  dashboardShellTitles,
} from "./skeletons/dashboard-sidebar";
import {
  ComingSoonSkeleton,
  ContactSkeleton,
  GenericPageSkeleton,
  HomeSkeleton,
  LegalSkeleton,
} from "./skeletons/public-pages";
import { type RouteSkeletonVariant } from "./skeletons/types";

interface RouteTransitionSkeletonProps {
  withinDashboard?: boolean;
  withDashboardShell?: boolean;
  dashboardSidebarCollapsed?: boolean;
  variant?: RouteSkeletonVariant;
}

function SkeletonContent({ variant }: { variant: RouteSkeletonVariant }) {
  switch (variant) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "history":
      return <HistorySkeleton />;
    case "achievements":
      return <AchievementsSkeleton />;
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
    case "checkout":
      return <CheckoutSkeleton />;
    case "notifications":
      return <NotificationsSkeleton />;
    case "admin":
      return <AdminSkeleton />;
    case "home":
      return <HomeSkeleton />;
    case "contact":
      return <ContactSkeleton />;
    case "legal":
      return <LegalSkeleton />;
    case "about":
    case "methodology":
    case "auth":
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
          : variant === "legal"
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
            : variant === "legal" || variant === "contact"
              ? "w-full"
              : variant === "checkout"
                ? "w-full"
                : "mx-auto w-full px-5 py-8 md:px-8 md:py-12",
          variant === "home"
            ? null
            : variant === "checkout"
              ? null
              : variant === "precise-analysis"
                ? "max-w-5xl"
                : variant === "achievements"
                  ? "max-w-6xl"
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

export type { RouteSkeletonVariant } from "./skeletons/types";
