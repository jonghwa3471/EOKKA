import type { Route } from "./+types/precise-analysis";

import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, Link, data, redirect, useActionData } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";
import { generateAiStrategy } from "~/features/stocks/ai-strategy.server";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import {
  getAnalysisHistory,
  getPreferredGoalAmount,
  saveDailyAnalysisSnapshot,
  seoulDate,
  startManagedAnalysisHistory,
} from "~/features/stocks/history/analysis-history.server";
import {
  calculateManagedHoldings,
  getManagedPortfolio,
  investmentMonthsSince,
} from "~/features/stocks/portfolio/portfolio.server";

const analysisSchema = z.object({
  goalAmount: z.coerce.number().int().min(100_000_000).max(100_000_000_000),
  monthlyContribution: z.coerce.number().int().min(0).max(1_000_000_000),
  confirmReset: z.literal("on").optional(),
});

function moneyLabel(value: number) {
  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  return `${eok ? `${eok.toLocaleString("ko-KR")}억` : ""}${eok && man ? " " : ""}${man ? `${man.toLocaleString("ko-KR")}만` : ""}원`;
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

  const [managed, history, preferredGoal] = await Promise.all([
    getManagedPortfolio(user.id),
    getAnalysisHistory(user.id),
    getPreferredGoalAmount(user.id),
  ]);
  const managedHistory = managed
    ? history.filter(
        (record) =>
          record.analysisMode === "managed" &&
          record.managedPortfolioId === managed.portfolio.managed_portfolio_id,
      )
    : [];
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

  return {
    managed,
    holdings,
    defaultGoalAmount: latest?.goalAmount ?? 100_000_000,
    defaultMonthlyContribution: latest?.monthlyContribution ?? 0,
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
    const parsed = analysisSchema.parse({
      goalAmount: formData.get("goalAmount"),
      monthlyContribution: formData.get("monthlyContribution") || 0,
      confirmReset: formData.get("confirmReset") ?? undefined,
    });
    const managed = await getManagedPortfolio(user.id);
    if (!managed)
      throw new Error("먼저 내 포트폴리오에서 매매일지를 작성해 주세요.");
    if (managed.portfolio.status !== "active" && parsed.confirmReset !== "on")
      throw new Error("정밀 분석 전환에 동의해 주세요.");

    const holdings = calculateManagedHoldings(managed.transactions);
    if (!holdings.length)
      throw new Error("현재 보유 중인 종목이 없어 분석할 수 없어요.");
    if (holdings.length > 10)
      throw new Error("정밀 분석은 현재 최대 10개 보유 종목을 지원해요.");
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
    let aiStrategy = null;
    try {
      aiStrategy = await generateAiStrategy(result);
    } catch (error) {
      console.error("Managed AI strategy generation failed", error);
    }
    const completeResult = { ...result, aiStrategy };

    if (managed.portfolio.status === "active") {
      await saveDailyAnalysisSnapshot({
        userId: user.id,
        result: completeResult,
        analysisMode: "managed",
        managedPortfolioId: managed.portfolio.managed_portfolio_id,
      });
    } else {
      await startManagedAnalysisHistory({
        userId: user.id,
        portfolioId: managed.portfolio.managed_portfolio_id,
        result: completeResult,
      });
    }
    return data({ result: completeResult, error: null });
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
      },
      { status: 400 },
    );
  }
}

export default function PreciseAnalysis({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const resultRef = useRef<HTMLElement>(null);
  const { managed, holdings, defaultGoalAmount, defaultMonthlyContribution } =
    loaderData;
  const isActive = managed?.portfolio.status === "active";
  useEffect(() => {
    if (!actionData?.result) return;
    window.requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  }, [actionData?.result]);

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-14 md:px-8 md:pt-12">
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
              {actionData?.error && (
                <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm font-bold text-red-500">
                  {actionData.error}
                </p>
              )}
              <Form method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="intent" value="analyze-managed" />
                <div className="space-y-2">
                  <Label htmlFor="goalAmount">목표 금액</Label>
                  <Input
                    id="goalAmount"
                    name="goalAmount"
                    type="number"
                    min="100000000"
                    step="100000000"
                    defaultValue={defaultGoalAmount}
                    required
                  />
                  <p className="text-right text-xs font-bold text-emerald-500">
                    현재 기준 {moneyLabel(defaultGoalAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyContribution">매월 투자금</Label>
                  <Input
                    id="monthlyContribution"
                    name="monthlyContribution"
                    type="number"
                    min="0"
                    defaultValue={defaultMonthlyContribution}
                  />
                  <p className="text-muted-foreground text-right text-xs">
                    추가 투자가 없다면 0원으로 분석해요.
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
                    기존 빠른 분석 기록은 보관하고 정밀 분석 기준으로 전환하는
                    데 동의해요.
                  </label>
                )}
                <Button type="submit" size="lg" className="sm:col-span-2">
                  {isActive ? "정밀 분석 업데이트" : "정밀 분석 시작"}
                  <ArrowRightIcon />
                </Button>
              </Form>
            </section>
            {actionData?.result && (
              <section ref={resultRef} className="mt-10 scroll-mt-6">
                <div className="mb-5">
                  <p className="text-sm font-bold text-emerald-500">
                    분석 완료
                  </p>
                  <h2 className="mt-1 text-2xl font-black">정밀 분석 결과</h2>
                </div>
                <AnalysisResultView
                  result={actionData.result}
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
