import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  doublePrecision,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "~/core/db/helpers.server";
import { stocks } from "~/features/stocks/schema";

export const managedPortfolios = pgTable(
  "managed_portfolios",
  {
    managed_portfolio_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text().notNull().default("내 포트폴리오"),
    status: text().notNull().default("draft"),
    transitioned_at: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("managed_portfolios_user_unique").on(table.user_id),
    pgPolicy("manage-own-managed-portfolio", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();

export const portfolioTransactions = pgTable(
  "portfolio_transactions",
  {
    portfolio_transaction_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    managed_portfolio_id: bigint({ mode: "number" })
      .notNull()
      .references(() => managedPortfolios.managed_portfolio_id, {
        onDelete: "cascade",
      }),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    stock_id: bigint({ mode: "number" })
      .notNull()
      .references(() => stocks.stock_id, { onDelete: "restrict" }),
    transaction_type: text().notNull(),
    traded_on: date().notNull(),
    quantity: doublePrecision().notNull(),
    unit_price: doublePrecision().notNull(),
    currency: text().notNull(),
    exchange_rate: doublePrecision().notNull().default(1),
    // 기존 데이터 호환을 위해 컬럼은 유지하지만 새 매매일지와 계산에서는 사용하지 않습니다.
    fee_krw: bigint({ mode: "number" }).notNull().default(0),
    tax_krw: bigint({ mode: "number" }).notNull().default(0),
    memo: text(),
    ...timestamps,
  },
  (table) => [
    index("portfolio_transactions_portfolio_date_idx").on(
      table.managed_portfolio_id,
      table.traded_on,
    ),
    pgPolicy("manage-own-portfolio-transactions", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
      withCheck: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();
