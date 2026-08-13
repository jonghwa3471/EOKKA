import type { Route } from "./+types/login";

import { CheckCircle2Icon, MailIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, Link, data } from "react-router";
import { z } from "zod";

import { EokkaLogo } from "~/core/components/eokka-logo";
import FormButton from "~/core/components/form-button";
import FormErrors from "~/core/components/form-error";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";

import {
  AuthDivider,
  SocialAuthButtons,
} from "../components/auth-login-buttons";

export const meta: Route.MetaFunction = () => [
  { title: `로그인 | ${import.meta.env.VITE_APP_NAME}` },
];

const loginSchema = z.object({
  email: z.string().trim().email("올바른 이메일 주소를 입력해 주세요."),
});

function loginErrorMessage(code?: string) {
  if (code === "otp_disabled")
    return "가입되지 않은 이메일이에요. 먼저 회원가입을 진행해 주세요.";
  if (code === "over_email_send_rate_limit")
    return "로그인 이메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.";
  if (code === "over_request_rate_limit")
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  return "로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = loginSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success)
    return data(
      { fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const [client] = makeServerClient(request);
  const origin = new URL(request.url).origin;
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: origin,
    },
  });
  if (error)
    return data({ error: loginErrorMessage(error.code) }, { status: 400 });

  return { success: true };
}

export default function Login({ actionData }: Route.ComponentProps) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success)
      formRef.current?.reset();
  }, [actionData]);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500" />
        <CardHeader className="items-center pt-7 text-center">
          <EokkaLogo className="mb-2 size-14" priority />
          <div className="flex items-center justify-center gap-2.5">
            <CardTitle className="text-2xl font-black">EOKKA 로그인</CardTitle>
            <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em]">
              BETA
            </span>
          </div>
          <CardDescription className="leading-6">
            가장 편한 방법으로 다시 시작해 보세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form ref={formRef} method="post" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                required
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.email ? (
                <FormErrors errors={actionData.fieldErrors.email} />
              ) : null}
            </div>
            <FormButton label="이메일 로그인 링크 받기" className="w-full" />
            {actionData && "error" in actionData && actionData.error ? (
              <FormErrors errors={[actionData.error]} />
            ) : null}
            {actionData && "success" in actionData && actionData.success ? (
              <Alert className="border-emerald-500/30 bg-emerald-500/[0.08]">
                <CheckCircle2Icon className="size-4 text-emerald-500" />
                <AlertTitle>로그인 링크를 보냈어요</AlertTitle>
                <AlertDescription>
                  이메일에서 링크를 누르면 바로 로그인돼요.
                </AlertDescription>
              </Alert>
            ) : null}
          </Form>

          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-[11px]">
            <MailIcon className="size-3.5" /> 비밀번호를 기억할 필요가 없어요.
          </p>

          <AuthDivider />
          <SocialAuthButtons />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-sm">
        아직 계정이 없으신가요?{" "}
        <Link
          to="/join"
          className="hover:text-foreground font-bold underline underline-offset-4"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
