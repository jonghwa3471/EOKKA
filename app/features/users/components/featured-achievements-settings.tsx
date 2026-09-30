import { PencilIcon, TrophyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { invalidateRouteDataCache } from "~/core/lib/route-data-cache";

import {
  ACHIEVEMENT_DIFFICULTY_STYLES,
  type AchievementDefinition,
  achievementDifficulty,
} from "../achievements";
import { AchievementEmoji } from "./achievement-emoji";
import { AchievementPickerDialog } from "./achievement-picker-dialog";

type EarnedAchievement = AchievementDefinition & { unlockedAt: string };

export function FeaturedAchievementsSettings({
  achievements,
  initialSelectedIds,
}: {
  achievements: EarnedAchievement[];
  initialSelectedIds: string[];
}) {
  const fetcher = useFetcher<{
    success?: boolean;
    featuredAchievementIds?: string[];
    error?: string;
  }>();
  const [open, setOpen] = useState(false);
  const [savedIds, setSavedIds] = useState(initialSelectedIds);
  const [draftIds, setDraftIds] = useState(initialSelectedIds);
  const featured = savedIds
    .map((id) => achievements.find((achievement) => achievement.id === id))
    .filter((achievement) => achievement !== undefined);

  useEffect(() => {
    if (!fetcher.data?.success) return;
    const saved = fetcher.data.featuredAchievementIds ?? [];
    setSavedIds(saved);
    setDraftIds(saved);
    setOpen(false);
    invalidateRouteDataCache("profile");
    invalidateRouteDataCache("account");
  }, [fetcher.data]);

  const save = () => {
    const formData = new FormData();
    draftIds.forEach((id) => formData.append("achievementId", id));
    void fetcher.submit(formData, {
      method: "post",
      action: "/api/users/featured-achievements",
    });
  };

  return (
    <>
      <Card className="w-full max-w-screen-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-amber-500" /> 프로필 뱃지
          </CardTitle>
          <CardDescription>
            프로필에 장식할 도전과제 뱃지를 최대 3개까지 선택해요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => {
              const achievement = featured[index];
              const difficulty = achievement
                ? achievementDifficulty(achievement)
                : null;
              const styles = difficulty
                ? ACHIEVEMENT_DIFFICULTY_STYLES[difficulty.tier]
                : null;
              return (
                <div
                  key={achievement?.id ?? `empty-setting-${index}`}
                  className={`bg-muted/45 flex min-h-20 items-center gap-3 rounded-2xl border border-dashed px-4 py-3 ${styles?.card ?? ""}`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-3xl ${styles?.badge ?? ""}`}
                  >
                    {achievement ? (
                      <AchievementEmoji achievement={achievement} />
                    ) : (
                      "＋"
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {achievement?.name ?? "빈 자리"}
                    </span>
                    {styles && (
                      <span
                        className={`mt-1 block text-xs font-bold ${styles.text}`}
                      >
                        {styles.label}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full cursor-pointer"
            disabled={achievements.length === 0}
            onClick={() => {
              setDraftIds(savedIds);
              setOpen(true);
            }}
          >
            <PencilIcon />
            {achievements.length ? "장식할 뱃지 선택" : "획득한 뱃지가 없어요"}
          </Button>
        </CardContent>
      </Card>
      <AchievementPickerDialog
        open={open}
        onOpenChange={setOpen}
        achievements={achievements}
        selectedIds={draftIds}
        onSelectedIdsChange={setDraftIds}
        onSave={save}
        busy={fetcher.state !== "idle"}
        error={fetcher.data?.error}
      />
    </>
  );
}
