import type { Route } from "./+types/eokka-pro";

import { and, eq, isNull } from "drizzle-orm";
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
import { useEffect, useState } from "react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import db from "~/core/db/drizzle-client.server";
import { isLocalDevelopmentEnvironment } from "~/core/lib/app-environment.server";
import {
  invalidateRouteDataCache,
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { isAdmin } from "~/features/admin/admin.server";
import { createNotification } from "~/features/notifications/notifications.server";
import { getPayments } from "~/features/payments/queries";
import { promotePendingQuickAnalysis } from "~/features/stocks/history/analysis-history.server";

import { getAutomaticAnalysisSettings } from "../automatic-analysis-settings.server";
import { DeveloperPortfolioGiftDialog } from "../components/developer-portfolio-gift-dialog";
import { proTenureToneStyles } from "../components/pro-tenure-badge";
import { createDeveloperPortfolioGiftNotification } from "../developer-portfolio-gift.server";
import { PRO_TENURE_BADGES } from "../pro-tenure";
import { profiles } from "../schema";

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
    isPaidPro: "isPaidPro" in settings && settings.isPaidPro,
    isBetaPro: "isBetaPro" in settings && settings.isBetaPro,
    giftRequested: new URL(request.url).searchParams.get("gift") === "1",
    betaJustStarted:
      new URL(request.url).searchParams.get("beta") === "started",
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

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login?next=/dashboard/pro");
  const formData = await request.formData();
  if (formData.get("intent") !== "start-beta-pro")
    throw new Response("Invalid intent", { status: 400 });
  const [started] = await db
    .update(profiles)
    .set({ beta_pro_started_at: new Date(), updated_at: new Date() })
    .where(
      and(
        eq(profiles.profile_id, user.id),
        isNull(profiles.beta_pro_started_at),
      ),
    )
    .returning({ id: profiles.profile_id });
  if (!started) return redirect("/dashboard/pro");
  let restoredAnalysis = false;
  try {
    restoredAnalysis = Boolean(await promotePendingQuickAnalysis(user.id));
  } catch (error) {
    console.error("Pending quick analysis promotion failed", error);
  }
  try {
    await Promise.all([
      createNotification({
        userId: user.id,
        type: "beta_pro_started",
        title: "EOKKA Pro 베타 체험을 시작했어요",
        message: restoredAnalysis
          ? "이제 Pro 기능을 이용할 수 있어요. 조금 전 빠른 분석도 첫 기록으로 저장했어요."
          : "이제 내 포트폴리오와 정밀 분석, 최근 상세 기록 30개와 장기 투자 인사이트를 이용할 수 있어요.",
        href: restoredAnalysis ? "/dashboard" : "/dashboard/pro",
      }),
      createDeveloperPortfolioGiftNotification(user.id),
    ]);
  } catch (error) {
    console.error("Beta Pro notification creation failed", error);
  }
  return redirect(
    `/dashboard/pro?beta=started&gift=1${restoredAnalysis ? "&analysis=restored" : ""}`,
  );
}

