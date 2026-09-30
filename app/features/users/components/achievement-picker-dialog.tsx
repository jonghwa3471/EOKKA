import { CheckIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import { cn } from "~/core/lib/utils";

import {
  ACHIEVEMENT_DIFFICULTY_STYLES,
  type AchievementDefinition,
  achievementDifficulty,
  achievementDifficultyRank,
} from "../achievements";
import { AchievementEmoji } from "./achievement-emoji";

type EarnedAchievement = AchievementDefinition & { unlockedAt: string };

export function AchievementPickerDialog({
  open,
  onOpenChange,
  achievements,
  selectedIds,
  onSelectedIdsChange,
  onSave,
  busy = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievements: EarnedAchievement[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSave: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(
        selectedIds.filter((selectedId) => selectedId !== id),
      );
      return;
    }
    if (selectedIds.length >= 3) return;
    onSelectedIdsChange([...selectedIds, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden rounded-3xl sm:max-w-3xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-black">
            프로필 뱃지 장식
          </DialogTitle>
          <DialogDescription>
            획득한 뱃지 중 최대 3개를 골라 프로필에 전시할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/45 flex min-h-16 items-center gap-3 rounded-2xl border p-3">
          {Array.from({ length: 3 }, (_, index) => {
            const achievement = achievements.find(
              (item) => item.id === selectedIds[index],
            );
            return (
              <div
                key={achievement?.id ?? `empty-${index}`}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed px-3 py-2",
                  achievement && "bg-background border-solid",
                )}
              >
                <span className="text-xl">
                  {achievement ? (
                    <AchievementEmoji achievement={achievement} />
                  ) : (
                    "＋"
                  )}
                </span>
                <span className="truncate text-xs font-black">
                  {achievement?.name ?? "빈 자리"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid max-h-[48vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {[...achievements]
            .sort(
              (left, right) =>
                achievementDifficultyRank(left) -
                achievementDifficultyRank(right),
            )
            .map((achievement) => {
              const difficulty = achievementDifficulty(achievement);
              const styles = ACHIEVEMENT_DIFFICULTY_STYLES[difficulty.tier];
              const selected = selectedIds.includes(achievement.id);
              const disabled = !selected && selectedIds.length >= 3;
              return (
                <Tooltip key={achievement.id} delayDuration={1000}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-disabled={disabled}
                      onClick={() => toggle(achievement.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                        styles.card,
                        selected ? styles.badge : "hover:bg-muted/55",
                        disabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl",
                          styles.badge,
                        )}
                      >
                        <AchievementEmoji achievement={achievement} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {achievement.name}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs font-bold",
                            styles.text,
                          )}
                        >
                          {styles.label} · {achievement.category}
                        </p>
                      </div>
                      {selected && <CheckIcon className="size-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className={cn(
                      "z-[70] max-w-80 rounded-xl px-4 py-3 text-left shadow-xl",
                    )}
                  >
                    <p className="font-black">{achievement.mission}</p>
                    <p className="mt-1.5 leading-5 font-medium opacity-80">
                      {achievement.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
        </div>
        {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" disabled={busy} onClick={onSave}>
            {busy ? "저장 중..." : `${selectedIds.length}개 뱃지 저장`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
