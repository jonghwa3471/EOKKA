import assert from "node:assert/strict";
import test from "node:test";

import { nextMonth } from "./subscription-values";

test("월말 결제일은 다음 달 마지막 날을 넘지 않고 원본 날짜를 바꾸지 않는다", () => {
  const start = new Date(2026, 0, 31, 14, 30);
  const next = nextMonth(start);
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 28);
  assert.equal(next.getHours(), 14);
  assert.equal(start.getDate(), 31);
});

test("윤년 2월과 연말을 넘기는 갱신일을 계산한다", () => {
  assert.equal(nextMonth(new Date(2028, 0, 31)).getDate(), 29);
  const next = nextMonth(new Date(2026, 11, 15));
  assert.equal(next.getFullYear(), 2027);
  assert.equal(next.getMonth(), 0);
  assert.equal(next.getDate(), 15);
});
