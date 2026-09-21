import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "react-router";

import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { sendNotificationEmail } from "~/features/notifications/notification-email.server";
import { createNotification } from "~/features/notifications/notifications.server";
import { notifications } from "~/features/notifications/schema";
import { profiles } from "~/features/users/schema";

import {
  adminMembers,
  siteAnnouncementRecipients,
  siteAnnouncements,
  supportMessages,
  supportTickets,
} from "./schema";
import {
  canDeleteSupportMessage,
  canDeleteSupportTicket,
} from "./support-permissions";

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
    .select({
      id: supportTickets.id,
      title: supportTickets.title,
      status: supportTickets.status,
      category: supportTickets.category,
      created_at: supportTickets.created_at,
      authorName: profiles.name,
      authorAvatarUrl: profiles.avatar_url,
    })
    .from(supportTickets)
    .leftJoin(profiles, eq(profiles.profile_id, supportTickets.user_id))
    .where(
      and(
        eq(supportTickets.id, ticketId),
        staff ? undefined : eq(supportTickets.user_id, userId),
      ),
    );
  if (!ticket) throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  const messages = await db
    .select({
      id: supportMessages.id,
      is_staff: supportMessages.is_staff,
      body: supportMessages.body,
      created_at: supportMessages.created_at,
    })
    .from(supportMessages)
    .where(eq(supportMessages.ticket_id, ticket.id))
    .orderBy(asc(supportMessages.created_at), asc(supportMessages.id));
  return { ticket, messages };
}

