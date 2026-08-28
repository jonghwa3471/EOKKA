import {
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
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="EOKKA 홈">
              <Link to="/">
                <EokkaLogo className="size-9" priority />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="font-black tracking-[-0.02em]">EOKKA</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>내 투자</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url}
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
      <SidebarFooter>
        <SidebarUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
