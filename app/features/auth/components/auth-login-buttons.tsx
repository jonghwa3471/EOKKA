import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

import { GoogleLogo } from "./logos/google";
import { KakaoLogo } from "./logos/kakao";

function SocialAuthButton({
  logo,
  label,
  href,
}: {
  logo: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Button variant="outline" className="w-full justify-center gap-2" asChild>
      <Link to={href}>
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
}: {
  mode?: "login" | "signup";
}) {
  const suffix = mode === "signup" ? "시작하기" : "계속하기";
  return (
    <div className="grid gap-2">
      <SocialAuthButton
        logo={<KakaoLogo className="size-4 scale-125 dark:text-yellow-300" />}
        label={`카카오로 ${suffix}`}
        href="/auth/social/start/kakao"
      />
      <SocialAuthButton
        logo={<GoogleLogo className="size-4" />}
        label={`Google로 ${suffix}`}
        href="/auth/social/start/google"
      />
    </div>
  );
}
