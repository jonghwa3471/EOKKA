import type { StockSearchResult } from "~/features/stocks/types";

export type Holding = {
  id: number;
  symbol: string;
  averagePrice: string;
  currency: "KRW" | "USD";
  quantity: string;
  costKrw?: number;
  selectedStock: StockSearchResult | null;
};

export const HOLDINGS_STORAGE_KEY = "eokka:portfolio-draft:v1";

export const ANALYSIS_STORAGE_KEY = "eokka:portfolio-analysis:v7";

export const HOME_TAB_STORAGE_KEY = "eokka:home-tab:v1";

export const GOAL_PRESETS = [1, 10, 100];

export const MONTHLY_CONTRIBUTION_MAX = 1_000_000_000;

export const MONTHLY_CONTRIBUTION_PRESETS = [10_000, 50_000, 100_000];

export const ANALYSIS_ESTIMATED_MS = 35_000;

export const emptyHolding = (id: number): Holding => ({
  id,
  symbol: "",
  averagePrice: "",
  currency: "KRW",
  quantity: "",
  selectedStock: null,
});
