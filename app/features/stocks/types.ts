export interface StockSearchResult {
  stockId: number;
  name: string;
  nameEn: string | null;
  ticker: string;
  country: "KR" | "US";
  exchange: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX";
  currency: "KRW" | "USD";
  securityType: "STOCK" | "ETF" | "ETN";
}
