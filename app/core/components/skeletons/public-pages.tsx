import { ArrowLeftIcon, MessageSquareHeartIcon } from "lucide-react";

import { Skeleton } from "~/core/components/ui/skeleton";

export function ComingSoonSkeleton() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <div className="bg-card w-full max-w-2xl rounded-[2rem] border p-8 text-center md:p-14">
        <Skeleton className="mx-auto size-16 rounded-2xl" />
        <Skeleton className="mx-auto mt-7 h-4 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-9 w-56 max-w-full rounded-xl" />
        <Skeleton className="mx-auto mt-4 h-4 w-full max-w-sm rounded-full" />
        <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full rounded-full" />
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Skeleton className="mx-auto h-4 w-28 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-12 w-3/4 rounded-2xl" />
        <Skeleton className="mx-auto mt-4 h-5 w-full max-w-xl rounded-full" />
        <Skeleton className="mx-auto mt-2 h-5 w-2/3 rounded-full" />
        <div className="mt-8 flex justify-center gap-3">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="mx-auto mt-14 h-72 w-full max-w-5xl rounded-[2rem]" />
    </div>
  );
}

export function ContactSkeleton() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-5 py-32 md:py-48">
      <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <MessageSquareHeartIcon className="mb-4 size-9 text-emerald-500" />
          <h1 className="text-3xl font-black">함께 만드는 EOKKA</h1>
          <p className="text-muted-foreground mt-3">
            불편했던 점이나 바라는 기능을 함께 나눠 주세요. 문의와 운영자의
            답변은 모든 사용자가 볼 수 있어요.
          </p>
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-md" />
      </header>

      <section className="bg-card overflow-hidden rounded-3xl border">
        <div className="border-b px-5 py-4 sm:px-7">
          <h2 className="font-bold">전체 문의</h2>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <span className="text-muted-foreground text-xs">· 최신 작성순</span>
          </div>
        </div>
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[100px_minmax(0,1fr)_88px_100px_100px_16px] sm:px-7"
            >
              <Skeleton className="hidden h-3 w-16 rounded-full sm:block" />
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-7 min-w-20 rounded-full" />
              <Skeleton className="hidden h-3 w-16 rounded-full sm:block" />
              <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
              <Skeleton className="hidden size-4 rounded sm:block" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function LegalSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-10 md:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium">
          <ArrowLeftIcon className="size-4" /> 홈으로
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="border-border bg-muted rounded-full border px-2.5 py-1 font-semibold tracking-[0.12em]">
            LEGAL
          </span>
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>
      <article className="border-border bg-card rounded-3xl border px-6 py-8 shadow-sm md:px-12 md:py-12">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="mt-5 h-4 w-full rounded-full" />
        <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
        {[0, 1, 2].map((section) => (
          <div key={section} className="mt-10">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </article>
    </main>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-svh">
      <div className="border-border/60 flex h-16 items-center border-b px-5 md:px-8">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="hidden h-9 w-24 rounded-full sm:block" />
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
      <div className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.09),transparent_36%),radial-gradient(circle_at_92%_20%,rgba(56,189,248,0.07),transparent_26%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-20 pb-20 md:pt-28 md:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto h-7 w-32 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-12 w-[86%] rounded-2xl sm:h-16 md:h-20" />
            <Skeleton className="mx-auto mt-3 h-12 w-[62%] rounded-2xl sm:hidden" />
            <Skeleton className="mx-auto mt-6 h-5 w-full max-w-xl rounded-full" />
            <Skeleton className="mx-auto mt-5 h-10 w-80 max-w-full rounded-xl" />
            <Skeleton className="mx-auto mt-6 h-12 w-[25rem] max-w-full rounded-2xl" />
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <div className="mb-4 flex justify-center">
              <div className="bg-muted/70 flex rounded-xl p-1">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
            <div className="bg-card/90 overflow-hidden rounded-3xl border shadow-2xl shadow-black/5">
              <div className="flex items-start justify-between gap-5 border-b px-5 py-5 sm:px-8">
                <div className="flex min-w-0 items-start gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="space-y-2.5 pt-0.5">
                    <Skeleton className="h-5 w-40 rounded-full" />
                    <Skeleton className="h-3.5 w-72 max-w-full rounded-full" />
                  </div>
                </div>
                <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
              </div>
              <div className="border-b px-5 py-4 sm:px-8">
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
              <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
                <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
                <div className="bg-muted/35 rounded-2xl border p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="space-y-2">
                        <Skeleton className="h-3.5 w-24 rounded-full" />
                        <Skeleton className="h-11 w-full rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-28 rounded-2xl" />
                  <Skeleton className="h-28 rounded-2xl" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton
                  key={item}
                  className="mx-auto h-5 w-40 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
