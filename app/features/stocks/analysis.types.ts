export interface AnalysisResult {
  asOf: string;
  goalAmount: number;
  totalCost: number;
  currentValue: number;
  profit: number;
  returnRate: number;
  priceBasis: "raw_close";
  holdings: Array<{
    name: string;
    ticker: string;
    currentPrice: number;
    currency: "KRW";
    valueKrw: number;
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
  }>;
  chart: Array<{
    month: number;
    conservative: number;
    base: number;
    optimistic: number;
  }>;
  probability: { tenYears: number; twentyYears: number; thirtyYears: number };
  riskWarnings: string[];
  summary: string[];
}
