import { sql } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

export type ServiceUsage = {
  userCount: number;
  analysisCount: number;
};

export async function getServiceUsage(): Promise<ServiceUsage> {
  const [usage] = await db.execute<ServiceUsage>(sql`
    select
      count(distinct coalesce(actor_user_id::text, nullif(target_id, '')))::int as "userCount",
      count(*)::int as "analysisCount"
    from admin_activity_events
    where event_type in ('quick_analysis_completed', 'precise_analysis_completed')
  `);

  return {
    userCount: usage?.userCount ?? 0,
    analysisCount: usage?.analysisCount ?? 0,
  };
}
