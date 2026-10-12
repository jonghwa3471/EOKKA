import assert from "node:assert/strict";
import test from "node:test";

import {
  type PortfolioTrade,
  calculateManagedHoldings,
  managedPortfolioCashFlows,
} from "./portfolio-calculations";

const buy: PortfolioTrade = {
  stockId: 1,
  stockName: "테스트",
  ticker: "TEST",
  currency: "USD",
  type: "BUY",
  tradedOn: "2026-01-01",
  quantity: 10,
  unitPrice: 100,
  exchangeRate: 1400,
};

test("부분 매도 후 남은 주식은 기존 평균 매수가와 매입 환율을 유지한다", () => {
  const [position] = calculateManagedHoldings([
    buy,
    { ...buy, type: "SELL", quantity: 4, unitPrice: 150, exchangeRate: 1500 },
  ]);
  assert.equal(position.quantity, 6);
  assert.equal(position.averagePrice, 100);
  assert.equal(position.costKrw, 840_000);
});

test("전량 매도한 종목은 제외하고 보유량 초과 매도는 거절한다", () => {
  assert.deepEqual(
    calculateManagedHoldings([buy, { ...buy, type: "SELL" }]),
    [],
  );
  assert.throws(
    () => calculateManagedHoldings([{ ...buy, type: "SELL" }]),
    /보유 수량/,
  );
});

test("현금흐름은 매수 시 유출, 매도 시 유입으로 환율을 반영한다", () => {
  const flows = managedPortfolioCashFlows([
    buy,
    { ...buy, type: "SELL", quantity: 1, exchangeRate: 1500 },
  ]);
  assert.equal(flows[0].amountKrw, -1_400_000);
  assert.equal(flows[1].amountKrw, 150_000);
});
