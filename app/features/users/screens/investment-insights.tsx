import type { Route } from "./+types/investment-insights";

import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Form, Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  FREE_HISTORY_LIMIT,
  getAnalysisHistory,
  getPreferredGoalAmount,
  setPreferredGoalAmount,
} from "~/features/stocks/history/analysis-history.server";

import { HistoricalInsights } from "./dashboard";

export const meta: Route.MetaFunction = () => [
  { title: `투자 인사이트 | ${import.meta.env.VITE_APP_NAME}` },
];

function formatGoalAmount(value: number) {
  if (value >= 100_000_000 && value % 100_000_000 === 0) {
    return `${(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }
  return `${new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}원`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [allHistory, savedPreferredGoal] = await Promise.all([
    getAnalysisHistory(user.id),
    getPreferredGoalAmount(user.id),
  ]);
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

  return {
    history,
    goalOptions,
    preferredGoal,
    historyLimit: FREE_HISTORY_LIMIT,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const goalAmount = Number(formData.get("goalAmount"));
  const history = await getAnalysisHistory(user.id);
  const validGoals = new Set(history.map((item) => item.goalAmount));
  if (!Number.isSafeInteger(goalAmount) || !validGoals.has(goalAmount)) {
    throw new Response("Invalid goal amount", { status: 400 });
  }

  await setPreferredGoalAmount(user.id, goalAmount);
  return redirect("/dashboard/insights");
}

export default function InvestmentInsights({ loaderData }: Route.ComponentProps) {
  const { history, goalOptions, preferredGoal, historyLimit } = loaderData;

  if (history.length === 0) {
    return (
      <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
          <section className="bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#8b5cf620,transparent_48%)]" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
              <SparklesIcon className="size-8" />
            </div>
            <h1 className="relative mt-7 text-3xl font-black md:text-4xl">
              기록이 쌓이면 인사이트가 보여요
            </h1>
            <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl leading-7">
              포트폴리오를 분석하면 목표 접근 속도, 수익률 흐름, 주간 시상식과
              구조 변화를 기록 전체를 바탕으로 정리해 드려요.
            </p>
            <Button asChild size="lg" className="relative mt-7 rounded-full px-7">
              <Link to="/">
                첫 분석 시작하기 <ArrowRightIcon />
              </Link>
            </Button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-violet-500">
              <SparklesIcon className="size-4" /> PORTFOLIO INSIGHTS
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              기록 속에서 찾은 투자 인사이트
            </h1>
            <p className="text-muted-foreground mt-2">
              선택한 목표의 최근 {historyLimit}개 기록을 함께 분석했어요.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/history">
              날짜별 기록 보기 <ArrowRightIcon />
            </Link>
          </Button>
        </header>

        {goalOptions.length > 1 && (
          <section className="bg-card mt-7 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div>
              <p className="font-black">인사이트 기준 목표</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                선택한 목표와 연결된 기록만 모아서 분석해요.
              </p>
            </div>
            <Form method="post" className="flex flex-wrap gap-2">
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

        <HistoricalInsights history={history} />
      </div>
    </main>
  );
}
