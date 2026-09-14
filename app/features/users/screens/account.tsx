import type { Route } from "./+types/account";

import { Suspense, useLayoutEffect } from "react";
import { Await } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";

import ChangeEmailForm from "../components/forms/change-email-form";
import ConnectSocialAccountsForm from "../components/forms/connect-social-accounts-form";
import DeleteAccountForm from "../components/forms/delete-account-form";
import EditProfileForm from "../components/forms/edit-profile-form";
import ResetUserDataForm from "../components/forms/reset-user-data-form";
import { getUserProfile } from "../queries";

export const meta: Route.MetaFunction = () => {
  return [{ title: `프로필 설정 | ${import.meta.env.VITE_APP_NAME}` }];
};

function socialAvatarUrl(identityData: Record<string, unknown> | undefined) {
  if (!identityData) return null;
  const avatarKey = /(avatar|picture|profile.*image|image.*profile|thumbnail)/i;
  const queue: unknown[] = [identityData];
  while (queue.length > 0) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [key, nestedValue] of Object.entries(value)) {
      if (
        avatarKey.test(key) &&
        typeof nestedValue === "string" &&
        (nestedValue.startsWith("https://") ||
          nestedValue.startsWith("http://k.kakaocdn.net/"))
      )
        return nestedValue.replace(
          "http://k.kakaocdn.net/",
          "https://k.kakaocdn.net/",
        );
      if (nestedValue && typeof nestedValue === "object")
        queue.push(nestedValue);
    }
  }
  return null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const identities = await client.auth.getUserIdentities();
  const profile = await getUserProfile(client, { userId: user!.id });
  const socialStatus = new URL(request.url).searchParams.get("social");
  const socialProvider = new URL(request.url).searchParams.get("provider");
  return {
    user,
    identities,
    profile,
    socialStatus,
    socialProvider,
  };
}

export default function Account({ loaderData }: Route.ComponentProps) {
  const { user, identities, profile, socialStatus, socialProvider } =
    loaderData;

  useLayoutEffect(() => {
    if (!socialStatus) return;
    const savedScrollY = sessionStorage.getItem("eokka:social-link-scroll-y");
    if (savedScrollY === null) return;

    sessionStorage.removeItem("eokka:social-link-scroll-y");
    const scrollY = Number(savedScrollY);
    if (!Number.isFinite(scrollY)) return;

    const restoreScroll = () =>
      window.scrollTo({ top: scrollY, behavior: "auto" });
    requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
    const retryTimer = window.setTimeout(restoreScroll, 250);
    return () => window.clearTimeout(retryTimer);
  }, [socialStatus]);

  return (
    <div className="flex w-full flex-col items-center gap-10 px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <Suspense
        fallback={
          <div className="bg-card animate-fast-pulse h-60 w-full max-w-screen-md rounded-xl border shadow-sm" />
        }
      >
        <Await
          resolve={profile}
          errorElement={
            <div className="text-red-500">프로필을 불러오지 못했습니다.</div>
          }
        >
          {(profile) => {
            if (!profile) {
              return null;
            }
            return (
              <EditProfileForm
                name={profile.name}
                marketingConsent={profile.marketing_consent}
                avatarUrl={profile.avatar_url}
              />
            );
          }}
        </Await>
      </Suspense>
      <ChangeEmailForm
        email={user?.email ?? ""}
        canChangeEmail={
          identities.data?.identities.some(
            (identity) => identity.provider === "email",
          ) ?? false
        }
      />
      <Suspense
        fallback={
          <div className="bg-card animate-fast-pulse h-60 w-full max-w-screen-md rounded-xl border shadow-sm" />
        }
      >
        <Await
          resolve={identities}
          errorElement={
            <div className="text-red-500">소셜 계정을 불러오지 못했습니다.</div>
          }
        >
          {({ data, error }) => {
            if (!data) {
              return (
                <div className="text-red-500">
                  <span>소셜 계정을 불러오지 못했습니다.</span>
                  <span className="text-xs">오류 코드: {error.code}</span>
                  <span className="text-xs">오류 내용: {error.message}</span>
                </div>
              );
            }
            return (
              <ConnectSocialAccountsForm
                providers={data.identities
                  .filter((identity) => identity.provider !== "email")
                  .map((identity) => identity.provider)}
                connectionFeedback={
                  (socialProvider === "google" || socialProvider === "kakao") &&
                  (socialStatus === "connected" ||
                    socialStatus === "disconnected" ||
                    socialStatus === "exists" ||
                    socialStatus === "cancelled" ||
                    socialStatus === "failed")
                    ? { provider: socialProvider, status: socialStatus }
                    : null
                }
                currentAvatarUrl={profile?.avatar_url ?? null}
                socialAvatarUrls={Object.fromEntries(
                  data.identities.map((identity) => {
                    const avatarUrl = socialAvatarUrl(
                      identity.identity_data as
                        | Record<string, unknown>
                        | undefined,
                    );
                    return [identity.provider, avatarUrl ?? null];
                  }),
                )}
              />
            );
          }}
        </Await>
      </Suspense>
      <ResetUserDataForm />
      <DeleteAccountForm />
    </div>
  );
}
