import { and, eq, gt, isNull } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { createNotification } from "~/features/notifications/notifications.server";
import { notifications } from "~/features/notifications/schema";

import { profiles } from "./schema";

export async function revealDeveloperPortfolioGift(userId: string) {
  const now = new Date();
  const [updated] = await db
    .update(profiles)
    .set({
      developer_portfolio_gift_revealed_at: now,
      updated_at: now,
    })
    .where(
      and(
        eq(profiles.profile_id, userId),
        gt(profiles.pro_expires_at, now),
        isNull(profiles.developer_portfolio_gift_revealed_at),
      ),
    )
    .returning({ id: profiles.profile_id });

  if (updated) return { revealed: true, newlyRevealed: true };

  const [profile] = await db
    .select({
      proExpiresAt: profiles.pro_expires_at,
      revealedAt: profiles.developer_portfolio_gift_revealed_at,
    })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);
  if (!profile?.proExpiresAt || profile.proExpiresAt <= now)
    throw new Error("EOKKA Pro 이용자만 선물을 열 수 있어요.");
  return { revealed: Boolean(profile.revealedAt), newlyRevealed: false };
}

export async function createDeveloperPortfolioGiftNotification(userId: string) {
  const [existing] = await db
    .select({ id: notifications.notification_id })
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, userId),
        eq(notifications.type, "pro_gift_unlocked"),
      ),
    )
    .limit(1);
  if (existing) return false;
  await createNotification({
    userId,
    type: "pro_gift_unlocked",
    title: "선물이 도착했습니다!",
    message:
      "EOKKA Pro를 시작해 주셔서 감사해요. 개발자의 실제 주식 포트폴리오와 투자 이야기를 감사 선물로 준비했어요.",
    href: "/dashboard/pro?gift=1",
  });
  return true;
}

export async function activateProMembership(userId: string) {
  const now = new Date();
  const [profile] = await db
    .select({ proExpiresAt: profiles.pro_expires_at })
    .from(profiles)
    .where(eq(profiles.profile_id, userId))
    .limit(1);
  const startsAt =
    profile?.proExpiresAt && profile.proExpiresAt > now
      ? profile.proExpiresAt
      : now;
  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  await db
    .update(profiles)
    .set({ pro_expires_at: expiresAt, updated_at: now })
    .where(eq(profiles.profile_id, userId));
  return expiresAt;
}
