import assert from "node:assert/strict";
import test from "node:test";

import {
  announcementSchema,
  assertSameOrigin,
  deleteMessageSchema,
  deleteTicketSchema,
  replySchema,
  ticketSchema,
} from "./validation";

test("문의 입력은 유형·길이를 검증하고 공백을 제거한다", () => {
  assert.equal(
    ticketSchema.parse({
      category: "bug",
      title: "  버그 신고  ",
      body: "내용을 알려드려요",
    }).title,
    "버그 신고",
  );
  assert.equal(
    ticketSchema.safeParse({
      category: "admin",
      title: "제목",
      body: "자세한 내용",
    }).success,
    false,
  );
  assert.equal(
    ticketSchema.safeParse({
      category: "bug",
      title: "제목",
      body: "x".repeat(5001),
    }).success,
    false,
  );
});
test("답변·공지는 유효한 UUID와 비어 있지 않은 내용이 필요하다", () => {
  assert.equal(
    replySchema.safeParse({ ticket: "not-an-id", body: "답변" }).success,
    false,
  );
  assert.equal(
    announcementSchema.safeParse({
      id: "a116f50d-c0c9-4e30-886b-b3e6b3367c57",
      title: "공지",
      body: "     ",
    }).success,
    false,
  );
});
test("문의와 댓글 삭제 대상은 UUID로 검증한다", () => {
  const id = "a116f50d-c0c9-4e30-886b-b3e6b3367c57";
  assert.equal(deleteTicketSchema.safeParse({ ticket: id }).success, true);
  assert.equal(
    deleteMessageSchema.safeParse({ ticket: id, message: id }).success,
    true,
  );
  assert.equal(
    deleteMessageSchema.safeParse({ ticket: id, message: "invalid" }).success,
    false,
  );
});
test("상태 변경은 동일 출처 POST만 허용한다", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://eokka.test/contact", {
        method: "POST",
        headers: { origin: "https://eokka.test" },
      }),
    ),
  );
  for (const origin of ["https://attacker.test", "null", ""])
    assert.throws(
      () =>
        assertSameOrigin(
          new Request("https://eokka.test/contact", {
            method: "POST",
            headers: { origin },
          }),
        ),
      (e: unknown) => e instanceof Response && e.status === 403,
    );
  assert.throws(() =>
    assertSameOrigin(
      new Request("https://eokka.test/contact", {
        headers: { origin: "https://eokka.test" },
      }),
    ),
  );
});
