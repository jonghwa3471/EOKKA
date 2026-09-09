import type { HoldingFundamentals } from "./fundamentals.types";

export interface AnalysisResult {
  asOf: string;
  marketMode: "domestic" | "global-test";
  goalAmount: number;
  monthlyContribution: number;
  investmentPeriodMonths?: number | null;
  totalCost: number;
  currentValue: number;
  profit: number;
  returnRate: number;
  annualizedReturnRate?: number | null;
  personalReturnAdjustment?: {
    historicalAnnualReturn: number;
    personalAnnualizedReturn: number | null;
    confidenceWeight: number;
    cappedExcessReturn: number;
    appliedAnnualAdjustment: number;
  };
  priceBasis: "raw_close" | "adjusted_close";
  exchangeRate: number | null;
  holdings: Array<{
    name: string;
    ticker: string;
    country?: string;
    exchange?: string;
    currentPrice: number;
    currency: "KRW" | "USD";
    costKrw: number;
    valueKrw: number;
    profitKrw: number;
    returnRate: number;
    dailyChangeRate?: number | null;
    fundamentals?: HoldingFundamentals | null;
    purchasePosition?: {
      tenYearPosition: number;
      oneYearPosition: number;
      tenYearObservations: number;
      oneYearObservations: number;
      tenYearLow: number;
      tenYearHigh: number;
      oneYearLow: number;
      oneYearHigh: number;
    };
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
  contributionScenarios: Array<{
    key: "conservative" | "base" | "optimistic";
    label: string;
    percentile: number;
    goalMonth: number | null;
    shortenedByMonths: number | null;
    valueAt10Years?: number;
    valueAt30Years?: number;
    valueAt50Years?: number;
  }>;
  contributionChart?: Array<{
    month: number;
    base: number;
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
    investmentPeriodCagr?: number | null;
    componentAnnualReturns?: Array<{
      label: string;
      annualReturn: number | null;
    }>;
  } | null;
  probability: {
    tenYears: number;
    twentyYears: number;
    thirtyYears: number;
    fortyYears: number;
    fiftyYears: number;
  };
  investmentStyle: {
    title: string;
    description: string;
    reason: string;
    scores: Array<{
      key:
        | "stability"
        | "growth"
        | "concentration"
        | "diversification"
        | "etf"
        | "aggression";
      label: string;
      score: number;
    }>;
  };
  riskWarnings: string[];
  summary: string[];
  aiStrategy?: AiStrategy | null;
}

export interface AiStrategy {
  framework: "investment_committee";
  headline: string;
  diagnosis: string;
  committeeDiscussion: {
    warrenBuffett: string;
    charlieMunger: string;
    benjaminGraham: string;
    peterLynch: string;
    philipFisher: string;
    johnTempleton: string;
    johnBogle: string;
    howardMarks: string;
    rayDalio: string;
    joelGreenblatt: string;
  };
  committeeConclusion?: string;
  overallCommitteeScore?: number;
  committeeScores?: {
    warrenBuffett: number;
    charlieMunger: number;
    benjaminGraham: number;
    peterLynch: number;
    philipFisher: number;
    johnTempleton: number;
    johnBogle: number;
    howardMarks: number;
    rayDalio: number;
    joelGreenblatt: number;
  };
  portfolioReview?: {
    concentration: string;
    diversificationEfficiency: string;
    sectorBalance: string;
  };
  scores: Array<{
    key:
      | "currentAssets"
      | "monthlyInvestment"
      | "profitability"
      | "diversification"
      | "growthPotential"
      | "stability";
    label: string;
    description: string;
    score: number;
  }>;
  strengths: Array<{
    title: string;
    detail: string;
  }>;
  improvements: Array<{
    title: string;
    detail: string;
  }>;
  holdingInsights?: Array<{
    name: string;
    verdict: "좋은 위치" | "중립" | "주의 필요";
    consensus?: "긍정" | "중립" | "신중";
    votes?: {
      positive: number;
      neutral: number;
      cautious: number;
    };
    evidence: string;
    strategy: string;
  }>;
  monthlyPlan: string;
  diversification: string;
  actions: Array<{
    title: string;
    detail: string;
    priority: "높음" | "보통" | "낮음";
  }>;
  disclaimer: string;
}
