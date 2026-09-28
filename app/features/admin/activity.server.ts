import { eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { profiles } from "~/features/users/schema";

import { adminActivityEvents } from "./schema";

export type AdminActivityType =
  | "account_created"
  | "login_completed"
  | "quick_analysis_completed"
  | "precise_analysis_completed"
  | "portfolio_transaction_added"
  | "portfolio_transaction_updated"
  | "portfolio_transaction_deleted"
  | "support_ticket_created"
  | "payment_completed"
  | "subscription_cancelled"
  | "account_deleted";

export async function recordAdminActivity({
  eventType,
  userId,
  targetType = "user",
  targetId,
  targetLabel,
}: {
  eventType: AdminActivityType;
  userId?: string | null;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
}) {
  try {
    let resolvedLabel = targetLabel?.trim() || null;
    if (!resolvedLabel && userId) {
      const [profile] = await db
        .select({ username: profiles.username })
        .from(profiles)
        .where(eq(profiles.profile_id, userId))
        .limit(1);
      if (profile?.username) resolvedLabel = `@${profile.username}`;
    }

    await db.insert(adminActivityEvents).values({
      event_type: eventType,
      actor_user_id: userId ?? null,
      target_type: targetType,
      target_id: targetId ?? userId ?? null,
      target_label: resolvedLabel ?? "확인할 수 없는 대상",
    });
  } catch (error) {
    // Activity history must never make the user's original operation fail.
    console.error("Failed to record admin activity", error);
  }
}
