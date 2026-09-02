import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  SparklesIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import { EokkaLogo } from "~/core/components/eokka-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/core/components/ui/sidebar";

import SidebarUser from "./sidebar-user";

const navigation = [
  { title: "대시보드", url: "/dashboard", icon: ChartNoAxesCombinedIcon },
  {
    title: "내 포트폴리오",
    url: "/dashboard/portfolio",
    icon: BriefcaseBusinessIcon,
  },
  { title: "투자 인사이트", url: "/dashboard/insights", icon: SparklesIcon },
  { title: "분석 기록", url: "/dashboard/history", icon: CalendarDaysIcon },
];

export default function DashboardSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatarUrl: string };
}) {
  const { pathname } = useLocation();

  return (
    <Sidebar
      className="font-sans"
      collapsible="icon"
      variant="inset"
      {...props}
    >
      <SidebarHeader className="border-sidebar-border/60 border-b p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="EOKKA 홈"
              className="rounded-2xl hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-violet-500/10"
            >
              <Link to="/" className="group/logo">
                <EokkaLogo
                  className="size-10 drop-shadow-[0_8px_18px_rgba(16,185,129,0.18)] transition-transform group-hover/logo:scale-105"
                  priority
                />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="bg-gradient-to-r from-emerald-500 to-violet-500 bg-clip-text text-base font-black tracking-[-0.03em] text-transparent">
                    EOKKA
                  </span>
                  <span className="text-sidebar-foreground/50 text-[10px] font-bold tracking-[0.08em]">
                    INVESTMENT LAB
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-1 py-2">
        <SidebarGroup className="gap-1">
          <SidebarGroupLabel>
            <span className="mr-2 size-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            내 투자
          </SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url}
                  className="hover:[&>svg]:animate-sidebar-menu-icon hover:[&>svg]:text-emerald-500 motion-reduce:hover:[&>svg]:animate-none"
                >
                  <Link
                    to={item.url}
                    aria-current={pathname === item.url ? "page" : undefined}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border/60 border-t bg-gradient-to-t from-emerald-500/4 to-transparent p-3">
        <SidebarUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
