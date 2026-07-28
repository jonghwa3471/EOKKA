import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "~/core/db/helpers.server";

/**
 * Searchable reference data for Korean-listed securities.
 *
 * The records are refreshed from the Financial Services Commission public API.
 * Anyone may search this public reference data, while writes are performed only
 * by the server-side synchronization script through DATABASE_URL.
 */
export const stocks = pgTable(
  "stocks",
  {
    stock_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    name: text().notNull(),
    name_en: text(),
    ticker: text().notNull(),
    country: text().notNull(),
    exchange: text().notNull(),
    currency: text().notNull(),
    security_type: text().notNull(),
    is_active: boolean().notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stocks_exchange_ticker_unique").on(
      table.exchange,
      table.ticker,
    ),
    index("stocks_name_idx").on(table.name),
    index("stocks_name_en_idx").on(table.name_en),
    index("stocks_ticker_idx").on(table.ticker),
    pgPolicy("public-read-stocks-policy", {
      for: "select",
      to: [anonRole, authenticatedRole],
      as: "permissive",
      using: sql`true`,
    }),
  ],
);

/**
 * Daily closing prices cached from the Financial Services Commission public API.
 * This table is server-only: no public RLS policy is intentionally defined.
 */
export const stockPrices = pgTable(
  "stock_prices",
  {
    stock_price_id: bigint({ mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    stock_id: bigint({ mode: "number" })
      .notNull()
      .references(() => stocks.stock_id, { onDelete: "cascade" }),
    trading_date: date().notNull(),
    open: bigint({ mode: "number" }),
    high: bigint({ mode: "number" }),
    low: bigint({ mode: "number" }),
    close: bigint({ mode: "number" }).notNull(),
    volume: bigint({ mode: "number" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stock_prices_stock_date_unique").on(
      table.stock_id,
      table.trading_date,
    ),
    index("stock_prices_stock_date_idx").on(table.stock_id, table.trading_date),
  ],
).enableRLS();
