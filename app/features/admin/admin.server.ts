import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "react-router";

import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { notifications } from "~/features/notifications/schema";
import { profiles } from "~/features/users/schema";

import {
  adminMembers,
  siteAnnouncements,
  supportMessages,
  supportTickets,
} from "./schema";

export async function isAdmin(userId: string) {
  const [member] = await db
    .select({ id: adminMembers.user_id })
    .from(adminMembers)
    .where(eq(adminMembers.user_id, userId))
    .limit(1);
  return Boolean(member);
}
export async function requireUser(request: Request) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  return user;
}
export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (!(await isAdmin(user.id)))
    throw new Response("관리자만 이용할 수 있어요.", { status: 403 });
  return user;
}
export async function getThread(
  ticketId: string,
  userId: string,
  staff = false,
) {
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.id, ticketId),
        staff ? undefined : eq(supportTickets.user_id, userId),
      ),
    );
  if (!ticket) throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticket_id, ticket.id))
    .orderBy(asc(supportMessages.created_at));
  return { ticket, messages };
}
export async function addTicket(
  userId: string,
  input: { category: string; title: string; body: string },
) {
  return db.transaction(async (tx) => {
    // Serialize per-user submissions to enforce the daily limit across instances.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const recent = await tx
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.user_id, userId),
          sql`${supportTickets.created_at} > now() - interval '24 hours'`,
        ),
      )
      .limit(5);
    if (recent.length >= 5)
      throw new Error("문의는 24시간 동안 최대 5건까지 접수할 수 있어요.");
    const [ticket] = await tx
      .insert(supportTickets)
      .values({ user_id: userId, category: input.category, title: input.title })
      .returning();
    await tx
      .insert(supportMessages)
      .values({ ticket_id: ticket.id, author_id: userId, body: input.body });
    const admins = await tx.select().from(adminMembers);
    if (admins.length)
      await tx.insert(notifications).values(
        admins.map((a) => ({
          user_id: a.user_id,
          type: "support_received",
          title: "새 문의가 도착했어요",
          message: input.title,
          href: `/dashboard/admin?ticket=${ticket.id}`,
        })),
      );
    return ticket.id;
  });
}
export async function replyToTicket(
  userId: string,
  ticketId: string,
  body: string,
  staff: boolean,
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.id, ticketId),
          staff ? undefined : eq(supportTickets.user_id, userId),
        ),
      )
      .for("update");
    if (!ticket) throw new Response("문의를 찾을 수 없어요.", { status: 404 });
    if (ticket.status === "closed")
      throw new Error("종료된 문의예요. 새 문의를 남겨 주세요.");
    const recent = await tx
      .select({ id: supportMessages.id })
      .from(supportMessages)
      .where(
        and(
          eq(supportMessages.author_id, userId),
          sql`${supportMessages.created_at} > now() - interval '1 minute'`,
        ),
      )
      .limit(5);
    if (recent.length >= 5) throw new Error("잠시 후 다시 보내 주세요.");
    await tx.insert(supportMessages).values({
      ticket_id: ticketId,
      author_id: userId,
      is_staff: staff ? "yes" : "no",
      body,
    });
    await tx
      .update(supportTickets)
      .set({ status: staff ? "answered" : "open", updated_at: new Date() })
      .where(eq(supportTickets.id, ticketId));
    const recipients = staff
      ? [{ user_id: ticket.user_id }]
      : await tx.select().from(adminMembers);
    if (recipients.length)
      await tx.insert(notifications).values(
        recipients.map((r) => ({
          user_id: r.user_id,
          type: staff ? "support_reply" : "support_received",
          title: staff
            ? "문의에 답변이 도착했어요"
            : "문의에 새 메시지가 도착했어요",
          message: ticket.title,
          href: staff
            ? `/contact?ticket=${ticket.id}`
            : `/dashboard/admin?ticket=${ticket.id}`,
        })),
      );
  });
}
export async function publishAnnouncement(
  userId: string,
  input: { id: string; title: string; body: string },
) {
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(siteAnnouncements)
      .values({ ...input, author_id: userId })
      .onConflictDoNothing()
      .returning({ id: siteAnnouncements.id });
    if (!inserted.length) return; // A retried request must not notify everyone again.
    await tx.execute(sql`insert into notifications (user_id, type, title, message, href)
      select profile_id, 'site_announcement', ${input.title}, ${input.body}, '/dashboard/notifications' from profiles`);
  });
}
export async function getAdminOverview(search: string, page: number) {
  const [tickets, announcements, users, counts] = await Promise.all([
    db
      .select({
        id: supportTickets.id,
        title: supportTickets.title,
        status: supportTickets.status,
        category: supportTickets.category,
        updated_at: supportTickets.updated_at,
        name: profiles.name,
      })
      .from(supportTickets)
      .leftJoin(profiles, eq(profiles.profile_id, supportTickets.user_id))
      .orderBy(desc(supportTickets.updated_at))
      .limit(100),
    db
      .select()
      .from(siteAnnouncements)
      .orderBy(desc(siteAnnouncements.created_at))
      .limit(20),
    db.execute<{
      id: string;
      name: string;
      email: string;
      created_at: string;
      last_active_on: string;
      pro: boolean;
      admin: boolean;
    }>(sql`select p.profile_id as id, p.name, u.email, p.created_at, p.last_active_on,
      (p.pro_expires_at > now()) as pro, (a.user_id is not null) as admin
      from profiles p join auth.users u on u.id = p.profile_id left join admin_members a on a.user_id = p.profile_id
      where p.name ilike ${`%${search}%`} or u.email ilike ${`%${search}%`}
      order by p.created_at desc limit 21 offset ${page * 20}`),
    db.execute<{ users: number; open: number }>(
      sql`select (select count(*)::int from profiles) as users, (select count(*)::int from support_tickets where status = 'open') as open`,
    ),
  ]);
  return {
    tickets,
    announcements,
    users: Array.from(users).slice(0, 20),
    hasMore: users.length > 20,
    counts: counts[0],
  };
}
