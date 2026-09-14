import type { Route } from "./+types/precise-analysis";

import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Clock3Icon,
  CrownIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, Link, data, redirect, useActionData } from "react-router";
import { z } from "zod";

import ConfirmDialog from "~/core/components/confirm-dialog";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  consumeManualAnalysisLimit,
  manualAnalysisLimitResponse,
} from "~/core/lib/rate-limit.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { generateAiStrategy } from "~/features/stocks/ai-strategy.server";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import { getLatestCachedMarketDate } from "~/features/stocks/fsc-client.server";
import {
  FreeGoalConflictError,
  ProGoalLimitError,
  assertFreeAccountGoal,
  getAnalysisHistory,
  getFreeAccountGoalAmount,
  getPreferredGoalAmount,
  saveDailyAnalysisSnapshot,
  seoulDate,
  startManagedAnalysisHistory,
} from "~/features/stocks/history/analysis-history.server";
import { getStockMarketMode } from "~/features/stocks/market-mode.server";
import {
  calculateManagedHoldings,
  getManagedPortfolio,
  investmentMonthsSince,
} from "~/features/stocks/portfolio/portfolio.server";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";

const analysisSchema = z.object({
  goalAmount: z.coerce.number().int().min(100_000_000).max(100_000_000_000),
  monthlyContribution: z.coerce.number().int().min(0).max(1_000_000_000),
  confirmReset: z.literal("on").optional(),
  replaceExistingGoal: z.literal("on").optional(),
});

const GOAL_PRESETS = [100_000_000, 1_000_000_000, 10_000_000_000];
const MONTHLY_CONTRIBUTION_PRESETS = [10_000, 50_000, 100_000];
const MONTHLY_CONTRIBUTION_MAX = 1_000_000_000;

function moneyLabel(value: number) {
  const rounded = Math.max(0, Math.round(value));
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  const won = rounded % 10_000;
  const parts = [
    eok ? `${eok.toLocaleString("ko-KR")}억` : "",
    man ? `${man.toLocaleString("ko-KR")}만` : "",
    won ? `${won.toLocaleString("ko-KR")}` : "",
  ].filter(Boolean);
  return `${parts.join(" ") || "0"}원`;
}

