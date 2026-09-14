import { eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { notifications } from "~/features/notifications/schema";
import { analysisSnapshots } from "~/features/stocks/history/schema";
import {
  managedPortfolios,
  portfolioTransactions,
} from "~/features/stocks/portfolio/schema";

import { profiles } from "./schema";

export async function resetUserInvestmentData(userId: string) {
  await db.transaction(async (transaction) => {
    await transaction
      .delete(portfolioTransactions)
      .where(eq(portfolioTransactions.user_id, userId));
    await transaction
      .delete(analysisSnapshots)
      .where(eq(analysisSnapshots.user_id, userId));
    await transaction
      .delete(managedPortfolios)
      .where(eq(managedPortfolios.user_id, userId));
    await transaction
      .delete(notifications)
      .where(eq(notifications.user_id, userId));
    await transaction
      .update(profiles)
      .set({
        preferred_goal_amount: null,
        automatic_analysis_goal_amount: null,
        automatic_analysis_monthly_contribution: null,
        updated_at: new Date(),
      })
      .where(eq(profiles.profile_id, userId));
  });
}
