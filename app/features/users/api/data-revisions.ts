import type { Route } from "./+types/data-revisions";

import { count, eq, max } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { notifications } from "~/features/notifications/schema";
import { analysisSnapshots } from "~/features/stocks/history/schema";
import {
  managedPortfolios,
  portfolioTransactions,
} from "~/features/stocks/portfolio/schema";

import { profiles, userAchievements } from "../schema";

function revision(updatedAt: Date | null, total: number) {
  return `${updatedAt?.toISOString() ?? "none"}:${total}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const [analysis, notification, portfolio, transaction, achievement, profile] =
    await Promise.all([
      db
        .select({
          updatedAt: max(analysisSnapshots.updated_at),
          total: count(),
        })
        .from(analysisSnapshots)
        .where(eq(analysisSnapshots.user_id, user.id)),
      db
        .select({ updatedAt: max(notifications.updated_at), total: count() })
        .from(notifications)
        .where(eq(notifications.user_id, user.id)),
      db
        .select({
          updatedAt: max(managedPortfolios.updated_at),
          total: count(),
        })
        .from(managedPortfolios)
        .where(eq(managedPortfolios.user_id, user.id)),
      db
        .select({
          updatedAt: max(portfolioTransactions.updated_at),
          total: count(),
        })
        .from(portfolioTransactions)
        .where(eq(portfolioTransactions.user_id, user.id)),
      db
        .select({
          updatedAt: max(userAchievements.unlocked_at),
          total: count(),
        })
        .from(userAchievements)
        .where(eq(userAchievements.user_id, user.id)),
      db
        .select({ updatedAt: profiles.updated_at })
        .from(profiles)
        .where(eq(profiles.profile_id, user.id))
        .limit(1),
    ]);

  return Response.json(
    {
      analysis: revision(
        analysis[0]?.updatedAt ?? null,
        analysis[0]?.total ?? 0,
      ),
      notifications: revision(
        notification[0]?.updatedAt ?? null,
        notification[0]?.total ?? 0,
      ),
      portfolio: `${revision(portfolio[0]?.updatedAt ?? null, portfolio[0]?.total ?? 0)}:${revision(transaction[0]?.updatedAt ?? null, transaction[0]?.total ?? 0)}`,
      achievements: revision(
        achievement[0]?.updatedAt ?? null,
        achievement[0]?.total ?? 0,
      ),
      profile: profile[0]?.updatedAt?.toISOString() ?? "none",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
