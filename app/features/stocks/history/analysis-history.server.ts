import type { AnalysisResult } from "~/features/stocks/analysis.types";

import { and, asc, eq, lt } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { analysisSnapshots } from "./schema";

export const FREE_HISTORY_DAYS = 7;

function seoulDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00+09:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function goalMonthFor(result: AnalysisResult) {
  const scenarios =
    result.monthlyContribution > 0
      ? result.contributionScenarios
      : result.scenarios;
  return scenarios.find((scenario) => scenario.key === "base")?.goalMonth ?? null;
}

export async function saveDailyAnalysisSnapshot({
  userId,
  result,
  hasUnlimitedHistory = false,
}: {
  userId: string;
  result: AnalysisResult;
  hasUnlimitedHistory?: boolean;
}) {
  const savedOn = seoulDate();
  const values = {
    user_id: userId,
    saved_on: savedOn,
    goal_amount: Math.round(result.goalAmount),
    current_value: Math.round(result.currentValue),
    profit: Math.round(result.profit),
    return_rate: result.returnRate,
    goal_month: goalMonthFor(result),
    monthly_contribution: Math.round(result.monthlyContribution),
    result,
    updated_at: new Date(),
  };

  await db
    .insert(analysisSnapshots)
    .values(values)
    .onConflictDoUpdate({
      target: [analysisSnapshots.user_id, analysisSnapshots.saved_on],
      set: values,
    });

  if (!hasUnlimitedHistory) {
    const cutoff = addDays(savedOn, -(FREE_HISTORY_DAYS - 1));
    await db
      .delete(analysisSnapshots)
      .where(
        and(
          eq(analysisSnapshots.user_id, userId),
          lt(analysisSnapshots.saved_on, cutoff),
        ),
      );
  }
}

export async function getAnalysisHistory(userId: string) {
  return db
    .select({
      id: analysisSnapshots.analysis_snapshot_id,
      savedOn: analysisSnapshots.saved_on,
      goalAmount: analysisSnapshots.goal_amount,
      currentValue: analysisSnapshots.current_value,
      profit: analysisSnapshots.profit,
      returnRate: analysisSnapshots.return_rate,
      goalMonth: analysisSnapshots.goal_month,
      monthlyContribution: analysisSnapshots.monthly_contribution,
      result: analysisSnapshots.result,
    })
    .from(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId))
    .orderBy(asc(analysisSnapshots.saved_on));
}
