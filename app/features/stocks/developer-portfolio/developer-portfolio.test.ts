import type { AnalysisResult } from "../analysis.types";

import assert from "node:assert/strict";
import test from "node:test";

import { toPublicDeveloperPortfolioSnapshot } from "./developer-portfolio.types";

test("공개 포트폴리오에는 정확한 금액·수량·가격을 포함하지 않는다", () => {
  const result = {
    asOf: "2026-09-30",
    currentValue: 12_345_678,
    totalCost: 8_765_432,
    profit: 3_580_246,
    returnRate: 40.85,
    annualizedReturnRate: 18.2,
    investmentPeriodMonths: 36,
    holdings: [
      {
        name: "테스트 종목",
        ticker: "TEST",
        currentPrice: 999,
        averagePrice: 777,
        currency: "USD",
        costKrw: 8_765_432,
        valueKrw: 12_345_678,
        profitKrw: 3_580_246,
        returnRate: 40.85,
      },
    ],
    investmentStyle: {
      title: "꾸준한 투자자",
      description: "설명",
      reason: "근거",
      scores: [],
    },
    summary: ["요약"],
    aiStrategy: null,
  } as unknown as AnalysisResult;

  const snapshot = toPublicDeveloperPortfolioSnapshot(
    result,
    new Date("2026-10-01T00:00:00.000Z"),
  );
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.holdings[0].weightPercent, 100);
  for (const privateKey of [
    "currentValue",
    "totalCost",
    "profitKrw",
    "currentPrice",
    "averagePrice",
    "quantity",
    "costKrw",
  ])
    assert.equal(serialized.includes(`\"${privateKey}\"`), false);
});

test("보유 종목은 공개 비중이 큰 순서로 정렬한다", () => {
  const result = {
    asOf: "2026-09-30",
    currentValue: 100,
    returnRate: 0,
    holdings: [
      { name: "작은 종목", ticker: "S", valueKrw: 20, returnRate: 1 },
      { name: "큰 종목", ticker: "L", valueKrw: 80, returnRate: 2 },
    ],
    investmentStyle: {
      title: "투자자",
      description: "설명",
      reason: "근거",
      scores: [],
    },
    summary: [],
  } as unknown as AnalysisResult;

  const snapshot = toPublicDeveloperPortfolioSnapshot(result);
  assert.deepEqual(
    snapshot.holdings.map((holding) => holding.ticker),
    ["L", "S"],
  );
  assert.deepEqual(
    snapshot.holdings.map((holding) => holding.weightPercent),
    [80, 20],
  );
});
