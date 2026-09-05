import { and, asc, eq, sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { managedPortfolios } from "~/features/stocks/portfolio/schema";
import { profiles } from "~/features/users/schema";

import { analysisSnapshots } from "./schema";

export const FREE_HISTORY_LIMIT = 30;

export function seoulDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function goalMonthFor(result: AnalysisResult) {
  return (
    result.scenarios.find((scenario) => scenario.key === "base")?.goalMonth ??
    null
  );
}

function jsonSafeResult(result: AnalysisResult) {
  return JSON.parse(JSON.stringify(result)) as AnalysisResult;
}

export async function saveDailyAnalysisSnapshot({
  userId,
  result,
  hasUnlimitedHistory = false,
  analysisMode = "quick",
  managedPortfolioId = null,
}: {
  userId: string;
  result: AnalysisResult;
  hasUnlimitedHistory?: boolean;
  analysisMode?: "quick" | "managed";
  managedPortfolioId?: number | null;
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
    analysis_mode: analysisMode,
    managed_portfolio_id: managedPortfolioId,
    result: jsonSafeResult(result),
    updated_at: new Date(),
  };

  const snapshotId = await db.transaction(async (transaction) => {
    const updated = await transaction
      .update(analysisSnapshots)
      .set({
        current_value: values.current_value,
        profit: values.profit,
        return_rate: values.return_rate,
        goal_month: values.goal_month,
        monthly_contribution: values.monthly_contribution,
        managed_portfolio_id: values.managed_portfolio_id,
        result: values.result,
        updated_at: values.updated_at,
      })
      .where(
        and(
          eq(analysisSnapshots.user_id, values.user_id),
          eq(analysisSnapshots.goal_amount, values.goal_amount),
          eq(analysisSnapshots.saved_on, values.saved_on),
          eq(analysisSnapshots.analysis_mode, values.analysis_mode),
        ),
      )
      .returning({ id: analysisSnapshots.analysis_snapshot_id });

    if (updated.length > 0) return updated[0].id;

    const [inserted] = await transaction
      .insert(analysisSnapshots)
      .values(values)
      .returning({ id: analysisSnapshots.analysis_snapshot_id });
    return inserted.id;
  });

  if (!hasUnlimitedHistory) {
    await db.execute(sql`
      delete from ${analysisSnapshots}
      where ${analysisSnapshots.analysis_snapshot_id} in (
        select analysis_snapshot_id
        from (
          select
            ${analysisSnapshots.analysis_snapshot_id} as analysis_snapshot_id,
            row_number() over (
              partition by ${analysisSnapshots.goal_amount}, ${analysisSnapshots.analysis_mode}
              order by
                ${analysisSnapshots.saved_on} desc,
                ${analysisSnapshots.analysis_snapshot_id} desc
            ) as record_number
          from ${analysisSnapshots}
          where ${analysisSnapshots.user_id} = ${userId}
        ) ranked_snapshots
        where record_number > ${FREE_HISTORY_LIMIT}
      )
    `);
  }

  return { id: snapshotId, savedOn };
}

export async function startManagedAnalysisHistory({
  userId,
  portfolioId,
  result,
}: {
  userId: string;
  portfolioId: number;
  result: AnalysisResult;
}) {
  const savedOn = seoulDate();
  const snapshot = {
    user_id: userId,
    saved_on: savedOn,
    goal_amount: Math.round(result.goalAmount),
    current_value: Math.round(result.currentValue),
    profit: Math.round(result.profit),
    return_rate: result.returnRate,
    goal_month: goalMonthFor(result),
    monthly_contribution: Math.round(result.monthlyContribution),
    analysis_mode: "managed",
    managed_portfolio_id: portfolioId,
    result: jsonSafeResult(result),
    updated_at: new Date(),
  };

  const snapshotId = await db.transaction(async (transaction) => {
    const [inserted] = await transaction
      .insert(analysisSnapshots)
      .values(snapshot)
      .returning({ id: analysisSnapshots.analysis_snapshot_id });
    await transaction
      .update(profiles)
      .set({ preferred_goal_amount: snapshot.goal_amount })
      .where(eq(profiles.profile_id, userId));
    await transaction
      .update(managedPortfolios)
      .set({ status: "active", transitioned_at: new Date() })
      .where(
        and(
          eq(managedPortfolios.managed_portfolio_id, portfolioId),
          eq(managedPortfolios.user_id, userId),
        ),
      );
    return inserted.id;
  });

  return { id: snapshotId, savedOn };
}

export async function getAnalysisHistory(userId: string) {
  const history = await db
    .select({
      id: analysisSnapshots.analysis_snapshot_id,
      savedOn: analysisSnapshots.saved_on,
      goalAmount: analysisSnapshots.goal_amount,
      currentValue: analysisSnapshots.current_value,
      profit: analysisSnapshots.profit,
      returnRate: analysisSnapshots.return_rate,
      goalMonth: analysisSnapshots.goal_month,
      monthlyContribution: analysisSnapshots.monthly_contribution,
      analysisMode: analysisSnapshots.analysis_mode,
      managedPortfolioId: analysisSnapshots.managed_portfolio_id,
      result: analysisSnapshots.result,
      updatedAt: analysisSnapshots.updated_at,
    })
    .from(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId))
    .orderBy(
      asc(analysisSnapshots.saved_on),
      asc(analysisSnapshots.analysis_snapshot_id),
    );

  return history.map((item) => ({
    ...item,
    // 기존 저장 기록도 월 추가 투자금을 제외한 평균 시나리오로 표시합니다.
    goalMonth: goalMonthFor(item.result),
  }));
}

export async function getActiveAnalysisHistory(userId: string) {
  const [portfolio] = await db
    .select({
      id: managedPortfolios.managed_portfolio_id,
      status: managedPortfolios.status,
    })
    .from(managedPortfolios)
    .where(eq(managedPortfolios.user_id, userId))
    .limit(1);
  const activeMode = portfolio?.status === "active" ? "managed" : "quick";
  const history = await getAnalysisHistory(userId);
  return history.filter(
    (item) =>
      item.analysisMode === activeMode &&
      (activeMode !== "managed" || item.managedPortfolioId === portfolio?.id),
  );
}

export async function deleteAnalysisSnapshot({
  userId,
  snapshotId,
}: {
  userId: string;
  snapshotId: number;
}) {
  await db
    .delete(analysisSnapshots)
    .where(
      and(
        eq(analysisSnapshots.user_id, userId),
        eq(analysisSnapshots.analysis_snapshot_id, snapshotId),
      ),
    );
}

export async function deleteAllAnalysisSnapshots(userId: string) {
  await db
    .delete(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId));
}

export async function getPreferredGoalAmount(userId: string) {
  const [profile] = await db
    .select({ goalAmount: profiles.preferred_goal_amount })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);
  return profile?.goalAmount ?? null;
}

export async function setPreferredGoalAmount(
  userId: string,
  goalAmount: number,
) {
  await db
    .update(profiles)
    .set({ preferred_goal_amount: goalAmount, updated_at: new Date() })
    .where(eq(profiles.profile_id, userId));
}
