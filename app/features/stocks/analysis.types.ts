export interface AnalysisResult {
  asOf: string;
  marketMode: "domestic" | "global-test";
  goalAmount: number;
  totalCost: number;
  currentValue: number;
  profit: number;
  returnRate: number;
  priceBasis: "raw_close" | "adjusted_close";
  exchangeRate: number | null;
  holdings: Array<{
    name: string;
    ticker: string;
    currentPrice: number;
    currency: "KRW" | "USD";
    costKrw: number;
    valueKrw: number;
    profitKrw: number;
    returnRate: number;
  }>;
  cagr: {
    oneYear: number | null;
    threeYear: number | null;
    fiveYear: number | null;
    available: number | null;
  };
  scenarios: Array<{
    key: "conservative" | "base" | "optimistic";
    label: string;
    percentile: number;
    goalMonth: number | null;
    valueAt10Years: number;
    valueAt30Years: number;
    valueAt50Years: number;
  }>;
  chart: Array<{
    month: number;
    conservative: number;
    base: number;
    optimistic: number;
    market: number | null;
  }>;
  benchmark: {
    label: string;
    components: string[];
    goalMonth: number | null;
    valueAt10Years: number;
    cagr: number | null;
  } | null;
  probability: { tenYears: number; twentyYears: number; thirtyYears: number };
  riskWarnings: string[];
  summary: string[];
}
