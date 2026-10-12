import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";

import { type RouteSkeletonVariant } from "./types";

const pageCopy: Partial<
  Record<
    RouteSkeletonVariant,
    { eyebrow: string; title: string; description: string }
  >
> = {
  dashboard: {
    eyebrow: "투자 리포트",
    title: "",
    description: "",
  },
  history: {
    eyebrow: "MY ANALYSIS",
    title: "분석 기록",
    description:
      "날짜를 선택하면 해당일에 분석한 포트폴리오와 목표별 결과를 다시 볼 수 있어요.",
  },
  achievements: {
    eyebrow: "EOKKA CHALLENGES",
    title: "도전과제",
    description: "분석과 기록을 이어가며 투자 습관을 뱃지로 모아보세요.",
  },
  portfolio: {
    eyebrow: "MANAGED PORTFOLIO",
    title: "내 포트폴리오",
    description:
      "매수·매도 날짜와 당시 환율을 기록해 실제 원화 매입원금으로 분석해요.",
  },
  "precise-analysis": {
    eyebrow: "PRECISE ANALYSIS",
    title: "정밀 분석",
    description:
      "매매일지의 거래일과 당시 환율을 반영해 포트폴리오를 분석해요.",
  },
  insights: {
    eyebrow: "PORTFOLIO INSIGHTS",
    title: "기록 속에서 찾은 투자 인사이트",
    description: "선택한 목표로 저장된 모든 기록을 함께 분석했어요.",
  },
  account: {
    eyebrow: "MY PROFILE",
    title: "프로필",
    description: "내 정보와 연결된 로그인 수단을 한곳에서 확인해요.",
  },
  payments: {
    eyebrow: "PAYMENT HISTORY",
    title: "결제내역",
    description: "이용 중인 요금제와 결제 기록, 영수증을 한곳에서 확인하세요.",
  },
  notifications: {
    eyebrow: "NOTIFICATIONS",
    title: "알림",
    description:
      "분석 갱신과 기록 변경처럼 놓치면 안 되는 소식을 모아 보여드려요.",
  },
  admin: {
    eyebrow: "ADMIN ONLY",
    title: "EOKKA 운영 관리",
    description: "사용자의 목소리를 확인하고 서비스 소식을 관리해요.",
  },
  pro: {
    eyebrow: "EOKKA PRO",
    title: "기록이 쌓일수록 더 선명해지는 투자 흐름",
    description: "직접 분석한 장기 기록으로 포트폴리오 변화를 이어서 확인해요.",
  },
  home: {
    eyebrow: "EOKKA",
    title: "내 투자 목표를 더 쉽게 이해해요",
    description: "포트폴리오를 분석하고 목표까지의 흐름을 한눈에 살펴보세요.",
  },
  contact: {
    eyebrow: "SUPPORT",
    title: "함께 만드는 EOKKA",
    description: "불편했던 점이나 바라는 기능을 함께 나눠 주세요.",
  },
  about: {
    eyebrow: "ABOUT EOKKA",
    title: "투자 목표를 이해하기 쉽게",
    description: "EOKKA가 어떤 방식으로 투자 여정을 보여주는지 소개해요.",
  },
  methodology: {
    eyebrow: "METHODOLOGY",
    title: "분석 방법",
    description: "포트폴리오 분석과 시나리오 계산 기준을 알려드려요.",
  },
  auth: {
    eyebrow: "WELCOME TO EOKKA",
    title: "계정을 확인하고 있어요",
    description: "안전한 로그인을 위한 화면을 준비하고 있어요.",
  },
  legal: {
    eyebrow: "EOKKA POLICY",
    title: "서비스 정책",
    description: "안전한 서비스 이용을 위한 내용을 확인해요.",
  },
};

export function PageHeading({
  variant,
  action = false,
}: {
  variant: RouteSkeletonVariant;
  action?: boolean;
}) {
  const copy = pageCopy[variant];
  const hasDynamicHeading = variant === "dashboard";
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="w-full max-w-xl">
        <p className="text-sm font-black text-emerald-500">{copy?.eyebrow}</p>
        {hasDynamicHeading ? (
          <>
            <Skeleton className="mt-2 h-10 w-72 max-w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              {copy?.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {copy?.description}
            </p>
          </>
        )}
      </div>
      {action && (
        <Skeleton className="hidden h-10 w-32 rounded-full sm:block" />
      )}
    </div>
  );
}

export function MetricCard() {
  return (
    <div className="bg-card rounded-3xl border p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-4 w-24 rounded-full" />
      <Skeleton className="mt-3 h-8 w-36 rounded-lg" />
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
    </div>
  );
}

export function ChartCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-card rounded-3xl border p-5">
      <Skeleton className="h-5 w-40 rounded-full" />
      <Skeleton className="mt-2 h-3 w-56 max-w-full rounded-full" />
      <div
        className={cn(
          "mt-7 flex items-end gap-3 border-b border-dashed pb-1",
          compact ? "h-36" : "h-52",
        )}
      >
        {[42, 68, 55, 82, 63, 91, 76].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-xl"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}
