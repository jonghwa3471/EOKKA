import {
  ArrowLeftIcon,
  HomeIcon,
  MessageCircleQuestionIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/core/lib/utils";

import { EokkaLogo } from "./eokka-logo";
import { Button } from "./ui/button";

interface ErrorStateProps {
  code?: string | number;
  eyebrow?: string;
  title: string;
  description: string;
  detail?: string | null;
  stack?: string;
  canGoBack?: boolean;
  className?: string;
}

export function ErrorState({
  code,
  eyebrow = "잠시 길을 잃었어요",
  title,
  description,
  detail,
  stack,
  canGoBack = true,
  className,
}: ErrorStateProps) {
  return (
    <main
      className={cn(
        "bg-background text-foreground relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-[-8rem] bottom-[-10rem] size-[28rem] rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_35%,var(--background)_78%)]" />
      </div>

      <section className="w-full max-w-2xl text-center">
        <div className="relative mx-auto flex size-32 items-center justify-center sm:size-36">
          <div className="absolute inset-0 rounded-full border border-emerald-500/15 bg-emerald-500/5" />
          <div className="absolute inset-3 rounded-full border border-dashed border-emerald-500/25 motion-safe:animate-[spin_18s_linear_infinite]" />
          <EokkaLogo
            className="relative size-20 shadow-[0_18px_55px_-18px_rgba(16,185,129,0.65)] sm:size-24"
            priority
          />
          {code ? (
            <span className="bg-background absolute -right-2 bottom-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.14em] text-emerald-600 shadow-sm dark:text-emerald-400">
              {code}
            </span>
          ) : null}
        </div>

        <p className="mt-7 text-xs font-black tracking-[0.18em] text-emerald-600 uppercase dark:text-emerald-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl leading-7 break-keep sm:text-lg">
          {description}
        </p>

        {detail ? (
          <div className="bg-muted/40 text-muted-foreground mx-auto mt-6 max-w-xl rounded-2xl border px-4 py-3 text-sm leading-6 break-keep">
            {detail}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/15 hover:bg-emerald-600"
          >
            <Link to="/">
              <HomeIcon /> 홈으로 돌아가기
            </Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="rounded-2xl"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon /> 다시 시도하기
          </Button>
          {canGoBack ? (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="rounded-2xl"
              onClick={() => window.history.back()}
            >
              <ArrowLeftIcon /> 이전 화면
            </Button>
          ) : null}
        </div>

        <Link
          to="/contact"
          className="text-muted-foreground hover:text-foreground mt-7 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 transition-colors hover:underline"
        >
          <MessageCircleQuestionIcon className="size-4" /> 문제가 계속되면
          알려주세요
        </Link>

        {stack ? (
          <details className="bg-muted/30 mt-10 rounded-2xl border text-left">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
              개발용 오류 상세 보기
            </summary>
            <pre className="max-h-72 overflow-auto border-t p-4 text-xs leading-5">
              <code>{stack}</code>
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}
