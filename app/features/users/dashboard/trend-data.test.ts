import type { History } from "./history-insights";

import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateTrendHistory,
  calendarTrendHistory,
  chartPeriodWithWeekday,
  shiftDate,
} from "./trend-data";

// Only the date and value are read by calendar grouping. Other report fields
// are intentionally omitted to make the boundary of these tests explicit.
function history(): History {
  return [
    { savedOn: "2026-10-02", currentValue: 100 },
    { savedOn: "2026-10-06", currentValue: 120 },
  ] as History;
}

test("휴장일과 평일 미갱신을 구분하며 직전 평가금액을 이어 그린다", () => {
  const rows = calendarTrendHistory(history(), "2026-10-06");
  assert.equal(rows.length, 5);
  assert.equal(rows[1].closedReason, "휴장일");
  assert.equal(rows[3].closedReason, "분석 미갱신일");
  assert.equal(rows[3].item.currentValue, 100);
  assert.equal(rows[4].isCarried, false);
  assert.equal(rows[4].item.currentValue, 120);
  assert.equal(rows.at(-1)?.item.savedOn, "2026-10-06");
});

test("월별 집계는 기간 마지막 값을 사용하고 실제 기록 유무를 보존한다", () => {
  const rows = aggregateTrendHistory(
    calendarTrendHistory(history(), "2026-10-07"),
    "monthly",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].item.currentValue, 120);
  assert.equal(rows[0].isCarried, false);
  assert.equal(rows[0].periodLabel, "2026.10월");
});

test("빈 차트와 연도를 넘기는 날짜 이동을 처리한다", () => {
  assert.deepEqual(calendarTrendHistory([], "2026-10-06"), []);
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(chartPeriodWithWeekday("2026-10-06", "yearly"), "2026년");
});
