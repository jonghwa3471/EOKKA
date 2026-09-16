// Server/operator CLI only. Never import this into application routes.
import "dotenv/config";
import postgres from "postgres";
import { z } from "zod";

const [operation, userId, email] = process.argv.slice(2);
if (
  !["grant", "revoke"].includes(operation) ||
  !z.string().uuid().safeParse(userId).success ||
  !z.string().email().safeParse(email).success
) {
  throw new Error(
    "Usage: npx tsx scripts/set-admin.ts grant|revoke AUTH_USER_UUID EXACT_EMAIL",
  );
}
const db = postgres(process.env.DATABASE_URL!, { prepare: false });
try {
  await db.begin(async (tx) => {
    const rows =
      await tx`select id from auth.users where id = ${userId} and lower(email) = ${email.toLowerCase()} and email_confirmed_at is not null`;
    if (rows.length !== 1)
      throw new Error(
        "확인된 이메일과 사용자 ID가 일치하지 않습니다. 변경하지 않았습니다.",
      );
    if (operation === "grant")
      await tx`insert into admin_members (user_id) values (${userId}) on conflict do nothing`;
    else await tx`delete from admin_members where user_id = ${userId}`;
  });
  console.log(
    operation === "grant"
      ? "관리자 권한이 등록되었습니다."
      : "관리자 권한이 해제되었습니다.",
  );
} finally {
  await db.end();
}
