import { eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { profiles } from "./schema";

export async function getAutomaticAnalysisSettings(userId: string) {
  const [profile] = await db
    .select({
      proExpiresAt: profiles.pro_expires_at,
      developerPortfolioGiftRevealedAt:
        profiles.developer_portfolio_gift_revealed_at,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);

  const settings = profile ?? {
    proExpiresAt: null,
    developerPortfolioGiftRevealedAt: null,
  };
  return {
    ...settings,
    isPro:
      settings.proExpiresAt !== null &&
      settings.proExpiresAt.getTime() > Date.now(),
  };
}
