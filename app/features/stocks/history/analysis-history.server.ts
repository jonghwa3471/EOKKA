import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { createNotification } from "~/features/notifications/notifications.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { managedPortfolios } from "~/features/stocks/portfolio/schema";
import { findCompletedAchievementIds } from "~/features/users/achievements";
import { syncUserAchievements } from "~/features/users/achievements.server";
import { profiles, userAchievements } from "~/features/users/schema";

import { hasHistoryAccess } from "./history-access.server";
import {
  compactAnalysisHistory,
  pruneDetailedAnalysisHistory,
  saveAnalysisHistoryPoint,
} from "./history-retention.server";
import {
  goalMonthFor,
  jsonSafeResult,
  notificationGoalLabel,
} from "./history-values";
import {
  analysisHistoryPoints,
  analysisSnapshots,
  pendingQuickAnalyses,
} from "./schema";

export async function savePendingQuickAnalysis(
  userId: string,
  result: AnalysisResult,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.asOf)) return;
  const now = new Date();
  await db
    .insert(pendingQuickAnalyses)
    .values({
      user_id: userId,
      result: jsonSafeResult(result),
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: pendingQuickAnalyses.user_id,
      set: { result: jsonSafeResult(result), updated_at: now },
    });
}

export async function promotePendingQuickAnalysis(userId: string) {
  const [pending] = await db
    .select({ result: pendingQuickAnalyses.result })
    .from(pendingQuickAnalyses)
    .where(eq(pendingQuickAnalyses.user_id, userId))
    .limit(1);
  if (!pending) return null;

  const saved = await saveDailyAnalysisSnapshot({
    userId,
    result: pending.result,
  });
  await db
    .delete(pendingQuickAnalyses)
    .where(eq(pendingQuickAnalyses.user_id, userId));
  return saved;
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
    if (analysisMode === "managed") {
      // A closing date represents one portfolio state. When a precise analysis
      // is saved for that date, it becomes the canonical record instead of
      // leaving the earlier quick analysis beside it.
      await transaction
        .delete(analysisSnapshots)
        .where(
          and(
            eq(analysisSnapshots.user_id, userId),
            eq(analysisSnapshots.saved_on, savedOn),
            eq(analysisSnapshots.analysis_mode, "quick"),
          ),
        );
      await transaction
        .delete(analysisHistoryPoints)
        .where(
          and(
            eq(analysisHistoryPoints.user_id, userId),
            eq(analysisHistoryPoints.saved_on, savedOn),
            eq(analysisHistoryPoints.analysis_mode, "quick"),
          ),
        );
    }
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
    const quickSnapshots = await transaction
      .select({
        savedOn: analysisSnapshots.saved_on,
        goalAmount: analysisSnapshots.goal_amount,
        currentValue: analysisSnapshots.current_value,
        monthlyContribution: analysisSnapshots.monthly_contribution,
        analysisMode: analysisSnapshots.analysis_mode,
        result: analysisSnapshots.result,
      })
      .from(analysisSnapshots)
      .where(
        and(
          eq(analysisSnapshots.user_id, userId),
          eq(analysisSnapshots.analysis_mode, "quick"),
        ),
      )
      .orderBy(
        desc(analysisSnapshots.saved_on),
        desc(analysisSnapshots.updated_at),
      );
    const quickAchievementIds = findCompletedAchievementIds(quickSnapshots);
    if (quickAchievementIds.length) {
      await transaction
        .delete(userAchievements)
        .where(
          and(
            eq(userAchievements.user_id, userId),
            inArray(userAchievements.achievement_id, quickAchievementIds),
          ),
        );
    }
    const [currentProfile] = await transaction
      .select({ featuredIds: profiles.featured_achievement_ids })
      .from(profiles)
      .where(eq(profiles.profile_id, userId))
      .limit(1);
    const remainingFeaturedIds = (currentProfile?.featuredIds ?? []).filter(
      (id) => !quickAchievementIds.includes(id),
    );
    await transaction
      .delete(analysisSnapshots)
      .where(
        and(
          eq(analysisSnapshots.user_id, userId),
          eq(analysisSnapshots.saved_on, savedOn),
          eq(analysisSnapshots.analysis_mode, "quick"),
        ),
      );
    await transaction
      .delete(analysisHistoryPoints)
      .where(
        and(
          eq(analysisHistoryPoints.user_id, userId),
          eq(analysisHistoryPoints.saved_on, savedOn),
          eq(analysisHistoryPoints.analysis_mode, "quick"),
        ),
      );
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
        featured_achievement_ids: remainingFeaturedIds,
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

export { seoulDate } from "./history-values";

export { FREE_HISTORY_LIMIT } from "./history-retention.server";

export { compactAnalysisHistory } from "./history-retention.server";

export { FreeGoalConflictError } from "./history-access.server";

export { ProGoalLimitError } from "./history-access.server";

export { getFreeAccountGoalAmount } from "./history-access.server";

export { assertFreeAccountGoal } from "./history-access.server";
