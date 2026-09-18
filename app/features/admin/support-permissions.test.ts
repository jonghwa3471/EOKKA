import assert from "node:assert/strict";
import test from "node:test";

import {
  canDeleteSupportMessage,
  canDeleteSupportTicket,
} from "./support-permissions";

test("문의글은 작성자와 관리자만 삭제할 수 있다", () => {
  assert.equal(canDeleteSupportTicket("owner", "owner", false), true);
  assert.equal(canDeleteSupportTicket("other", "owner", false), false);
  assert.equal(canDeleteSupportTicket("admin", "owner", true), true);
});

test("최초 문의는 댓글로 삭제할 수 없고 작성자는 자기 댓글만 삭제한다", () => {
  assert.equal(
    canDeleteSupportMessage({
      userId: "owner",
      authorId: "owner",
      staff: false,
      isInitial: true,
    }),
    false,
  );
  assert.equal(
    canDeleteSupportMessage({
      userId: "owner",
      authorId: "owner",
      staff: false,
      isInitial: false,
    }),
    true,
  );
  assert.equal(
    canDeleteSupportMessage({
      userId: "owner",
      authorId: "admin",
      staff: false,
      isInitial: false,
    }),
    false,
  );
  assert.equal(
    canDeleteSupportMessage({
      userId: "admin",
      authorId: "owner",
      staff: true,
      isInitial: false,
    }),
    true,
  );
});