function maskDisplayName(name: string | null) {
  const value = name?.trim() || "사용자";
  if (value.length === 1) return `${value}*`;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}${"*".repeat(Math.min(value.length - 2, 3))}${value.at(-1)}`;
}

const SUPPORT_PAGE_SIZE = 15;

export async function getPublicSupportBoard(
  viewerId?: string,
  requestedPage = 1,
  focusTicketId?: string | null,
) {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(supportTickets);
  const totalPages = Math.max(1, Math.ceil(Number(total) / SUPPORT_PAGE_SIZE));
  let page = Math.min(Math.max(1, requestedPage), totalPages);

  if (focusTicketId) {
    const [focused] = await db
      .select({ created_at: supportTickets.created_at })
      .from(supportTickets)
      .where(eq(supportTickets.id, focusTicketId))
      .limit(1);
    if (!focused) throw new Response("문의를 찾을 수 없어요.", { status: 404 });
    const [position] = await db.execute<{ newer: number }>(sql`
      select count(*)::int as newer
      from support_tickets newer
      cross join support_tickets focused
      where focused.id = ${focusTicketId}::uuid
        and (
          newer.created_at > focused.created_at
          or (
            newer.created_at = focused.created_at
            and newer.id::text > focused.id::text
          )
        )
    `);
    page = Math.floor(Number(position.newer) / SUPPORT_PAGE_SIZE) + 1;
  }

  const rows = await db
    .select({
      id: supportTickets.id,
      title: supportTickets.title,
      status: supportTickets.status,
      category: supportTickets.category,
      created_at: supportTickets.created_at,
      ownerId: supportTickets.user_id,
      authorName: profiles.name,
      authorAvatarUrl: profiles.avatar_url,
    })
    .from(supportTickets)
    .leftJoin(profiles, eq(profiles.profile_id, supportTickets.user_id))
    .orderBy(desc(supportTickets.created_at), desc(supportTickets.id))
    .limit(SUPPORT_PAGE_SIZE)
    .offset((page - 1) * SUPPORT_PAGE_SIZE);
  const ticketIds = rows.map((ticket) => ticket.id);
  const messages = ticketIds.length
    ? await db
        .select({
          id: supportMessages.id,
          ticket_id: supportMessages.ticket_id,
          author_id: supportMessages.author_id,
          is_staff: supportMessages.is_staff,
          body: supportMessages.body,
          created_at: supportMessages.created_at,
        })
        .from(supportMessages)
        .where(inArray(supportMessages.ticket_id, ticketIds))
        .orderBy(asc(supportMessages.created_at), asc(supportMessages.id))
    : [];
  return {
    tickets: rows.map(({ ownerId, ...ticket }) => ({
      ...ticket,
      isOwner: Boolean(viewerId && ownerId === viewerId),
      authorName: maskDisplayName(ticket.authorName),
      messages: messages
        .filter((message) => message.ticket_id === ticket.id)
        .map(({ ticket_id: _ticketId, author_id, ...message }, index) => ({
          ...message,
          canDelete: Boolean(
            viewerId &&
              canDeleteSupportMessage({
                userId: viewerId,
                authorId: author_id,
                staff: false,
                isInitial: index === 0,
              }),
          ),
        })),
    })),
    page,
    total: Number(total),
    totalPages,
  };
}
export async function addTicket(
  userId: string,
  input: { category: string; title: string; body: string },
) {
  const ticketId = await db.transaction(async (tx) => {
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
  return ticketId;
}
export async function replyToTicket(
  userId: string,
  ticketId: string,
  body: string,
  staff: boolean,
) {
  const result = await db.transaction(async (tx) => {
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
    return {
      title: ticket.title,
      recipientIds: recipients.map((recipient) => recipient.user_id),
    };
  });
  if (staff)
    await Promise.allSettled(
      result.recipientIds.map((recipientId) =>
        sendNotificationEmail({
          userId: recipientId,
          type: "support_reply",
          title: "문의에 답변이 도착했어요",
          message: result.title,
          href: `/contact?ticket=${ticketId}`,
        }),
      ),
    );
}

export async function setSupportTicketStatus(
  ticketId: string,
  status: "open" | "closed",
) {
  const [ticket] = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.user_id,
      title: supportTickets.title,
      status: supportTickets.status,
    })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!ticket) throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  if (ticket.status === status) return;

  await db
    .update(supportTickets)
    .set({ status, updated_at: new Date() })
    .where(eq(supportTickets.id, ticketId));

  if (status === "closed")
    await createNotification({
      userId: ticket.userId,
      type: "support_closed",
      title: "문의가 종료됐어요",
      message: ticket.title,
      href: `/contact?ticket=${ticket.id}`,
    });
}
export async function deleteSupportTicket(
  userId: string,
  ticketId: string,
  staff: boolean,
) {
  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .for("update");
    if (!ticket || !canDeleteSupportTicket(userId, ticket.user_id, staff))
      throw new Response("문의를 찾을 수 없어요.", { status: 404 });

    await tx.delete(supportTickets).where(eq(supportTickets.id, ticketId));
    const recipients = staff
      ? ticket.user_id === userId
        ? []
        : [{ user_id: ticket.user_id }]
      : await tx.select().from(adminMembers);
    if (recipients.length)
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          user_id: recipient.user_id,
          type: "support_deleted",
          title: staff
            ? "문의글이 EOKKA 운영자에 의해 삭제됐어요"
            : "문의글이 작성자에 의해 삭제됐어요",
          message: ticket.title,
          href: staff ? "/contact" : "/dashboard/admin?tab=inbox",
        })),
      );
  });
}
export async function deleteSupportMessage(
  userId: string,
  ticketId: string,
  messageId: string,
  staff: boolean,
) {
  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .for("update");
    if (!ticket) throw new Response("문의를 찾을 수 없어요.", { status: 404 });

    const messages = await tx
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticket_id, ticketId))
      .orderBy(asc(supportMessages.created_at), asc(supportMessages.id));
    const index = messages.findIndex((message) => message.id === messageId);
    const message = messages[index];
    if (
      !message ||
      !canDeleteSupportMessage({
        userId,
        authorId: message.author_id,
        staff,
        isInitial: index === 0,
      })
    )
      throw new Response("댓글을 찾을 수 없어요.", { status: 404 });

    await tx.delete(supportMessages).where(eq(supportMessages.id, messageId));
    const remaining = messages.filter((item) => item.id !== messageId);
    const lastMessage = remaining.at(-1);
    await tx
      .update(supportTickets)
      .set({
        status:
          ticket.status === "closed"
            ? "closed"
            : lastMessage?.is_staff === "yes"
              ? "answered"
              : "open",
        updated_at: new Date(),
      })
      .where(eq(supportTickets.id, ticketId));

    const recipients = staff
      ? ticket.user_id === userId
        ? []
        : [{ user_id: ticket.user_id }]
      : await tx.select().from(adminMembers);
    if (recipients.length)
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          user_id: recipient.user_id,
          type: "support_deleted",
          title: staff
            ? "문의 댓글이 EOKKA 운영자에 의해 삭제됐어요"
            : "문의 댓글이 작성자에 의해 삭제됐어요",
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
  input: {
    id: string;
    title: string;
    body: string;
    audience: "all" | "user";
    kind: "general" | "update" | "maintenance" | "event";
    recipientIds: string[];
  },
) {
  const targetUserIds =
    input.audience === "user" ? [...new Set(input.recipientIds)] : [];
  if (input.audience === "user") {
    const recipients = await db
      .select({ id: profiles.profile_id })
      .from(profiles)
      .where(inArray(profiles.profile_id, targetUserIds));
    if (recipients.length !== targetUserIds.length)
      throw new Error("공지받을 사용자 중 일부를 찾을 수 없어요.");
  }
  const published = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(siteAnnouncements)
      .values({
        id: input.id,
        author_id: userId,
        recipient_user_id: targetUserIds.length === 1 ? targetUserIds[0] : null,
        kind: input.kind,
        title: input.title,
        body: input.body,
      })
      .onConflictDoNothing()
      .returning({ id: siteAnnouncements.id });
    if (!inserted.length) return false; // A retried request must not notify everyone again.
    if (targetUserIds.length) {
      await tx.insert(siteAnnouncementRecipients).values(
        targetUserIds.map((targetUserId) => ({
          announcement_id: input.id,
          user_id: targetUserId,
        })),
      );
      await tx.insert(notifications).values(
        targetUserIds.map((targetUserId) => ({
          user_id: targetUserId,
          type: "site_announcement",
          title: input.title,
          message: input.body,
          href: "/dashboard/notifications",
        })),
      );
    } else
      await tx.execute(sql`insert into notifications (user_id, type, title, message, href)
        select profile_id, 'site_announcement', ${input.title}, ${input.body}, '/dashboard/notifications' from profiles`);
    return true;
  });
  if (!published) return;
  const recipients = await db
    .select({ userId: profiles.profile_id })
    .from(profiles)
    .where(
      targetUserIds.length
        ? inArray(profiles.profile_id, targetUserIds)
        : undefined,
    );
  for (let index = 0; index < recipients.length; index += 10) {
    await Promise.allSettled(
      recipients.slice(index, index + 10).map(({ userId }) =>
        sendNotificationEmail({
          userId,
          type: "site_announcement",
          title: input.title,
          message: input.body,
          href: "/dashboard/notifications",
        }),
      ),
    );
  }
}

export async function getAdminAnnouncementPage(offset: number, limit = 20) {
  const rows = Array.from(
    await db.execute<{
      id: string;
      author_id: string | null;
      recipient_user_id: string | null;
      kind: string;
      title: string;
      body: string;
      created_at: string;
    }>(sql`select id, author_id, recipient_user_id, kind, title, body, created_at
      from site_announcements order by created_at desc
      limit ${limit + 1} offset ${offset}`),
  );
  const page = rows.slice(0, limit);
  const recipientRows = page.length
    ? await db
        .select({
          announcementId: siteAnnouncementRecipients.announcement_id,
          userId: siteAnnouncementRecipients.user_id,
        })
        .from(siteAnnouncementRecipients)
        .where(
          inArray(
            siteAnnouncementRecipients.announcement_id,
            page.map((announcement) => announcement.id),
          ),
        )
    : [];
  const recipientIdsByAnnouncement = new Map<string, string[]>();
  for (const row of recipientRows) {
    const recipients = recipientIdsByAnnouncement.get(row.announcementId) ?? [];
    recipients.push(row.userId);
    recipientIdsByAnnouncement.set(row.announcementId, recipients);
  }
  return {
    announcements: page.map((announcement) => ({
      ...announcement,
      recipient_user_ids:
        recipientIdsByAnnouncement.get(announcement.id) ??
        (announcement.recipient_user_id
          ? [announcement.recipient_user_id]
          : []),
    })),
    hasMore: rows.length > limit,
  };
}

export async function getAdminOverview(
  search: string,
  page: number,
  status: "all" | "open" | "answered" | "closed" = "all",
) {
  const [tickets, announcementPage, users, counts, announcementRecipients] =
    await Promise.all([
      db.execute<{
        id: string;
        title: string;
        status: string;
        category: string;
        created_at: string;
        updated_at: string;
        user_id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        joined_at: string;
        last_active_on: string;
        pro: boolean;
        admin: boolean;
        ticket_count: number;
        messages: Array<{
          id: string;
          author_id: string | null;
          is_staff: string;
          body: string;
          created_at: string;
        }>;
      }>(sql`select st.id, st.title, st.status, st.category, st.created_at, st.updated_at,
      st.user_id, p.name, u.email, p.avatar_url, p.created_at as joined_at, p.last_active_on,
      (p.pro_expires_at > now()) as pro, (a.user_id is not null) as admin,
      (select count(*)::int from support_tickets own where own.user_id = st.user_id) as ticket_count,
      coalesce((select json_agg(json_build_object(
        'id', sm.id, 'author_id', sm.author_id, 'is_staff', sm.is_staff, 'body', sm.body, 'created_at', sm.created_at
      ) order by sm.created_at, sm.id) from support_messages sm where sm.ticket_id = st.id), '[]'::json) as messages
      from support_tickets st
      join profiles p on p.profile_id = st.user_id
      join auth.users u on u.id = st.user_id
      left join admin_members a on a.user_id = st.user_id
      ${status === "all" ? sql`` : sql`where st.status = ${status}`}
      order by st.created_at desc limit 100`),
      getAdminAnnouncementPage(0),
      db.execute<{
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        created_at: string;
        last_active_on: string;
        pro: boolean;
        admin: boolean;
        ticket_count: number;
      }>(sql`select p.profile_id as id, p.name, u.email, p.avatar_url, p.created_at, p.last_active_on,
      (p.pro_expires_at > now()) as pro, (a.user_id is not null) as admin,
      (select count(*)::int from support_tickets own where own.user_id = p.profile_id) as ticket_count
      from profiles p join auth.users u on u.id = p.profile_id left join admin_members a on a.user_id = p.profile_id
      where p.name ilike ${`%${search}%`} or u.email ilike ${`%${search}%`}
      order by p.created_at desc limit 21 offset ${page * 20}`),
      db.execute<{
        users: number;
        open: number;
        answered: number;
        closed: number;
      }>(
        sql`select
          (select count(*)::int from profiles) as users,
          (select count(*)::int from support_tickets where status = 'open') as open,
          (select count(*)::int from support_tickets where status = 'answered') as answered,
          (select count(*)::int from support_tickets where status = 'closed') as closed`,
      ),
      db.execute<{
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
      }>(sql`select p.profile_id as id, p.name, u.email, p.avatar_url
      from profiles p join auth.users u on u.id = p.profile_id
      order by p.name, u.email limit 500`),
    ]);
  return {
    tickets: Array.from(tickets),
    announcements: announcementPage.announcements,
    hasMoreAnnouncements: announcementPage.hasMore,
    users: Array.from(users).slice(0, 20),
    hasMore: users.length > 20,
    counts: counts[0],
    announcementRecipients: Array.from(announcementRecipients),
  };
}
