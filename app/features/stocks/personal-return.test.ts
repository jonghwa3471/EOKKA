import assert from "node:assert/strict";
import test from "node:test";

import { moneyWeightedAnnualReturn } from "./personal-return";

test("거래별 현금흐름과 현재 평가금액으로 금액가중수익률을 계산한다", () => {
  const result = moneyWeightedAnnualReturn(
    [{ date: "2025-01-01", amountKrw: -1_000_000 }],
    1_100_000,
    "2026-01-01",
  );
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 10) < 0.05);
});

test("추가 매수 시점을 반영한다", () => {
  const result = moneyWeightedAnnualReturn(
    [
      { date: "2025-01-01", amountKrw: -1_000_000 },
      { date: "2025-07-01", amountKrw: -1_000_000 },
    ],
    2_150_000,
    "2026-01-01",
  );
  assert.ok(result !== null);
  assert.ok(result > 9 && result < 11);
});

test("매수 현금흐름이 없으면 계산하지 않는다", () => {
  assert.equal(moneyWeightedAnnualReturn([], 1_000_000, "2026-01-01"), null);
});
