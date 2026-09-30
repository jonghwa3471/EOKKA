import type { Route } from "./+types/profile";

import {
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  CrownIcon,
  FingerprintIcon,
  Link2Icon,
  LockKeyholeIcon,
  MailIcon,
  PencilIcon,
  Settings2Icon,
  TrophyIcon,
  UserCircle2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, redirect, useFetcher } from "react-router";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  invalidateRouteDataCache,
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { getPayments } from "~/features/payments/queries";

import {
  ACHIEVEMENT_DIFFICULTY_STYLES,
  type AchievementDefinition,
  achievementDifficulty,
  achievementDifficultyRank,
  achievementsInCategory,
} from "../achievements";
import { syncUserAchievements } from "../achievements.server";
import { getAutomaticAnalysisSettings } from "../automatic-analysis-settings.server";
import { AchievementEmoji } from "../components/achievement-emoji";
import { AchievementPickerDialog } from "../components/achievement-picker-dialog";
import { ProTenureBadgeView } from "../components/pro-tenure-badge";
import { proTenureBadge } from "../pro-tenure";
import { getUserProfile } from "../queries";

export const meta: Route.MetaFunction = () => [
  { title: `프로필 | ${import.meta.env.VITE_APP_NAME}` },
];

const providerNames: Record<string, string> = {
  google: "Google",
  kakao: "Kakao",
  email: "이메일",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "확인할 수 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [
    profile,
    identities,
    analysisHistory,
    accountSettings,
    payments,
    achievements,
  ] = await Promise.all([
    getUserProfile(client, { userId: user.id }),
    client.auth.getUserIdentities(),
    client
      .from("analysis_snapshots")
      .select("goal_amount,saved_on")
      .eq("user_id", user.id)
      .order("saved_on", { ascending: false }),
    getAutomaticAnalysisSettings(user.id),
    getPayments(client, { userId: user.id }),
    syncUserAchievements(user.id),
  ]);

  const analysisRecords = analysisHistory.data ?? [];
  const activeGoalCount = new Set(
    analysisRecords.map((record) => record.goal_amount),
  ).size;
  const proExpiresAt = accountSettings.proExpiresAt?.toISOString() ?? null;
  const isPro = accountSettings.isPro;
  const completedPaymentCount = payments.filter((payment) =>
    ["DONE", "PAID", "APPROVED"].includes(payment.status.toUpperCase()),
  ).length;
  const proTenureMonths = isPro
    ? Math.max(1, completedPaymentCount)
    : completedPaymentCount;
  const earnedAchievementIds = new Set(
    achievements.map((achievement) => achievement.id),
  );

  return {
    name:
      profile?.name ??
      user.user_metadata.name ??
      user.user_metadata.full_name ??
      user.email?.split("@")[0] ??
      "사용자",
    email: user.email ?? "",
    avatarUrl:
      profile?.avatar_url ??
      user.user_metadata.avatar_url ??
      user.user_metadata.picture ??
      "",
    marketingConsent: profile?.marketing_consent ?? false,
    username: profile?.username ?? null,
    createdAt: profile?.created_at ?? user.created_at,
    isPro,
    proExpiresAt,
    analysisCount: analysisRecords.length,
    activeGoalCount,
    latestAnalysisOn: analysisRecords[0]?.saved_on ?? null,
    proTenureMonths,
    achievements,
    featuredAchievementIds: (profile?.featured_achievement_ids ?? []).filter(
      (id) => earnedAchievementIds.has(id),
    ),
    providers:
      identities.data?.identities.map((identity) => identity.provider) ?? [],
  };
}

