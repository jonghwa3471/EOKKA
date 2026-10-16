import assert from "node:assert/strict";
import test from "node:test";

import {
  clearRouteDataCache,
  invalidateAnalysisRouteData,
  loadCachedRouteData,
} from "./route-data-cache";

test("저장한 분석의 영향을 받는 화면은 명시적으로 갱신할 때까지 기존 캐시를 유지한다", async () => {
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
    assert.equal(await loadCachedRouteData(key, async () => "after"), "before");
  assert.equal(
    await loadCachedRouteData("contact", async () => "unexpected"),
    "unchanged",
  );
  for (const key of keys) {
    clearRouteDataCache(key);
    assert.equal(await loadCachedRouteData(key, async () => "after"), "after");
  }
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
