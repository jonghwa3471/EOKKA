import { type Route } from "@rr/app/features/users/api/+types/edit-profile";
import { UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import ConfirmDialog from "~/core/components/confirm-dialog";
import FetcherFormButton from "~/core/components/fetcher-form-button";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

export default function EditProfileForm({
  name,
  avatarUrl,
  marketingConsent,
}: {
  name: string;
  marketingConsent: boolean;
  avatarUrl: string | null;
}) {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  const saveInFlightRef = useRef(false);
  const initialNameRef = useRef(name);
  const initialMarketingConsentRef = useRef(marketingConsent);
  const [profileName, setProfileName] = useState(name);
  const [marketingEnabled, setMarketingEnabled] = useState(marketingConsent);
  const [hasNewAvatar, setHasNewAvatar] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const isDirty =
    profileName !== initialNameRef.current ||
    marketingEnabled !== initialMarketingConsentRef.current ||
    hasNewAvatar;

  useEffect(() => {
    if (fetcher.state !== "idle") {
      saveInFlightRef.current = true;
      return;
    }
    if (
      saveInFlightRef.current &&
      fetcher.data &&
      "success" in fetcher.data &&
      fetcher.data.success
    ) {
      saveInFlightRef.current = false;
      initialNameRef.current = profileName;
      initialMarketingConsentRef.current = marketingEnabled;
      setHasNewAvatar(false);
      const fileInput = formRef.current?.elements.namedItem("avatar");
      if (fileInput instanceof HTMLInputElement) fileInput.value = "";
      formRef.current?.blur();
      formRef.current?.querySelectorAll("input").forEach((input) => {
        input.blur();
      });
    }
  }, [fetcher.data, fetcher.state, marketingEnabled, profileName]);

  useEffect(() => {
    if (!hasNewAvatar) setAvatar(avatarUrl);
  }, [avatarUrl, hasNewAvatar]);

  const onChangeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
      setHasNewAvatar(true);
    }
  };
  return (
    <fetcher.Form
      method="post"
      className="w-full max-w-screen-md"
      encType="multipart/form-data"
      ref={formRef}
      action="/api/users/profile"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isDirty) return;
        if (!event.currentTarget.checkValidity()) {
          event.currentTarget.reportValidity();
          return;
        }
        setConfirmOpen(true);
      }}
    >
      <Card className="justify-between">
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <CardDescription>
            프로필 사진과 이름을 관리할 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full flex-col gap-7">
            <div className="flex items-center gap-10">
              <div className="flex flex-col items-start gap-2">
                <span>프로필 사진</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="focus-visible:ring-ring cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      aria-label="프로필 사진 크게 보기"
                    >
                      <Avatar className="size-24">
                        {avatar ? (
                          <AvatarImage src={avatar} alt="프로필 사진" />
                        ) : null}
                        <AvatarFallback>
                          <UserIcon className="text-muted-foreground size-10" />
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>프로필 사진</DialogTitle>
                    </DialogHeader>
                    <div className="bg-muted/40 flex min-h-80 items-center justify-center overflow-hidden rounded-xl p-4">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="프로필 사진 크게 보기"
                          className="max-h-[70vh] max-w-full rounded-lg object-contain"
                        />
                      ) : (
                        <div className="bg-muted flex size-48 items-center justify-center rounded-full">
                          <UserIcon className="text-muted-foreground size-20" />
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-muted-foreground flex w-1/2 flex-col gap-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span>최대 용량: 1MB</span>
                  <span>지원 형식: PNG, JPG, GIF</span>
                </div>
                <Input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  onChange={onChangeAvatar}
                  className="cursor-pointer file:cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="name" className="flex flex-col items-start gap-1">
                이름
              </Label>
              <Input
                id="name"
                name="name"
                required
                type="text"
                placeholder="이름을 입력해 주세요"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
              {fetcher.data &&
              "fieldErrors" in fetcher.data &&
              fetcher.data.fieldErrors?.name ? (
                <FormErrors errors={fetcher.data?.fieldErrors?.name} />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="marketingConsent"
                name="marketingConsent"
                checked={marketingEnabled}
                onCheckedChange={(checked) =>
                  setMarketingEnabled(checked === true)
                }
              />
              <Label htmlFor="marketingConsent">
                새로운 기능과 소식을 이메일로 받을게요. (선택)
              </Label>
            </div>
            {fetcher.data &&
            "fieldErrors" in fetcher.data &&
            fetcher.data.fieldErrors?.marketingConsent ? (
              <FormErrors
                errors={fetcher.data?.fieldErrors?.marketingConsent}
              />
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <FetcherFormButton
            submitting={fetcher.state === "submitting"}
            label="프로필 저장"
            className="w-full"
            disabled={fetcher.state !== "idle" || !isDirty}
          />
          {fetcher.data && "success" in fetcher.data && fetcher.data.success ? (
            <FormSuccess message="프로필이 저장되었습니다." />
          ) : null}
          {fetcher.data && "error" in fetcher.data && fetcher.data.error ? (
            <FormErrors errors={[fetcher.data.error]} />
          ) : null}
        </CardFooter>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="프로필 변경사항을 저장할까요?"
        description="변경한 이름, 프로필 사진과 이메일 소식 수신 설정을 계정에 반영해요."
        confirmLabel="프로필 저장"
        busy={fetcher.state !== "idle"}
        onConfirm={() => {
          if (!formRef.current) return;
          setConfirmOpen(false);
          void fetcher.submit(formRef.current, {
            method: "post",
            action: "/api/users/profile",
            encType: "multipart/form-data",
          });
        }}
      />
    </fetcher.Form>
  );
}
