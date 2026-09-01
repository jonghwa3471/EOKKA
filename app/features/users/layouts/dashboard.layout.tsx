import type { Route } from "./+types/dashboard.layout";

import { Outlet, useLocation } from "react-router";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/core/components/ui/sidebar";
import makeServerClient from "~/core/lib/supa-client.server";

import DashboardSidebar from "../components/dashboard-sidebar";

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  return {
    user: user
      ? {
          name:
            user.user_metadata.name ??
            user.user_metadata.full_name ??
            user.email?.split("@")[0] ??
            "사용자",
          avatarUrl:
            user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "",
          email: user.email ?? "",
        }
      : null,
  };
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user!;
  const { pathname } = useLocation();
  const pageTitle = pathname.startsWith("/account/")
    ? "프로필 설정"
    : pathname.startsWith("/dashboard/insights")
      ? "투자 인사이트"
      : pathname.startsWith("/dashboard/history")
        ? "분석 기록"
        : pathname.startsWith("/dashboard/pro")
          ? "EOKKA Pro"
          : pathname.startsWith("/dashboard/payments")
            ? "결제내역"
            : "내 투자 대시보드";
  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />
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
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
