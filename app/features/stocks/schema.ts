import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";

import { makeIdentityColumn, timestamps } from "~/core/db/helpers.server";

/**
 * Searchable reference data for domestic and US-listed securities.
 *
 * The records are refreshed from Korea Investment & Securities master files.
 * Anyone may search this public reference data, while writes are performed only
 * by the server-side synchronization script through DATABASE_URL.
 */
export const stocks = pgTable(
  "stocks",
  {
    ...makeIdentityColumn("stock_id"),
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
