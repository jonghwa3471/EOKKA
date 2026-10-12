import { desc, eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { profiles } from "~/features/users/schema";

import { analysisSnapshots } from "./schema";

export async function hasHistoryAccess(userId: string) {
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
