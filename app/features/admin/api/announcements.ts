import type { Route } from "./+types/announcements";

import { data } from "react-router";

import { getAdminAnnouncementPage, requireAdmin } from "../admin.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const rawOffset = Number(
    new URL(request.url).searchParams.get("offset") ?? 0,
  );
  const offset = Number.isSafeInteger(rawOffset)
    ? Math.max(0, Math.min(rawOffset, 100_000))
    : 0;
  return data(await getAdminAnnouncementPage(offset));
}
