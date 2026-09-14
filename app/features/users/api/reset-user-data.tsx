import type { Route } from "./+types/reset-user-data";

import { data } from "react-router";
import { z } from "zod";

import { requireAuthentication, requireMethod } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";

import { resetUserInvestmentData } from "../user-data.server";

const schema = z.object({
  confirmation: z.literal("RESET"),
});

export async function action({ request }: Route.ActionArgs) {
  requireMethod("DELETE")(request);
  const [client] = makeServerClient(request);
  await requireAuthentication(client);
  const {
    data: { user },
  } = await client.auth.getUser();
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));

  if (!parsed.success) {
    return data(
      { error: "초기화 확인란에 RESET을 정확히 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    await resetUserInvestmentData(user!.id);
    return { success: true };
  } catch {
    return data(
      { error: "정보를 초기화하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
