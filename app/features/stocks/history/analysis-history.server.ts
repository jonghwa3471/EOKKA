import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { createNotification } from "~/features/notifications/notifications.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { managedPortfolios } from "~/features/stocks/portfolio/schema";
import { syncUserAchievements } from "~/features/users/achievements.server";
import { profiles } from "~/features/users/schema";

import { analysisHistoryPoints, analysisSnapshots } from "./schema";

export const FREE_HISTORY_LIMIT = 30;
const DAILY_HISTORY_DAYS = 90;
const WEEKLY_HISTORY_DAYS = 365;

async function hasHistoryAccess(userId: string) {
  const [profile] = await db
    .select({
      proExpiresAt: profiles.pro_expires_at,
      betaProStartedAt: profiles.beta_pro_started_at,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);
  return Boolean(
    profile?.betaProStartedAt ||
      (profile?.proExpiresAt != null &&
        profile.proExpiresAt.getTime() > Date.now()),
  );
}

export class FreeGoalConflictError extends Error {
  readonly code = "FREE_GOAL_CONFLICT";

  constructor(readonly currentGoalAmount: number) {
    super("현재 베타에서는 목표 금액을 하나만 저장할 수 있어요.");
  }
}

export class ProGoalLimitError extends Error {
  readonly code = "PRO_GOAL_LIMIT";

  constructor() {
    super("EOKKA Pro 베타에서는 목표 금액을 하나만 저장할 수 있어요.");
  }
}

export async function getFreeAccountGoalAmount(userId: string) {
  const [profile] = await db
    .select({
      preferredGoalAmount: profiles.preferred_goal_amount,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);
  if (profile?.preferredGoalAmount != null) return profile.preferredGoalAmount;
  const [latest] = await db
    .select({ goalAmount: analysisSnapshots.goal_amount })
    .from(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId))
    .orderBy(
      desc(analysisSnapshots.saved_on),
      desc(analysisSnapshots.analysis_snapshot_id),
    )
    .limit(1);
  return latest?.goalAmount ?? null;
}

export async function assertFreeAccountGoal({
  userId,
  goalAmount,
  replaceExistingGoal,
}: {
  userId: string;
  goalAmount: number;
  replaceExistingGoal: boolean;
}) {
  const currentGoalAmount = await getFreeAccountGoalAmount(userId);
  if (
    currentGoalAmount != null &&
    currentGoalAmount !== goalAmount &&
    !replaceExistingGoal
  )
    throw new FreeGoalConflictError(currentGoalAmount);
  return currentGoalAmount;
}

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

function compactHistoryResult(result: AnalysisResult): AnalysisResult {
  const sampledChart = result.chart.filter(
    (point, index, points) =>
      index === 0 || index === points.length - 1 || point.month % 12 === 0,
  );
  return jsonSafeResult({
    ...result,
    holdings: result.holdings.map(
      ({
        fundamentals: _fundamentals,
        purchasePosition: _position,
        ...holding
      }) => holding,
    ),
    chart: sampledChart,
    contributionChart: undefined,
    aiStrategy: null,
    summary: [],
    riskWarnings: [],
  });
}

async function saveAnalysisHistoryPoint({
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

async function pruneDetailedAnalysisHistory(userId: string) {
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

function notificationGoalLabel(value: number) {
  return value % 100_000_000 === 0
    ? `${(value / 100_000_000).toLocaleString("ko-KR")}억`
    : `${value.toLocaleString("ko-KR")}원`;
}

export async function saveDailyAnalysisSnapshot({
  userId,
  result,
  hasUnlimitedHistory = false,
  analysisMode = "quick",
  managedPortfolioId = null,
  updateSource = "manual",
  replaceOtherGoals = false,
}: {
  userId: string;
  result: AnalysisResult;
  hasUnlimitedHistory?: boolean;
  analysisMode?: "quick" | "managed";
  managedPortfolioId?: number | null;
  updateSource?: "manual" | "automatic";
  replaceOtherGoals?: boolean;
}) {
  if (!(await hasHistoryAccess(userId)))
    throw new Error("분석 기록 저장은 EOKKA Pro에서 이용할 수 있어요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.asOf))
    throw new Error("분석 결과의 종가 기준일이 올바르지 않습니다.");
  const savedOn = result.asOf;
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
    update_source: updateSource,
    managed_portfolio_id: managedPortfolioId,
    result: jsonSafeResult(result),
    updated_at: new Date(),
  };

  const snapshotId = await db.transaction(async (transaction) => {
    if (replaceOtherGoals) {
      await transaction
        .delete(analysisSnapshots)
        .where(
          and(
            eq(analysisSnapshots.user_id, userId),
            ne(analysisSnapshots.goal_amount, values.goal_amount),
          ),
        );
      await transaction
        .delete(analysisHistoryPoints)
        .where(
          and(
            eq(analysisHistoryPoints.user_id, userId),
            ne(analysisHistoryPoints.goal_amount, values.goal_amount),
          ),
        );
      await transaction
        .update(profiles)
        .set({
          preferred_goal_amount: values.goal_amount,
          updated_at: new Date(),
        })
        .where(eq(profiles.profile_id, userId));
    }
    const updated = await transaction
      .update(analysisSnapshots)
      .set({
        current_value: values.current_value,
        profit: values.profit,
        return_rate: values.return_rate,
        goal_month: values.goal_month,
        monthly_contribution: values.monthly_contribution,
        managed_portfolio_id: values.managed_portfolio_id,
        update_source: values.update_source,
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

    if (updated.length > 0) return { id: updated[0].id, wasUpdated: true };

    const [inserted] = await transaction
      .insert(analysisSnapshots)
      .values(values)
      .returning({ id: analysisSnapshots.analysis_snapshot_id });
    return { id: inserted.id, wasUpdated: false };
  });

  await saveAnalysisHistoryPoint({
    userId,
    result,
    analysisMode,
    managedPortfolioId,
  });

  if (!hasUnlimitedHistory) {
    await pruneDetailedAnalysisHistory(userId);
  }
  await compactAnalysisHistory(userId);

  if (updateSource === "automatic") {
    const href = `/dashboard/history?month=${savedOn.slice(0, 7)}&date=${savedOn}&analysis=${snapshotId.id}`;
    await createNotification({
      userId,
      type: snapshotId.wasUpdated ? "analysis_updated" : "analysis_created",
      title: "자동 분석이 갱신됐어요",
      message: `${savedOn.replaceAll("-", ".")} 종가로 ${notificationGoalLabel(values.goal_amount)} 목표 분석을 ${snapshotId.wasUpdated ? "갱신했어요" : "저장했어요"}.`,
      href,
    });
  }

  await syncUserAchievements(userId);

  return { id: snapshotId.id, savedOn };
}

export async function startManagedAnalysisHistory({
  userId,
  portfolioId,
  result,
  replaceOtherGoals = false,
}: {
  userId: string;
  portfolioId: number;
  result: AnalysisResult;
  replaceOtherGoals?: boolean;
}) {
  if (!(await hasHistoryAccess(userId)))
    throw new Error("분석 기록 저장은 EOKKA Pro에서 이용할 수 있어요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.asOf))
    throw new Error("분석 결과의 종가 기준일이 올바르지 않습니다.");
  const savedOn = result.asOf;
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
    update_source: "manual",
    managed_portfolio_id: portfolioId,
    result: jsonSafeResult(result),
    updated_at: new Date(),
  };

  const snapshotId = await db.transaction(async (transaction) => {
    if (replaceOtherGoals) {
      await transaction
        .delete(analysisSnapshots)
        .where(
          and(
            eq(analysisSnapshots.user_id, userId),
            ne(analysisSnapshots.goal_amount, snapshot.goal_amount),
          ),
        );
      await transaction
        .delete(analysisHistoryPoints)
        .where(
          and(
            eq(analysisHistoryPoints.user_id, userId),
            ne(analysisHistoryPoints.goal_amount, snapshot.goal_amount),
          ),
        );
    }
    const [inserted] = await transaction
      .insert(analysisSnapshots)
      .values(snapshot)
      .returning({ id: analysisSnapshots.analysis_snapshot_id });
    await transaction
      .update(profiles)
      .set({
        preferred_goal_amount: snapshot.goal_amount,
      })
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

  await saveAnalysisHistoryPoint({
    userId,
    result,
    analysisMode: "managed",
    managedPortfolioId: portfolioId,
  });
  await pruneDetailedAnalysisHistory(userId);
  await compactAnalysisHistory(userId);

  await syncUserAchievements(userId);

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
      updateSource: analysisSnapshots.update_source,
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
  const history = await db
    .select({
      id: analysisHistoryPoints.analysis_history_point_id,
      savedOn: analysisHistoryPoints.saved_on,
      goalAmount: analysisHistoryPoints.goal_amount,
      currentValue: analysisHistoryPoints.current_value,
      profit: analysisHistoryPoints.profit,
      returnRate: analysisHistoryPoints.return_rate,
      goalMonth: analysisHistoryPoints.goal_month,
      monthlyContribution: analysisHistoryPoints.monthly_contribution,
      analysisMode: analysisHistoryPoints.analysis_mode,
      managedPortfolioId: analysisHistoryPoints.managed_portfolio_id,
      result: analysisHistoryPoints.metrics,
      updatedAt: analysisHistoryPoints.updated_at,
    })
    .from(analysisHistoryPoints)
    .where(
      and(
        eq(analysisHistoryPoints.user_id, userId),
        eq(analysisHistoryPoints.analysis_mode, activeMode),
        ...(activeMode === "managed" && portfolio?.id
          ? [eq(analysisHistoryPoints.managed_portfolio_id, portfolio.id)]
          : []),
      ),
    )
    .orderBy(
      asc(analysisHistoryPoints.saved_on),
      asc(analysisHistoryPoints.analysis_history_point_id),
    );
  return history.map((item) => ({
    ...item,
    updateSource: "history" as const,
    goalMonth: goalMonthFor(item.result),
  }));
}

export async function deleteAnalysisSnapshot({
  userId,
  snapshotId,
}: {
  userId: string;
  snapshotId: number;
}) {
  const deleted = await db
    .delete(analysisSnapshots)
    .where(
      and(
        eq(analysisSnapshots.user_id, userId),
        eq(analysisSnapshots.analysis_snapshot_id, snapshotId),
      ),
    )
    .returning({
      savedOn: analysisSnapshots.saved_on,
      goalAmount: analysisSnapshots.goal_amount,
    });
  if (deleted[0]) {
    await db
      .delete(analysisHistoryPoints)
      .where(
        and(
          eq(analysisHistoryPoints.user_id, userId),
          eq(analysisHistoryPoints.saved_on, deleted[0].savedOn),
          eq(analysisHistoryPoints.goal_amount, deleted[0].goalAmount),
        ),
      );
    await createNotification({
      userId,
      type: "analysis_deleted",
      title: "분석 기록을 삭제했어요",
      message: `${deleted[0].savedOn.replaceAll("-", ".")} ${notificationGoalLabel(deleted[0].goalAmount)} 목표 분석을 삭제했어요.`,
      href: "/dashboard/history",
    });
  }
}

export async function deleteAllAnalysisSnapshots(userId: string) {
  const deleted = await db
    .delete(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId))
    .returning({ id: analysisSnapshots.analysis_snapshot_id });
  await db
    .delete(analysisHistoryPoints)
    .where(eq(analysisHistoryPoints.user_id, userId));
  if (deleted.length > 0)
    await createNotification({
      userId,
      type: "analysis_all_deleted",
      title: "분석 기록을 모두 삭제했어요",
      message: `저장되어 있던 분석 기록 ${deleted.length.toLocaleString("ko-KR")}개를 모두 삭제했어요.`,
      href: "/dashboard/history",
    });
}

export async function deleteActiveAnalysisGoal({
  userId,
  goalAmount,
}: {
  userId: string;
  goalAmount: number;
}) {
  const [portfolio] = await db
    .select({
      id: managedPortfolios.managed_portfolio_id,
      status: managedPortfolios.status,
    })
    .from(managedPortfolios)
    .where(eq(managedPortfolios.user_id, userId))
    .limit(1);
  const isManaged = portfolio?.status === "active";
  const activeScope = isManaged
    ? and(
        eq(analysisSnapshots.analysis_mode, "managed"),
        eq(analysisSnapshots.managed_portfolio_id, portfolio.id),
      )
    : eq(analysisSnapshots.analysis_mode, "quick");
  const activeHistoryScope = isManaged
    ? and(
        eq(analysisHistoryPoints.analysis_mode, "managed"),
        eq(analysisHistoryPoints.managed_portfolio_id, portfolio.id),
      )
    : eq(analysisHistoryPoints.analysis_mode, "quick");

  const result = await db.transaction(async (transaction) => {
    const deleted = await transaction
      .delete(analysisSnapshots)
      .where(
        and(
          eq(analysisSnapshots.user_id, userId),
          eq(analysisSnapshots.goal_amount, goalAmount),
          activeScope,
        ),
      )
      .returning({ id: analysisSnapshots.analysis_snapshot_id });
    if (deleted.length === 0) return { deletedCount: 0, nextGoalAmount: null };
    await transaction
      .delete(analysisHistoryPoints)
      .where(
        and(
          eq(analysisHistoryPoints.user_id, userId),
          eq(analysisHistoryPoints.goal_amount, goalAmount),
          activeHistoryScope,
        ),
      );

    const [profile] = await transaction
      .select({
        preferredGoalAmount: profiles.preferred_goal_amount,
        automaticGoalAmount: profiles.automatic_analysis_goal_amount,
      })
      .from(profiles)
      .where(eq(profiles.profile_id, userId))
      .limit(1);
    let nextGoalAmount = profile?.preferredGoalAmount ?? null;
    if (
      profile?.preferredGoalAmount === goalAmount ||
      profile?.automaticGoalAmount === goalAmount
    ) {
      const [remaining] = await transaction
        .select({ goalAmount: analysisSnapshots.goal_amount })
        .from(analysisSnapshots)
        .where(and(eq(analysisSnapshots.user_id, userId), activeScope))
        .orderBy(
          desc(analysisSnapshots.saved_on),
          desc(analysisSnapshots.analysis_snapshot_id),
        )
        .limit(1);
      const remainingGoalAmount = remaining?.goalAmount ?? null;
      nextGoalAmount =
        profile.preferredGoalAmount === goalAmount
          ? remainingGoalAmount
          : profile.preferredGoalAmount;
      await transaction
        .update(profiles)
        .set({
          preferred_goal_amount: nextGoalAmount,
          automatic_analysis_goal_amount:
            profile.automaticGoalAmount === goalAmount
              ? remainingGoalAmount
              : profile.automaticGoalAmount,
          updated_at: new Date(),
        })
        .where(eq(profiles.profile_id, userId));
    }
    return { deletedCount: deleted.length, nextGoalAmount };
  });

  if (result.deletedCount > 0)
    await createNotification({
      userId,
      type: "analysis_deleted",
      title: "저장 목표를 삭제했어요",
      message: `${notificationGoalLabel(goalAmount)} 목표와 연결된 분석 기록 ${result.deletedCount.toLocaleString("ko-KR")}개를 삭제했어요.`,
      href: "/dashboard/precise-analysis",
    });

  return result;
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
