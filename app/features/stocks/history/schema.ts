import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
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
    update_source: text().notNull().default("manual"),
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

/**
 * Lightweight, long-lived portfolio history used by charts and period insights.
 * The full AI report remains in analysis_snapshots and can be pruned separately.
 */
export const analysisHistoryPoints = pgTable(
  "analysis_history_points",
  {
    analysis_history_point_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    saved_on: date().notNull(),
    period_kind: text().notNull().default("daily"),
    goal_amount: bigint({ mode: "number" }).notNull(),
    current_value: bigint({ mode: "number" }).notNull(),
    total_cost: bigint({ mode: "number" }).notNull(),
    profit: bigint({ mode: "number" }).notNull(),
    return_rate: doublePrecision().notNull(),
    goal_month: integer(),
    monthly_contribution: bigint({ mode: "number" }).notNull().default(0),
    analysis_mode: text().notNull().default("quick"),
    managed_portfolio_id: bigint({ mode: "number" }).references(
      () => managedPortfolios.managed_portfolio_id,
      { onDelete: "set null" },
    ),
    metrics: jsonb().$type<AnalysisResult>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("analysis_history_points_user_goal_date_unique").on(
      table.user_id,
      table.goal_amount,
      table.saved_on,
      table.analysis_mode,
    ),
    pgPolicy("select-own-analysis-history-points", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("insert-own-analysis-history-points", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("update-own-analysis-history-points", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
    pgPolicy("delete-own-analysis-history-points", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();

export const analysisRateLimits = pgTable(
  "analysis_rate_limits",
  {
    identifier_hash: text().notNull(),
    window_on: date().notNull(),
    count: integer().notNull().default(1),
    created_at: timestamps.created_at,
    updated_at: timestamps.updated_at,
  },
  (table) => [
    primaryKey({ columns: [table.identifier_hash, table.window_on] }),
  ],
).enableRLS();
