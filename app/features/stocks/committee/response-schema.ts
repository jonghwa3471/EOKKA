import { z } from "zod";

export const aiStrategySchema = z.object({
  framework: z.literal("investment_committee"),
  headline: z.string().min(1).max(200),
  diagnosis: z.string().min(1).max(900),
  committeeDiscussion: z.object({
    warrenBuffett: z.string().min(1).max(320),
    charlieMunger: z.string().min(1).max(320),
    benjaminGraham: z.string().min(1).max(320),
    peterLynch: z.string().min(1).max(320),
    philipFisher: z.string().min(1).max(320),
    johnTempleton: z.string().min(1).max(320),
    johnBogle: z.string().min(1).max(320),
    howardMarks: z.string().min(1).max(320),
    rayDalio: z.string().min(1).max(320),
    joelGreenblatt: z.string().min(1).max(320),
  }),
  committeeAdvice: z.object({
    warrenBuffett: z.string().min(1).max(420),
    charlieMunger: z.string().min(1).max(420),
    benjaminGraham: z.string().min(1).max(420),
    peterLynch: z.string().min(1).max(420),
    philipFisher: z.string().min(1).max(420),
    johnTempleton: z.string().min(1).max(420),
    johnBogle: z.string().min(1).max(420),
    howardMarks: z.string().min(1).max(420),
    rayDalio: z.string().min(1).max(420),
    joelGreenblatt: z.string().min(1).max(420),
  }),
  committeeConclusion: z.string().min(1).max(220),
  strengths: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(400),
      }),
    )
    .length(2),
  improvements: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(500),
      }),
    )
    .length(2),
  holdingInsights: z
    .array(
      z.object({
        holdingAlias: z.string().min(1).max(20),
        evidence: z.string().min(1).max(300),
        strategy: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(20),
  monthlyPlan: z.string().min(1).max(600),
  diversification: z.string().min(1).max(600),
  actions: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(400),
        priority: z.enum(["높음", "보통", "낮음"]),
      }),
    )
    .length(3),
  disclaimer: z.string().min(1).max(200),
});
