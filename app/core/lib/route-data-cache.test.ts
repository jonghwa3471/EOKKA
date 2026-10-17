import assert from "node:assert/strict";
import test from "node:test";

import {
  clearRouteDataCache,
  invalidateAnalysisRouteData,
  loadCachedRouteData,
} from "./route-data-cache";

test("저장한 분석의 영향을 받는 화면은 다음 조회에서 자동으로 갱신한다", async () => {
  const keys = [
    "dashboard",
    "analysis-history:2026-10",
    "profile",
    "achievements",
    "account",
  ];
  for (const key of keys) await loadCachedRouteData(key, async () => "before");
  await loadCachedRouteData("contact", async () => "unchanged");
  invalidateAnalysisRouteData();
  for (const key of keys)
    assert.equal(await loadCachedRouteData(key, async () => "after"), "after");
  assert.equal(
    await loadCachedRouteData("contact", async () => "unexpected"),
    "unchanged",
  );
  for (const key of [...keys, "contact"]) clearRouteDataCache(key);
});

test("최대 캐시 나이가 0이면 서버에서 최신 데이터를 다시 불러온다", async () => {
  const key = "developer-portfolio";
  assert.equal(await loadCachedRouteData(key, async () => "before"), "before");
  assert.equal(
    await loadCachedRouteData(key, async () => "after", { maxAgeMs: 0 }),
    "after",
  );
  clearRouteDataCache(key);
});
