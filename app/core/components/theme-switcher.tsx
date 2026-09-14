/**
 * Theme Switcher Component
 *
 * A dropdown menu component that allows users to switch between light, dark, and system themes.
 * This component provides a consistent interface for theme switching throughout the application.
 *
 * Features:
 * - Visual indication of the current theme (sun, moon, or monitor icon)
 * - Dropdown menu with theme options
 * - Integration with remix-themes for theme persistence
 * - Support for light, dark, and system themes
 * - Accessible button with appropriate aria attributes
 */
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Theme, useTheme } from "remix-themes";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const themeOptions = [
  { key: "light", label: "라이트 모드", icon: SunIcon, value: Theme.LIGHT },
  { key: "dark", label: "다크 모드", icon: MoonIcon, value: Theme.DARK },
  { key: "system", label: "시스템 모드", icon: MonitorIcon, value: null },
] as const;

/**
 * ThemeSwitcher component for toggling between light, dark, and system themes
 *
 * This component uses the remix-themes hook to access and modify the current theme.
 * It displays a dropdown menu with options for light, dark, and system themes,
 * with the current theme indicated by the appropriate icon on the trigger button.
 *
 * @returns A dropdown menu component for switching themes
 */
export default function ThemeSwitcher() {
  // Get the current theme, setter function, and metadata from remix-themes
  const [theme, setTheme, metadata] = useTheme();
  const currentMode =
    metadata.definedBy === "SYSTEM"
      ? "system"
      : theme === Theme.LIGHT
        ? "light"
        : "dark";
  const currentOption =
    themeOptions.find((option) => option.key === currentMode) ??
    themeOptions[2];
  const CurrentThemeIcon = currentOption.icon;

  return (
    <DropdownMenu>
      {/* Dropdown trigger button with current theme icon */}
      <DropdownMenuTrigger
        asChild
        className="cursor-pointer"
        data-testid="theme-switcher" // For testing purposes
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={`화면 테마 변경, 현재 ${currentOption.label}`}
          className="border-border/60 bg-background/60 rounded-xl border shadow-sm hover:border-violet-500/25 hover:bg-violet-500/10 hover:text-violet-500"
        >
          <CurrentThemeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      {/* Dropdown menu with theme options */}
      <DropdownMenuContent align="end" className="min-w-44 p-1.5">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isCurrent = option.key === currentMode;
          return (
            <DropdownMenuItem
              key={option.key}
              onClick={() => setTheme(option.value)}
              aria-current={isCurrent ? "true" : undefined}
              className={
                isCurrent
                  ? "bg-violet-500/10 font-bold text-violet-600 dark:text-violet-300"
                  : undefined
              }
            >
              <Icon className="size-4" />
              {option.label}
              {isCurrent ? (
                <CheckIcon className="ml-auto size-4 text-violet-500" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
