import { and, desc, eq, inArray } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { analysisSnapshots } from "~/features/stocks/history/schema";

import { achievementById, findCompletedAchievementIds } from "./achievements";
import { userAchievements } from "./schema";

async function awardAchievementIds(userId: string, completedIds: string[]) {
  if (!completedIds.length) return;
  const alreadyEarned = await db
    .select({ id: userAchievements.achievement_id })
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.user_id, userId),
        inArray(userAchievements.achievement_id, completedIds),
      ),
    );
  const earnedIds = new Set(alreadyEarned.map((item) => item.id));
  const newIds = completedIds.filter((id) => !earnedIds.has(id));
  if (newIds.length) {
    await db
      .insert(userAchievements)
      .values(
        newIds.map((achievementId) => ({
          user_id: userId,
          achievement_id: achievementId,
        })),
      )
      .onConflictDoNothing();
  }
}

export async function awardUserAchievementsForAnalysis(
  userId: string,
  result: AnalysisResult,
) {
  await awardAchievementIds(
    userId,
    findCompletedAchievementIds([
      {
        savedOn: result.asOf,
        goalAmount: result.goalAmount,
        currentValue: result.currentValue,
        monthlyContribution: result.monthlyContribution,
        result,
      },
    ]),
  );
}

export async function syncUserAchievements(userId: string) {
  const snapshots = await db
    .select({
      savedOn: analysisSnapshots.saved_on,
      goalAmount: analysisSnapshots.goal_amount,
      currentValue: analysisSnapshots.current_value,
      monthlyContribution: analysisSnapshots.monthly_contribution,
      result: analysisSnapshots.result,
    })
    .from(analysisSnapshots)
    .where(eq(analysisSnapshots.user_id, userId))
    .orderBy(
      desc(analysisSnapshots.saved_on),
      desc(analysisSnapshots.updated_at),
    );

  const completedIds = findCompletedAchievementIds(snapshots);
  await awardAchievementIds(userId, completedIds);

  const earned = await db
    .select({
      achievementId: userAchievements.achievement_id,
      unlockedAt: userAchievements.unlocked_at,
    })
    .from(userAchievements)
    .where(eq(userAchievements.user_id, userId))
    .orderBy(userAchievements.unlocked_at);

  return earned
    .map((item) => {
      const definition = achievementById(item.achievementId);
      return definition
        ? { ...definition, unlockedAt: item.unlockedAt.toISOString() }
        : null;
    })
    .filter((item) => item !== null);
}
