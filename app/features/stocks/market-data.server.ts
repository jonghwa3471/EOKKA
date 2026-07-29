import type { InferSelectModel } from "drizzle-orm";

import { getDomesticMarketData } from "./fsc-client.server";
import {
  getKisDomesticMarketData,
  getKisUsMarketData,
} from "./kis-client.server";
import { getStockMarketMode } from "./market-mode.server";
import { stocks } from "./schema";

type Stock = InferSelectModel<typeof stocks>;

export async function getMarketData(stock: Stock) {
  const mode = getStockMarketMode();
  if (mode === "domestic") {
    if (stock.country !== "KR")
      throw new Error("현재 서비스에서는 국내 종목만 분석할 수 있습니다.");
    return {
      ...(await getDomesticMarketData(
        stock.stock_id,
        stock.ticker,
        stock.security_type as "STOCK" | "ETF" | "ETN",
      )),
      exchangeRate: 1,
    };
  }

  return stock.country === "KR"
    ? getKisDomesticMarketData(stock.ticker)
    : getKisUsMarketData(
        stock.ticker,
        stock.exchange as "NASDAQ" | "NYSE" | "AMEX",
      );
}
