import type { Route } from "./+types/dashboard.layout";

import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigation } from "react-router";

import type { RouteSkeletonVariant } from "~/core/components/route-transition-skeleton";
import { RouteTransitionSkeleton } from "~/core/components/route-transition-skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "~/core/components/ui/sidebar";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { isAdmin } from "~/features/admin/admin.server";
import { getUnreadNotificationCount } from "~/features/notifications/notifications.server";

import { markUserActive } from "../activity.server";
import DashboardSidebar from "../components/dashboard-sidebar";
import { getUserProfile } from "../queries";

function DashboardRouteTransitionSkeleton() {
  const navigation = useNavigation();
  const location = useLocation();
  const { state: sidebarState } = useSidebar();
  const [visible, setVisible] = useState(false);
  const targetPath = navigation.location?.pathname ?? "";
  const targetStaysInDashboard =
    targetPath.startsWith("/dashboard") || targetPath.startsWith("/account");
  const isRouteLoading =
    navigation.state === "loading" &&
    !navigation.formData &&
    targetStaysInDashboard &&
    targetPath !== location.pathname;
  const variant: RouteSkeletonVariant = targetPath.startsWith(
    "/dashboard/history",
  )
    ? "history"
    : targetPath.startsWith("/dashboard/portfolio")
      ? "portfolio"
      : targetPath.startsWith("/dashboard/precise-analysis")
        ? "precise-analysis"
        : targetPath.startsWith("/dashboard/insights")
          ? "insights"
          : targetPath.startsWith("/account")
            ? "account"
            : targetPath.startsWith("/dashboard/pro")
              ? "pro"
              : targetPath.startsWith("/dashboard/payments")
                ? "payments"
                : targetPath.startsWith("/dashboard/notifications")
                  ? "notifications"
                  : targetPath.startsWith("/dashboard/admin")
                    ? "admin"
                    : "dashboard";

  useEffect(() => {
    if (!isRouteLoading) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, [isRouteLoading]);

  return visible ? (
    <RouteTransitionSkeleton
      withinDashboard
      dashboardSidebarCollapsed={sidebarState === "collapsed"}
      variant={variant}
    />
  ) : null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) await markUserActive(user.id);
  const [unreadNotificationCount, profile] = user
    ? await Promise.all([
        getUnreadNotificationCount(user.id),
        getUserProfile(client, { userId: user.id }),
      ])
    : [0, null];
  return {
    isAdmin: user ? await isAdmin(user.id) : false,
    unreadNotificationCount,
    user: user
      ? {
          name:
            profile?.name ??
            user.user_metadata.name ??
            user.user_metadata.full_name ??
            user.email?.split("@")[0] ??
            "사용자",
          avatarUrl:
            profile?.avatar_url ??
            user.user_metadata.avatar_url ??
            user.user_metadata.picture ??
            "",
          email: user.email ?? "",
        }
      : null,
  };
}

type DashboardLayoutLoaderData = Awaited<ReturnType<typeof loader>>;
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<DashboardLayoutLoaderData>(
    "dashboard-layout",
    async () => serverLoader() as Promise<DashboardLayoutLoaderData>,
  );
}

export function shouldRevalidate({
  formMethod,
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}) {
  const isDashboardShell = (pathname: string) =>
    pathname.startsWith("/dashboard") || pathname.startsWith("/account");
  if (
    !formMethod &&
    isDashboardShell(currentUrl.pathname) &&
    isDashboardShell(nextUrl.pathname)
  )
    return false;
  return defaultShouldRevalidate;
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  usePrimeRouteDataCache("dashboard-layout", loaderData);
  const user = loaderData.user!;
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(
    loaderData.unreadNotificationCount,
  );
  const { pathname: currentPathname } = useLocation();
  const navigation = useNavigation();
  const pathname =
    navigation.state === "loading" && navigation.location
      ? navigation.location.pathname
      : currentPathname;

  useEffect(() => {
    setUnreadNotificationCount(loaderData.unreadNotificationCount);
  }, [loaderData.unreadNotificationCount]);

  useEffect(() => {
    const handleUnreadChange = (event: Event) => {
      const { delta } = (event as CustomEvent<{ delta: number }>).detail;
      setUnreadNotificationCount((current) => Math.max(0, current + delta));
    };
    window.addEventListener(
      "eokka:notification-unread-change",
      handleUnreadChange,
    );
    return () =>
      window.removeEventListener(
        "eokka:notification-unread-change",
        handleUnreadChange,
      );
  }, []);
  const pageTitle = pathname.startsWith("/dashboard/admin")
    ? "운영 관리"
    : pathname.startsWith("/account/edit")
      ? "프로필 설정"
      : pathname === "/account"
        ? "프로필"
        : pathname.startsWith("/dashboard/portfolio")
          ? "내 포트폴리오"
          : pathname.startsWith("/dashboard/precise-analysis")
            ? "정밀 분석"
            : pathname.startsWith("/dashboard/insights")
              ? "투자 인사이트"
              : pathname.startsWith("/dashboard/history")
                ? "분석 기록"
                : pathname.startsWith("/dashboard/pro")
                  ? "EOKKA Pro"
                  : pathname.startsWith("/dashboard/payments")
                    ? "결제내역"
                    : pathname.startsWith("/dashboard/notifications")
                      ? "알림"
                      : "내 투자 대시보드";
  return (
    <SidebarProvider>
      <DashboardSidebar
        isAdmin={loaderData.isAdmin}
        user={user}
        unreadNotificationCount={unreadNotificationCount}
      />
      <SidebarInset>
        <header className="bg-background/80 border-border/60 relative z-20 flex h-16 shrink-0 items-center gap-2 border-b shadow-[0_10px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-gradient-to-r after:from-emerald-500/35 after:via-violet-500/25 after:to-transparent">
          <div className="flex items-center gap-3 px-5">
            <SidebarTrigger className="-ml-1" />
            <span className="font-sans text-sm font-black tracking-[-0.02em]">
              {pageTitle}
            </span>
            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          </div>
        </header>
        <DashboardRouteTransitionSkeleton />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
