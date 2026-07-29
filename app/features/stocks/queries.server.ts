import type { StockSearchResult } from "./types";

import { sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { getStockMarketMode } from "./market-mode.server";
import { stocks } from "./schema";

const SEARCH_RESULT_LIMIT = 8;

export async function searchStocks(query: string) {
  const normalizedQuery = query.trim().slice(0, 50);
  if (!normalizedQuery) return [];

  const searchTerm = normalizedQuery.toLocaleLowerCase("en-US");
  const marketMode = getStockMarketMode();

  const results = await db
    .select({
      stockId: stocks.stock_id,
      name: stocks.name,
      nameEn: stocks.name_en,
      ticker: stocks.ticker,
      country: stocks.country,
      exchange: stocks.exchange,
      currency: stocks.currency,
      securityType: stocks.security_type,
    })
    .from(stocks)
    .where(
      sql`
      ${stocks.is_active} = true
      and (${marketMode === "global-test"} or ${stocks.country} = 'KR')
      and (
        position(${searchTerm} in lower(${stocks.ticker})) > 0
        or position(${searchTerm} in lower(${stocks.name})) > 0
        or position(${searchTerm} in lower(coalesce(${stocks.name_en}, ''))) > 0
      )
    `,
    )
    .orderBy(
      sql`
        case
          when lower(${stocks.ticker}) = ${searchTerm} then 0
          when lower(${stocks.name}) = ${searchTerm} then 1
          when lower(coalesce(${stocks.name_en}, '')) = ${searchTerm} then 1
          when left(lower(${stocks.ticker}), length(${searchTerm})) = ${searchTerm} then 2
          when left(lower(${stocks.name}), length(${searchTerm})) = ${searchTerm} then 3
          when left(lower(coalesce(${stocks.name_en}, '')), length(${searchTerm})) = ${searchTerm} then 3
          else 4
        end
      `,
      stocks.name,
    )
    .limit(SEARCH_RESULT_LIMIT);

  return results as StockSearchResult[];
}
