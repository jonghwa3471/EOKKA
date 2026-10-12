import { CheckIcon, CreditCardIcon, CrownIcon, TrophyIcon } from "lucide-react";

import { Skeleton } from "~/core/components/ui/skeleton";
import { cn } from "~/core/lib/utils";

import { MetricCard, PageHeading } from "./primitives";

function AccountCardSkeleton({
  height,
  danger = false,
  fields = 1,
}: {
  height: string;
  danger?: boolean;
  fields?: number;
}) {
  return (
    <div
      className={cn(
        "bg-card w-full rounded-xl border p-6 shadow-sm",
        height,
        danger && "border-red-500/35 bg-red-500/[0.04]",
      )}
    >
      <div className="flex items-start gap-3">
        {danger && <Skeleton className="size-10 shrink-0 rounded-xl" />}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40 max-w-full rounded-lg" />
          <Skeleton className="h-3 w-80 max-w-full rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {Array.from({ length: fields }, (_, field) => (
          <div key={field} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      {danger && <Skeleton className="mt-6 h-10 w-full rounded-md" />}
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-10">
      <div className="bg-card min-h-[25rem] w-full rounded-xl border p-6 shadow-sm">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full rounded-full" />
        <div className="mt-6 flex items-center gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-4 w-48 max-w-full rounded-full" />
          </div>
        </div>
        <div className="mt-7 space-y-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="mt-6 h-10 w-full rounded-md" />
      </div>
      <div className="bg-card w-full rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 font-black">
          <TrophyIcon className="size-5 text-amber-500" /> 프로필 뱃지
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          프로필에 장식할 도전과제 뱃지를 최대 3개까지 선택해요.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-md" />
      </div>
      <AccountCardSkeleton height="min-h-[13rem]" />
      <AccountCardSkeleton height="min-h-[16rem]" fields={2} />
      <AccountCardSkeleton height="min-h-[17rem]" danger />
      <AccountCardSkeleton height="min-h-[18rem]" danger />
    </div>
  );
}

export function ProSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="via-background grid gap-8 rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-violet-500/[0.08] p-7 md:p-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
            <CrownIcon className="size-3.5" /> EOKKA Pro 베타
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
            기록은 차곡차곡,
            <br />
            투자 판단은 더 차분하게
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 break-keep md:text-base">
            필요할 때 최신 종가로 포트폴리오를 분석하고, 쌓인 변화를
            주간·월간·연간 인사이트로 확인하세요. 베타 기간에는 결제 없이 경험할
            수 있어요.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["상세 기록 30개", "장기 흐름 보관", "하루 5회"].map((benefit) => (
              <span
                key={benefit}
                className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
              >
                <CheckIcon className="size-3.5 text-emerald-500" />
                {benefit}
              </span>
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
      <div className="mt-8 text-center">
        <p className="text-xs font-black tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">
          Plan comparison
        </p>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">
          무료와 Pro, 무엇이 다른가요?
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          무료로 분석 결과를 바로 확인하고, Pro에서는 결과를 저장해 시간에 따른
          변화까지 이어서 확인할 수 있어요.
        </p>
      </div>
      <div className="bg-card mt-6 rounded-3xl border p-6">
        <div className="grid grid-cols-3 gap-4 border-b pb-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-5 rounded-full" />
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((cell) => (
                <Skeleton key={cell} className="h-4 rounded-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaymentsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeading variant="payments" action />
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <MetricCard key={item} />
        ))}
      </div>
      <div className="bg-card mt-7 rounded-3xl border p-6">
        <div className="flex items-center justify-between border-b pb-5">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <div className="space-y-4 pt-5">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  const features = [
    "최대 20종목 분석",
    "목표 금액 1개 저장",
    "상세 기록 30개 · 장기 흐름 보관",
    "수동 분석 하루 5회",
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-20">
      <section className="overflow-hidden rounded-[2rem] border border-amber-500/25 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_40%)] shadow-xl">
        <div className="p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300">
            <CreditCardIcon className="size-3.5" /> 월 자동결제
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            EOKKA Pro 베타
          </h1>
          <div className="mt-3 flex items-end gap-1">
            <strong className="text-4xl font-black">990원</strong>
            <span className="text-muted-foreground pb-1 text-sm">/ 월</span>
          </div>
          <ul className="mt-7 grid gap-3 text-sm font-semibold sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-emerald-500" /> {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-muted/35 border-t p-6 sm:p-8">
          <p className="text-muted-foreground text-xs leading-5 break-keep">
            카드를 한 번 등록하면 매월 같은 날짜에 990원이 자동 결제됩니다.
            언제든 해지할 수 있으며, 해지 후에도 현재 결제 기간까지 Pro를 이용할
            수 있어요. 이미 결제된 이용 기간은 단순 변심으로 환불되지 않습니다.
          </p>
          <Skeleton className="mt-5 h-11 w-full rounded-2xl" />
          <div className="mt-2 flex h-9 w-full items-center justify-center text-sm font-medium">
            돌아가기
          </div>
        </div>
      </section>
    </main>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeading variant="notifications" action />
      <div className="bg-card mt-7 overflow-hidden rounded-3xl border">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="divide-y px-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-start gap-4 py-5">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-3 w-full max-w-xl rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <>
      <PageHeading variant="admin" />
      <div className="mt-7 grid grid-cols-2 gap-4">
        <MetricCard />
        <MetricCard />
      </div>
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="bg-card mt-6 overflow-hidden rounded-3xl border">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-72 rounded-full" />
        </div>
        <div className="divide-y px-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="my-4 h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}
