import type { Route } from "./+types/precise-analysis";

import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Form, Link, data, redirect, useActionData } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";
import { generateAiStrategy } from "~/features/stocks/ai-strategy.server";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
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

    const saved =
      managed.portfolio.status === "active"
        ? await saveDailyAnalysisSnapshot({
            userId: user.id,
            result: completeResult,
            analysisMode: "managed",
            managedPortfolioId: managed.portfolio.managed_portfolio_id,
          })
        : await startManagedAnalysisHistory({
            userId: user.id,
            portfolioId: managed.portfolio.managed_portfolio_id,
            result: completeResult,
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
  const isActive = managed?.portfolio.status === "active";
  const goalPlaceholder = String(defaultGoalAmount);
  const contributionPlaceholder = String(
    defaultMonthlyContribution > 0 ? defaultMonthlyContribution : 100_000,
  );
  const parsedGoalAmount = Number(goalAmount);
  const parsedMonthlyContribution = Number(monthlyContribution);

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
                    value={goalAmount}
                    placeholder={goalPlaceholder}
                    onChange={(event) => setGoalAmount(event.target.value)}
                    required
                  />
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
                    기존 빠른 분석 기록은 보관하고 정밀 분석 기준으로 전환하는
                    데 동의해요.
                  </label>
                )}
                <p className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-xs leading-5 text-violet-700 sm:col-span-2 dark:text-violet-300">
                  AI 분석에는 종목명을 익명 식별자로 바꾼 계산 요약만 사용해요.
                  사용자 정보와 개별 매매일지 원문은 전달하지 않아요.
                </p>
                <Button type="submit" size="lg" className="sm:col-span-2">
                  {isActive ? "정밀 분석 업데이트" : "정밀 분석 시작"}
                  <ArrowRightIcon />
                </Button>
              </Form>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
