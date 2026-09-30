import type { AchievementDefinition } from "../achievements";

import { cn } from "~/core/lib/utils";

export function AchievementEmoji({
  achievement,
  className,
}: {
  achievement: AchievementDefinition;
  className?: string;
}) {
  const buffettCount = Number(
    achievement.name.match(/^([123])버핏$/)?.[1] ?? 0,
  );

  if (!buffettCount)
    return <span className={className}>{achievement.emoji}</span>;

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      aria-label={`${achievement.name} 뱃지`}
    >
      {Array.from({ length: buffettCount }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn("relative", index > 0 && "-ml-[0.38em]")}
          style={{ zIndex: index + 1 }}
        >
          🦬
        </span>
      ))}
    </span>
  );
}
