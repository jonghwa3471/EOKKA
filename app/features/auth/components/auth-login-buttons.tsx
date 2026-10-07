import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  type AnalyticsEventName,
  markPendingAnalyticsEvent,
} from "~/core/lib/analytics.client";

import { GoogleLogo } from "./logos/google";
import { KakaoLogo } from "./logos/kakao";

function SocialAuthButton({
  logo,
  label,
  href,
  analyticsEvent,
  disabled = false,
}: {
  logo: React.ReactNode;
  label: string;
  href: string;
  analyticsEvent: AnalyticsEventName;
  disabled?: boolean;
}) {
  if (disabled)
    return (
      <Button
        variant="outline"
        className="w-full justify-center gap-2"
        disabled
      >
        {logo}
        <span>{label}</span>
      </Button>
    );
  return (
    <Button variant="outline" className="w-full justify-center gap-2" asChild>
      <Link to={href} onClick={() => markPendingAnalyticsEvent(analyticsEvent)}>
        {logo}
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex w-full items-center gap-3 py-1" role="separator">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground shrink-0 px-1 text-xs">또는</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}

export function SocialAuthButtons({
  mode = "login",
  disabled = false,
}: {
  mode?: "login" | "signup";
  disabled?: boolean;
}) {
  const suffix = mode === "signup" ? "시작하기" : "계속하기";
  return (
    <div className="grid gap-2">
      <SocialAuthButton
        logo={<KakaoLogo className="size-4 scale-125 dark:text-yellow-300" />}
        label={`카카오로 ${suffix}`}
        href={`/auth/social/start/kakao?mode=${mode}`}
        analyticsEvent={mode === "signup" ? "sign_up" : "login"}
        disabled={disabled}
      />
      <SocialAuthButton
        logo={<GoogleLogo className="size-4" />}
        label={`Google로 ${suffix}`}
        href={`/auth/social/start/google?mode=${mode}`}
        analyticsEvent={mode === "signup" ? "sign_up" : "login"}
        disabled={disabled}
      />
    </div>
  );
}
