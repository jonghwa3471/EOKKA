/**
 * Navigation Bar Component
 *
 * A responsive navigation header that adapts to different screen sizes and user authentication states.
 * This component provides the main navigation interface for the application, including:
 *
 * - Responsive design with desktop and mobile layouts
 * - User authentication state awareness (logged in vs. logged out)
 * - User profile menu with avatar and dropdown options
 * - Theme switching functionality
 * - Mobile-friendly navigation drawer
 *
 * The component handles different states:
 * - Loading state with skeleton placeholders
 * - Authenticated state with user profile information
 * - Unauthenticated state with sign in/sign up buttons
 */
import { CogIcon, HomeIcon, LogOutIcon, MenuIcon } from "lucide-react";
import { Link } from "react-router";

import { EokkaLogo } from "./eokka-logo";
import ThemeSwitcher from "./theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import {
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "./ui/sheet";

/**
 * UserMenu Component
 *
 * Displays the authenticated user's profile menu with avatar and dropdown options.
 * This component is shown in the navigation bar when a user is logged in and provides
 * quick access to user-specific actions and information.
 *
 * Features:
 * - Avatar display with image or fallback initials
 * - User name and email display
 * - Quick navigation to dashboard
 * - Logout functionality
 *
 * @param name - The user's display name
 * @param email - The user's email address (optional)
 * @param avatarUrl - URL to the user's avatar image (optional)
 * @returns A dropdown menu component with user information and actions
 */
function UserMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}) {
  return (
    <DropdownMenu>
      {/* Avatar as the dropdown trigger */}
      <DropdownMenuTrigger asChild>
        <Avatar className="ring-border/70 size-8 cursor-pointer rounded-lg ring-1 transition-all hover:ring-2 hover:ring-emerald-500/40 data-[state=open]:ring-2 data-[state=open]:ring-emerald-500/50">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      {/* Dropdown content with user info and actions */}
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-2">
        {/* User information display */}
        <DropdownMenuLabel className="mb-1 flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-3 font-normal">
          <Avatar className="ring-background size-10 rounded-xl shadow-sm ring-2">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="rounded-xl font-black">
              {name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <strong className="truncate font-black">{name}</strong>
            <span className="text-muted-foreground mt-1 truncate text-xs font-medium">
              {email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 대시보드 link */}
        <DropdownMenuItem asChild>
          <SheetClose asChild>
            <Link to="/dashboard" viewTransition>
              <HomeIcon className="size-4" />
              대시보드
            </Link>
          </SheetClose>
        </DropdownMenuItem>

        {/* Logout link */}
        <DropdownMenuItem asChild variant="destructive">
          <SheetClose asChild>
            <Link to="/logout" viewTransition>
              <LogOutIcon className="size-4" />
              로그아웃
            </Link>
          </SheetClose>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * AuthButtons Component
 *
 * Displays authentication buttons (로그인 and 회원가입) for unauthenticated users.
 * This component is shown in the navigation bar when no user is logged in and provides
 * quick access to authentication screens.
 *
 * Features:
 * - 로그인 button with ghost styling (less prominent)
 * - 회원가입 button with default styling (more prominent)
 * - View transitions for smooth navigation to auth screens
 * - Compatible with mobile navigation drawer (SheetClose integration)
 *
 * @returns Fragment containing sign in and sign up buttons
 */
function AuthButtons() {
  return (
    <>
      {/* 로그인 button (less prominent) */}
      <Button variant="ghost" asChild className="rounded-full px-5 font-bold">
        <SheetClose asChild>
          <Link to="/login" viewTransition>
            로그인
          </Link>
        </SheetClose>
      </Button>

      {/* 회원가입 button (more prominent) */}
      <Button
        variant="default"
        asChild
        className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 font-black text-white shadow-[0_8px_24px_-12px_rgba(16,185,129,0.8)] hover:from-emerald-400 hover:to-emerald-600"
      >
        <SheetClose asChild>
          <Link to="/join" viewTransition>
            회원가입
          </Link>
        </SheetClose>
      </Button>
    </>
  );
}

/**
 * Actions Component
 *
 * Displays utility actions and settings in the navigation bar, including:
 * - Debug/settings dropdown menu with links to monitoring tools
 * - Theme switcher for toggling between light and dark mode
 *
 * This component is shown in the navigation bar for all users regardless of
 * authentication state and provides access to application-wide settings and tools.
 *
 * @returns Fragment containing settings dropdown and theme switcher
 */
function Actions() {
  return (
    <>
      {/* Settings/debug dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="cursor-pointer">
          <Button
            variant="ghost"
            size="icon"
            aria-label="설정 메뉴 열기"
            className="border-border/60 bg-background/60 rounded-xl border shadow-sm hover:border-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            <CogIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Sentry monitoring link */}
          <DropdownMenuItem asChild>
            <SheetClose asChild>
              <Link to="/debug/sentry" viewTransition>
                Sentry
              </Link>
            </SheetClose>
          </DropdownMenuItem>
          {/* Google Analytics link */}
          <DropdownMenuItem asChild>
            <SheetClose asChild>
              <Link to="/debug/analytics" viewTransition>
                Google Tag
              </Link>
            </SheetClose>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme switcher component (light/dark mode) */}
      <ThemeSwitcher />
    </>
  );
}

/**
 * NavigationBar Component
 *
 * The main navigation header for the application that adapts to different screen sizes
 * and user authentication states. This component serves as the primary navigation
 * interface and combines several sub-components to create a complete navigation experience.
 *
 * Features:
 * - Responsive design with desktop navigation and mobile drawer
 * - Application branding with localized title
 * - Service introduction and methodology links
 * - User authentication state handling (loading, authenticated, unauthenticated)
 * - User profile menu with avatar for authenticated users
 * - 로그인/sign up buttons for unauthenticated users
 * - Theme switching option
 *
 * @param name - The authenticated user's name (if available)
 * @param email - The authenticated user's email (if available)
 * @param avatarUrl - The authenticated user's avatar URL (if available)
 * @param loading - Boolean indicating if the auth state is still loading
 * @returns The complete navigation bar component
 */
export function NavigationBar({
  name,
  email,
  avatarUrl,
  loading,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  loading: boolean;
}) {
  return (
    <nav
      className={
        "bg-background/72 border-border/60 fixed inset-x-0 top-0 z-50 mx-auto flex h-16 w-full items-center justify-between border-b px-5 font-sans shadow-[0_12px_35px_-25px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-opacity after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-gradient-to-r after:from-transparent after:via-emerald-500/35 after:to-transparent md:px-10"
      }
    >
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between py-3">
        {/* Application logo/title with link to home */}
        <Link
          to="/"
          className="group/logo inline-grid h-10 grid-flow-col items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-emerald-500/8"
          aria-label="EOKKA 홈"
        >
          <EokkaLogo
            className="block size-8 self-center drop-shadow-[0_6px_14px_rgba(16,185,129,0.2)] transition-transform group-hover/logo:scale-105"
            priority
          />
          <span className="block h-8 self-center text-lg leading-8 font-black tracking-[-0.02em]">
            EOKKA
          </span>
        </Link>

        {/* Desktop navigation menu (hidden on mobile) */}
        <div className="hidden h-full items-center gap-5 md:flex">
          <Link
            to="/about"
            viewTransition
            className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-bold tracking-[-0.015em] transition-all hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-violet-500/10"
          >
            서비스 소개
          </Link>
          <Link
            to="/methodology"
            viewTransition
            className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-bold tracking-[-0.015em] transition-all hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-violet-500/10"
          >
            분석 방법
          </Link>

          <Separator orientation="vertical" />

          {/* Settings and theme switcher */}
          <Actions />

          <Separator orientation="vertical" />

          {/* Conditional rendering based on authentication state */}
          {loading ? (
            // Loading state with skeleton placeholder
            <div className="flex items-center">
              <div className="bg-muted-foreground/20 size-8 animate-pulse rounded-lg" />
            </div>
          ) : (
            <>
              {name ? (
                // Authenticated state with user menu
                <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
              ) : (
                // Unauthenticated state with auth buttons
                <AuthButtons />
              )}
            </>
          )}
        </div>

        {/* Mobile menu trigger (hidden on desktop) */}
        <SheetTrigger className="border-border/60 bg-background/70 flex size-9 items-center justify-center rounded-xl border shadow-sm transition-colors hover:bg-emerald-500/10 hover:text-emerald-500 md:hidden">
          <MenuIcon className="size-4" />
        </SheetTrigger>
        <SheetContent className="bg-background/95 border-l-emerald-500/15 backdrop-blur-xl">
          <SheetHeader className="mt-12 gap-2 px-4 text-left">
            <SheetClose asChild>
              <Link
                to="/about"
                className="rounded-xl px-4 py-3 font-bold tracking-[-0.015em] transition-colors hover:bg-gradient-to-r hover:from-emerald-500/12 hover:to-violet-500/12"
              >
                서비스 소개
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/methodology"
                className="rounded-xl px-4 py-3 font-bold tracking-[-0.015em] transition-colors hover:bg-gradient-to-r hover:from-emerald-500/12 hover:to-violet-500/12"
              >
                분석 방법
              </Link>
            </SheetClose>
          </SheetHeader>
          {loading ? (
            <div className="flex items-center">
              <div className="bg-muted-foreground h-4 w-24 animate-pulse rounded-full" />
            </div>
          ) : (
            <SheetFooter>
              {name ? (
                <div className="grid grid-cols-3">
                  <div className="col-span-2 flex w-full justify-between">
                    <Actions />
                  </div>
                  <div className="flex justify-end">
                    <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between">
                    <Actions />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <AuthButtons />
                  </div>
                </div>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </div>
    </nav>
  );
}
