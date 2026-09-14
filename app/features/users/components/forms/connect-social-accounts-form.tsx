import type { Route as SocialAvatarRoute } from "@rr/app/features/users/api/+types/use-social-avatar";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { GoogleLogo } from "~/features/auth/components/logos/google";
import { KakaoLogo } from "~/features/auth/components/logos/kakao";

import {
  ConnectProviderButton,
  DisconnectProviderButton,
} from "../connect-provider-buttons";

const enabledProviders = [
  {
    name: "구글",
    key: "google",
    logo: <GoogleLogo />,
  },
  {
    name: "카카오",
    key: "kakao",
    logo: <KakaoLogo className="size-5 text-[#FEE500]" />,
  },
];

export default function ConnectSocialAccountsForm({
  providers,
  connectionFeedback,
  currentAvatarUrl,
  socialAvatarUrls,
}: {
  providers: string[];
  connectionFeedback: {
    provider: "google" | "kakao";
    status: "connected" | "exists" | "cancelled" | "failed";
  } | null;
  currentAvatarUrl: string | null;
  socialAvatarUrls: Record<string, string | null>;
}) {
  const avatarFetcher =
    useFetcher<SocialAvatarRoute.ComponentProps["actionData"]>();
  const avatarChoiceFinished = Boolean(
    avatarFetcher.data &&
      "success" in avatarFetcher.data &&
      avatarFetcher.data.success,
  );
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  useEffect(() => {
    if (connectionFeedback?.status === "connected") setAvatarDialogOpen(true);
  }, [connectionFeedback?.provider, connectionFeedback?.status]);

  useEffect(() => {
    if (avatarChoiceFinished) setAvatarDialogOpen(false);
  }, [avatarChoiceFinished]);
  return (
    <Card className="w-full max-w-screen-md">
      <CardHeader>
        <CardTitle>소셜 계정 연결</CardTitle>
        <CardDescription>
          구글이나 카카오 계정을 연결하거나 연결을 해제할 수 있어요.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {enabledProviders.map((provider) => {
          const feedback =
            connectionFeedback?.provider === provider.key
              ? connectionFeedback
              : null;
          const message = feedback
            ? feedback.status === "connected"
              ? `${provider.name} 계정을 연결했어요.`
              : feedback.status === "exists"
                ? `이 ${provider.name} 계정은 이미 다른 EOKKA 계정에 연결되어 있어요.`
                : feedback.status === "cancelled"
                  ? `${provider.name} 계정 연결을 취소했어요.`
                  : `${provider.name} 계정을 연결하지 못했어요. 다시 시도해 주세요.`
            : null;

          return (
            <div key={provider.key} className="space-y-3">
              {providers.includes(provider.key) ? (
                <DisconnectProviderButton
                  provider={provider.name}
                  logo={provider.logo}
                  providerKey={provider.key}
                />
              ) : (
                <ConnectProviderButton
                  provider={provider.name}
                  logo={provider.logo}
                  providerKey={provider.key}
                />
              )}
              {message && feedback?.status === "connected" ? (
                <FormSuccess message={message} />
              ) : null}
              {feedback?.status === "connected" ? (
                <Dialog
                  open={avatarDialogOpen}
                  onOpenChange={setAvatarDialogOpen}
                >
                  <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-md">
                    <DialogHeader className="border-b bg-gradient-to-br from-emerald-500/10 to-violet-500/[0.06] p-6">
                      <DialogTitle className="text-xl font-black">
                        사용할 프로필 사진을 골라주세요
                      </DialogTitle>
                      <DialogDescription className="leading-6">
                        현재 사진을 유지하거나 연결한 {provider.name} 계정의
                        사진으로 변경할 수 있어요.
                      </DialogDescription>
                    </DialogHeader>
                    <avatarFetcher.Form
                      method="post"
                      action="/api/users/social-avatar"
                      className="p-5 pt-1"
                    >
                      <input
                        type="hidden"
                        name="provider"
                        value={provider.key}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            choice: "current",
                            label: "현재 사진 유지",
                            url: currentAvatarUrl,
                            disabled: false,
                          },
                          {
                            choice: "provider",
                            label: `${provider.name} 사진 사용`,
                            url: socialAvatarUrls[provider.key],
                            disabled: !socialAvatarUrls[provider.key],
                          },
                        ].map((option) => (
                          <Button
                            key={option.choice}
                            type="submit"
                            name="choice"
                            value={option.choice}
                            variant="outline"
                            className="h-auto min-w-0 flex-col gap-3 rounded-2xl py-5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"
                            disabled={
                              option.disabled || avatarFetcher.state !== "idle"
                            }
                          >
                            <Avatar className="size-16 ring-2 ring-emerald-500/15">
                              <AvatarImage src={option.url ?? undefined} />
                              <AvatarFallback>사진 없음</AvatarFallback>
                            </Avatar>
                            <span className="max-w-full truncate text-xs">
                              {option.label}
                            </span>
                          </Button>
                        ))}
                      </div>
                      {!socialAvatarUrls[provider.key] ? (
                        <p className="text-muted-foreground mt-4 text-center text-xs leading-5">
                          {provider.name}에서 프로필 사진을 제공하지 않아 현재
                          사진을 유지할 수 있어요.
                        </p>
                      ) : null}
                      {avatarFetcher.state !== "idle" ? (
                        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-xs">
                          <Loader2Icon className="size-3.5 animate-spin" />
                          프로필 사진을 반영하고 있어요
                        </p>
                      ) : null}
                      {avatarFetcher.data && "error" in avatarFetcher.data ? (
                        <div className="mt-4">
                          <FormErrors errors={[avatarFetcher.data.error]} />
                        </div>
                      ) : null}
                    </avatarFetcher.Form>
                  </DialogContent>
                </Dialog>
              ) : null}
              {feedback?.status === "connected" && avatarChoiceFinished ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckIcon className="size-4" /> 프로필 사진 선택을
                  반영했어요.
                </p>
              ) : null}
              {message && feedback?.status !== "connected" ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                  <FormErrors errors={[message]} />
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
