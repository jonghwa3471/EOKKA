import assert from "node:assert/strict";
import test from "node:test";

import { calculateHoldingConsensus } from "./ai-strategy.server";

const baseInput = {
  portfolioWeightPercent: 18,
  returnRatePercent: 32,
  longTermPurchasePositionPercent: 28,
  recentPurchasePositionPercent: 42,
  financialProfile: {
    revenueGrowthPercent: 12,
    operatingProfitGrowthPercent: 9,
    netIncomeGrowthPercent: 8,
    operatingMarginPercent: 18,
    debtRatioPercent: 65,
    returnOnEquityPercent: 14,
  },
};

test("같은 종목 수치에는 항상 같은 컨센서스와 10표를 반환한다", () => {
  const first = calculateHoldingConsensus(baseInput);
  const second = calculateHoldingConsensus({ ...baseInput });

  assert.deepEqual(first, second);
  assert.equal(
    first.votes.positive + first.votes.neutral + first.votes.cautious,
    10,
  );
  assert.equal(first.consensus, "긍정");
  assert.equal(first.verdict, "좋은 위치");
});

test("높은 매수 위치와 비중, 악화된 재무 수치는 신중으로 계산한다", () => {
  const result = calculateHoldingConsensus({
    portfolioWeightPercent: 48,
    returnRatePercent: -18,
    longTermPurchasePositionPercent: 88,
    recentPurchasePositionPercent: 82,
    financialProfile: {
      revenueGrowthPercent: -7,
      operatingProfitGrowthPercent: -12,
      netIncomeGrowthPercent: -15,
      operatingMarginPercent: -3,
      debtRatioPercent: 240,
      returnOnEquityPercent: -5,
    },
  });

  assert.deepEqual(result.votes, {
    positive: 0,
    neutral: 0,
    cautious: 10,
  });
  assert.equal(result.consensus, "신중");
  assert.equal(result.verdict, "주의 필요");
});

test("확인되지 않은 재무 항목은 임의로 평가하지 않고 중립표로 둔다", () => {
  const result = calculateHoldingConsensus({
    portfolioWeightPercent: 12,
    returnRatePercent: 0,
    longTermPurchasePositionPercent: null,
    recentPurchasePositionPercent: null,
    financialProfile: null,
  });

  assert.deepEqual(result.votes, {
    positive: 1,
    neutral: 9,
    cautious: 0,
  });
  assert.equal(result.consensus, "중립");
});
