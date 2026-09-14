import type { Route } from "./+types/use-social-avatar";

import { data } from "react-router";
import { z } from "zod";

import { requireAuthentication, requireMethod } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";

const schema = z.object({
  provider: z.enum(["google", "kakao"]),
  choice: z.enum(["current", "provider"]),
});

function avatarFromIdentity(identityData: Record<string, unknown> | undefined) {
  if (!identityData) return null;
  const avatarKey = /(avatar|picture|profile.*image|image.*profile|thumbnail)/i;
  const queue: unknown[] = [identityData];
  while (queue.length > 0) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [key, nestedValue] of Object.entries(value)) {
      if (
        avatarKey.test(key) &&
        typeof nestedValue === "string" &&
        (nestedValue.startsWith("https://") ||
          nestedValue.startsWith("http://k.kakaocdn.net/"))
      )
        return nestedValue.replace(
          "http://k.kakaocdn.net/",
          "https://k.kakaocdn.net/",
        );
      if (nestedValue && typeof nestedValue === "object")
        queue.push(nestedValue);
    }
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  requireMethod("POST")(request);
  const [client] = makeServerClient(request);
  await requireAuthentication(client);
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success)
    return data(
      { error: "아바타 선택 정보가 올바르지 않아요." },
      { status: 400 },
    );
  if (parsed.data.choice === "current") return { success: true };

  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: identities, error: identitiesError } =
    await client.auth.getUserIdentities();
  const identity = identities?.identities.find(
    (item) => item.provider === parsed.data.provider,
  );
  const avatarUrl = avatarFromIdentity(
    identity?.identity_data as Record<string, unknown> | undefined,
  );

  if (identitiesError || !user || !identity || !avatarUrl)
    return data(
      { error: "연결한 소셜 계정의 프로필 사진을 찾지 못했어요." },
      { status: 400 },
    );

  const { error: profileError } = await client
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("profile_id", user.id);
  const { error: authError } = await client.auth.updateUser({
    data: { ...user.user_metadata, avatar_url: avatarUrl },
  });

  if (profileError || authError)
    return data(
      { error: "프로필 사진을 변경하지 못했어요. 다시 시도해 주세요." },
      { status: 500 },
    );
  return { success: true };
}
