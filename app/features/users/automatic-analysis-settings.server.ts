import { eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { profiles } from "./schema";

export async function getAutomaticAnalysisSettings(userId: string) {
  const [profile] = await db
    .select({
      proExpiresAt: profiles.pro_expires_at,
      betaProStartedAt: profiles.beta_pro_started_at,
      developerPortfolioGiftRevealedAt:
        profiles.developer_portfolio_gift_revealed_at,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);

  const settings = profile ?? {
    proExpiresAt: null,
    betaProStartedAt: null,
    developerPortfolioGiftRevealedAt: null,
  };
  const isPaidPro =
    settings.proExpiresAt !== null &&
    settings.proExpiresAt.getTime() > Date.now();
  const isBetaPro = settings.betaProStartedAt !== null;
  return {
    ...settings,
    isPaidPro,
    isBetaPro,
    isPro: isPaidPro || isBetaPro,
  };
}
