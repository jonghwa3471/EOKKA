import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "~/core/db/helpers.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { managedPortfolios } from "~/features/stocks/portfolio/schema";

export const analysisSnapshots = pgTable(
  "analysis_snapshots",
  {
    analysis_snapshot_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    saved_on: date().notNull(),
    goal_amount: bigint({ mode: "number" }).notNull(),
    current_value: bigint({ mode: "number" }).notNull(),
    profit: bigint({ mode: "number" }).notNull(),
    return_rate: doublePrecision().notNull(),
    goal_month: integer(),
    monthly_contribution: bigint({ mode: "number" }).notNull().default(0),
    analysis_mode: text().notNull().default("quick"),
    managed_portfolio_id: bigint({ mode: "number" }).references(
      () => managedPortfolios.managed_portfolio_id,
      { onDelete: "set null" },
    ),
    result: jsonb().$type<AnalysisResult>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("analysis_snapshots_user_goal_date_unique").on(
      table.user_id,
      table.goal_amount,
      table.saved_on,
      table.analysis_mode,
    ),
    pgPolicy("select-own-analysis-snapshots", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("insert-own-analysis-snapshots", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("update-own-analysis-snapshots", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("delete-own-analysis-snapshots", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();
