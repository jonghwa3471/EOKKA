import type { Route } from "./+types/dashboard";

import {
  ArrowRightIcon,
  AwardIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  CoinsIcon,
  CrownIcon,
  PiggyBankIcon,
  RefreshCwIcon,
  ScaleIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import { cn } from "~/core/lib/utils";

import { TrendChart } from "../dashboard/asset-trend-chart";
import { CostBasisComparisonChart } from "../dashboard/cost-basis-chart";
import {
  formatGoalAmount,
  formatMonths,
  formatRate,
  formatWon,
} from "../dashboard/formatters";
import { difference } from "../dashboard/history-insights";
import { ProfitContributionGrid } from "../dashboard/profit-contribution-grid";
import {
  CalculationChange,
  CalculationValue,
  Change,
  ComparisonRow,
  DailyRecordChange,
  GoalJourney,
  SummaryCard,
} from "../dashboard/summary-components";
import { type TrendSeries } from "../dashboard/trend-data";

export const meta: Route.MetaFunction = () => [
  { title: `내 투자 대시보드 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [
    { default: makeServerClient },
    { getActiveAnalysisHistory, getPreferredGoalAmount },
    { getAutomaticAnalysisSettings },
    { getLatestCachedMarketDate, refreshLatestDomesticMarketDate },
    { getLatestKisMarketDate },
    { getStockMarketMode },
    { isAutomaticAnalysisEnabled },
  ] = await Promise.all([
    import("~/core/lib/supa-client.server"),
    import("~/features/stocks/history/analysis-history.server"),
    import("~/features/users/automatic-analysis-settings.server"),
    import("~/features/stocks/fsc-client.server"),
    import("~/features/stocks/kis-client.server"),
    import("~/features/stocks/market-mode.server"),
    import("~/core/lib/app-environment.server"),
  ]);
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();

  const [allHistory, savedPreferredGoal, automaticSettings] = user
    ? await Promise.all([
        getActiveAnalysisHistory(user.id),
        getPreferredGoalAmount(user.id),
        getAutomaticAnalysisSettings(user.id),
      ])
    : [[], null, null];
  const goalOptions = [
    ...new Set(allHistory.map((item) => item.goalAmount)),
  ].sort((a, b) => a - b);
  const oneEokGoal = 100_000_000;
  const preferredGoal =
    (savedPreferredGoal && goalOptions.includes(savedPreferredGoal)
      ? savedPreferredGoal
      : goalOptions.includes(oneEokGoal)
        ? oneEokGoal
        : goalOptions[0]) ?? null;
  const goalHistory = preferredGoal
    ? allHistory.filter((item) => item.goalAmount === preferredGoal)
    : [];
  const history = Array.from(
    new Map(goalHistory.map((item) => [item.savedOn, item])).values(),
  );
  const historyLatestMarketDate = allHistory
    .map((item) => item.result.asOf)
    .sort((a, b) => b.localeCompare(a))[0];
  const latestRecordedHoldings = allHistory.at(-1)?.result.holdings ?? [];
  const representativeDomesticTicker = latestRecordedHoldings.find(
    (holding) => holding.currency === "KRW",
  )?.ticker;
  const marketMode = getStockMarketMode();
  const refreshedMarketDate =
    marketMode === "domestic"
      ? representativeDomesticTicker
        ? await refreshLatestDomesticMarketDate(representativeDomesticTicker)
        : await getLatestCachedMarketDate()
      : await (async () => {
          const representatives = new Map<
            string,
            (typeof latestRecordedHoldings)[number]
          >();
          for (const holding of latestRecordedHoldings) {
            const country =
              holding.country ?? (holding.currency === "KRW" ? "KR" : "US");
            const exchange = holding.exchange ?? "";
            const key = `${country}:${exchange}`;
            if (!representatives.has(key)) representatives.set(key, holding);
          }
          try {
            const dates = (
              await Promise.all(
                [...representatives.values()].map((holding) =>
                  getLatestKisMarketDate(
                    holding.ticker,
                    holding.country ??
                      (holding.currency === "KRW" ? "KR" : "US"),
                    holding.exchange ?? "",
                  ),
                ),
              )
            ).filter((date): date is string => Boolean(date));
            return dates.sort((a, b) => a.localeCompare(b))[0] ?? null;
          } catch (error) {
            console.error("Latest KIS market date refresh failed", error);
            return null;
          }
        })();
  const latestMarketDate =
    [refreshedMarketDate, historyLatestMarketDate]
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return {
    history,
    goalOptions,
    preferredGoal,
    name:
      user?.user_metadata.name ??
      user?.user_metadata.full_name ??
      user?.email?.split("@")[0] ??
      "사용자",
    latestMarketDate,
    isPro: automaticSettings?.isPro ?? false,
    isPaidPro: automaticSettings?.isPaidPro ?? false,
    automaticAnalysisEnabled: isAutomaticAnalysisEnabled(),
  };
}

type DashboardLoaderData = Awaited<ReturnType<typeof loader>>;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<DashboardLoaderData>(
    "dashboard",
    () => serverLoader() as Promise<DashboardLoaderData>,
  );
}

export async function action({ request }: Route.ActionArgs) {
  const [
    { default: makeServerClient },
    { getActiveAnalysisHistory, setPreferredGoalAmount },
  ] = await Promise.all([
    import("~/core/lib/supa-client.server"),
    import("~/features/stocks/history/analysis-history.server"),
  ]);
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const goalAmount = Number(formData.get("goalAmount"));
  const history = await getActiveAnalysisHistory(user.id);
  const validGoals = new Set(history.map((item) => item.goalAmount));
  if (!Number.isSafeInteger(goalAmount) || !validGoals.has(goalAmount)) {
    throw new Response("Invalid goal amount", { status: 400 });
  }

  await setPreferredGoalAmount(user.id, goalAmount);
  return redirect("/dashboard");
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  usePrimeRouteDataCache("dashboard", loaderData);
  const {
    history,
    name,
    goalOptions,
    preferredGoal,
    latestMarketDate,
    automaticAnalysisEnabled,
    isPro,
    isPaidPro,
  } = loaderData;
  const [dimmedTrendSeries, setDimmedTrendSeries] = useState<TrendSeries[]>([]);
  const toggleTrendSeries = (series: TrendSeries) =>
    setDimmedTrendSeries((current) =>
      current.includes(series)
        ? current.filter((item) => item !== series)
        : [...current, series],
    );
  const latest = history.at(-1);
  const previous = history.at(-2);

  if (!latest) {
    return (
      <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
          <section className="border-border/70 bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#10b98120,transparent_45%)]" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <ChartNoAxesCombinedIcon className="size-8" />
            </div>
            <p className="mt-8 text-sm font-bold tracking-[0.2em] text-emerald-500">
              MY EOKKA
            </p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              분석 기록을 시작해 보세요
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl leading-7">
              {isPro
                ? "첫 포트폴리오 분석을 저장하면 최근 상세 기록과 장기 자산 흐름을 함께 확인할 수 있어요. 베타에서는 필요할 때 직접 분석해 주세요."
                : "무료 플랜에서는 분석 결과를 바로 확인할 수 있어요. 기록을 저장하고 시간에 따른 변화를 비교하려면 EOKKA Pro를 이용해 주세요."}
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-7">
              <Link to={isPro ? "/" : "/dashboard/pro"}>
                {isPro ? "지금 분석하기" : "Pro로 기록 시작하기"}{" "}
                <ArrowRightIcon />
              </Link>
            </Button>
          </section>
        </div>
      </main>
    );
  }

  const hasLatestCloseAnalysis =
    latestMarketDate === null || latest.savedOn >= latestMarketDate;
  const isAutomaticGoal = isPaidPro && automaticAnalysisEnabled;
  const checkedAnalysisHref = hasLatestCloseAnalysis
    ? `/dashboard/history?month=${latest.savedOn.slice(0, 7)}&date=${latest.savedOn}&analysis=${latest.id}`
    : null;
  const manualAnalysisHref =
    latest.analysisMode === "managed" ? "/dashboard/precise-analysis" : "/";

  const assetChange = difference(
    latest.currentValue,
    previous?.currentValue ?? null,
  );
  const returnChange = difference(
    latest.returnRate,
    previous?.returnRate ?? null,
  );
  const profitChange = difference(latest.profit, previous?.profit ?? null);
  const costChange = difference(
    latest.result.totalCost,
    previous?.result.totalCost ?? null,
  );
  const hasForeignHolding = latest.result.holdings.some(
    (holding) => holding.currency === "USD",
  );
  const annualizedReturnRate =
    (latest.result.investmentPeriodMonths ?? 0) >= 12
      ? (latest.result.annualizedReturnRate ?? null)
      : null;
  const previousAnnualizedReturnRate =
    (previous?.result.investmentPeriodMonths ?? 0) >= 12
      ? (previous?.result.annualizedReturnRate ?? null)
      : null;
  const annualizedReturnChange = difference(
    annualizedReturnRate,
    previousAnnualizedReturnRate,
  );
  const periodChange = difference(
    latest.goalMonth,
    previous?.goalMonth ?? null,
  );
  const contributionGoalMonth =
    latest.monthlyContribution > 0
      ? (latest.result.contributionScenarios.find(
          (scenario) => scenario.key === "base",
        )?.goalMonth ?? null)
      : null;
  const first = history[0];
  const weekAssetChange = latest.currentValue - first.currentValue;
  const weekReturnChange = latest.returnRate - first.returnRate;
  const weekPeriodChange = difference(latest.goalMonth, first.goalMonth);
  const progress = Math.min(
    100,
    (latest.currentValue / latest.goalAmount) * 100,
  );
  const recordOutcomes = history.slice(1).map((item, index) => {
    const profitDelta = item.profit - history[index].profit;
    return profitDelta > 1 ? "win" : profitDelta < -1 ? "loss" : "draw";
  });
  const winningRecordCount = recordOutcomes.filter(
    (outcome) => outcome === "win",
  ).length;
  const losingRecordCount = recordOutcomes.filter(
    (outcome) => outcome === "loss",
  ).length;
  const drawRecordCount =
    recordOutcomes.length - winningRecordCount - losingRecordCount;
  const decidedRecordCount = winningRecordCount + losingRecordCount;
  const recordWinRate = decidedRecordCount
    ? (winningRecordCount / decidedRecordCount) * 100
    : null;

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
              <SparklesIcon className="size-4" /> 투자 리포트
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              {name}님의 목표 현황
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground">
                최근 종가 {latest.savedOn} · 전체 {history.length}개 기록
              </p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-black",
                  latest.analysisMode === "managed"
                    ? "bg-emerald-500/12 text-emerald-500"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {latest.analysisMode === "managed"
                  ? "정밀 분석 사용 중"
                  : "빠른 분석 사용 중"}
              </span>
            </div>
          </div>
        </header>

        <section
          className={cn(
            "mt-6 flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
            hasLatestCloseAnalysis
              ? "border-emerald-500/25 bg-emerald-500/[0.07]"
              : "border-amber-500/25 bg-amber-500/[0.07]",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                hasLatestCloseAnalysis
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-amber-500/15 text-amber-500",
              )}
            >
              {hasLatestCloseAnalysis ? (
                <CheckCircle2Icon className="size-5" />
              ) : (
                <RefreshCwIcon className="size-5" />
              )}
            </span>
            <div>
              <p className="font-black">
                {hasLatestCloseAnalysis
                  ? "최신 종가가 분석에 반영됐어요"
                  : !isPro
                    ? "새 종가로 포트폴리오를 업데이트할 수 있어요"
                    : "최신 종가 분석이 아직 필요해요"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {hasLatestCloseAnalysis
                  ? `${latest.savedOn} 종가 기준 분석이에요.`
                  : `현재 ${latest.savedOn} 종가까지 반영됐어요. 최신 확정 종가는 ${latestMarketDate}이에요.`}
              </p>
              <p
                className={cn(
                  "mt-2 text-xs font-semibold",
                  isAutomaticGoal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {isAutomaticGoal
                  ? "자동 분석을 사용 중이에요."
                  : !isPro
                    ? hasLatestCloseAnalysis
                      ? "무료 플랜은 필요할 때 직접 분석해 업데이트할 수 있어요."
                      : "무료 플랜은 자동 분석되지 않아요. 아래 링크에서 최신 종가를 직접 반영해 주세요."
                    : "Pro 베타에서는 필요할 때 직접 분석해 업데이트해 주세요."}
              </p>
            </div>
          </div>
          {checkedAnalysisHref ? (
            <Link
              to={checkedAnalysisHref}
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-black text-emerald-500 transition-colors hover:text-emerald-400 sm:self-center"
            >
              분석 보기 <ArrowRightIcon className="size-4" />
            </Link>
          ) : (
            <Link
              to={manualAnalysisHref}
              state={
                latest.analysisMode === "quick"
                  ? { openQuickAnalysis: true }
                  : undefined
              }
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-black text-amber-600 transition-colors hover:text-amber-500 sm:self-center dark:text-amber-400"
            >
              최신 종가로 직접 분석하기 <ArrowRightIcon className="size-4" />
            </Link>
          )}
        </section>

        {goalOptions.length > 1 && (
          <section className="bg-card mt-7 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div>
              <p className="font-black">대시보드 기준 목표</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                선택한 목표의 최근 기록을 대시보드에서 우선 표시해요.
              </p>
            </div>
            <Form method="post" className="flex flex-wrap justify-end gap-2">
              {goalOptions.map((goal) => (
                <Button
                  key={goal}
                  type="submit"
                  name="goalAmount"
                  value={goal}
                  size="sm"
                  variant={goal === preferredGoal ? "default" : "outline"}
                  className="rounded-full px-4"
                >
                  {formatGoalAmount(goal)}
                </Button>
              ))}
            </Form>
          </section>
        )}

        <section
          className={cn(
            "grid gap-4 md:grid-cols-2 xl:grid-cols-12",
            goalOptions.length > 1 ? "mt-5" : "mt-7",
          )}
        >
          <SummaryCard
            className="xl:col-span-3"
            icon={PiggyBankIcon}
            label="현재 평가금액"
            value={formatWon(latest.currentValue)}
            change={<Change value={assetChange} suffix="원" />}
          />
          <SummaryCard
            className="xl:col-span-3"
            icon={CoinsIcon}
            label="현재 평가손익"
            value={formatWon(latest.profit)}
            valueClass={latest.profit >= 0 ? "text-rose-500" : "text-blue-500"}
            change={<Change value={profitChange} suffix="원" />}
          />
          <SummaryCard
            className="xl:col-span-3"
            icon={TrendingUpIcon}
            label="현재 수익률"
            value={formatRate(latest.returnRate)}
            valueClass={
              latest.returnRate >= 0 ? "text-rose-500" : "text-blue-500"
            }
            change={<Change value={returnChange} suffix="%p" />}
          />
          <SummaryCard
            className="xl:col-span-3"
            icon={ChartNoAxesCombinedIcon}
            label="총 연평균 수익률"
            value={
              annualizedReturnRate === null
                ? "1년 기록 필요"
                : formatRate(annualizedReturnRate)
            }
            valueClass={
              annualizedReturnRate === null
                ? "text-muted-foreground"
                : annualizedReturnRate >= 0
                  ? "text-rose-500"
                  : "text-blue-500"
            }
            detail={
              latest.result.personalReturnMethod === "money-weighted"
                ? "매매일지 현금흐름 기준"
                : "투자 기간 기준 근사값"
            }
            change={
              annualizedReturnRate === null ? (
                <span className="text-muted-foreground text-xs">
                  누적 수익률은 위 카드에서 확인할 수 있어요
                </span>
              ) : (
                <Change value={annualizedReturnChange} suffix="%p" />
              )
            }
          />
          <SummaryCard
            className="xl:col-span-4"
            icon={Clock3Icon}
            label={`${formatGoalAmount(latest.goalAmount)} 목표 도달 예상`}
            value={formatMonths(latest.goalMonth)}
            detail={
              latest.monthlyContribution > 0
                ? `매월 ${formatWon(latest.monthlyContribution)} 투자 시 ${formatMonths(contributionGoalMonth)}`
                : undefined
            }
            detailAfterChange
            change={<Change value={periodChange} suffix="개월" inverse />}
          />
          <SummaryCard
            className="xl:col-span-4"
            icon={TargetIcon}
            label={`${formatGoalAmount(latest.goalAmount)} 목표 달성률`}
            value={`${progress.toFixed(1)}%`}
            change={
              <span className="text-muted-foreground text-xs">
                {formatWon(
                  Math.max(0, latest.goalAmount - latest.currentValue),
                )}{" "}
                남음
              </span>
            }
          />
          <SummaryCard
            className="xl:col-span-4"
            icon={AwardIcon}
            label="승률"
            value={
              recordWinRate === null
                ? "비교 준비 중"
                : `${recordWinRate.toFixed(1)}%`
            }
            valueClass={
              recordWinRate === null
                ? "text-muted-foreground"
                : recordWinRate >= 50
                  ? "text-rose-500"
                  : "text-blue-500"
            }
            detail="직전 기록 대비 평가손익 기준"
            change={
              <span className="text-muted-foreground text-xs leading-5">
                수익 {winningRecordCount}일 · 손해 {losingRecordCount}일
                {drawRecordCount > 0 ? ` · 보합 ${drawRecordCount}일 제외` : ""}
              </span>
            }
          />
        </section>

        <details className="group bg-card mt-4 overflow-hidden rounded-3xl border shadow-sm">
          <summary className="hover:bg-muted/35 flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors marker:hidden md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <ScaleIcon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="font-black">계산 내역 보기</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  평가금액·매입원금·평가손익과 환율 적용 기준
                </p>
              </div>
            </div>
            <ChevronDownIcon className="text-muted-foreground size-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>

          <div className="border-t px-5 py-5 md:px-6 md:py-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CalculationValue
                label="현재 평가금액"
                value={formatWon(latest.currentValue)}
                description="현재가 × 수량을 원화로 합산"
              />
              <CalculationValue
                label="원화 매입원금"
                value={formatWon(latest.result.totalCost)}
                description="보유 종목의 원화 매입금액 합계"
              />
              <CalculationValue
                label="현재 평가손익"
                value={formatWon(latest.profit)}
                valueClass={
                  latest.profit >= 0 ? "text-rose-500" : "text-blue-500"
                }
                description="평가금액 − 원화 매입원금"
              />
              <CalculationValue
                label="현재 수익률"
                value={formatRate(latest.returnRate)}
                valueClass={
                  latest.returnRate >= 0 ? "text-rose-500" : "text-blue-500"
                }
                description="평가손익 ÷ 원화 매입원금"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="bg-muted/25 rounded-2xl border p-4">
                <p className="text-sm font-black">직전 기록과 비교</p>
                {previous ? (
                  <>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {previous.savedOn} → {latest.savedOn}
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <CalculationChange label="평가금액" value={assetChange} />
                      <CalculationChange label="매입원금" value={costChange} />
                      <CalculationChange
                        label="평가손익"
                        value={profitChange}
                      />
                    </dl>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    기록이 하나 더 쌓이면 각 금액이 왜 변했는지 비교해 드려요.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
                <p className="text-sm font-black">환율과 매입원금 기준</p>
                {hasForeignHolding ? (
                  <div className="text-muted-foreground mt-2 space-y-2 text-xs leading-5">
                    <p>
                      현재 해외주식 평가에는{" "}
                      <strong className="text-foreground">
                        1달러당{" "}
                        {(latest.result.exchangeRate ?? 0).toLocaleString(
                          "ko-KR",
                        )}
                        원
                      </strong>
                      을 적용했어요.
                    </p>
                    <p>
                      첫 분석은 입력한 달러 평균가를 분석일 환율로 환산하며,
                      이후 종목·수량·평균가가 같으면 저장된 원화 매입원금을
                      유지해요.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    국내 종목만 포함되어 있어 별도의 환율 환산을 적용하지
                    않았어요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </details>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.85fr_0.85fr]">
          <div className="bg-card flex min-h-[430px] flex-col rounded-3xl border p-5 shadow-sm md:p-7">
            <div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold">
                  전체 기간 기록
                </p>
                <h2 className="mt-1 text-xl font-black">내 자산 성장 추이</h2>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-bold xl:flex-nowrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleTrendSeries("actual")}
                      aria-pressed={!dimmedTrendSeries.includes("actual")}
                      className={cn(
                        "order-4 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition",
                        dimmedTrendSeries.includes("actual")
                          ? "bg-muted text-emerald-500 opacity-40 hover:opacity-65"
                          : "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30",
                      )}
                    >
                      <span className="size-2 rounded-full bg-emerald-500" />
                      실제 평가금액
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    종가 기준으로 저장된 내 자산의 실제 평가금액 변화예요.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleTrendSeries("currentExpected")}
                      aria-pressed={
                        !dimmedTrendSeries.includes("currentExpected")
                      }
                      className={cn(
                        "order-5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition",
                        dimmedTrendSeries.includes("currentExpected")
                          ? "bg-muted text-blue-500 opacity-40 hover:opacity-65"
                          : "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30",
                      )}
                    >
                      <span className="w-4 border-t-2 border-dashed border-blue-500" />
                      현재 예상
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    가장 최근 분석을 현재 평가금액에 반영한 가까운 미래의 평균
                    시나리오예요.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleTrendSeries("expected")}
                      aria-pressed={!dimmedTrendSeries.includes("expected")}
                      className={cn(
                        "order-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition",
                        dimmedTrendSeries.includes("expected")
                          ? "bg-muted text-amber-500 opacity-40 hover:opacity-65"
                          : "bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30",
                      )}
                    >
                      <span className="h-0.5 w-4 bg-amber-500" /> 최초 예상
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    첫 분석 당시 평균 시나리오가 예상했던 자산 변화예요.
                  </TooltipContent>
                </Tooltip>
                {history[0]?.result.benchmark && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => toggleTrendSeries("market")}
                        aria-pressed={!dimmedTrendSeries.includes("market")}
                        className={cn(
                          "order-2 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition",
                          dimmedTrendSeries.includes("market")
                            ? "bg-muted text-violet-500 opacity-40 hover:opacity-65"
                            : "bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/30",
                        )}
                      >
                        <span className="w-4 border-t-2 border-dashed border-violet-500" />
                        최초 시장 예상
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      첫 분석 당시 장기 시장 수익률을 적용해 계산한 비교
                      경로예요.
                    </TooltipContent>
                  </Tooltip>
                )}
                {history.some(
                  (item) => item.result.benchmark?.observedComponents?.length,
                ) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => toggleTrendSeries("actualMarket")}
                        aria-pressed={
                          !dimmedTrendSeries.includes("actualMarket")
                        }
                        className={cn(
                          "order-3 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition",
                          dimmedTrendSeries.includes("actualMarket")
                            ? "bg-muted text-cyan-500 opacity-40 hover:opacity-65"
                            : "bg-cyan-500/15 text-cyan-500 ring-1 ring-cyan-500/30",
                        )}
                      >
                        <span className="h-0.5 w-4 bg-cyan-500" /> 시장 실제
                        추이
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      첫 기록 이후 내 포트폴리오와 연결된 시장 지수가 실제로
                      움직인 정도예요.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="mt-4 min-h-0 flex-1">
              <TrendChart
                history={history}
                endDate={latest.savedOn}
                dimmedSeries={dimmedTrendSeries}
              />
            </div>
          </div>

          <div className="bg-card rounded-3xl border p-6 shadow-sm md:p-7">
            <p className="text-muted-foreground text-sm font-semibold">
              첫 기록과 비교
            </p>
            <h2 className="mt-1 text-xl font-black">기간 변화 요약</h2>
            <div className="mt-6 space-y-3">
              <ComparisonRow
                label="평가금액"
                value={`${weekAssetChange >= 0 ? "+" : "-"}${formatWon(Math.abs(weekAssetChange))}`}
                improved={weekAssetChange >= 0}
              />
              <ComparisonRow
                label="수익률"
                value={`${weekReturnChange >= 0 ? "+" : ""}${weekReturnChange.toFixed(1)}%p`}
                improved={weekReturnChange >= 0}
              />
              <ComparisonRow
                label="목표 기간"
                value={
                  weekPeriodChange === null
                    ? "비교 불가"
                    : weekPeriodChange === 0
                      ? "변화 없음"
                      : `${Math.abs(weekPeriodChange)}개월 ${weekPeriodChange < 0 ? "단축" : "증가"}`
                }
                improved={weekPeriodChange !== null && weekPeriodChange < 0}
              />
            </div>
            <GoalJourney progress={progress} />
          </div>
        </section>

        <section className="bg-card mt-5 rounded-3xl border p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                투자 기간 전체 비교
              </p>
              <h2 className="mt-1 text-xl font-black">매입 원금과 평가금액</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                투자한 원금 위에서 자산이 얼마나 움직였는지 기록별로 비교해요.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <CostBasisComparisonChart
              history={history}
              endDate={latest.savedOn}
            />
          </div>
        </section>

        <section className="mt-5 space-y-5">
          <div className="bg-card rounded-3xl border p-6 shadow-sm md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
                <CalendarDaysIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-black">일별 분석 기록</h2>
                <p className="text-muted-foreground text-xs">
                  저장된 전체 날짜별 마지막 분석을 표시
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-muted-foreground grid grid-cols-[72px_1fr_1fr] gap-2 border-b pb-2 text-[11px] font-bold">
                <span>날짜</span>
                <span className="text-right">수익률</span>
                <span className="text-right">목표 기간</span>
              </div>
              <div className="max-h-[480px] divide-y overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                {history
                  .map((item, index, records) => ({
                    item,
                    previous: records[index - 1],
                  }))
                  .reverse()
                  .map(({ item, previous }) => {
                    const returnRateChange = difference(
                      item.returnRate,
                      previous?.returnRate ?? null,
                    );
                    const goalMonthChange = difference(
                      item.goalMonth,
                      previous?.goalMonth ?? null,
                    );
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[72px_1fr_1fr] items-center gap-2 py-3 text-sm"
                      >
                        <span className="font-bold">
                          {item.savedOn.slice(5).replace("-", ".")}
                        </span>
                        <span className="flex min-w-0 flex-col items-end gap-0.5 font-semibold">
                          {formatRate(item.returnRate)}
                          <DailyRecordChange
                            value={returnRateChange}
                            suffix="%p"
                            isFirst={!previous}
                          />
                        </span>
                        <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                          <span className="text-muted-foreground">
                            {formatMonths(item.goalMonth)}
                          </span>
                          <DailyRecordChange
                            value={goalMonthChange}
                            suffix="개월"
                            inverse
                            isFirst={!previous}
                          />
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <ProfitContributionGrid history={history} />

          {!isPro && (
            <div className="via-card relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-violet-500/10 p-6 shadow-sm md:p-8">
              <CrownIcon className="absolute -top-5 -right-5 size-32 rotate-12 text-amber-400/10" />
              <div className="relative">
                <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-500">
                  EOKKA PRO
                </span>
                <h2 className="mt-5 text-2xl font-black">
                  투자 기록을 차곡차곡 이어가세요
                </h2>
                <p className="text-muted-foreground mt-3 max-w-2xl leading-7 break-keep">
                  목표 하나를 필요할 때 직접 분석하고, 상세 결과는 최근 30개까지
                  다시 보세요. 가벼운 변화 기록은 계속 이어져 장기 차트와
                  주·월·연간 인사이트에 활용돼요.
                </p>
                <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    "상세 분석 최근 30개",
                    "장기 변화 기록 보관",
                    "최대 20종목 분석",
                    "주·월·연간 인사이트",
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="bg-background/50 flex items-center gap-2 rounded-2xl border p-4 font-semibold"
                    >
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                      {benefit}
                    </div>
                  ))}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="bg-background/60 mt-6 rounded-full border-amber-400/40"
                >
                  <Link to="/dashboard/pro">
                    Pro 혜택 자세히 보기 <ArrowRightIcon />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
