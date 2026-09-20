import { and, desc, eq, isNull, sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { profiles } from "~/features/users/schema";

import { notifications } from "./schema";

export type NotificationType =
  | "support_received"
  | "support_reply"
  | "support_closed"
  | "support_deleted"
  | "site_announcement"
  | "analysis_created"
  | "analysis_updated"
  | "analysis_deleted"
  | "analysis_all_deleted"
  | "payment_completed"
  | "subscription_renewal_upcoming";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
}) {
  await db.insert(notifications).values({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href ?? null,
  });
  const { sendNotificationEmail } = await import("./notification-email.server");
  await sendNotificationEmail(input);
}

export async function notifyUpcomingSubscriptionRenewals() {
  let notified = 0;
  for (const reminderDays of [7, 1] as const) {
    const upcoming = await db
      .select({
        userId: profiles.profile_id,
        renewsAt: profiles.pro_expires_at,
      })
      .from(profiles)
      .where(sql`${profiles.pro_expires_at} >= now() + (${reminderDays} * interval '1 day')
        and ${profiles.pro_expires_at} < now() + (${reminderDays + 1} * interval '1 day')`);

    for (const account of upcoming) {
      if (!account.renewsAt) continue;
      const date = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(account.renewsAt);
      const message = `${date}에 다음 구독 결제가 예정되어 있어요. 결제일 ${reminderDays}일 전 안내예요.`;
      const [existing] = await db
        .select({ id: notifications.notification_id })
        .from(notifications)
        .where(
          and(
            eq(notifications.user_id, account.userId),
            eq(notifications.type, "subscription_renewal_upcoming"),
            eq(notifications.message, message),
          ),
        )
        .limit(1);
      if (existing) continue;
      await createNotification({
        userId: account.userId,
        type: "subscription_renewal_upcoming",
        title:
          reminderDays === 1
            ? "EOKKA Pro 결제일이 내일이에요"
            : "EOKKA Pro 결제일이 다가오고 있어요",
        message,
        href: "/dashboard/pro",
      });
      notified += 1;
    }
  }
  return notified;
}

export async function getNotifications(userId: string) {
  return db
    .select({
      id: notifications.notification_id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      readAt: notifications.read_at,
      createdAt: notifications.created_at,
    })
    .from(notifications)
    .where(eq(notifications.user_id, userId))
    .orderBy(
      desc(notifications.created_at),
      desc(notifications.notification_id),
    )
    .limit(100);
}

export async function getUnreadNotificationCount(userId: string) {
  const rows = await db
    .select({ id: notifications.notification_id })
    .from(notifications)
    .where(
      and(eq(notifications.user_id, userId), isNull(notifications.read_at)),
    );
  return rows.length;
}

export async function markNotificationRead(userId: string, id: number) {
  await db
    .update(notifications)
    .set({ read_at: new Date(), updated_at: new Date() })
    .where(
      and(
        eq(notifications.user_id, userId),
        eq(notifications.notification_id, id),
      ),
    );
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read_at: new Date(), updated_at: new Date() })
    .where(
      and(eq(notifications.user_id, userId), isNull(notifications.read_at)),
    );
}

export async function deleteNotification(userId: string, id: number) {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.user_id, userId),
        eq(notifications.notification_id, id),
      ),
    );
}

export async function deleteAllNotifications(userId: string) {
  await db.delete(notifications).where(eq(notifications.user_id, userId));
}
