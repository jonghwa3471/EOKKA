import type { Route } from "@rr/app/features/users/api/+types/change-email";

import { LockKeyholeIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";

import FetcherFormButton from "~/core/components/fetcher-form-button";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import { CardContent, CardFooter } from "~/core/components/ui/card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

export default function ChangeEmailForm({
  email,
  canChangeEmail,
}: {
  email: string;
  canChangeEmail: boolean;
}) {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      formRef.current?.reset();
      formRef.current?.blur();
      formRef.current?.querySelectorAll("input").forEach((input) => {
        if (!input.disabled) {
          input.blur();
        }
      });
    }
  }, [fetcher.data]);

  if (!canChangeEmail) {
    return (
      <Card className="w-full max-w-screen-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <LockKeyholeIcon className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>이메일</CardTitle>
              <CardDescription>
                소셜 로그인으로 가입한 계정의 이메일은 EOKKA에서 변경할 수
                없어요.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="social-email">현재 이메일</Label>
            <Input
              id="social-email"
              type="email"
              disabled
              value={email}
              className="cursor-not-allowed"
            />
            <p className="text-muted-foreground text-sm leading-relaxed">
              이메일을 바꾸려면 연결된 구글 또는 카카오 계정에서 변경해 주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      className="w-full max-w-screen-md"
      action="/api/users/email"
    >
      <Card className="justify-between">
        <CardHeader>
          <CardTitle>{email ? "이메일 변경" : "이메일 추가"}</CardTitle>
          <CardDescription>
            {email
              ? "로그인에 사용하는 이메일 주소를 변경할 수 있어요."
              : "계정에 로그인 이메일 주소를 추가할 수 있어요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full flex-col gap-7">
            <div className="flex cursor-not-allowed flex-col items-start space-y-2">
              <Label
                htmlFor="currentEmail"
                className="flex flex-col items-start gap-1"
              >
                현재 이메일
              </Label>
              <Input
                id="currentEmail"
                name="currentEmail"
                required
                type="email"
                disabled
                value={email}
              />
            </div>
            <div className="flex flex-col items-start space-y-2">
              <Label
                htmlFor="email"
                className="flex flex-col items-start gap-1"
              >
                새 이메일
              </Label>
              <Input id="email" name="email" required type="email" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <FetcherFormButton
            label={email ? "이메일 변경" : "이메일 추가"}
            className="w-full"
            submitting={fetcher.state === "submitting"}
            disabled={fetcher.state === "submitting"}
          />
          {fetcher.data && "success" in fetcher.data && fetcher.data.success ? (
            <FormSuccess message="확인 메일을 보냈어요. 메일의 인증 링크를 누르면 이메일 변경이 완료돼요." />
          ) : null}
          {fetcher.data && "error" in fetcher.data && fetcher.data.error ? (
            <FormErrors errors={[fetcher.data.error]} />
          ) : null}
        </CardFooter>
      </Card>
    </fetcher.Form>
  );
}
