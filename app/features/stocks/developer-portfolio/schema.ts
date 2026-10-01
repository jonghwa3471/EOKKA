import type { PublicDeveloperPortfolioSnapshot } from "./developer-portfolio.types";

import {
  bigint,
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// Public pages read this through a server loader. There are deliberately no
// client policies, so the browser can never write a developer snapshot directly.
export const developerPortfolioSnapshots = pgTable(
  "developer_portfolio_snapshots",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    as_of: date().notNull(),
    snapshot: jsonb().$type<PublicDeveloperPortfolioSnapshot>().notNull(),
    published_by: uuid().references(() => authUsers.id, {
      onDelete: "set null",
    }),
    published_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("developer_portfolio_snapshots_as_of_unique").on(table.as_of),
    index("developer_portfolio_snapshots_published_idx").on(table.published_at),
  ],
).enableRLS();
