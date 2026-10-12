import assert from "node:assert/strict";
import test from "node:test";

import {
  cagr,
  maximumDrawdown,
  priceRangePosition,
  weightedMonthlyReturns,
} from "./metrics";
import { simulatePaths } from "./simulation";

test("매수 위치는 가격 범위를 벗어나도 0~100 사이이며 동일 가격은 중간이다", () => {
  assert.equal(priceRangePosition([100, 200], 150), 50);
  assert.equal(priceRangePosition([100, 200], 50), 0);
  assert.equal(priceRangePosition([100, 200], 250), 100);
  assert.equal(priceRangePosition([100, 100], 100), 50);
  assert.equal(priceRangePosition([], 100), 50);
});

test("기간이 부족하면 CAGR을 만들지 않고 충분한 기간에는 복리로 계산한다", () => {
  assert.equal(cagr([0.1], 12), null);
  assert.ok(
    Math.abs(cagr(Array(12).fill(0.01), 12)! - (1.01 ** 12 - 1) * 100) < 1e-9,
  );
});

test("최대 낙폭은 최초 원금이 아닌 직전 고점부터 계산한다", () => {
  assert.equal(maximumDrawdown([1, -0.5]), 50);
  assert.equal(maximumDrawdown([0.1, 0.1]), 0);
});

test("종목별 공통 월만 추려 보유 비중에 따라 수익률을 합산한다", () => {
  const returns = weightedMonthlyReturns([
    {
      weight: 3,
      history: [
        { date: "20260131", close: 100 },
        { date: "20260228", close: 110 },
        { date: "20260331", close: 121 },
      ],
    },
    {
      weight: 1,
      history: [
        { date: "20260228", close: 100 },
        { date: "20260331", close: 120 },
      ],
    },
  ]);
  assert.equal(returns.length, 1);
  assert.ok(Math.abs(returns[0] - 0.125) < 1e-9);
});

test("수익률 0인 시뮬레이션은 월 적립금만 누적하고 목표 도달 월을 유지한다", () => {
  const { valuesByMonth, goalMonths } = simulatePaths([0], 100, 130, 42, 0, 10);
  assert.equal(valuesByMonth[0][0], 100);
  assert.equal(valuesByMonth[3][0], 130);
  assert.ok([...goalMonths].every((month) => month === 3));
});
