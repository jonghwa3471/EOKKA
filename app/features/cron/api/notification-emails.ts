import type { Route } from "./+types/notification-emails";

import { data } from "react-router";

import { notifyUpcomingSubscriptionRenewals } from "~/features/notifications/notifications.server";

export async function action({ request }: Route.ActionArgs) {
  if (
    request.method !== "POST" ||
    !process.env.CRON_SECRET ||
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const notified = await notifyUpcomingSubscriptionRenewals();
  return data({ success: true, notified });
}
