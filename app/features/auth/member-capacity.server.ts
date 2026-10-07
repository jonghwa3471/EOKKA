import { sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

export const BETA_MEMBER_LIMIT = 50;

export async function getBetaMemberCapacity() {
  const [row] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count
    from auth.users
  `);
  const count = Number(row?.count ?? 0);
  return {
    count,
    limit: BETA_MEMBER_LIMIT,
    remaining: Math.max(0, BETA_MEMBER_LIMIT - count),
    isFull: count >= BETA_MEMBER_LIMIT,
  };
}

export async function isBetaMemberCapacityFull() {
  return (await getBetaMemberCapacity()).isFull;
}

export const BETA_MEMBER_CAPACITY_MESSAGE =
  "베타 회원 50명이 모두 모였어요. 지금은 빠른 분석만 이용할 수 있으며 분석 결과는 저장되지 않아요.";
