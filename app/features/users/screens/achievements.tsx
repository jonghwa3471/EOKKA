import type { Route } from "./+types/achievements";

import { CheckIcon, LockKeyholeIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";

import { ACHIEVEMENTS, type AchievementTone } from "../achievements";
import { syncUserAchievements } from "../achievements.server";

type AchievementFilter = "all" | "earned" | "locked";

const filters: Array<{ value: AchievementFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "earned", label: "획득 완료" },
  { value: "locked", label: "도전 중" },
];

export const meta: Route.MetaFunction = () => [
  { title: `도전과제 | ${import.meta.env.VITE_APP_NAME}` },
];

const toneStyles: Record<
  AchievementTone,
  { badge: string; card: string; glow: string }
> = {
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    card: "border-emerald-500/35",
    glow: "from-emerald-500/16",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    card: "border-amber-500/35",
    glow: "from-amber-500/16",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    card: "border-violet-500/35",
    glow: "from-violet-500/16",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    card: "border-rose-500/35",
    glow: "from-rose-500/16",
  },
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    card: "border-cyan-500/35",
    glow: "from-cyan-500/16",
  },
  blue: {
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    card: "border-blue-500/35",
    glow: "from-blue-500/16",
  },
};

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  return { earned: await syncUserAchievements(user.id) };
}

export default function Achievements({ loaderData }: Route.ComponentProps) {
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const earnedMap = new Map(
    loaderData.earned.map((achievement) => [achievement.id, achievement]),
  );
  const earnedCount = earnedMap.size;
  const progress = Math.round((earnedCount / ACHIEVEMENTS.length) * 100);
  const filteredAchievements = ACHIEVEMENTS.filter((achievement) => {
    if (filter === "earned") return earnedMap.has(achievement.id);
    if (filter === "locked") return !earnedMap.has(achievement.id);
    return true;
  });
  const filterCounts: Record<AchievementFilter, number> = {
    all: ACHIEVEMENTS.length,
    earned: earnedCount,
    locked: ACHIEVEMENTS.length - earnedCount,
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-12 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <TrophyIcon className="size-4" /> EOKKA CHALLENGES
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            도전과제
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
            분석과 기록을 이어가며 투자 습관을 뱃지로 모아보세요. 한 번 획득한
            뱃지는 계속 보관되고 프로필에도 표시돼요.
          </p>
        </header>

        <section className="bg-card relative mt-7 overflow-hidden rounded-[2rem] border p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.13),transparent_45%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold">
                지금까지 모은 뱃지
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums">
                {earnedCount}
                <span className="text-muted-foreground ml-1 text-lg">
                  / {ACHIEVEMENTS.length}
                </span>
              </p>
            </div>
            <div className="w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-black">
                <span>수집 진행도</span>
                <span>{progress}%</span>
              </div>
              <div className="bg-muted h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <div
          className="bg-muted/55 mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border p-1.5"
          role="tablist"
          aria-label="도전과제 달성 상태"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all",
                filter === item.value
                  ? "bg-background text-foreground border shadow-sm"
                  : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                  filter === item.value
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : "bg-background/70",
                )}
              >
                {filterCounts[item.value]}
              </span>
            </button>
          ))}
        </div>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAchievements.map((achievement) => {
            const earned = earnedMap.get(achievement.id);
            const styles = toneStyles[achievement.tone];
            return (
              <article
                key={achievement.id}
                className={cn(
                  "bg-card relative overflow-hidden rounded-3xl border p-5 shadow-sm transition-transform hover:-translate-y-0.5 md:p-6",
                  earned ? styles.card : "border-border/65",
                )}
              >
                {earned && (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent",
                      styles.glow,
                    )}
                  />
                )}
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-2xl text-3xl shadow-sm",
                        earned ? styles.badge : "bg-muted grayscale",
                      )}
                      aria-hidden="true"
                    >
                      {achievement.emoji}
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black",
                        earned
                          ? styles.badge
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {earned ? (
                        <CheckIcon className="size-3" />
                      ) : (
                        <LockKeyholeIcon className="size-3" />
                      )}
                      {earned ? "획득 완료" : "도전 중"}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-4 text-[11px] font-black tracking-[0.12em]">
                    {achievement.category}
                  </p>
                  <h2 className="mt-1.5 text-xl font-black">
                    {achievement.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 font-bold">
                    {achievement.mission}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {achievement.description}
                  </p>
                  {earned && (
                    <p className="text-muted-foreground mt-4 text-xs font-bold">
                      {new Intl.DateTimeFormat("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "Asia/Seoul",
                      }).format(new Date(earned.unlockedAt))}{" "}
                      획득
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        {filteredAchievements.length === 0 && (
          <div className="bg-muted/35 text-muted-foreground mt-4 rounded-3xl border border-dashed px-6 py-14 text-center">
            <TrophyIcon className="mx-auto size-8 opacity-40" />
            <p className="mt-3 font-black">
              {filter === "earned"
                ? "아직 획득한 도전과제가 없어요."
                : "현재 표시할 도전과제가 없어요."}
            </p>
            <p className="mt-1 text-sm">
              분석을 완료하고 첫 뱃지부터 모아보세요.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
