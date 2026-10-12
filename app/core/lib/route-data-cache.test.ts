import assert from "node:assert/strict";
import test from "node:test";

import {
  invalidateAnalysisRouteData,
  invalidateRouteDataCache,
  loadCachedRouteData,
} from "./route-data-cache";

test("저장한 분석의 영향을 받는 화면만 갱신하고 다른 화면 캐시는 유지한다", async () => {
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
  for (const key of [...keys, "contact"]) invalidateRouteDataCache(key);
});
