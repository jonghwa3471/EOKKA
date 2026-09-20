import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// No client policies: all access goes through authorized server loaders/actions.
export const adminMembers = pgTable("admin_members", {
  user_id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid().primaryKey().defaultRandom(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    category: text().notNull(),
    title: text().notNull(),
    status: text().notNull().default("open"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_tickets_user_idx").on(t.user_id, t.created_at)],
).enableRLS();

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    ticket_id: uuid()
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    author_id: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    is_staff: text().notNull().default("no"),
    body: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticket_id, t.created_at)],
).enableRLS();

export const siteAnnouncements = pgTable("site_announcements", {
  id: uuid().primaryKey(), // client-generated retry key, validated on the server
  author_id: uuid().references(() => authUsers.id, { onDelete: "set null" }),
  recipient_user_id: uuid().references(() => authUsers.id, {
    onDelete: "set null",
  }),
  title: text().notNull(),
  body: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const siteAnnouncementRecipients = pgTable(
  "site_announcement_recipients",
  {
    announcement_id: uuid()
      .notNull()
      .references(() => siteAnnouncements.id, { onDelete: "cascade" }),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.announcement_id, table.user_id] }),
    index("site_announcement_recipients_user_idx").on(table.user_id),
  ],
).enableRLS();
