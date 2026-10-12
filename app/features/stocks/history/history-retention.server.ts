import { and, eq, sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { SERVICE_LIMITS } from "~/core/lib/service-limits";
import type { AnalysisResult } from "~/features/stocks/analysis.types";

import { compactHistoryResult, goalMonthFor } from "./history-values";
import { analysisHistoryPoints, analysisSnapshots } from "./schema";

export const FREE_HISTORY_LIMIT = SERVICE_LIMITS.detailedAnalysisRecords;

const DAILY_HISTORY_DAYS = 90;

const WEEKLY_HISTORY_DAYS = 365;

export async function saveAnalysisHistoryPoint({
  userId,
  result,
  analysisMode,
  managedPortfolioId,
}: {
  userId: string;
  result: AnalysisResult;
  analysisMode: "quick" | "managed";
  managedPortfolioId: number | null;
}) {
  const values = {
    user_id: userId,
    saved_on: result.asOf,
    period_kind: "daily",
    goal_amount: Math.round(result.goalAmount),
    current_value: Math.round(result.currentValue),
    total_cost: Math.round(result.totalCost),
    profit: Math.round(result.profit),
    return_rate: result.returnRate,
    goal_month: goalMonthFor(result),
    monthly_contribution: Math.round(result.monthlyContribution),
    analysis_mode: analysisMode,
    managed_portfolio_id: managedPortfolioId,
    metrics: compactHistoryResult(result),
    updated_at: new Date(),
  };
  const updated = await db
    .update(analysisHistoryPoints)
    .set(values)
    .where(
      and(
        eq(analysisHistoryPoints.user_id, userId),
        eq(analysisHistoryPoints.goal_amount, values.goal_amount),
        eq(analysisHistoryPoints.saved_on, values.saved_on),
        eq(analysisHistoryPoints.analysis_mode, analysisMode),
      ),
    )
    .returning({ id: analysisHistoryPoints.analysis_history_point_id });
  if (updated.length === 0)
    await db.insert(analysisHistoryPoints).values(values);
}

/**
 * Keep recent points daily, then retain one closing point per ISO week and,
 * after a year, one closing point per month. Full AI reports are unaffected.
 */
export async function compactAnalysisHistory(userId?: string) {
  const scope = userId
    ? sql`where ${analysisHistoryPoints.user_id} = ${userId}`
    : sql``;
  await db.execute(sql`
    with ranked as (
      select
        ${analysisHistoryPoints.analysis_history_point_id} as id,
        case
          when ${analysisHistoryPoints.saved_on} >= current_date - ${DAILY_HISTORY_DAYS}::integer then 'daily'
          when ${analysisHistoryPoints.saved_on} >= current_date - ${WEEKLY_HISTORY_DAYS}::integer then 'weekly'
          else 'monthly'
        end as period_kind,
        row_number() over (
          partition by
            ${analysisHistoryPoints.user_id},
            ${analysisHistoryPoints.goal_amount},
            ${analysisHistoryPoints.analysis_mode},
            coalesce(${analysisHistoryPoints.managed_portfolio_id}, 0),
            case
              when ${analysisHistoryPoints.saved_on} >= current_date - ${DAILY_HISTORY_DAYS}::integer
                then ${analysisHistoryPoints.saved_on}::text
              when ${analysisHistoryPoints.saved_on} >= current_date - ${WEEKLY_HISTORY_DAYS}::integer
                then to_char(${analysisHistoryPoints.saved_on}, 'IYYY-IW')
              else to_char(${analysisHistoryPoints.saved_on}, 'YYYY-MM')
            end
          order by ${analysisHistoryPoints.saved_on} desc,
            ${analysisHistoryPoints.analysis_history_point_id} desc
        ) as bucket_rank
      from ${analysisHistoryPoints}
      ${scope}
    ), deleted as (
      delete from ${analysisHistoryPoints}
      where ${analysisHistoryPoints.analysis_history_point_id} in (
        select id from ranked where bucket_rank > 1
      )
    )
    update ${analysisHistoryPoints} as points
    set period_kind = ranked.period_kind
    from ranked
    where points.analysis_history_point_id = ranked.id
      and ranked.bucket_rank = 1
  `);
}

export async function pruneDetailedAnalysisHistory(userId: string) {
  await db.execute(sql`
    delete from ${analysisSnapshots}
    where ${analysisSnapshots.analysis_snapshot_id} in (
      select analysis_snapshot_id
      from (
        select
          ${analysisSnapshots.analysis_snapshot_id} as analysis_snapshot_id,
          row_number() over (
            partition by ${analysisSnapshots.user_id}
            order by ${analysisSnapshots.saved_on} desc,
              ${analysisSnapshots.analysis_snapshot_id} desc
          ) as record_number
        from ${analysisSnapshots}
        where ${analysisSnapshots.user_id} = ${userId}
      ) ranked_snapshots
      where record_number > ${FREE_HISTORY_LIMIT}
    )
  `);
}
