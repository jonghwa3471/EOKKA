import type { Route } from "./+types/join";

import {
  CheckCircle2Icon,
  LockKeyholeIcon,
  UsersRoundIcon,
} from "lucide-react";
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
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";

import {
  AuthDivider,
  SocialAuthButtons,
} from "../components/auth-login-buttons";
import {
  BETA_MEMBER_CAPACITY_MESSAGE,
  getBetaMemberCapacity,
} from "../member-capacity.server";

export const meta: Route.MetaFunction = () => [
  { title: `회원가입 | ${import.meta.env.VITE_APP_NAME}` },
];

const joinSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50),
  email: z.string().trim().email("올바른 이메일 주소를 입력해 주세요."),
  terms: z.literal("on", { message: "이용약관에 동의해 주세요." }),
  marketing: z.string().optional(),
});

function signupErrorMessage(code?: string) {
  if (code === "over_email_send_rate_limit")
    return "가입 이메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.";
  if (code === "over_request_rate_limit")
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  return "가입 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function loader() {
  return getBetaMemberCapacity();
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = joinSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success)
    return data(
      { fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const capacity = await getBetaMemberCapacity();
  if (capacity.isFull)
    return data({ error: BETA_MEMBER_CAPACITY_MESSAGE }, { status: 403 });

  const [client] = makeServerClient(request);
  const origin = new URL(request.url).origin;
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: origin,
      data: {
        name: parsed.data.name,
        display_name: parsed.data.name,
        marketing_consent: parsed.data.marketing === "on",
        terms_accepted_at: new Date().toISOString(),
      },
    },
  });
  if (error) {
    const latestCapacity = await getBetaMemberCapacity();
    return data(
      {
        error: latestCapacity.isFull
          ? BETA_MEMBER_CAPACITY_MESSAGE
          : signupErrorMessage(error.code),
      },
      { status: latestCapacity.isFull ? 403 : 400 },
    );
  }

  return { success: true };
}

function TermsNotice() {
  return (
    <span>
      계속 진행하면 EOKKA의{" "}
      <Link
        to="/legal/terms-of-service"
        className="hover:text-foreground underline underline-offset-4"
      >
        이용약관
      </Link>
      과{" "}
      <Link
        to="/legal/privacy-policy"
        className="hover:text-foreground underline underline-offset-4"
      >
        개인정보처리방침
      </Link>
      에 동의하게 됩니다.
    </span>
  );
}

export default function Join({ actionData, loaderData }: Route.ComponentProps) {
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
            <CardTitle className="text-2xl font-black">
              EOKKA 시작하기
            </CardTitle>
            <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em]">
              BETA
            </span>
          </div>
          <CardDescription className="leading-6">
            계정을 만들면 분석 결과와 포트폴리오를 이어서 관리할 수 있어요.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="bg-muted/25 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span className="flex items-center gap-2">
                <UsersRoundIcon className="size-4 text-emerald-500" /> 베타 회원
              </span>
              <span className="tabular-nums">
                {Math.min(loaderData.count, loaderData.limit)}/
                {loaderData.limit}명
              </span>
            </div>
            <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-[width]"
                style={{
                  width: `${Math.min(100, (loaderData.count / loaderData.limit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {loaderData.isFull
                ? "준비한 50개의 베타 자리가 모두 채워졌어요."
                : `${loaderData.remaining}명이 더 베타에 참여할 수 있어요.`}
            </p>
          </div>

          {loaderData.isFull && (
            <Alert className="border-amber-500/30 bg-amber-500/[0.08]">
              <LockKeyholeIcon className="size-4 text-amber-500" />
              <AlertTitle>베타 회원 모집이 마감됐어요</AlertTitle>
              <AlertDescription className="leading-6">
                회원가입과 분석 기록 저장은 잠시 닫혀 있어요. 로그인 없이 빠른
                분석은 계속 이용할 수 있어요.
                <Link
                  to="/"
                  className="mt-2 block font-black text-amber-600 underline underline-offset-4 dark:text-amber-400"
                >
                  빠른 분석 이용하기
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <Form ref={formRef} method="post" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={50}
                placeholder="이름을 입력해 주세요"
                required
                disabled={loaderData.isFull}
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.name ? (
                <FormErrors errors={actionData.fieldErrors.name} />
              ) : null}
            </div>
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
                disabled={loaderData.isFull}
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.email ? (
                <FormErrors errors={actionData.fieldErrors.email} />
              ) : null}
            </div>

            <div className="grid gap-3 rounded-xl border p-4">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="terms"
                  name="terms"
                  required
                  disabled={loaderData.isFull}
                />
                <Label
                  htmlFor="terms"
                  className="text-muted-foreground leading-5"
                >
                  <TermsNotice />
                </Label>
              </div>
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.terms ? (
                <FormErrors errors={actionData.fieldErrors.terms} />
              ) : null}
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="marketing"
                  name="marketing"
                  disabled={loaderData.isFull}
                />
                <Label
                  htmlFor="marketing"
                  className="text-muted-foreground leading-5"
                >
                  새로운 기능과 소식을 이메일로 받을게요. (선택)
                </Label>
              </div>
            </div>

            <FormButton
              label={loaderData.isFull ? "베타 모집 마감" : "이메일로 시작하기"}
              className="w-full"
              disabled={loaderData.isFull}
            />
            {actionData && "error" in actionData && actionData.error ? (
              <FormErrors errors={[actionData.error]} />
            ) : null}
            {actionData && "success" in actionData && actionData.success ? (
              <Alert className="border-emerald-500/30 bg-emerald-500/[0.08]">
                <CheckCircle2Icon className="size-4 text-emerald-500" />
                <AlertTitle>가입 링크를 보냈어요</AlertTitle>
                <AlertDescription>
                  이메일에서 링크를 누르면 회원가입과 로그인이 완료돼요.
                </AlertDescription>
              </Alert>
            ) : null}
          </Form>

          <AuthDivider />
          <SocialAuthButtons mode="signup" disabled={loaderData.isFull} />
          <p className="text-muted-foreground text-center text-[11px] leading-5">
            소셜 계정의 이름을 사용합니다. <TermsNotice />
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        이미 계정이 있으신가요?{" "}
        <Link
          to="/login"
          className="hover:text-foreground font-bold underline underline-offset-4"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
