/**
 * Authentication Login Buttons Module
 *
 * This module provides reusable components for rendering various authentication options
 * in a consistent and styled manner. It supports multiple authentication methods including:
 * - Social logins (Google, Kakao)
 * - Passwordless options (OTP, Magic Link)
 *
 * The components are designed to be used in both sign-in and sign-up flows, with
 * appropriate visual separation and consistent styling. Each button includes the
 * provider's logo and descriptive text to enhance usability.
 *
 * This modular approach allows for easy addition or removal of authentication methods
 * without modifying the main authentication screens.
 */
import { MailIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

import { GoogleLogo } from "./logos/google";
import { KakaoLogo } from "./logos/kakao";

/**
 * Generic authentication button component
 *
 * This component renders a consistent button for any authentication provider.
 * It includes the provider's logo and a standardized "Continue with [Provider]" text.
 * The button uses the outline variant for a clean look and links to the appropriate
 * authentication flow.
 *
 * @param logo - React node representing the provider's logo
 * @param label - Provider name (e.g., "Google", "Apple")
 * @param href - URL path to the authentication flow for this provider
 */
function AuthLoginButton({
  logo,
  label,
  href,
}: {
  logo: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Button
      variant="outline"
      className="inline-flex items-center justify-center gap-2"
      asChild
    >
      <Link to={href}>
        <span>{logo}</span>
        <span>{label}</span>
      </Link>
    </Button>
  );
}

/**
 * Visual divider with "OR" text
 *
 * This component creates a horizontal divider with the text "OR" centered between
 * two lines. It's used to visually separate different authentication method groups
 * (e.g., social logins from passwordless options).
 */
function Divider() {
  return (
    <div className="flex w-full items-center gap-3 py-1" role="separator">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground shrink-0 px-1 text-xs whitespace-nowrap">
        또는
      </span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}

/**
 * Passwordless authentication options
 *
 * This component renders buttons for passwordless authentication methods:
 * - OTP (One-Time Password) authentication
 * - Magic Link email authentication
 *
 * These methods provide alternatives to traditional password-based or social login
 * approaches, enhancing accessibility and security.
 *
 * Note: The underscore prefix (_SignInButtons) indicates this is a private component
 * intended for internal use within this module.
 */
function EmailLinkButton() {
  return (
    <AuthLoginButton
      logo={<MailIcon className="size-4 scale-110 dark:text-white" />}
      label="이메일 링크로 로그인"
      href="/auth/magic-link"
    />
  );
}

/**
 * Social login authentication options
 *
 * This component renders buttons for social authentication providers:
 * - Google
 * - Kakao
 *
 * Each button uses the provider's official logo and links to the appropriate
 * OAuth flow. The styling is consistent while respecting each provider's
 * brand guidelines for their logo presentation.
 */
function SocialLoginButtons() {
  return (
    <>
      <AuthLoginButton
        logo={<GoogleLogo className="size-4" />}
        label="Google로 계속하기"
        href="/auth/social/start/google"
      />
      <AuthLoginButton
        logo={<KakaoLogo className="size-4 scale-125 dark:text-yellow-300" />}
        label="카카오로 계속하기"
        href="/auth/social/start/kakao"
      />
    </>
  );
}

/**
 * Complete set of sign-in authentication options
 *
 * This exported component provides all authentication options for the sign-in flow,
 * including both social logins and passwordless options, with a divider between them.
 *
 * Usage:
 * ```tsx
 * <SignInButtons />
 * ```
 */
export function SignInButtons() {
  return (
    <>
      <Divider />
      <SocialLoginButtons />
      <EmailLinkButton />
    </>
  );
}

/**
 * Authentication options for the sign-up flow
 *
 * This exported component provides authentication options specifically for the sign-up flow.
 * It only includes social login options, as the passwordless options are typically
 * more relevant for returning users rather than new registrations.
 *
 * Usage:
 * ```tsx
 * <SignUpButtons />
 * ```
 */
export function SignUpButtons() {
  return (
    <>
      <Divider />
      <SocialLoginButtons />
    </>
  );
}
