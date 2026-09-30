import type { Route } from "./+types/featured-achievements";

import { data } from "react-router";
import { z } from "zod";

import makeServerClient from "~/core/lib/supa-client.server";

import { ACHIEVEMENTS } from "../achievements";

const schema = z.object({
  achievementIds: z
    .array(z.string())
    .max(3, "프로필에는 도전과제 뱃지를 최대 3개까지 장식할 수 있어요.")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "같은 도전과제 뱃지는 한 번만 선택할 수 있어요.",
    }),
});

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return data(null, { status: 405 });

  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return data({ error: "로그인이 필요해요." }, { status: 401 });

  const formData = await request.formData();
  const parsed = schema.safeParse({
    achievementIds: formData.getAll("achievementId").map(String),
  });
  if (!parsed.success)
    return data(
      { error: parsed.error.issues[0]?.message ?? "뱃지를 확인해 주세요." },
      { status: 400 },
    );

  const validIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
  if (parsed.data.achievementIds.some((id) => !validIds.has(id)))
    return data(
      { error: "존재하지 않는 도전과제가 포함되어 있어요." },
      { status: 400 },
    );

  if (parsed.data.achievementIds.length) {
    const { data: earned, error: earnedError } = await client
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id)
      .in("achievement_id", parsed.data.achievementIds);
    if (earnedError)
      return data(
        { error: "획득한 뱃지를 확인하지 못했어요." },
        { status: 500 },
      );
    if (earned.length !== parsed.data.achievementIds.length)
      return data(
        { error: "획득한 도전과제 뱃지만 프로필에 장식할 수 있어요." },
        { status: 400 },
      );
  }

  const { error } = await client
    .from("profiles")
    .update({ featured_achievement_ids: parsed.data.achievementIds })
    .eq("profile_id", user.id);
  if (error)
    return data({ error: "뱃지 설정을 저장하지 못했어요." }, { status: 500 });

  return { success: true, featuredAchievementIds: parsed.data.achievementIds };
}
