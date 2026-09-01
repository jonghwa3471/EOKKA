import type { Route } from "./+types/payments";

import {
  ArrowRightIcon,
  ConstructionIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => [
  { title: `결제내역 | ${import.meta.env.VITE_APP_NAME}` },
];

export default function Payments() {
  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-10 md:px-8 md:pt-12">
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
        <section className="bg-card relative w-full overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#8b5cf620,transparent_48%)]" />
          <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
            <ReceiptTextIcon className="size-8" />
          </div>

          <div className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-500">
            <ConstructionIcon className="size-3.5" /> 준비 중
          </div>

          <h1 className="relative mt-5 text-3xl font-black tracking-tight md:text-4xl">
            결제내역 페이지를 준비하고 있어요
          </h1>
          <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl leading-7">
            이용 중인 요금제와 결제 내역, 영수증을 한곳에서 확인할 수 있도록
            만들고 있어요. 기능이 준비되면 이 페이지에서 바로 확인할 수 있어요.
          </p>

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
