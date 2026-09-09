import { LoaderCircleIcon, QuoteIcon } from "lucide-react";
import { useMemo } from "react";

import { INVESTMENT_WISDOM } from "~/core/data/investment-wisdom";
import { cn } from "~/core/lib/utils";

export function InvestmentActionLoader({
  title,
  description,
  progress,
  className,
}: {
  title: string;
  description: string;
  progress?: number;
  className?: string;
}) {
  const safeProgress =
    progress === undefined ? undefined : Math.min(100, Math.max(0, progress));
  const wisdom = useMemo(
    () =>
      INVESTMENT_WISDOM[Math.floor(Math.random() * INVESTMENT_WISDOM.length)],
    [title],
  );

  return (
    <div
      className={cn(
        "bg-background/70 fixed inset-0 z-[9999] flex cursor-wait items-center justify-center p-5 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="border-border/70 bg-card/95 relative w-full max-w-xl overflow-hidden rounded-[2rem] border shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_88%_80%,rgba(139,92,246,0.14),transparent_38%)]" />
        <div className="relative grid min-h-64 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="relative min-h-44 overflow-hidden bg-[#07100f] sm:min-h-full">
            <img
              src={wisdom.image}
              alt={`${wisdom.author}를 표현한 투자 캐릭터`}
              className="absolute inset-0 size-full object-cover object-[50%_24%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07100f] via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#07100f]" />
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-7 sm:pl-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
                <LoaderCircleIcon className="size-5 animate-spin" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{title}</p>
                  {safeProgress !== undefined && (
                    <span className="text-xs font-black text-emerald-500 tabular-nums">
                      {Math.round(safeProgress)}%
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {description}
                </p>
              </div>
            </div>

            {safeProgress !== undefined && (
              <div className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            )}

            <blockquote className="mt-5 border-t border-white/10 pt-4">
              <QuoteIcon className="size-4 text-emerald-500/70" />
              <p className="mt-2 text-sm leading-6 font-bold text-balance text-white/95">
                “{wisdom.english}”
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-5 text-balance">
                “{wisdom.korean}”
              </p>
              <footer className="text-muted-foreground mt-1.5 text-[11px] font-semibold">
                {wisdom.author}
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
