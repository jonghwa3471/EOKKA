import type { Route } from "./+types/automatic-analysis-settings";

import {
  CalendarClockIcon,
  CheckCircle2Icon,
  InfoIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Form, data, redirect, useActionData } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { getActiveAnalysisHistory } from "~/features/stocks/history/analysis-history.server";

import {
  getAutomaticAnalysisSettings,
  setAutomaticAnalysisSettings,
} from "../automatic-analysis-settings.server";

const settingsSchema = z.object({
  goalAmount: z.coerce.number().int().min(100_000_000).max(100_000_000_000),
  monthlyContribution: z.coerce.number().int().min(0).max(1_000_000_000),
});

const GOAL_PRESETS = [100_000_000, 1_000_000_000, 10_000_000_000];
const MONTHLY_PRESETS = [0, 100_000, 500_000, 1_000_000];

function moneyLabel(value: number) {
  const rounded = Math.max(0, Math.round(value));
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  const won = rounded % 10_000;
  const parts = [
    eok ? `${eok.toLocaleString("ko-KR")}억` : "",
    man ? `${man.toLocaleString("ko-KR")}만` : "",
    won ? won.toLocaleString("ko-KR") : "",
  ].filter(Boolean);
  return `${parts.join(" ") || "0"}원`;
}

export const meta: Route.MetaFunction = () => [
  { title: `자동 분석 설정 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [settings, history] = await Promise.all([
    getAutomaticAnalysisSettings(user.id),
    getActiveAnalysisHistory(user.id),
  ]);
  const latest = history.at(-1) ?? null;

  return {
    goalAmount:
      settings.goalAmount ??
      settings.preferredGoalAmount ??
      latest?.goalAmount ??
      100_000_000,
    monthlyContribution:
      settings.monthlyContribution ?? latest?.monthlyContribution ?? 0,
    isConfigured:
      settings.goalAmount != null && settings.monthlyContribution != null,
    hasAnalysis: history.length > 0,
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
    const parsed = settingsSchema.parse({
      goalAmount: formData.get("goalAmount"),
      monthlyContribution: formData.get("monthlyContribution") || 0,
    });
    await setAutomaticAnalysisSettings({ userId: user.id, ...parsed });
    return data({ saved: true, error: null });
  } catch (error) {
    return data(
      {
        saved: false,
        error:
          error instanceof z.ZodError
            ? "목표 금액과 매월 투자금을 다시 확인해 주세요."
            : "자동 분석 설정을 저장하지 못했어요.",
      },
      { status: 400 },
    );
  }
}

export default function AutomaticAnalysisSettings({
  loaderData,
}: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const [goalAmount, setGoalAmount] = useState(String(loaderData.goalAmount));
  const [monthlyContribution, setMonthlyContribution] = useState(
    String(loaderData.monthlyContribution),
  );
  const parsedGoal = Number(goalAmount);
  const parsedMonthly = Number(monthlyContribution);

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-14 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <CalendarClockIcon className="size-4" /> AUTOMATIC ANALYSIS
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            자동 분석 설정
          </h1>
          <p className="text-muted-foreground mt-2 leading-6">
            자동으로 기록할 목표 금액과 매월 투자금을 한 번 정해 두세요.
          </p>
        </header>

        <section className="bg-card relative mt-7 overflow-hidden rounded-3xl border p-5 shadow-sm md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_32%)]" />
          <div className="relative flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm leading-6">
            <SparklesIcon className="mt-1 size-4 shrink-0 text-emerald-500" />
            <p>
              거래일마다 오후 2시 30분에 가장 최근 확정 종가를 확인해요. 새
              종가가 있으면 아래 설정과 최신 포트폴리오로 분석 기록과 AI
              인사이트를 업데이트해요.
            </p>
          </div>

          {!loaderData.hasAnalysis && (
            <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <InfoIcon className="mt-1 size-4 shrink-0" />
              설정은 지금 저장할 수 있어요. 첫 빠른 분석이나 정밀 분석으로
              포트폴리오가 만들어진 뒤부터 자동 분석이 시작돼요.
            </div>
          )}

          <Form
            method="post"
            className="relative mt-6 grid gap-5 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="goalAmount">자동 분석 목표 금액</Label>
              <Input
                id="goalAmount"
                name="goalAmount"
                type="number"
                min="100000000"
                max="100000000000"
                step="100000000"
                value={goalAmount}
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
                      "h-9 cursor-pointer rounded-xl border text-xs font-black transition-colors",
                      parsedGoal === amount
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "bg-background hover:border-emerald-500/50 hover:bg-emerald-500/[0.06]",
                    )}
                  >
                    {moneyLabel(amount)}
                  </button>
                ))}
              </div>
              <p className="text-right text-xs font-bold text-emerald-500">
                {Number.isFinite(parsedGoal) && parsedGoal > 0
                  ? moneyLabel(parsedGoal)
                  : "1억원 이상 입력해 주세요"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">자동 분석 매월 투자금</Label>
              <Input
                id="monthlyContribution"
                name="monthlyContribution"
                type="number"
                min="0"
                max="1000000000"
                value={monthlyContribution}
                onChange={(event) => setMonthlyContribution(event.target.value)}
                required
              />
              <div className="grid grid-cols-4 gap-2">
                {MONTHLY_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setMonthlyContribution(String(amount))}
                    className={cn(
                      "h-9 cursor-pointer rounded-xl border text-xs font-black transition-colors",
                      parsedMonthly === amount
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "bg-background hover:border-violet-500/50 hover:bg-violet-500/[0.06]",
                    )}
                  >
                    {amount === 0 ? "투자 안 함" : moneyLabel(amount)}
                  </button>
                ))}
              </div>
              <p className="text-right text-xs font-bold text-violet-500">
                {Number.isFinite(parsedMonthly) && parsedMonthly >= 0
                  ? `매월 ${moneyLabel(parsedMonthly)}`
                  : "0원 이상 입력해 주세요"}
              </p>
            </div>

            {actionData?.error && (
              <p className="rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm font-bold text-red-500 sm:col-span-2">
                {actionData.error}
              </p>
            )}
            {actionData?.saved && (
              <p className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 text-sm font-bold text-emerald-600 sm:col-span-2 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4" /> 자동 분석 설정을
                저장했어요.
              </p>
            )}

            <Button type="submit" size="lg" className="sm:col-span-2">
              <SaveIcon /> 설정 저장하기
            </Button>
          </Form>
        </section>

        <p className="text-muted-foreground mt-5 text-center text-xs leading-5">
          최근 30일 동안 서비스를 이용하지 않으면 불필요한 시세 조회와 AI 호출을
          줄이기 위해 자동 분석을 잠시 쉬어요.
        </p>
      </div>
    </main>
  );
}
