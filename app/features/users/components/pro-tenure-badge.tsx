import type { ProTenureBadge } from "../pro-tenure";

import { cn } from "~/core/lib/utils";

export const proTenureToneStyles: Record<
  ProTenureBadge["tone"],
  { badge: string; card: string; glow: string; ring: string; month: string }
> = {
  emerald: {
    badge: "border-emerald-400/40 shadow-emerald-500/20",
    card: "hover:border-emerald-400/55 hover:shadow-emerald-500/15",
    glow: "bg-emerald-400/35",
    ring: "ring-emerald-400/70",
    month: "border-emerald-300/30 bg-emerald-950",
  },
  cyan: {
    badge: "border-cyan-400/40 shadow-cyan-500/20",
    card: "hover:border-cyan-400/55 hover:shadow-cyan-500/15",
    glow: "bg-cyan-400/35",
    ring: "ring-cyan-400/70",
    month: "border-cyan-300/30 bg-cyan-950",
  },
  violet: {
    badge: "border-violet-400/40 shadow-violet-500/20",
    card: "hover:border-violet-400/55 hover:shadow-violet-500/15",
    glow: "bg-violet-400/35",
    ring: "ring-violet-400/70",
    month: "border-violet-300/30 bg-violet-950",
  },
  amber: {
    badge: "border-amber-400/40 shadow-amber-500/20",
    card: "hover:border-amber-400/55 hover:shadow-amber-500/15",
    glow: "bg-amber-400/35",
    ring: "ring-amber-400/70",
    month: "border-amber-300/30 bg-amber-950",
  },
  rose: {
    badge: "border-rose-400/40 shadow-rose-500/20",
    card: "hover:border-rose-400/55 hover:shadow-rose-500/15",
    glow: "bg-rose-400/35",
    ring: "ring-rose-400/70",
    month: "border-rose-300/30 bg-rose-950",
  },
};

export function ProTenureBadgeView({
  badge,
  className,
  compact = false,
}: {
  badge: ProTenureBadge;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border bg-slate-950/90 font-black text-white shadow-lg backdrop-blur",
        proTenureToneStyles[badge.tone].badge,
        compact
          ? "gap-1 py-0.5 pr-2 pl-1 text-[10px]"
          : "gap-2 py-1.5 pr-3 pl-1.5 text-xs",
        className,
      )}
      title={`${badge.months}개월 구독 배지 · ${badge.name}`}
    >
      <img
        src={badge.image}
        alt=""
        className={cn("object-contain", compact ? "size-6" : "size-8")}
      />
      {badge.name}
    </span>
  );
}
