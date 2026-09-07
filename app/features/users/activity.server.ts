import { and, eq, lt } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import { profiles } from "./schema";

function seoulDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function markUserActive(userId: string) {
  const today = seoulDate();
  await db
    .update(profiles)
    .set({ last_active_on: today })
    .where(
      and(eq(profiles.profile_id, userId), lt(profiles.last_active_on, today)),
    );
}