export const meta: Route.MetaFunction = () => [
  { title: `정밀 분석 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [managed, history, preferredGoal, accountGoalAmount, accountSettings] =
    await Promise.all([
      getManagedPortfolio(user.id),
      getAnalysisHistory(user.id),
      getPreferredGoalAmount(user.id),
      getFreeAccountGoalAmount(user.id),
      getAutomaticAnalysisSettings(user.id),
    ]);
  const managedHistory = managed
    ? history.filter(
        (record) =>
          record.analysisMode === "managed" &&
          record.managedPortfolioId === managed.portfolio.managed_portfolio_id,
      )
    : [];
  const activeHistory =
    managed?.portfolio.status === "active"
      ? managedHistory
      : history.filter((record) => record.analysisMode === "quick");
  const preferredHistory = preferredGoal
    ? managedHistory.filter((record) => record.goalAmount === preferredGoal)
    : [];
  const latest = preferredHistory.at(-1) ?? managedHistory.at(-1) ?? null;
  const holdings = managed
    ? calculateManagedHoldings(managed.transactions)
    : [];
  const lastAnalysisAt = managedHistory.reduce<Date | null>(
    (latestDate, record) =>
      !latestDate || record.updatedAt > latestDate
        ? record.updatedAt
        : latestDate,
    null,
  );
  const latestCachedMarketDate =
    getStockMarketMode() === "domestic"
      ? await getLatestCachedMarketDate()
      : null;

  return {
    managed,
    holdings,
    defaultGoalAmount: latest?.goalAmount ?? 100_000_000,
    defaultMonthlyContribution: latest?.monthlyContribution ?? 0,
    accountGoalAmount,
    isPro: accountSettings.isPro,
    savedGoalCount: new Set(activeHistory.map((record) => record.goalAmount))
      .size,
    analysisAsOfPreview: latestCachedMarketDate ?? latest?.result.asOf ?? null,
    hasUnappliedChanges: Boolean(
      managed?.portfolio.status === "active" &&
        (!lastAnalysisAt ||
          new Date(managed.portfolio.updated_at).getTime() >
            lastAnalysisAt.getTime()),
    ),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  try {
    const formData = await request.formData();
    const managed = await getManagedPortfolio(user.id);
    if (!managed)
      throw new Error("먼저 내 포트폴리오에서 매매일지를 작성해 주세요.");
    const parsed = analysisSchema.parse({
      goalAmount: formData.get("goalAmount"),
      monthlyContribution: formData.get("monthlyContribution") || 0,
      confirmReset: formData.get("confirmReset") ?? undefined,
      replaceExistingGoal: formData.get("replaceExistingGoal") || undefined,
    });
    if (managed.portfolio.status !== "active" && parsed.confirmReset !== "on")
      throw new Error("정밀 분석 전환에 동의해 주세요.");
    const accountSettings = await getAutomaticAnalysisSettings(user.id);
    if (accountSettings.isPro)
      await assertFreeAccountGoal({
        userId: user.id,
        goalAmount: parsed.goalAmount,
        replaceExistingGoal: parsed.replaceExistingGoal === "on",
      });
    const durableLimit = await consumeManualAnalysisLimit(request, user.id);
    if (!durableLimit.allowed) return manualAnalysisLimitResponse(durableLimit);

    const holdings = calculateManagedHoldings(managed.transactions);
    if (!holdings.length)
      throw new Error("현재 보유 중인 종목이 없어 분석할 수 없어요.");
    const holdingLimit = accountSettings.isPro ? 20 : 10;
    if (holdings.length > holdingLimit)
      throw new Error(
        `${accountSettings.isPro ? "EOKKA Pro" : "무료 플랜"} 정밀 분석은 최대 ${holdingLimit}개 보유 종목을 지원해요.`,
      );
    const firstBoughtOn = managed.transactions.find(
      (item) => item.type === "BUY",
    )?.tradedOn;
    if (!firstBoughtOn)
      throw new Error("투자 기간을 계산할 매수 기록이 없어요.");

    const result = await analyzePortfolio({
      goalAmount: parsed.goalAmount,
      monthlyContribution: parsed.monthlyContribution,
      investmentPeriodMonths: investmentMonthsSince(firstBoughtOn, seoulDate()),
      holdings: holdings.map((holding) => ({
        stockId: holding.stockId,
        averagePrice: holding.averagePrice,
        quantity: holding.quantity,
        currency: holding.currency,
        costKrw: holding.costKrw,
      })),
    });
    // AI receives only the already-calculated, alias-based summary created by
    // generateAiStrategy. Raw transactions and user identity stay on-server.
    let aiStrategy = null;
    try {
      aiStrategy = await generateAiStrategy(result);
    } catch (error) {
      // A failed AI explanation must not discard the deterministic analysis.
      console.error("Managed AI strategy generation failed", error);
    }
    const completeResult = { ...result, aiStrategy };

    if (!accountSettings.isPro)
      return data({
        result: completeResult,
        error: null,
        code: undefined,
        historySaved: false,
      });

    const saved =
      managed.portfolio.status === "active"
        ? await saveDailyAnalysisSnapshot({
            userId: user.id,
            result: completeResult,
            analysisMode: "managed",
            managedPortfolioId: managed.portfolio.managed_portfolio_id,
            replaceOtherGoals: parsed.replaceExistingGoal === "on",
          })
        : await startManagedAnalysisHistory({
            userId: user.id,
            portfolioId: managed.portfolio.managed_portfolio_id,
            result: completeResult,
            replaceOtherGoals: parsed.replaceExistingGoal === "on",
          });
    const month = saved.savedOn.slice(0, 7);
    return redirect(
      `/dashboard/history?month=${month}&date=${saved.savedOn}&analysis=${saved.id}`,
    );
  } catch (error) {
    return data(
      {
        result: null,
        error:
          error instanceof z.ZodError
            ? "목표 금액과 월 투자금을 다시 확인해 주세요."
            : error instanceof Error
              ? error.message
              : "정밀 분석을 완료하지 못했어요.",
        code:
          error instanceof FreeGoalConflictError ||
          error instanceof ProGoalLimitError
            ? error.code
            : undefined,
      },
      { status: 400 },
    );
  }
}

export default function PreciseAnalysis({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { managed, holdings, defaultGoalAmount, defaultMonthlyContribution } =
    loaderData;
  const [goalAmount, setGoalAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [analysisUsage, setAnalysisUsage] = useState<{
    limit: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [goalChange, setGoalChange] = useState<{
    current: number;
    requested: number;
  } | null>(null);
  const analysisFormRef = useRef<HTMLFormElement>(null);
  const confirmedGoalChangeRef = useRef(false);
  const isActive = managed?.portfolio.status === "active";
  const goalPlaceholder = String(defaultGoalAmount);
  const contributionPlaceholder = String(
    defaultMonthlyContribution > 0 ? defaultMonthlyContribution : 100_000,
  );
  const parsedGoalAmount = Number(goalAmount);
  const parsedMonthlyContribution = Number(monthlyContribution);
  const displayedAnalysisDate = loaderData.analysisAsOfPreview;
  const ephemeralResult = (actionData?.result ?? null) as AnalysisResult | null;
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/stocks/analysis-limit", { cache: "no-store" })
      .then((response) => response.json())
      .then((status: { limit: number; used: number; remaining: number }) => {
        if (!cancelled) setAnalysisUsage(status);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const addMonthlyContribution = (amount: number) =>
    setMonthlyContribution(
      String(
        Math.min(
          (Number.isFinite(parsedMonthlyContribution)
            ? parsedMonthlyContribution
            : 0) + amount,
          MONTHLY_CONTRIBUTION_MAX,
        ),
      ),
    );

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-14 md:px-8 md:pt-12">
      <ConfirmDialog
        open={goalChange !== null}
        onOpenChange={(open) => {
          if (!open) setGoalChange(null);
        }}
        title="저장 목표 금액을 바꿀까요?"
        description={
          goalChange ? (
            <>
              무료 플랜에서는 목표 금액을 하나만 저장할 수 있어요. 현재 목표
              <strong> {moneyLabel(goalChange.current)}</strong>을
              <strong> {moneyLabel(goalChange.requested)}</strong>으로 바꾸면
              이전 목표의 분석 기록이 삭제됩니다.
            </>
          ) : null
        }
        confirmLabel="목표 변경하기"
        destructive
        onConfirm={() => {
          const form = analysisFormRef.current;
          if (!form) return;
          const hidden = form.elements.namedItem("replaceExistingGoal");
          if (hidden instanceof HTMLInputElement) hidden.value = "on";
          confirmedGoalChangeRef.current = true;
          setGoalChange(null);
          form.requestSubmit();
        }}
      />
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <SparklesIcon className="size-4" /> PRECISE ANALYSIS
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            정밀 분석
          </h1>
          <p className="text-muted-foreground mt-2 leading-6">
            매매일지의 거래일과 당시 환율을 반영해 포트폴리오를 분석해요.
          </p>
          <div className="mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5 text-sm leading-6 text-amber-800 dark:text-amber-200">
            <Clock3Icon className="mt-1 size-4 shrink-0" />
            <p>
              {displayedAnalysisDate ? (
                <>
                  현재 확인된{" "}
                  <strong>
                    {displayedAnalysisDate.replaceAll("-", ".")} 종가
                  </strong>
                  를 기준으로 분석해요. 더 최근 종가가 제공됐다면 분석할 때
                  자동으로 최신 날짜가 적용돼요.
                </>
              ) : (
                <>
                  분석을 시작하면 사용할{" "}
                  <strong>가장 최근 확정 종가 날짜</strong>를 확인해요.
                </>
              )}{" "}
              기록은 분석한 날이 아니라 실제 사용한 종가 날짜에 저장돼요.
            </p>
          </div>
        </header>

        {!holdings.length ? (
          <section className="bg-card mt-7 rounded-3xl border p-8 text-center shadow-sm">
            <BriefcaseBusinessIcon className="mx-auto size-9 text-emerald-500" />
            <h2 className="mt-4 text-xl font-black">
              먼저 매매일지가 필요해요
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              실제 거래 내역을 등록한 뒤 정밀 분석을 시작할 수 있어요.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/dashboard/portfolio">
                내 포트폴리오로 이동 <ArrowRightIcon />
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <section className="bg-card mt-7 rounded-3xl border p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">분석 설정</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    현재 매매일지에서 계산된 {holdings.length}개 보유 종목을
                    사용해요.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  <Link to="/dashboard/portfolio">매매일지 확인</Link>
                </Button>
              </div>
              {loaderData.hasUnappliedChanges && (
                <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                  저장된 매매일지 변경사항을 이번 분석에 반영해요.
                </p>
              )}
              <div className="mt-5 border-t pt-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="font-black">이번 분석에 사용할 보유 종목</h3>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      매매일지의 매수·매도를 반영해 계산한 현재 보유 정보예요.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500">
                    {holdings.length}개 종목
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {holdings.map((holding, index) => (
                    <article
                      key={holding.stockId}
                      className={cn(
                        "rounded-2xl border p-4",
                        index % 3 === 0
                          ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                          : index % 3 === 1
                            ? "border-violet-500/20 bg-violet-500/[0.05]"
                            : "border-sky-500/20 bg-sky-500/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{holding.name}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs font-bold">
                            {holding.ticker}
                          </p>
                        </div>
                        <span className="bg-background/70 shrink-0 rounded-full border px-2.5 py-1 text-xs font-black">
                          {holding.quantity.toLocaleString("ko-KR", {
                            maximumFractionDigits: 6,
                          })}
                          주
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-muted-foreground">평균 매수가</dt>
                          <dd className="mt-1 font-black tabular-nums">
                            {holding.averagePrice.toLocaleString("ko-KR", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {holding.currency}
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-muted-foreground">
                            원화 매입원금
                          </dt>
                          <dd className="mt-1 font-black tabular-nums">
                            {moneyLabel(holding.costKrw)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </div>
              {actionData?.error && (
                <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm font-bold text-red-500">
                  {actionData.error}
                </p>
              )}
              <Form
                ref={analysisFormRef}
                method="post"
                className="mt-5 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  if (confirmedGoalChangeRef.current) {
                    confirmedGoalChangeRef.current = false;
                    return;
                  }
                  const requestedGoal = Number(
                    new FormData(event.currentTarget).get("goalAmount"),
                  );
                  const currentGoal = !loaderData.isPro
                    ? loaderData.accountGoalAmount
                    : null;
                  if (
                    currentGoal == null ||
                    requestedGoal === currentGoal ||
                    !Number.isFinite(requestedGoal)
                  )
                    return;
                  event.preventDefault();
                  setGoalChange({
                    current: currentGoal,
                    requested: requestedGoal,
                  });
                }}
              >
                <input type="hidden" name="intent" value="analyze-managed" />
                <input type="hidden" name="replaceExistingGoal" value="" />
                <div className="space-y-2">
                  <Label htmlFor="goalAmount">목표 금액</Label>
                  {loaderData.isPro && (
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Pro에서는 목표 금액을 최대 3개까지 저장하며, 저장된 모든
                      목표를 자동 분석해요. 현재 {loaderData.savedGoalCount}/3개
                      사용 중이에요.
                    </p>
                  )}
                  <Input
                    id="goalAmount"
                    name="goalAmount"
                    type="number"
                    min="100000000"
                    step="100000000"
                    value={goalAmount}
                    placeholder={goalPlaceholder}
                    onChange={(event) => setGoalAmount(event.target.value)}
                    required
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {GOAL_PRESETS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setGoalAmount(String(amount))}
                        className={cn(
                          "h-9 rounded-xl border text-xs font-black transition-colors",
                          parsedGoalAmount === amount
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "bg-background hover:border-emerald-500/50 hover:bg-emerald-500/[0.06]",
                        )}
                      >
                        {moneyLabel(amount)}
                      </button>
                    ))}
                  </div>
                  <p className="text-right text-xs font-bold text-emerald-500">
                    {Number.isFinite(parsedGoalAmount) && parsedGoalAmount > 0
                      ? `입력 금액 ${moneyLabel(parsedGoalAmount)}`
                      : `예: ${moneyLabel(defaultGoalAmount)}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyContribution">매월 투자금</Label>
                  <Input
                    id="monthlyContribution"
                    name="monthlyContribution"
                    type="number"
                    min="0"
                    value={monthlyContribution}
                    placeholder={contributionPlaceholder}
                    onChange={(event) =>
                      setMonthlyContribution(event.target.value)
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {MONTHLY_CONTRIBUTION_PRESETS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => addMonthlyContribution(amount)}
                        className="bg-background h-9 rounded-full border px-3 text-xs font-black transition-colors hover:border-violet-500/50 hover:bg-violet-500/[0.07] hover:text-violet-500"
                        aria-label={`월 투자금에 ${moneyLabel(amount)} 추가`}
                      >
                        +{moneyLabel(amount)}
                      </button>
                    ))}
                  </div>
                  <p className="text-right text-xs font-bold text-violet-500">
                    {Number.isFinite(parsedMonthlyContribution) &&
                    parsedMonthlyContribution > 0
                      ? `입력 금액 ${moneyLabel(parsedMonthlyContribution)}`
                      : `예: ${moneyLabel(Number(contributionPlaceholder))} · 미입력 시 0원`}
                  </p>
                </div>
                {!isActive && (
                  <label className="bg-muted/25 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 sm:col-span-2">
                    <input
                      type="checkbox"
                      name="confirmReset"
                      className="mt-1 size-4"
                      required
                    />
                    <span>
                      {loaderData.isPro ? (
                        <>
                          기존 빠른 분석 기록은 그대로 보관하고, 앞으로 정밀
                          분석 기준으로 기록하는 데 동의해요.
                        </>
                      ) : (
                        <>
                          매매일지 정보를 사용해 정밀 분석을 진행하는 데
                          동의해요.
                          <strong className="mt-1 block text-amber-600 dark:text-amber-400">
                            무료 플랜에서는 빠른 분석과 정밀 분석 결과가 모두
                            저장되지 않아요.
                          </strong>
                        </>
                      )}
                    </span>
                  </label>
                )}
                <p className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-xs leading-5 text-violet-700 sm:col-span-2 dark:text-violet-300">
                  AI 분석에는 종목명을 익명 식별자로 바꾼 계산 요약만 사용해요.
                  사용자 정보와 개별 매매일지 원문은 전달하지 않아요.
                </p>
                <div className="flex items-center justify-between gap-3 text-xs font-bold sm:col-span-2">
                  <span className="text-muted-foreground">
                    오늘의 무료 분석
                  </span>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 text-emerald-600 tabular-nums dark:text-emerald-400">
                    {analysisUsage
                      ? `${analysisUsage.used}/${analysisUsage.limit}회 사용 · ${analysisUsage.remaining}회 남음`
                      : "최대 5회"}
                  </span>
                </div>
                <Button type="submit" size="lg" className="sm:col-span-2">
                  {isActive ? "정밀 분석 업데이트" : "정밀 분석 시작"}
                  <ArrowRightIcon />
                </Button>
              </Form>
            </section>
            {!loaderData.isPro && (
              <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.10] to-violet-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-black">
                    <CrownIcon className="size-4 text-amber-500" /> 무료 분석
                    결과는 저장되지 않아요
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Pro에서는 정밀 분석 기록을 계속 보관하고 대시보드와
                    인사이트에서 변화를 비교할 수 있어요.
                  </p>
                </div>
                <Button
                  asChild
                  className="shrink-0 rounded-full bg-amber-500 text-black hover:bg-amber-400"
                >
                  <Link to="/dashboard/pro">Pro로 기록 저장하기</Link>
                </Button>
              </section>
            )}
            {ephemeralResult && (
              <section className="mt-7">
                <AnalysisResultView
                  result={ephemeralResult}
                  showAuthCta={false}
                  showContributionDetails
                />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
