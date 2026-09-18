import { and, desc, eq, isNull } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { notifications } from "./schema";

export type NotificationType =
  | "support_received"
  | "support_reply"
  | "support_deleted"
  | "site_announcement"
  | "analysis_created"
  | "analysis_updated"
  | "analysis_deleted"
  | "analysis_all_deleted";

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
