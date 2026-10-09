import assert from "node:assert/strict";
import test from "node:test";

import { isAutomaticAnalysisEnabled } from "./app-environment.server";

test("자동 분석은 명시적으로 true를 설정했을 때만 활성화된다", () => {
  const previous = process.env.AUTOMATIC_ANALYSIS_ENABLED;

  try {
    delete process.env.AUTOMATIC_ANALYSIS_ENABLED;
    assert.equal(isAutomaticAnalysisEnabled(), false);

    process.env.AUTOMATIC_ANALYSIS_ENABLED = "false";
    assert.equal(isAutomaticAnalysisEnabled(), false);

    process.env.AUTOMATIC_ANALYSIS_ENABLED = "TRUE";
    assert.equal(isAutomaticAnalysisEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env.AUTOMATIC_ANALYSIS_ENABLED;
    else process.env.AUTOMATIC_ANALYSIS_ENABLED = previous;
  }
});
