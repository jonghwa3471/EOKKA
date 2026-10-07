import type { Route } from "./+types/user-tickets";

import { data } from "react-router";
import { z } from "zod";

import { getAdminUserTickets, requireAdmin } from "../admin.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const userId = z.string().uuid().parse(params.userId);
  return data({ userId, tickets: await getAdminUserTickets(userId) });
}
