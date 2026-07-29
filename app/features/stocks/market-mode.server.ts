export type StockMarketMode = "domestic" | "global-test";

export function getStockMarketMode(): StockMarketMode {
  const mode = process.env.STOCK_MARKET_MODE ?? "domestic";
  if (mode !== "domestic" && mode !== "global-test")
    throw new Error(
      "STOCK_MARKET_MODE는 domestic 또는 global-test여야 합니다.",
    );
  if (mode === "global-test" && process.env.NODE_ENV === "production")
    throw new Error("global-test 모드는 로컬 개발 환경에서만 사용할 수 있습니다.");
  return mode;
}
