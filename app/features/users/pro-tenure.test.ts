import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRO_TENURE_BADGES, proTenureBadge } from "./pro-tenure";

describe("Pro 구독 배지", () => {
  it("구독 여정의 주요 기간마다 배지를 제공한다", () => {
    assert.deepEqual(
      PRO_TENURE_BADGES.map((badge) => badge.months),
      [1, 3, 6, 12, 24],
    );
  });

  it("구독 기간에 맞는 가장 최신 배지를 반환한다", () => {
    assert.equal(proTenureBadge(0), undefined);
    assert.equal(proTenureBadge(7)?.months, 6);
    assert.equal(proTenureBadge(24)?.months, 24);
  });
});
