import type { Route } from "./+types/renew-subscriptions";

import { renewDueSubscriptions } from "~/features/payments/subscription.server";

export async function loader({ request }: Route.LoaderArgs) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await renewDueSubscriptions());
}
