import { type Route } from "@rr/app/features/users/api/+types/edit-profile";
import { UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

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
  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      formRef.current?.blur();
      formRef.current?.querySelectorAll("input").forEach((input) => {
        input.blur();
      });
    }
  }, [fetcher.data]);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const onChangeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
    }
  };
  return (
    <fetcher.Form
      method="post"
      className="w-full max-w-screen-md"
      encType="multipart/form-data"
      ref={formRef}
      action="/api/users/profile"
    >
      <Card className="justify-between">
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <CardDescription>프로필 사진과 이름을 관리할 수 있어요.</CardDescription>
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
                      className="cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
                    <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-4">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="프로필 사진 크게 보기"
                          className="max-h-[70vh] max-w-full rounded-lg object-contain"
                        />
                      ) : (
                        <div className="flex size-48 items-center justify-center rounded-full bg-muted">
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
                defaultValue={name}
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
                defaultChecked={marketingConsent}
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
          />
          {fetcher.data && "success" in fetcher.data && fetcher.data.success ? (
            <FormSuccess message="프로필이 저장되었습니다." />
          ) : null}
          {fetcher.data && "error" in fetcher.data && fetcher.data.error ? (
            <FormErrors errors={[fetcher.data.error]} />
          ) : null}
        </CardFooter>
      </Card>
    </fetcher.Form>
  );
}
