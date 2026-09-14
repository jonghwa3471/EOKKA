import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "~/core/db/helpers.server";

export const notifications = pgTable(
  "notifications",
  {
    notification_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    message: text().notNull(),
    href: text(),
    read_at: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("notifications_user_created_idx").on(table.user_id, table.created_at),
    index("notifications_user_read_idx").on(table.user_id, table.read_at),
    pgPolicy("select-own-notifications", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("update-own-notifications", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("delete-own-notifications", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();
