import type { Route } from "./+types/reveal-developer-portfolio-gift";

import { redirect } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";
import { assertSameOrigin } from "~/features/admin/validation";
import { revealDeveloperPortfolioGift } from "~/features/users/developer-portfolio-gift.server";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  try {
    await revealDeveloperPortfolioGift(user.id);
  } catch {
    throw redirect("/dashboard/pro");
  }
  return redirect("/dashboard/developer-portfolio?gift=1");
}
