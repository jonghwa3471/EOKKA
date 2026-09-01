import type { Route } from "./+types/eokka-pro";

import {
  ArrowRightIcon,
  ConstructionIcon,
  CrownIcon,
  SparklesIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => [
  { title: `EOKKA Pro | ${import.meta.env.VITE_APP_NAME}` },
];

export default function EokkaPro() {
  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
        <section className="bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#f59e0b24,transparent_34%),radial-gradient(circle_at_70%_15%,#8b5cf620,transparent_36%)]" />
          <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
            <CrownIcon className="size-8" />
          </div>

          <div className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400">
            <ConstructionIcon className="size-3.5" /> 준비 중
          </div>

          <h1 className="relative mt-5 text-3xl font-black tracking-tight md:text-4xl">
            EOKKA Pro를 준비하고 있어요
          </h1>
          <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl leading-7">
            분석 기록을 기간 제한 없이 보관하고 더 깊은 장기 인사이트를 확인할
            수 있는 Pro 기능을 만들고 있어요. 준비가 끝나면 이 페이지에서 자세한
            혜택을 안내할게요.
          </p>

          <div className="relative mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl border bg-amber-500/5 px-4 py-3 text-sm font-bold text-amber-600 dark:text-amber-400">
            <SparklesIcon className="size-4" /> 더 오래 기록하고, 더 깊게 분석할
            수 있도록 준비 중이에요.
          </div>

          <Button asChild size="lg" className="relative mt-7 rounded-full px-7">
            <Link to="/dashboard">
              대시보드로 돌아가기 <ArrowRightIcon />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
