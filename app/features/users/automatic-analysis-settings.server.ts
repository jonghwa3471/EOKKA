import { eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { profiles } from "./schema";

export async function getAutomaticAnalysisSettings(userId: string) {
  const [profile] = await db
    .select({
      goalAmount: profiles.automatic_analysis_goal_amount,
      monthlyContribution: profiles.automatic_analysis_monthly_contribution,
      preferredGoalAmount: profiles.preferred_goal_amount,
      proExpiresAt: profiles.pro_expires_at,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);

  const settings = profile ?? {
    goalAmount: null,
    monthlyContribution: null,
    preferredGoalAmount: null,
    proExpiresAt: null,
  };
  return {
    ...settings,
    isPro:
      settings.proExpiresAt !== null &&
      settings.proExpiresAt.getTime() > Date.now(),
  };
}

export async function setAutomaticAnalysisSettings({
  userId,
  goalAmount,
  monthlyContribution,
}: {
  userId: string;
  goalAmount: number;
  monthlyContribution: number;
}) {
  await db
    .update(profiles)
    .set({
      automatic_analysis_goal_amount: goalAmount,
      automatic_analysis_monthly_contribution: monthlyContribution,
      updated_at: new Date(),
    })
    .where(eq(profiles.profile_id, userId));
}
