import assert from "node:assert/strict";
import test from "node:test";

import type { AnalysisResult } from "./analysis.types";
import { restoreStoredHoldingAliases } from "./components/analysis-result";

const holdings = [
  { name: "애플" },
  { name: "엔비디아" },
  { name: "알파벳 A" },
  { name: "마이크로소프트" },
  { name: "오라클" },
] as AnalysisResult["holdings"];

test("익명 종목 범위를 실제 종목명 목록으로 복원한다", () => {
  assert.equal(
    restoreStoredHoldingAliases("종목 A~E를 함께 살펴봤어요.", holdings),
    "애플·엔비디아·알파벳 A·마이크로소프트·오라클을 함께 살펴봤어요.",
  );
});

test("이미 일부 복원된 범위와 축약 목록도 모두 복원한다", () => {
  assert.equal(
    restoreStoredHoldingAliases(
      "애플~E 모두 확인했고, 애플·B·C·E는 더 살펴봐요.",
      holdings,
    ),
    "애플·엔비디아·알파벳 A·마이크로소프트·오라클 모두 확인했고, 애플·엔비디아·알파벳 A·오라클은 더 살펴봐요.",
  );
});

test("복원한 종목명에 맞게 조사도 자연스럽게 고친다", () => {
  assert.equal(
    restoreStoredHoldingAliases(
      "종목 A는 종목 B와 비교하고 종목 E를 다시 봐요.",
      holdings,
    ),
    "애플은 엔비디아와 비교하고 오라클을 다시 봐요.",
  );
});
