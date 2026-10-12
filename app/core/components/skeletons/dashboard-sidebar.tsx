import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  MicroscopeIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";

import { EokkaLogo } from "~/core/components/eokka-logo";
import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";

import { type RouteSkeletonVariant } from "./types";

const dashboardMenu = [
  [ChartNoAxesCombinedIcon, "대시보드"],
  [BriefcaseBusinessIcon, "내 포트폴리오"],
  [MicroscopeIcon, "정밀 분석"],
  [SparklesIcon, "투자 인사이트"],
  [CalendarDaysIcon, "분석 기록"],
  [TrophyIcon, "도전과제"],
] as const;

export const dashboardShellTitles: Partial<
  Record<RouteSkeletonVariant, string>
> = {
  dashboard: "내 투자 대시보드",
  history: "분석 기록",
  achievements: "도전과제",
  portfolio: "내 포트폴리오",
  "precise-analysis": "정밀 분석",
  insights: "투자 인사이트",
  account: "프로필",
  pro: "EOKKA Pro",
  payments: "결제내역",
  notifications: "알림",
  admin: "운영 관리",
};

export function ImmediateDashboardSidebar({
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
            : variant === "achievements"
              ? 5
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
