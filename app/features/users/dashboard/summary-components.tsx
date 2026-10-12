import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  TrendingUpIcon,
} from "lucide-react";

import { cn } from "~/core/lib/utils";

import { formatWon } from "./formatters";
import { useRevealOncePerVisit } from "./use-reveal-once-per-visit";

export function Change({
  value,
  suffix,
  inverse = false,
  showDailyPrefix = true,
}: {
  value: number | null;
  suffix: string;
  inverse?: boolean;
  showDailyPrefix?: boolean;
}) {
  if (value === null || value === 0)
    return <span className="text-muted-foreground text-xs">변화 없음</span>;
  const improved = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const direction = inverse
    ? value < 0
      ? "단축"
      : "증가"
    : value > 0
      ? "상승"
      : "하락";
  const formattedValue =
    suffix === "원"
      ? formatWon(Math.abs(value))
      : `${Math.abs(value).toFixed(suffix === "%p" ? 1 : 0)}${suffix}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold",
        improved ? "text-rose-500" : "text-blue-500",
      )}
    >
      <Icon className="size-3.5" />
      {showDailyPrefix && "전일보다 "}
      {formattedValue} {direction}
    </span>
  );
}

export function DailyRecordChange({
  value,
  suffix,
  inverse = false,
  isFirst = false,
}: {
  value: number | null;
  suffix: string;
  inverse?: boolean;
  isFirst?: boolean;
}) {
  if (isFirst)
    return <span className="text-muted-foreground text-[11px]">첫 기록</span>;
  if (value === null)
    return <span className="text-muted-foreground text-[11px]">비교 불가</span>;
  if (value === 0)
    return <span className="text-muted-foreground text-[11px]">변화 없음</span>;

  const improved = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const direction = inverse
    ? value < 0
      ? "단축"
      : "증가"
    : value > 0
      ? "상승"
      : "하락";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 text-[11px] font-bold",
        improved ? "text-rose-500" : "text-blue-500",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(suffix === "%p" ? 1 : 0)}
      {suffix} {direction}
    </span>
  );
}

export function GoalJourney({ progress }: { progress: number }) {
  const { ref, isRevealed } = useRevealOncePerVisit<HTMLDivElement>();

  return (
    <div ref={ref} className="bg-muted/60 mt-6 rounded-2xl p-4">
      <div className="flex justify-between text-xs font-bold">
        <span>목표까지의 여정</span>
        <span>{progress.toFixed(1)}%</span>
      </div>
      <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          style={{
            width: isRevealed ? `${progress}%` : "0%",
            transition: "width 950ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

export function CalculationValue({
  label,
  value,
  description,
  valueClass,
}: {
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-muted/25 rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className={cn("mt-2 text-lg font-black tabular-nums", valueClass)}>
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-[11px] leading-5">
        {description}
      </p>
    </div>
  );
}

export function CalculationChange({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const tone =
    value === null || value === 0
      ? "text-muted-foreground"
      : value > 0
        ? "text-rose-500"
        : "text-blue-500";

  return (
    <div>
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className={cn("mt-1 font-black tabular-nums", tone)}>
        {value === null
          ? "비교 불가"
          : value === 0
            ? "변화 없음"
            : `${value > 0 ? "+" : ""}${formatWon(value)}`}
      </dd>
    </div>
  );
}

export function SummaryCard({
  className,
  icon: Icon,
  label,
  value,
  valueClass,
  detail,
  detailAfterChange = false,
  change,
}: {
  className?: string;
  icon: typeof TrendingUpIcon;
  label: string;
  value: string;
  valueClass?: string;
  detail?: string;
  detailAfterChange?: boolean;
  change: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card h-full rounded-3xl border p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-semibold">
          {label}
        </span>
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className={cn("mt-4 text-2xl font-black", valueClass)}>{value}</p>
      {detail && !detailAfterChange && (
        <p className="mt-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {detail}
        </p>
      )}
      <div className="mt-2">{change}</div>
      {detail && detailAfterChange && (
        <p className="mt-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {detail}
        </p>
      )}
    </div>
  );
}

export function ComparisonRow({
  label,
  value,
  improved,
}: {
  label: string;
  value: string;
  improved: boolean;
}) {
  return (
    <div className="bg-background/40 flex items-center justify-between rounded-2xl border p-4">
      <span className="text-sm font-semibold">{label}</span>
      <span
        className={cn(
          "text-sm font-black",
          improved ? "text-rose-500" : "text-blue-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}
