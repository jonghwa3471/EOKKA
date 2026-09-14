import type { Route } from "./+types/use-social-avatar";

import { data } from "react-router";
import { z } from "zod";

import { requireAuthentication, requireMethod } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";

const schema = z.object({
  provider: z.enum(["google", "kakao"]),
  choice: z.enum(["current", "provider"]),
});

const MAX_AVATAR_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function isAllowedProviderAvatarUrl(
  avatarUrl: string,
  provider: "google" | "kakao",
) {
  try {
    const url = new URL(avatarUrl);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();

    return provider === "google"
      ? hostname === "googleusercontent.com" ||
          hostname.endsWith(".googleusercontent.com")
      : hostname === "kakaocdn.net" || hostname.endsWith(".kakaocdn.net");
  } catch {
    return false;
  }
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

  if (!isAllowedProviderAvatarUrl(avatarUrl, parsed.data.provider))
    return data(
      { error: "소셜 계정의 프로필 사진 주소를 안전하게 확인하지 못했어요." },
      { status: 400 },
    );

  let avatarResponse: Response;
  try {
    avatarResponse = await fetch(avatarUrl, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return data(
      { error: "소셜 계정의 프로필 사진을 불러오지 못했어요." },
      { status: 502 },
    );
  }

  if (
    !avatarResponse.ok ||
    !isAllowedProviderAvatarUrl(
      avatarResponse.url || avatarUrl,
      parsed.data.provider,
    )
  )
    return data(
      { error: "소셜 계정의 프로필 사진을 안전하게 불러오지 못했어요." },
      { status: 502 },
    );

  const contentType =
    avatarResponse.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  const declaredSize = Number(
    avatarResponse.headers.get("content-length") ?? "0",
  );
  if (!ALLOWED_AVATAR_TYPES.has(contentType))
    return data(
      { error: "지원하지 않는 소셜 프로필 사진 형식이에요." },
      { status: 400 },
    );
  if (declaredSize > MAX_AVATAR_BYTES)
    return data(
      { error: "소셜 프로필 사진은 1MB 이하만 사용할 수 있어요." },
      { status: 400 },
    );

  const avatarBytes = await avatarResponse.arrayBuffer();
  if (avatarBytes.byteLength > MAX_AVATAR_BYTES)
    return data(
      { error: "소셜 프로필 사진은 1MB 이하만 사용할 수 있어요." },
      { status: 400 },
    );

  // Every source (direct upload, Google, Kakao) uses one fixed object path.
  // Upsert replaces the previous bytes, so unused avatars never accumulate.
  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(user.id, avatarBytes, {
      upsert: true,
      cacheControl: "3600",
      contentType,
    });

  if (uploadError)
    return data(
      { error: "소셜 프로필 사진을 저장하지 못했어요. 다시 시도해 주세요." },
      { status: 500 },
    );

  const {
    data: { publicUrl },
  } = client.storage.from("avatars").getPublicUrl(user.id);
  const storedAvatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await client
    .from("profiles")
    .update({ avatar_url: storedAvatarUrl })
    .eq("profile_id", user.id);
  const { error: authError } = await client.auth.updateUser({
    data: { ...user.user_metadata, avatar_url: storedAvatarUrl },
  });

  if (profileError || authError)
    return data(
      { error: "프로필 사진을 변경하지 못했어요. 다시 시도해 주세요." },
      { status: 500 },
    );
  return { success: true };
}
