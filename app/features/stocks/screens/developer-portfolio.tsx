import type { Route } from "./+types/developer-portfolio";

import {
  ArrowUpRightIcon,
  BarChart3Icon,
  BookOpenTextIcon,
  CalendarDaysIcon,
  Clock3Icon,
  EyeIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  QuoteIcon,
  RefreshCwIcon,
  SparklesIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "lucide-react";
import { Suspense } from "react";
import { Await, Form, Link, redirect, useNavigation } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Skeleton } from "~/core/components/ui/skeleton";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { isAdmin, requireAdmin } from "~/features/admin/admin.server";
import {
  analyzeDeveloperPortfolio,
  getLatestDeveloperPortfolioSnapshot,
  isLocalDeveloperPortfolioPublishingEnabled,
  publishDeveloperPortfolio,
} from "~/features/stocks/developer-portfolio/developer-portfolio.server";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";

export const meta: Route.MetaFunction = () => [
  { title: `개발자 주식 포트폴리오 | ${import.meta.env.VITE_APP_NAME}` },
  {
    name: "description",
    content:
      "EOKKA를 만들고 직접 사용하는 1인 개발자의 실제 주식 포트폴리오를 최신 종가 기준으로 살펴보세요.",
  },
];

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "계산 전";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00+09:00`));
}

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationLabel(months: number | null) {
  if (months == null) return "계산 전";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years}년` : "", rest ? `${rest}개월` : ""]
    .filter(Boolean)
    .join(" ");
}

export async function loader({ request }: Route.LoaderArgs) {
  const latestPromise = getLatestDeveloperPortfolioSnapshot();
  const localPublishingEnabled = isLocalDeveloperPortfolioPublishingEnabled();
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  const accountSettings = await getAutomaticAnalysisSettings(user.id);
  if (!accountSettings.isPaidPro) throw redirect("/dashboard/pro");
  const admin = await isAdmin(user.id);
  if (!accountSettings.developerPortfolioGiftRevealedAt && !admin)
    throw redirect("/dashboard/pro");
  const canManage = localPublishingEnabled && admin;
  return {
    snapshotPromise: latestPromise.then((latest) => latest?.snapshot ?? null),
    canManage,
    published: new URL(request.url).searchParams.get("published") === "1",
  };
}

type DeveloperPortfolioLoaderData = Awaited<ReturnType<typeof loader>>;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<DeveloperPortfolioLoaderData>(
    "developer-portfolio",
    async () => serverLoader() as Promise<DeveloperPortfolioLoaderData>,
  );
}

export async function action({ request }: Route.ActionArgs) {
  if (!isLocalDeveloperPortfolioPublishingEnabled())
    throw new Response("로컬 환경에서만 게시할 수 있어요.", { status: 403 });
  const user = await requireAdmin(request);
  const result = await analyzeDeveloperPortfolio(user.id, true);
  await publishDeveloperPortfolio(user.id, result);
  return Response.redirect(
    new URL("/dashboard/developer-portfolio?published=1", request.url),
  );
}

function DeveloperPortfolioDataSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <div aria-label="공개 포트폴리오를 불러오는 중" role="status">
      {canManage && (
        <section className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-5">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-5 w-72 max-w-full rounded-full" />
              <Skeleton className="h-3.5 w-64 max-w-full rounded-full" />
            </div>
            <Skeleton className="hidden h-10 w-52 rounded-lg sm:block" />
          </div>
        </section>
      )}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-card rounded-2xl border p-5">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-4 h-8 w-28 rounded-lg" />
          </div>
        ))}
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-card rounded-3xl border p-6 sm:p-8">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="mt-3 h-7 w-52 rounded-lg" />
          <div className="mt-8 space-y-6">
            {[88, 72, 58, 42, 31].map((width) => (
              <div key={width}>
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton
                  className="mt-3 h-2 rounded-full"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {[0, 1].map((item) => (
            <div key={item} className="bg-card rounded-3xl border p-6">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="mt-4 h-6 w-44 rounded-lg" />
              <Skeleton className="mt-4 h-4 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DeveloperPortfolio({
  loaderData,
}: Route.ComponentProps) {
  const { snapshotPromise, canManage, published } = loaderData;
  usePrimeRouteDataCache("developer-portfolio", loaderData);
  const navigation = useNavigation();
  const publishing = navigation.state !== "idle";

  return (
    <main className="mx-auto w-full max-w-6xl py-6 md:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,0.12),transparent_32%)] px-6 py-10 sm:px-10 sm:py-14">
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-300">
            <EyeIcon className="size-3.5" />
            실제 투자 기록 구경하기
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
            개발자의 주식 포트폴리오
          </h1>
          <blockquote className="text-muted-foreground relative mt-5 max-w-3xl border-l-2 border-emerald-500/40 pl-5 text-sm leading-7 font-medium sm:text-base">
            <QuoteIcon className="absolute -top-1 -left-3 size-5 fill-emerald-500/15 text-emerald-500" />
            <span aria-hidden>“</span>
            투자를 전문적으로 하는 것도, 특별한 비법이 있는 것도 아니에요. 다만
            큰돈을 한 번에 넣기보다 적은 금액이라도 꾸준히 투자하고, 좋은 기업을
            오래 보유하며 복리의 힘을 믿는 방식으로 투자해 왔어요. 큰 수익을 한
            번에 쫓기보다 무리하지 않는 선에서 적당한 수익을 꾸준히 쌓는 과정을
            직접 경험했고, 그 방법을 다른 분들과 나누고 싶어요. 이 페이지에서는
            제가 실제로 어떤 종목을 모아가고 있는지, 포트폴리오가 어떻게 변하고
            있는지를 최신으로 반영한 종가 기준으로 보여드려요.
            <span aria-hidden>”</span>
          </blockquote>
          <Suspense
            fallback={<Skeleton className="mt-6 h-9 w-72 rounded-full" />}
          >
            <Await resolve={snapshotPromise}>
              {(snapshot) =>
                snapshot ? (
                  <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="bg-background/75 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 backdrop-blur">
                      <CalendarDaysIcon className="size-3.5 text-emerald-500" />
                      {formatDate(snapshot.asOf)} 종가 기준
                    </span>
                    <span className="text-muted-foreground bg-background/75 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 backdrop-blur">
                      <Clock3Icon className="size-3.5" />
                      {formatPublishedAt(snapshot.publishedAt)} 공개
                    </span>
                  </div>
                ) : null
              }
            </Await>
          </Suspense>
        </div>
      </section>

      <Suspense
        fallback={<DeveloperPortfolioDataSkeleton canManage={canManage} />}
      >
        <Await resolve={snapshotPromise}>
          {(snapshot) => (
            <>
              {canManage && (
                <section className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-300">
                        <LockKeyholeIcon className="size-4" /> 로컬 관리자 게시
                        도구
                      </p>
                      <div className="mt-2">
                        <p className="font-black">
                          저장된 1억 목표 공개본만 보여주고 있어요.
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">
                          {snapshot
                            ? `현재 ${formatDate(snapshot.asOf)} 종가 분석이 공개되어 있어요.`
                            : "아직 공개된 분석이 없어요. 버튼을 눌러 첫 공개본을 만들 수 있어요."}
                        </p>
                      </div>
                      {published && (
                        <p className="mt-2 text-sm font-black text-emerald-600 dark:text-emerald-300">
                          분석과 공개 스냅샷 갱신을 완료했어요.
                        </p>
                      )}
                    </div>
                    <Form method="post">
                      <Button
                        type="submit"
                        disabled={publishing}
                        className="w-full bg-emerald-500 font-black text-white hover:bg-emerald-600 sm:w-auto"
                      >
                        {publishing ? (
                          <LoaderCircleIcon className="size-4 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="size-4" />
                        )}
                        {publishing
                          ? "분석 후 반영 중..."
                          : "최신 분석을 로컬 공개본에 반영"}
                      </Button>
                    </Form>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs leading-5 font-medium">
                    페이지에 들어오는 것만으로 분석하지 않아요. 버튼을 누를 때만
                    로컬의 해외주식 포트폴리오를 1억 목표로 분석해 공개 전용
                    스냅샷을 갱신하며, 대시보드·분석 기록·기준 목표에는 영향을
                    주지 않아요.
                  </p>
                  <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-xs leading-5 font-semibold text-amber-700 dark:text-amber-300">
                    아직 배포된 서비스가 없어 지금 확인할 수 있는 곳은 로컬 공개
                    화면뿐이에요. 실제 서비스 배포를 시작할 때 배포 환경 연결을
                    확인하고 버튼 문구도 배포용으로 바꿀 예정이에요.
                  </div>
                </section>
              )}

              {!snapshot ? (
                <section className="mt-8 rounded-3xl border border-dashed p-12 text-center">
                  <WalletCardsIcon className="text-muted-foreground/50 mx-auto size-10" />
                  <h2 className="mt-4 text-xl font-black">
                    아직 공개된 포트폴리오가 없어요
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    개발자가 첫 스냅샷을 공개하면 이곳에서 볼 수 있어요.
                  </p>
                </section>
              ) : (
                <>
                  <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "전체 수익률",
                        value: formatPercent(snapshot.returnRate),
                        icon: TrendingUpIcon,
                      },
                      {
                        label: "연평균 수익률",
                        value: formatPercent(snapshot.annualizedReturnRate),
                        icon: BarChart3Icon,
                      },
                      {
                        label: "투자 기간",
                        value: durationLabel(snapshot.investmentPeriodMonths),
                        icon: Clock3Icon,
                      },
                      {
                        label: "보유 종목",
                        value: `${snapshot.holdingCount}개`,
                        icon: WalletCardsIcon,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <article
                        key={label}
                        className="bg-card rounded-2xl border p-5 shadow-sm"
                      >
                        <div className="text-muted-foreground flex items-center gap-2 text-xs font-black">
                          <Icon className="size-4 text-emerald-500" /> {label}
                        </div>
                        <p className="mt-3 text-2xl font-black tracking-[-0.04em]">
                          {value}
                        </p>
                      </article>
                    ))}
                  </section>

                  <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                    <article className="bg-card rounded-3xl border p-6 sm:p-8">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-black text-emerald-500">
                            PORTFOLIO
                          </p>
                          <h2 className="mt-1 text-2xl font-black">
                            어디에 투자하고 있을까요?
                          </h2>
                        </div>
                        <span className="text-muted-foreground text-xs font-bold">
                          비중 순
                        </span>
                      </div>
                      <div className="mt-7 space-y-5">
                        {snapshot.holdings.map((holding) => (
                          <div
                            key={`${holding.ticker}-${holding.exchange ?? ""}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate font-black">
                                  {holding.name}
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-xs font-bold">
                                  {holding.ticker}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="font-black">
                                  {holding.weightPercent.toFixed(1)}%
                                </p>
                                <p
                                  className={
                                    holding.returnRate >= 0
                                      ? "text-rose-500"
                                      : "text-blue-500"
                                  }
                                >
                                  <span className="text-xs font-black">
                                    {formatPercent(holding.returnRate)}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                style={{
                                  width: `${Math.max(2, Math.min(100, holding.weightPercent))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <div className="space-y-6">
                      <article className="bg-card rounded-3xl border p-6">
                        <p className="flex items-center gap-2 text-xs font-black text-violet-500">
                          <SparklesIcon className="size-4" /> 투자 성향
                        </p>
                        <h2 className="mt-3 text-xl font-black">
                          {snapshot.investmentStyle.title}
                        </h2>
                        <p className="text-muted-foreground mt-3 text-sm leading-6 font-medium">
                          {snapshot.investmentStyle.description}
                        </p>
                      </article>
                      {snapshot.committee && (
                        <article className="rounded-3xl border border-violet-500/15 bg-violet-500/[0.06] p-6">
                          <p className="text-xs font-black text-violet-500">
                            투자위원회 한 줄 평
                          </p>
                          <h2 className="mt-3 text-lg leading-7 font-black">
                            {snapshot.committee.committeeConclusion ??
                              snapshot.committee.headline}
                          </h2>
                          {snapshot.committee.overallCommitteeScore != null && (
                            <p className="mt-4 inline-flex rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-black text-violet-600 dark:text-violet-300">
                              포트폴리오 점수{" "}
                              {snapshot.committee.overallCommitteeScore.toFixed(
                                1,
                              )}{" "}
                              / 10
                            </p>
                          )}
                        </article>
                      )}
                    </div>
                  </section>

                  {snapshot.summary.length > 0 && (
                    <section className="bg-card mt-8 rounded-3xl border p-6 sm:p-8">
                      <h2 className="text-xl font-black">
                        지금 포트폴리오 한눈에 보기
                      </h2>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {snapshot.summary.slice(0, 4).map((item) => (
                          <div
                            key={item}
                            className="bg-muted/55 flex gap-3 rounded-2xl p-4"
                          >
                            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                            <p className="text-sm leading-6 font-semibold">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </Await>
      </Suspense>

      <section className="mt-8 overflow-hidden rounded-3xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(16,185,129,0.08))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-300">
              <BookOpenTextIcon className="size-4" /> 초보 투자자를 위한 이야기
            </p>
            <h2 className="mt-3 text-xl font-black sm:text-2xl">
              차트를 덜 보고도 마음 편히 투자하는 방법
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6 font-medium">
              적은 돈으로 꾸준히 장기 투자하며, 본업에 집중하면서 자산을 굴리고
              있는 저만의 투자 경험을 정리하고 있어요.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-full bg-amber-500 font-black text-white hover:bg-amber-600"
          >
            <Link
              to="/dashboard/developer-portfolio/investing-notes"
              viewTransition
            >
              초보 투자자를 위한 노하우
              <ArrowUpRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="text-muted-foreground mt-8 space-y-3 rounded-2xl border border-dashed px-5 py-5 text-xs leading-5 font-medium">
        <p>
          해외주식 정보는 한국투자증권 API를 로컬 개발 환경에서만 이용해 분석한
          뒤, 개발자가 직접 공개 버튼을 누른 시점의 결과를 공개용 스냅샷으로
          저장해 보여줘요. 배포된 페이지가 한국투자증권 API를 직접 호출하거나
          실시간 시세를 제공하지는 않아요.
        </p>
        <p>
          종목명·포트폴리오 비중·수익률처럼 공개 가능한 정보만 제한적으로
          제공하며, 정확한 자산 금액·보유 수량·거래 내역은 공개하지 않아요.
          표시된 수치는 해당 날짜의 종가와 당시 환율을 기준으로 계산한 참고
          정보이며 투자 권유나 수익 보장이 아니에요.
        </p>
      </section>
    </main>
  );
}
