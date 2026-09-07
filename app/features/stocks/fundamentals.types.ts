export interface HoldingFundamentals {
  source: "금융위원회 기업 재무정보" | "한국투자증권";
  asOf: string | null;
  coverage: "full" | "partial";
  periods: number;
  revenueGrowthPercent: number | null;
  operatingProfitGrowthPercent: number | null;
  netIncomeGrowthPercent: number | null;
  operatingMarginPercent: number | null;
  debtRatioPercent: number | null;
  returnOnEquityPercent: number | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
}
