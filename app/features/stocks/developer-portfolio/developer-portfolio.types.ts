import type { AiStrategy, AnalysisResult } from "../analysis.types";

import { z } from "zod";

const boundedText = z.string().trim().min(1).max(2_000);

export const publicDeveloperPortfolioSnapshotSchema = z.object({
  version: z.literal(1),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publishedAt: z.string().datetime(),
  returnRate: z.number().finite(),
  annualizedReturnRate: z.number().finite().nullable(),
  investmentPeriodMonths: z.number().int().nonnegative().nullable(),
  holdingCount: z.number().int().nonnegative().max(1_000),
  investmentStyle: z.object({
    title: boundedText,
    description: boundedText,
    reason: boundedText,
    scores: z
      .array(
        z.object({
          key: z.enum([
            "stability",
            "growth",
            "concentration",
            "diversification",
            "etf",
            "aggression",
          ]),
          label: boundedText,
          score: z.number().finite(),
        }),
      )
      .max(12),
  }),
  holdings: z
    .array(
      z.object({
        name: boundedText,
        ticker: boundedText,
        country: z.string().trim().max(100).optional(),
        exchange: z.string().trim().max(100).optional(),
        weightPercent: z.number().finite(),
        returnRate: z.number().finite(),
        dailyChangeRate: z.number().finite().nullable(),
      }),
    )
    .max(1_000),
  summary: z.array(boundedText).max(30),
  committee: z
    .object({
      headline: boundedText,
      diagnosis: boundedText,
      committeeConclusion: boundedText.optional(),
      overallCommitteeScore: z.number().finite().optional(),
      strengths: z
        .array(z.object({ title: boundedText, detail: boundedText }))
        .max(30),
      improvements: z
        .array(z.object({ title: boundedText, detail: boundedText }))
        .max(30),
      actions: z
        .array(
          z.object({
            title: boundedText,
            detail: boundedText,
            priority: z.enum(["높음", "보통", "낮음"]),
          }),
        )
        .max(30),
    })
    .nullable(),
});

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
