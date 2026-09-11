import type { Route } from "./+types/analysis-limit";

import { data } from "react-router";

import { getManualAnalysisLimitStatus } from "~/core/lib/rate-limit.server";
import makeServerClient from "~/core/lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const status = await getManualAnalysisLimitStatus(request, user?.id ?? null);

  return data(
    {
      limit: status.limit,
      used: status.used,
      remaining: status.remaining,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        ...(status.setCookie ? { "Set-Cookie": status.setCookie } : {}),
      },
    },
  );
}