type EokkaProLoaderData = Awaited<ReturnType<typeof loader>>;
export async function clientLoader({
  request,
  serverLoader,
}: Route.ClientLoaderArgs) {
  const justStartedBeta =
    new URL(request.url).searchParams.get("beta") === "started";
  return loadCachedRouteData<EokkaProLoaderData>(
    "eokka-pro",
    async () => serverLoader() as Promise<EokkaProLoaderData>,
    { maxAgeMs: justStartedBeta ? 0 : 30_000 },
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
    pro: "1개",
  },
  {
    feature: "분석 기록 보관",
    free: "저장하지 않음",
    pro: "최근 30개 · 이전 기록은 요약 보관",
  },
  {
    feature: "수동 분석",
    free: "하루 5회",
    pro: "하루 5회",
  },
  {
    feature: "자동 분석",
    free: "-",
    pro: "베타 기간 미제공",
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
  const [giftPreviewOpen, setGiftPreviewOpen] = useState(
    loaderData.betaJustStarted,
  );
  usePrimeRouteDataCache("eokka-pro", loaderData);
  useEffect(() => {
    if (!loaderData.betaJustStarted) return;
    invalidateRouteDataCache("dashboard");
    invalidateRouteDataCache("analysis-history");
    invalidateRouteDataCache("investment-insights");
    invalidateRouteDataCache("home");
    invalidateRouteDataCache("dashboard-layout");
  }, [loaderData.betaJustStarted]);
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
                기록은 가볍게 쌓고,
                <br />
                투자 판단은 더 차분하게
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 break-keep md:text-base">
                필요할 때 최신 종가로 직접 분석하고, 쌓인 변화를 주간·월간·연간
                인사이트로 확인하세요. 베타 기간에는 결제 없이 직접 경험할 수
                있어요.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "상세 기록 최근 30개",
                  "장기 차트 계속 보관",
                  "목표 금액 1개",
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
                    누구나 이용하는 베타
                  </p>
                  <div className="mt-2 flex items-end gap-1">
                    <strong className="text-4xl font-black tracking-tight">
                      무료
                    </strong>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
                  결제 없음
                </span>
              </div>
              {loaderData.isPro ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {loaderData.isBetaPro
                        ? "Pro 베타 체험 중"
                        : "Pro 이용 중"}
                    </p>
                    {loaderData.isPaidPro && loaderData.proExpiresAt ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        다음 결제 ·{" "}
                        <strong className="text-foreground tabular-nums">
                          {koreanDate(loaderData.proExpiresAt)}
                        </strong>
                      </p>
                    ) : null}
                  </div>
                  {loaderData.isPaidPro ? (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-2xl"
                    >
                      <Link to="/dashboard/payments">구독 관리</Link>
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-center text-xs leading-5">
                      결제 없이 기간 제한 없이 체험할 수 있어요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="bg-muted/35 rounded-2xl border p-4">
                    <p className="text-xs font-black">무료 베타 체험</p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      결제 없이 목표 1개와 최근 상세 기록 30개, 장기 차트와
                      주·월·연간 인사이트를 이용해 보세요.
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="start-beta-pro" />
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
                    >
                      <SparklesIcon /> Pro 베타 체험 시작하기
                    </Button>
                  </Form>
                </div>
              )}
              {loaderData.isPaidPro && (
                <details className="group mt-3 text-[11px]">
                  <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-center gap-1 font-bold transition-colors">
                    결제 및 해지 안내
                    <ArrowRightIcon className="size-3 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="text-muted-foreground bg-muted/35 mt-2 rounded-xl px-3 py-2.5 text-center leading-5 break-keep">
                    구독을 해지하면 다음 결제부터 중단되며, 결제한 기간까지
                    Pro를 이용할 수 있어요. 구독이 끝나도 기존 분석 기록과
                    포트폴리오는 삭제되지 않으며, 재구독하면 이전 기록부터
                    이어서 이용할 수 있어요. Pro 이용 기간이 끝난 동안에는 자동
                    분석과 새 분석 기록 저장이 중단돼요. 청약철회·과오금·서비스
                    하자에 따른 환불은 관련 법령과 결제 화면에 안내된 조건을
                    따라요.
                  </p>
                </details>
              )}
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
              Pro와 함께한 기간에 따라 프로필에 새로운 배지가 표시돼요.
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
              무료에서는 최대 10종목을 직접 분석하고 결과를 바로 확인해요. Pro
              베타에서는 최대 20종목과 목표 하나를 기록으로 남기고, 직접 분석한
              흐름을 기간별 인사이트로 확인해요.
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
                    <span className="flex items-start justify-center gap-1.5 text-center leading-6 font-black text-amber-700 dark:text-amber-300">
                      <CheckIcon className="mt-1 size-4 shrink-0" />
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
                "상세 분석은 최근 30개까지 다시 보고, 가벼운 변화 기록은 압축해 장기 차트와 연간 인사이트를 계속 이어가요.",
            },
            {
              icon: RefreshCwIcon,
              title: "한 가지 목표에 집중해요",
              detail:
                "무료 베타에서는 목표 금액 하나를 저장하고, 필요할 때 최신 종가로 직접 분석해 흐름을 쌓을 수 있어요.",
            },
            {
              icon: ShieldCheckIcon,
              title: "기간별 변화를 한눈에 봐요",
              detail:
                "주간·월간·연간 인사이트와 장기 자산 차트로 숫자가 어떻게 달라졌는지 쉽게 확인해요.",
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
            기능을 꾸준히 개선하겠습니다. 현재 베타 체험은 결제 없이 이용할 수
            있어요.
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
        preview={!loaderData.betaJustStarted}
        beta={loaderData.betaJustStarted}
      />
    </main>
  );
}
