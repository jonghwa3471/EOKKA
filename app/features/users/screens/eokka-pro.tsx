import type { Route } from "./+types/eokka-pro";

import {
  InfinityIcon,
  ArrowRightIcon,
  CheckIcon,
  Clock3Icon,
  CrownIcon,
  GiftIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { Form, Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import { isLocalDevelopmentEnvironment } from "~/core/lib/app-environment.server";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { isAdmin } from "~/features/admin/admin.server";
import { getPayments } from "~/features/payments/queries";

import { getAutomaticAnalysisSettings } from "../automatic-analysis-settings.server";
import { DeveloperPortfolioGiftDialog } from "../components/developer-portfolio-gift-dialog";
import { proTenureToneStyles } from "../components/pro-tenure-badge";
import { PRO_TENURE_BADGES } from "../pro-tenure";

export const meta: Route.MetaFunction = () => [
  { title: `EOKKA Pro | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const [settings, payments] = user
    ? await Promise.all([
        getAutomaticAnalysisSettings(user.id),
        getPayments(client, { userId: user.id }),
      ])
    : [{ isPro: false }, []];
  const completedPaymentCount = payments.filter((payment) =>
    ["DONE", "PAID", "APPROVED"].includes(payment.status.toUpperCase()),
  ).length;
  const proTenureMonths = settings.isPro
    ? Math.max(1, completedPaymentCount)
    : completedPaymentCount;
  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  return {
    canPreviewGiftWorkflow:
      isLocalDevelopmentEnvironment() &&
      Boolean(user && (await isAdmin(user.id))),
    isPro: settings.isPro,
    giftRequested: new URL(request.url).searchParams.get("gift") === "1",
    developerPortfolioGiftRevealed:
      "developerPortfolioGiftRevealedAt" in settings &&
      Boolean(settings.developerPortfolioGiftRevealedAt),
    proExpiresAt:
      "proExpiresAt" in settings && settings.proExpiresAt
        ? settings.proExpiresAt.toISOString()
        : null,
    checkoutStartsAt: now.toISOString(),
    checkoutRenewsAt: nextBillingDate.toISOString(),
    proTenureMonths,
  };
}

type EokkaProLoaderData = Awaited<ReturnType<typeof loader>>;
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<EokkaProLoaderData>(
    "eokka-pro",
    async () => serverLoader() as Promise<EokkaProLoaderData>,
  );
}

const comparison = [
  {
    feature: "분석 가능 종목",
    free: "최대 10개",
    pro: "최대 20개",
  },
  {
    feature: "저장 가능한 목표 금액",
    free: "저장 불가",
    pro: "최대 3개",
  },
  {
    feature: "분석 기록 보관",
    free: "저장하지 않음",
    pro: "기간 제한 없음",
  },
  {
    feature: "수동 분석",
    free: "하루 5회",
    pro: "하루 15회",
  },
  {
    feature: "자동 분석",
    free: "-",
    pro: "사용 가능",
  },
  {
    feature: "자동 분석 범위",
    free: "-",
    pro: "저장한 모든 목표",
  },
  {
    feature: "투자 인사이트",
    free: "이용 불가",
    pro: "주·월·연간별 제공",
  },
] as const;

function koreanDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function EokkaPro({ loaderData }: Route.ComponentProps) {
  const [giftPreviewOpen, setGiftPreviewOpen] = useState(false);
  usePrimeRouteDataCache("eokka-pro", loaderData);
  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-12 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-6xl">
        {loaderData.canPreviewGiftWorkflow && (
          <section className="mb-7 flex flex-col gap-4 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-xs font-black text-amber-600 dark:text-amber-300">
                로컬 관리자 테스트 도구
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5 font-medium">
                결제 완료 후 나타나는 감사 선물과 메뉴 공개 연출을 데이터 변경
                없이 확인해요.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-full border-amber-500/30 font-black hover:bg-amber-500/10"
              onClick={() => setGiftPreviewOpen(true)}
            >
              <GiftIcon className="size-4" /> 선물 워크플로우 미리보기
            </Button>
          </section>
        )}
        {loaderData.isPro &&
          loaderData.giftRequested &&
          !loaderData.developerPortfolioGiftRevealed && (
            <section className="mb-7 overflow-hidden rounded-3xl border border-amber-500/25 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_42%),linear-gradient(135deg,rgba(139,92,246,0.08),rgba(16,185,129,0.08))] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/20">
                    <GiftIcon className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-300">
                      PRO 감사 선물
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      아직 열지 않은 선물이 있어요
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-6 font-medium">
                      개발자의 실제 주식 포트폴리오와 투자 이야기를 Pro
                      회원님께만 공개할게요.
                    </p>
                  </div>
                </div>
                <Form
                  method="post"
                  action="/api/users/developer-portfolio-gift"
                >
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 font-black text-white sm:w-auto"
                  >
                    <GiftIcon className="size-4" /> 선물 열어보기
                  </Button>
                </Form>
              </div>
            </section>
          )}
        <section className="via-background relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-violet-500/[0.08] p-7 shadow-sm md:p-10">
          <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
                <CrownIcon className="size-3.5" /> EOKKA Pro 베타
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
                기록은 자동으로,
                <br />
                투자 판단은 더 차분하게
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 break-keep md:text-base">
                거래일마다 최신 종가로 포트폴리오를 기록하고, 쌓인 변화를 주간과
                월간 인사이트로 확인하세요. 아직 성장 중인 베타 서비스라 부담
                없는 가격으로 시작해요.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "거래일 자동 분석",
                  "기록 기간 제한 없음",
                  "목표 최대 3개",
                  "최대 20종목",
                ].map((benefit) => (
                  <span
                    key={benefit}
                    className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
                  >
                    <CheckIcon className="size-3.5 text-emerald-500" />
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-background/85 rounded-3xl border border-amber-500/25 p-5 shadow-xl backdrop-blur md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-amber-600 dark:text-amber-300">
                    베타 기간 한정
                  </p>
                  <div className="mt-2 flex items-end gap-1">
                    <strong className="text-4xl font-black tracking-tight">
                      990원
                    </strong>
                    <span className="text-muted-foreground pb-1 text-sm">
                      / 월
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
                  월 자동결제
                </span>
              </div>
              {loaderData.isPro ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Pro 이용 중
                    </p>
                    {loaderData.proExpiresAt ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        다음 결제 ·{" "}
                        <strong className="text-foreground tabular-nums">
                          {koreanDate(loaderData.proExpiresAt)}
                        </strong>
                      </p>
                    ) : null}
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-2xl"
                  >
                    <Link to="/dashboard/payments">구독 관리</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="bg-muted/35 rounded-2xl border p-4">
                    <p className="text-xs font-black">오늘 시작하면</p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {koreanDate(loaderData.checkoutRenewsAt)}까지 이용하고,
                      같은 날 다음 결제가 진행돼요.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="w-full rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
                  >
                    <Link to="/payments/checkout" prefetch="intent">
                      <Clock3Icon /> 월 990원으로 시작하기
                    </Link>
                  </Button>
                </div>
              )}
              <details className="group mt-3 text-[11px]">
                <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-center gap-1 font-bold transition-colors">
                  결제 및 해지 안내
                  <ArrowRightIcon className="size-3 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-muted-foreground bg-muted/35 mt-2 rounded-xl px-3 py-2.5 text-center leading-5 break-keep">
                  구독을 해지하면 다음 결제부터 중단되며, 결제한 기간까지 Pro를
                  이용할 수 있어요. 구독이 끝나도 기존 분석 기록과 포트폴리오는
                  삭제되지 않으며, 재구독하면 이전 기록부터 이어서 이용할 수
                  있어요. Pro 이용 기간이 끝난 동안에는 자동 분석과 새 분석 기록
                  저장이 중단돼요. 청약철회·과오금·서비스 하자에 따른 환불은
                  관련 법령과 결제 화면에 안내된 조건을 따라요.
                </p>
              </details>
              <p className="text-muted-foreground mt-3 text-center text-[10px] leading-4">
                토스페이먼츠를 통해 안전하게 결제해요
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.14em] text-amber-600 uppercase dark:text-amber-400">
              Pro journey badges
            </p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              함께한 시간만큼 배지가 자라요
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              결제가 완료된 누적 구독 개월에 따라 프로필에 새로운 배지가
              표시돼요.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PRO_TENURE_BADGES.map((badge) => {
              const earned = loaderData.proTenureMonths >= badge.months;
              return (
                <article
                  key={badge.months}
                  className={cn(
                    "bg-card group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                    proTenureToneStyles[badge.tone].card,
                    earned
                      ? cn("shadow-sm", proTenureToneStyles[badge.tone].badge)
                      : "border-border opacity-65 hover:opacity-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <img
                      src={badge.image}
                      alt={`${badge.name} 배지`}
                      className={cn(
                        "size-20 object-contain drop-shadow-lg transition duration-300",
                        earned
                          ? "scale-105"
                          : "grayscale group-hover:scale-105 group-hover:grayscale-0",
                      )}
                    />
                    <span className="bg-muted rounded-full px-2 py-1 text-[10px] font-black">
                      {badge.months}개월
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black">{badge.name}</p>
                  <p className="text-muted-foreground mt-3 text-xs leading-5 break-keep">
                    {badge.description}
                  </p>
                  {earned && (
                    <p className="mt-3 flex items-center gap-1 text-[11px] font-black text-emerald-500">
                      <CheckIcon className="size-3.5" /> 획득 완료
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">
              Plan comparison
            </p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              무료와 Pro, 무엇이 다른가요?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              무료에서는 최대 10종목을 직접 분석하고 결과를 바로 확인해요.
              Pro에서는 더 많은 종목과 목표를 기록으로 남기고, 최신 종가 분석과
              기간별 인사이트까지 자동으로 이어가요.
            </p>
          </div>
          <div className="bg-card mt-6 overflow-x-auto rounded-3xl border">
            <div className="min-w-[560px]">
              <div className="bg-muted/35 grid grid-cols-[1.35fr_1fr_1fr] border-b px-6 py-4 text-sm font-black">
                <span>기능</span>
                <span className="flex items-center justify-center gap-2 text-center">
                  <span className="text-muted-foreground bg-muted flex size-7 items-center justify-center rounded-full">
                    <UserRoundIcon className="size-3.5" />
                  </span>
                  무료
                </span>
                <span className="flex items-center justify-center gap-2 text-center text-amber-600 dark:text-amber-300">
                  <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/15">
                    <CrownIcon className="size-3.5" />
                  </span>
                  Pro 베타
                </span>
              </div>
              {comparison.map((item) => {
                return (
                  <div
                    key={item.feature}
                    className="grid grid-cols-[1.35fr_1fr_1fr] items-center border-b px-6 py-4 text-sm last:border-b-0"
                  >
                    <span className="font-bold break-keep">{item.feature}</span>
                    <span className="text-muted-foreground flex justify-center text-center">
                      {item.free}
                    </span>
                    <span className="flex items-center justify-center gap-1.5 text-center font-black text-amber-700 dark:text-amber-300">
                      <CheckIcon className="size-4" />
                      {item.pro}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: InfinityIcon,
              title: "분석을 기록으로 남겨요",
              detail:
                "무료 분석은 화면에서 확인하고 끝나지만, Pro는 기록을 기간 제한 없이 보관해 수익률과 목표 기간의 변화를 이어서 보여줘요.",
            },
            {
              icon: RefreshCwIcon,
              title: "세 가지 목표를 거래일마다 확인해요",
              detail:
                "목표 금액을 최대 3개까지 저장하면 거래일마다 모든 목표를 최신 종가와 각 목표에서 마지막으로 사용한 월 투자금으로 자동 분석해요.",
            },
            {
              icon: ShieldCheckIcon,
              title: "더 넓게, 더 자주 분석해요",
              detail:
                "빠른 분석과 정밀 포트폴리오에 최대 20종목을 담고, 수동 분석도 하루 15회까지 이용할 수 있어요.",
            },
          ].map(({ icon: Icon, title, detail }) => (
            <article key={title} className="bg-card rounded-2xl border p-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6 break-keep">
                {detail}
              </p>
            </article>
          ))}
        </section>

        <div className="bg-card mt-8 flex flex-col items-center rounded-3xl border p-6 text-center sm:p-8">
          <SparklesIcon className="size-6 text-amber-500" />
          <p className="mt-3 font-black">EOKKA Pro는 아직 베타 단계예요</p>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 break-keep">
            완벽한 서비스라고 약속하기보다 실제 사용 경험을 바탕으로 분석과 기록
            기능을 꾸준히 개선하겠습니다. 구독은 언제든 해지할 수 있고 결제한
            기간까지 계속 이용할 수 있어요.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-full">
            <Link to="/dashboard">
              대시보드로 돌아가기 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
      <DeveloperPortfolioGiftDialog
        open={giftPreviewOpen}
        onOpenChange={setGiftPreviewOpen}
        preview
      />
    </main>
  );
}
