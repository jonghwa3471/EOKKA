import {
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  HomeIcon,
  SettingsIcon,
} from "lucide-react";
import { Link } from "react-router";

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
  { title: "분석 기록", url: "/dashboard/history", icon: CalendarDaysIcon },
];

export default function DashboardSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatarUrl: string };
}) {
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
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>계정</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="프로필 설정">
                <Link to="/account/edit">
                  <SettingsIcon />
                  <span>프로필 설정</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="메인 홈">
                <Link to="/">
                  <HomeIcon />
                  <span>메인 홈</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
