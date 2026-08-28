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
      : "내 투자 대시보드";
  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-3 px-5">
            <SidebarTrigger className="-ml-1" />
            <span className="text-muted-foreground font-sans text-sm font-semibold tracking-[-0.015em]">
              {pageTitle}
            </span>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
