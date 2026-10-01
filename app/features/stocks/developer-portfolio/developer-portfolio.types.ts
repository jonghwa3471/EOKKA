import type { AiStrategy, AnalysisResult } from "../analysis.types";

export interface PublicDeveloperPortfolioSnapshot {
  version: 1;
  asOf: string;
  publishedAt: string;
  returnRate: number;
  annualizedReturnRate: number | null;
  investmentPeriodMonths: number | null;
  holdingCount: number;
  investmentStyle: AnalysisResult["investmentStyle"];
  holdings: Array<{
    name: string;
    ticker: string;
    country?: string;
    exchange?: string;
    weightPercent: number;
    returnRate: number;
    dailyChangeRate: number | null;
  }>;
  summary: string[];
  committee: Pick<
    AiStrategy,
    | "headline"
    | "diagnosis"
    | "committeeConclusion"
    | "overallCommitteeScore"
    | "strengths"
    | "improvements"
    | "actions"
  > | null;
}

export function toPublicDeveloperPortfolioSnapshot(
  result: AnalysisResult,
  publishedAt = new Date(),
): PublicDeveloperPortfolioSnapshot {
  const denominator = Math.max(1, result.currentValue);
  const ai = result.aiStrategy;

  return {
    version: 1,
    asOf: result.asOf,
    publishedAt: publishedAt.toISOString(),
    returnRate: result.returnRate,
    annualizedReturnRate: result.annualizedReturnRate ?? null,
    investmentPeriodMonths: result.investmentPeriodMonths ?? null,
    holdingCount: result.holdings.length,
    investmentStyle: result.investmentStyle,
    holdings: result.holdings
      .map((holding) => ({
        name: holding.name,
        ticker: holding.ticker,
        country: holding.country,
        exchange: holding.exchange,
        weightPercent: (holding.valueKrw / denominator) * 100,
        returnRate: holding.returnRate,
        dailyChangeRate: holding.dailyChangeRate ?? null,
      }))
      .sort((a, b) => b.weightPercent - a.weightPercent),
    summary: result.summary,
    committee: ai
      ? {
          headline: ai.headline,
          diagnosis: ai.diagnosis,
          committeeConclusion: ai.committeeConclusion,
          overallCommitteeScore: ai.overallCommitteeScore,
          strengths: ai.strengths,
          improvements: ai.improvements,
          actions: ai.actions,
        }
      : null,
  };
}