type ProfileLoaderData = Awaited<ReturnType<typeof loader>>;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<ProfileLoaderData>(
    "profile",
    async () => serverLoader() as Promise<ProfileLoaderData>,
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  usePrimeRouteDataCache("profile", loaderData);
  const badgeFetcher = useFetcher<{
    success?: boolean;
    featuredAchievementIds?: string[];
    error?: string;
  }>();
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementDefinition | null>(null);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const {
    name,
    email,
    avatarUrl,
    marketingConsent,
    createdAt,
    providers,
    isPro,
    proExpiresAt,
    analysisCount,
    activeGoalCount,
    latestAnalysisOn,
    proTenureMonths,
    username,
    achievements,
    featuredAchievementIds,
  } = loaderData;
  const [savedFeaturedIds, setSavedFeaturedIds] = useState(
    featuredAchievementIds,
  );
  const [draftFeaturedIds, setDraftFeaturedIds] = useState(
    featuredAchievementIds,
  );
  const tenureBadge = proTenureBadge(proTenureMonths);
  const earnedAchievementIds = new Set(
    achievements.map((achievement) => achievement.id),
  );
  const featuredAchievements = savedFeaturedIds
    .map((id) => achievements.find((achievement) => achievement.id === id))
    .filter((achievement) => achievement !== undefined);

  useEffect(() => {
    if (!badgeFetcher.data?.success) return;
    const saved = badgeFetcher.data.featuredAchievementIds ?? [];
    setSavedFeaturedIds(saved);
    setDraftFeaturedIds(saved);
    setBadgePickerOpen(false);
    invalidateRouteDataCache("profile");
    invalidateRouteDataCache("account");
  }, [badgeFetcher.data]);

  const saveFeaturedAchievements = () => {
    const formData = new FormData();
    draftFeaturedIds.forEach((id) => formData.append("achievementId", id));
    void badgeFetcher.submit(formData, {
      method: "post",
      action: "/api/users/featured-achievements",
    });
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
              <UserCircle2Icon className="size-4" /> MY PROFILE
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              프로필
            </h1>
            <p className="text-muted-foreground mt-2">
              EOKKA에서 사용 중인 내 정보와 연결 상태를 확인해요.
            </p>
          </div>
          <Button asChild className="rounded-full px-5">
            <Link to="/account/edit" viewTransition>
              <Settings2Icon /> 프로필 설정
            </Link>
          </Button>
        </header>

        <section className="bg-card relative mt-7 overflow-hidden rounded-[2rem] border p-6 shadow-sm md:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_42%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="w-fit shrink-0">
              <Avatar className="ring-background size-24 rounded-3xl shadow-xl ring-4 md:size-28">
                <AvatarImage src={avatarUrl} alt={`${name} 프로필 사진`} />
                <AvatarFallback className="rounded-3xl text-2xl font-black">
                  {name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs font-black tracking-[0.15em] uppercase">
                EOKKA MEMBER
              </p>
              <h2 className="mt-2 truncate text-3xl font-black">{name}</h2>
              {username && (
                <p className="mt-2 flex items-center gap-2 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                  <FingerprintIcon className="size-4 shrink-0" />@{username}
                </p>
              )}
              <p className="text-muted-foreground mt-2 flex items-center gap-2 truncate text-sm">
                <MailIcon className="size-4 shrink-0" /> {email}
              </p>
            </div>
            {tenureBadge && (
              <Link
                to="/dashboard/pro"
                className="w-fit rounded-full transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label={`${tenureBadge.name} 구독 배지 자세히 보기`}
              >
                <ProTenureBadgeView badge={tenureBadge} />
              </Link>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <CrownIcon className="size-5" />
            </div>
            <p className="text-muted-foreground mt-5 text-xs font-bold">
              이용 중인 플랜
            </p>
            <p className="mt-3 text-lg font-black">
              {isPro ? "EOKKA Pro 베타" : "무료 플랜"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {isPro
                ? `${formatDate(proExpiresAt)}까지 이용 가능`
                : "필요할 때 직접 분석할 수 있어요."}
            </p>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <Link2Icon className="size-5" />
            </div>
            <p className="text-muted-foreground mt-5 text-xs font-bold">
              연결된 로그인
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {providers.length ? (
                providers.map((provider) => (
                  <span
                    key={provider}
                    className="bg-muted rounded-full px-3 py-1.5 text-xs font-black"
                  >
                    {providerNames[provider] ?? provider}
                  </span>
                ))
              ) : (
                <strong>연결 정보 없음</strong>
              )}
            </div>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
              <ChartNoAxesCombinedIcon className="size-5" />
            </div>
            <p className="text-muted-foreground mt-5 text-xs font-bold">
              저장된 분석
            </p>
            <p className="mt-3 text-lg font-black">
              {analysisCount.toLocaleString("ko-KR")}개 기록
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {analysisCount > 0
                ? `목표 ${activeGoalCount}개 · 최근 ${formatDate(latestAnalysisOn)}`
                : isPro
                  ? "첫 분석을 저장해 보세요."
                  : "Pro에서 분석 기록을 보관할 수 있어요."}
            </p>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <MailIcon className="size-5" />
            </div>
            <p className="text-muted-foreground mt-5 text-xs font-bold">
              마케팅 정보 수신
            </p>
            <p className="mt-3 text-lg font-black">
              {marketingConsent ? "수신 중" : "수신하지 않음"}
            </p>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CalendarDaysIcon className="size-5" />
            </div>
            <p className="text-muted-foreground mt-5 text-xs font-bold">
              EOKKA와 함께한 날
            </p>
            <p className="mt-3 text-lg font-black">{formatDate(createdAt)}</p>
          </div>
        </section>

        <section className="bg-card mt-4 rounded-3xl border p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-black">
                <TrophyIcon className="size-5 text-amber-500" /> 프로필 뱃지
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                획득한 뱃지 중 마음에 드는 3개를 골라 장식해요.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              onClick={() => {
                setDraftFeaturedIds(savedFeaturedIds);
                setBadgePickerOpen(true);
              }}
            >
              <PencilIcon className="size-3.5" /> 장식 편집
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => {
              const achievement = featuredAchievements[index];
              const difficulty = achievement
                ? achievementDifficulty(achievement)
                : null;
              const difficultyStyles = difficulty
                ? ACHIEVEMENT_DIFFICULTY_STYLES[difficulty.tier]
                : null;
              return achievement ? (
                <button
                  type="button"
                  key={achievement.id}
                  onClick={() => setSelectedAchievement(achievement)}
                  className={`bg-muted/60 hover:bg-muted flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${difficultyStyles?.card ?? ""}`}
                  title={achievement.mission}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-3xl ${difficultyStyles?.badge ?? ""}`}
                    aria-hidden="true"
                  >
                    <AchievementEmoji achievement={achievement} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {achievement.name}
                    </span>
                    <span
                      className={`mt-1 block text-xs font-bold ${difficultyStyles?.text ?? "text-muted-foreground"}`}
                    >
                      {difficultyStyles?.label} · 설명 보기
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  key={`empty-badge-${index}`}
                  onClick={() => {
                    setDraftFeaturedIds(savedFeaturedIds);
                    setBadgePickerOpen(true);
                  }}
                  className="text-muted-foreground hover:bg-muted/45 flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-bold transition-colors"
                >
                  <span className="text-xl">＋</span> 뱃지 선택
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-right">
            <Link
              to="/dashboard/achievements"
              viewTransition
              className="text-muted-foreground hover:text-foreground text-xs font-black transition-colors"
            >
              모든 도전과제 보기 →
            </Link>
          </div>
        </section>

        <AchievementPickerDialog
          open={badgePickerOpen}
          onOpenChange={setBadgePickerOpen}
          achievements={achievements}
          selectedIds={draftFeaturedIds}
          onSelectedIdsChange={setDraftFeaturedIds}
          onSave={saveFeaturedAchievements}
          busy={badgeFetcher.state !== "idle"}
          error={badgeFetcher.data?.error}
        />

        <Dialog
          open={selectedAchievement !== null}
          onOpenChange={(open) => !open && setSelectedAchievement(null)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-5xl lg:overflow-hidden">
            {selectedAchievement &&
              (() => {
                const difficulty = achievementDifficulty(selectedAchievement);
                const difficultyStyles =
                  ACHIEVEMENT_DIFFICULTY_STYLES[difficulty.tier];
                const related = achievementsInCategory(
                  selectedAchievement.category,
                ).sort(
                  (left, right) =>
                    achievementDifficultyRank(left) -
                    achievementDifficultyRank(right),
                );
                const earned = achievements.find(
                  (achievement) => achievement.id === selectedAchievement.id,
                );
                return (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
                    <div className="min-w-0 lg:flex lg:flex-col lg:justify-center">
                      <DialogHeader className="items-center text-center sm:text-center">
                        <div
                          className={`mb-2 flex size-16 items-center justify-center rounded-2xl text-4xl ${difficultyStyles.badge}`}
                        >
                          <AchievementEmoji achievement={selectedAchievement} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${
                              earned
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {earned ? "획득 완료" : "도전 중"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${difficultyStyles.badge}`}
                          >
                            {difficultyStyles.label} 난이도
                          </span>
                        </div>
                        <DialogTitle className="pt-2 text-2xl font-black">
                          {selectedAchievement.name}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6">
                          {selectedAchievement.category} 도전과제
                        </DialogDescription>
                      </DialogHeader>

                      <div className="bg-muted/45 mt-5 rounded-2xl border p-4">
                        <p className="text-center font-black">
                          {selectedAchievement.mission}
                        </p>
                        <p className="text-muted-foreground mt-2 text-center text-sm leading-6">
                          {selectedAchievement.description}
                        </p>
                        {earned && (
                          <p className="text-muted-foreground mt-3 text-center text-xs font-bold">
                            {formatDate(earned.unlockedAt)} 획득
                          </p>
                        )}
                      </div>
                    </div>

                    <section className="min-w-0 lg:border-l lg:pl-6">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <h3 className="font-black">같은 카테고리 도전과제</h3>
                          <p className="text-muted-foreground mt-1 text-xs">
                            위에서 아래로 갈수록 달성 난이도가 높아져요.
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs font-black">
                          {
                            related.filter((item) =>
                              earnedAchievementIds.has(item.id),
                            ).length
                          }
                          /{related.length} 획득
                        </span>
                      </div>
                      <div className="mt-3 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                        {related.map((achievement) => {
                          const itemDifficulty =
                            achievementDifficulty(achievement);
                          const itemStyles =
                            ACHIEVEMENT_DIFFICULTY_STYLES[itemDifficulty.tier];
                          const isEarned = earnedAchievementIds.has(
                            achievement.id,
                          );
                          const isSelected =
                            achievement.id === selectedAchievement.id;
                          return (
                            <button
                              type="button"
                              key={achievement.id}
                              onClick={() =>
                                setSelectedAchievement(achievement)
                              }
                              aria-pressed={isSelected}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                                isSelected
                                  ? `${itemStyles.card} ${itemStyles.badge}`
                                  : "bg-card hover:bg-muted/55"
                              }`}
                            >
                              <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg ${itemStyles.badge}`}
                              >
                                <AchievementEmoji achievement={achievement} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs font-black ${itemStyles.text}`}
                                >
                                  {itemStyles.label} 난이도
                                </p>
                                <p className="truncate text-sm font-black">
                                  {achievement.name}
                                </p>
                              </div>
                              <span
                                className={`flex shrink-0 items-center gap-1 text-xs font-black ${
                                  isEarned
                                    ? "text-emerald-600 dark:text-emerald-300"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isEarned ? (
                                  <CheckIcon className="size-3.5" />
                                ) : (
                                  <LockKeyholeIcon className="size-3.5" />
                                )}
                                {isEarned ? "획득" : "도전 중"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>

        <section className="mt-4 flex flex-col gap-4 rounded-3xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <p className="font-black">정보를 바꾸고 싶나요?</p>
            <p className="text-muted-foreground mt-1 text-sm">
              프로필 사진과 이름, 연결 계정 및 데이터 설정을 관리할 수 있어요.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/account/edit" viewTransition>
              <Settings2Icon /> 설정으로 이동
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
