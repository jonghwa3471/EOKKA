export interface StockSearchResult {
  stockId: number;
  name: string;
  nameEn: string | null;
  ticker: string;
  country: "KR";
  exchange: "KOSPI" | "KOSDAQ";
  currency: "KRW";
  securityType: "STOCK" | "ETF" | "ETN";
}
