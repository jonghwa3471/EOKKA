import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  UserCircle2Icon,
  UserIcon,
} from "lucide-react";
import { Link } from "react-router";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/core/components/ui/sidebar";

export default function SidebarUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatarUrl: string;
  };
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="group/profile-card data-[state=open]:text-sidebar-accent-foreground border-sidebar-border/70 from-background/85 via-background/60 relative h-[68px] overflow-hidden rounded-2xl border bg-gradient-to-br to-emerald-500/8 px-3 py-2.5 shadow-[0_14px_35px_-24px_rgba(15,23,42,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-emerald-400 before:to-violet-500 before:opacity-0 before:transition-opacity group-data-[collapsible=icon]:before:hidden hover:-translate-y-0.5 hover:border-emerald-500/25 hover:shadow-[0_18px_38px_-22px_rgba(16,185,129,0.35)] hover:before:opacity-100 focus-visible:ring-1 focus-visible:ring-emerald-500/40 data-[state=open]:border-emerald-500/30 data-[state=open]:bg-gradient-to-br data-[state=open]:from-emerald-500/12 data-[state=open]:to-violet-500/10 data-[state=open]:before:opacity-100"
            >
              <div className="relative shrink-0">
                <Avatar className="ring-background size-10 rounded-xl shadow-md ring-2 group-data-[collapsible=icon]:size-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-xl font-black">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="ring-sidebar absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 shadow-[0_0_9px_rgba(16,185,129,0.8)] ring-2" />
              </div>
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-black tracking-[-0.02em]">
                  {user.name}
                </span>
                <span className="text-sidebar-foreground/55 mt-1 truncate text-[11px] font-semibold">
                  {user.email}
                </span>
              </div>
              <span className="border-sidebar-border/70 bg-background/65 text-sidebar-foreground/55 flex size-8 shrink-0 items-center justify-center rounded-xl border transition-all group-hover/profile-card:border-emerald-500/20 group-hover/profile-card:bg-emerald-500/10 group-hover/profile-card:text-emerald-500 group-data-[collapsible=icon]:hidden group-data-[state=open]/profile-card:rotate-180 group-data-[state=open]/profile-card:text-emerald-500">
                <ChevronsUpDown className="size-4" />
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 p-2"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="mb-1 rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-0 font-normal">
              <div className="flex items-center gap-3 p-3 text-left text-sm">
                <Avatar className="ring-background size-10 rounded-xl shadow-sm ring-2">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-xl font-black">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black">{user.name}</span>
                  <span className="text-muted-foreground mt-1 truncate text-xs font-medium">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                asChild
                className="hover:[&>svg]:animate-sidebar-menu-icon text-amber-600 focus:from-amber-500/12 focus:to-violet-500/12 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-300 hover:[&>svg]:text-amber-500 motion-reduce:hover:[&>svg]:animate-none"
              >
                <Link to="/dashboard/pro">
                  <Sparkles />
                  EOKKA Pro
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                asChild
                className="hover:[&>svg]:animate-sidebar-menu-icon hover:[&>svg]:text-emerald-500 motion-reduce:hover:[&>svg]:animate-none"
              >
                <Link to="/account/edit" viewTransition>
                  <UserCircle2Icon />
                  프로필 설정
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="hover:[&>svg]:animate-sidebar-menu-icon hover:[&>svg]:text-emerald-500 motion-reduce:hover:[&>svg]:animate-none"
              >
                <Link to="/dashboard/payments">
                  <CreditCard />
                  결제 내역
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:[&>svg]:animate-sidebar-menu-icon hover:[&>svg]:text-emerald-500 motion-reduce:hover:[&>svg]:animate-none">
                <Bell />
                알림 설정
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              variant="destructive"
              className="hover:[&>svg]:animate-sidebar-menu-icon motion-reduce:hover:[&>svg]:animate-none"
            >
              <Link to="/logout">
                <LogOut />
                로그아웃
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
