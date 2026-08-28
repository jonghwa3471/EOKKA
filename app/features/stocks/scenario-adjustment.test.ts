import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePersonalReturnAdjustment,
  personalPerformanceWeight,
} from "./scenario-adjustment";

test("투자 기간에 맞는 신뢰 가중치를 적용한다", () => {
  assert.equal(personalPerformanceWeight(5), 0);
  assert.equal(personalPerformanceWeight(6), 0.05);
  assert.equal(personalPerformanceWeight(12), 0.1);
  assert.equal(personalPerformanceWeight(24), 0.15);
  assert.equal(personalPerformanceWeight(36), 0.2);
  assert.equal(personalPerformanceWeight(60), 0.25);
});

test("6개월 미만의 개인 수익률은 시나리오에 반영하지 않는다", () => {
  const result = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: 5,
    personalAnnualizedReturn: 80,
    historicalAnnualReturn: 10,
    simulationHistoricalAnnualReturn: 10,
  });

  assert.equal(result.adjustment.confidenceWeight, 0);
  assert.equal(result.adjustment.appliedAnnualAdjustment, 0);
  assert.equal(result.monthlyLogAdjustment, 0);
});

test("개인 초과 수익률과 최종 연간 보정폭을 상한 내로 제한한다", () => {
  const result = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: 60,
    personalAnnualizedReturn: 100,
    historicalAnnualReturn: 8,
    simulationHistoricalAnnualReturn: 8,
  });

  assert.equal(result.adjustment.cappedExcessReturn, 10);
  assert.equal(result.adjustment.appliedAnnualAdjustment, 2.5);
  assert.ok(result.monthlyLogAdjustment > 0);
});

test("낮은 개인 수익률도 연 -2.5%p보다 크게 보정하지 않는다", () => {
  const result = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: 60,
    personalAnnualizedReturn: -80,
    historicalAnnualReturn: 8,
    simulationHistoricalAnnualReturn: 8,
  });

  assert.equal(result.adjustment.cappedExcessReturn, -10);
  assert.equal(result.adjustment.appliedAnnualAdjustment, -2.5);
  assert.ok(result.monthlyLogAdjustment < 0);
});

test("개인 수익률이 없으면 보정하지 않는다", () => {
  const result = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: 120,
    personalAnnualizedReturn: null,
    historicalAnnualReturn: 8,
    simulationHistoricalAnnualReturn: 8,
  });

  assert.equal(result.adjustment.cappedExcessReturn, 0);
  assert.equal(result.adjustment.appliedAnnualAdjustment, 0);
  assert.equal(result.monthlyLogAdjustment, 0);
});

test("투자 기간을 모르는 경우에도 개인 성과를 보정하지 않는다", () => {
  const result = calculatePersonalReturnAdjustment({
    investmentPeriodMonths: null,
    personalAnnualizedReturn: null,
    historicalAnnualReturn: 8,
    simulationHistoricalAnnualReturn: 8,
  });

  assert.equal(result.adjustment.confidenceWeight, 0);
  assert.equal(result.adjustment.appliedAnnualAdjustment, 0);
  assert.equal(result.monthlyLogAdjustment, 0);
});
