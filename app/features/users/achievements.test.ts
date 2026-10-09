import assert from "node:assert/strict";
import test from "node:test";

import type { AnalysisResult } from "~/features/stocks/analysis.types";

import { ACHIEVEMENTS, findCompletedAchievementIds } from "./achievements";

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    asOf: "2026-09-28",
    marketMode: "domestic",
    goalAmount: 100_000_000,
    monthlyContribution: 100_000,
    investmentPeriodMonths: 72,
    totalCost: 10_000_000,
    currentValue: 21_000_000,
    profit: 11_000_000,
    returnRate: 110,
    annualizedReturnRate: 22,
    priceBasis: "raw_close",
    exchangeRate: null,
    holdings: Array.from({ length: 5 }, (_, index) => ({
      name: `종목 ${index + 1}`,
      ticker: `${index + 1}`,
      currentPrice: 1,
      currency: "KRW" as const,
      costKrw: 1,
      valueKrw: 1,
      profitKrw: 0,
      returnRate: 0,
    })),
    cagr: { oneYear: null, threeYear: null, fiveYear: null, available: null },
    scenarios: [],
    contributionScenarios: [],
    chart: [],
    benchmark: null,
    probability: {
      tenYears: 0,
      twentyYears: 0,
      thirtyYears: 0,
      fortyYears: 0,
      fiftyYears: 0,
    },
    investmentStyle: { title: "", description: "", reason: "", scores: [] },
    riskWarnings: [],
    summary: [],
    ...overrides,
  };
}

test("현재 분석 수치와 누적 기록 일수로 도전과제를 판정한다", () => {
  const completedResult = result({
    currentValue: 500_000_000,
    profit: 100_000_000,
    returnRate: 300,
    annualizedReturnRate: 60,
    investmentPeriodMonths: 240,
    holdings: Array.from({ length: 20 }, (_, index) => ({
      name: `종목 ${index + 1}`,
      ticker: `${index + 1}`,
      currentPrice: 2,
      currency: "KRW" as const,
      costKrw: 1,
      valueKrw: 2,
      profitKrw: 1,
      returnRate: 100,
    })),
  });
  const snapshots = Array.from({ length: 100 }, (_, index) => ({
    savedOn: `record-${index + 1}`,
    goalAmount: 500_000_000,
    currentValue: 500_000_000,
    monthlyContribution: 1_000_000,
    analysisMode: "managed" as const,
    result: completedResult,
  })).reverse();

  const completed = findCompletedAchievementIds(snapshots);
  assert.equal(ACHIEVEMENTS.length, 50);
  assert.equal(new Set(ACHIEVEMENTS.map((item) => item.id)).size, 50);
  assert.equal(completed.length, 50);
  assert.ok(completed.includes("one-buffett"));
  assert.ok(completed.includes("annual-return-40"));
  assert.ok(completed.includes("annual-return-60"));
  assert.ok(completed.includes("thirty-day-witness"));
  assert.ok(completed.includes("thirty-managed-days"));
});

test("기록이 없으면 도전과제를 수여하지 않는다", () => {
  assert.deepEqual(findCompletedAchievementIds([]), []);
});

test("빠른 분석 기록으로는 정밀 분석 도전과제를 수여하지 않는다", () => {
  const completed = findCompletedAchievementIds([
    {
      savedOn: "2026-09-28",
      goalAmount: 100_000_000,
      currentValue: 21_000_000,
      monthlyContribution: 100_000,
      analysisMode: "quick",
      result: result(),
    },
  ]);

  assert.equal(completed.includes("first-managed-analysis"), false);
});

test("버핏 지수는 연평균 수익률이 높아도 투자 1년 전에는 수여하지 않는다", () => {
  const shortTermResult = result({
    annualizedReturnRate: 80,
    investmentPeriodMonths: 11,
  });
  const completed = findCompletedAchievementIds([
    {
      savedOn: "2026-09-28",
      goalAmount: 100_000_000,
      currentValue: shortTermResult.currentValue,
      monthlyContribution: 100_000,
      result: shortTermResult,
    },
  ]);

  assert.equal(completed.includes("one-buffett"), false);
  assert.equal(completed.includes("annual-return-40"), false);
  assert.equal(completed.includes("annual-return-60"), false);
});
