import { ChartNoAxesCombinedIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import { cn } from "~/core/lib/utils";

import { formatWon } from "./formatters";
import { type History } from "./history-insights";
import { shiftDate } from "./trend-data";

function profitTileTone(change: number | null, intensity: number) {
  if (change === null || Math.abs(change) < 1) {
    return "border-border/70 bg-muted/70 hover:bg-muted";
  }
  const gainTones = [
    "border-rose-300/60 bg-rose-300/55 hover:bg-rose-300/75 dark:border-rose-800 dark:bg-rose-950/70",
    "border-rose-400/70 bg-rose-400/65 hover:bg-rose-400/85 dark:border-rose-700 dark:bg-rose-900/75",
    "border-rose-500/80 bg-rose-500/75 hover:bg-rose-500/90 dark:border-rose-600 dark:bg-rose-800/80",
    "border-rose-600 bg-rose-600 hover:bg-rose-500 dark:border-rose-500 dark:bg-rose-700",
  ];
  const lossTones = [
    "border-blue-300/60 bg-blue-300/55 hover:bg-blue-300/75 dark:border-blue-800 dark:bg-blue-950/70",
    "border-blue-400/70 bg-blue-400/65 hover:bg-blue-400/85 dark:border-blue-700 dark:bg-blue-900/75",
    "border-blue-500/80 bg-blue-500/75 hover:bg-blue-500/90 dark:border-blue-600 dark:bg-blue-800/80",
    "border-blue-600 bg-blue-600 hover:bg-blue-500 dark:border-blue-500 dark:bg-blue-700",
  ];
  return (change > 0 ? gainTones : lossTones)[
    Math.min(3, Math.max(0, intensity - 1))
  ];
}

export function ProfitContributionGrid({ history }: { history: History }) {
  const records = history;
  const latestDate = records.at(-1)?.savedOn;
  if (!latestDate) return null;

  const availableYears = [
    ...new Set(records.map((item) => Number(item.savedOn.slice(0, 4)))),
  ].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  const recordsWithChanges = records.map((item, index) => {
    const previous = records[index - 1];
    return {
      item,
      previous,
      profitChange: previous ? item.profit - previous.profit : null,
      returnChange: previous ? item.returnRate - previous.returnRate : null,
    };
  });
  const recordByDate = new Map(
    recordsWithChanges.map((record) => [record.item.savedOn, record]),
  );
  const magnitudes = recordsWithChanges
    .flatMap(({ profitChange }) =>
      profitChange === null || Math.abs(profitChange) < 1
        ? []
        : [Math.abs(profitChange)],
    )
    .sort((a, b) => a - b);
  const intensityFor = (change: number | null) => {
    if (change === null || Math.abs(change) < 1 || magnitudes.length === 0) {
      return 0;
    }
    const rank = magnitudes.findIndex((value) => value >= Math.abs(change));
    const percentile = (Math.max(0, rank) + 1) / magnitudes.length;
    return Math.min(4, Math.max(1, Math.ceil(percentile * 4)));
  };
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const startWeekday = new Date(`${yearStart}T12:00:00Z`).getUTCDay();
  const calendarStart = shiftDate(yearStart, -startWeekday);
  const endWeekday = new Date(`${yearEnd}T12:00:00Z`).getUTCDay();
  const calendarEnd = shiftDate(yearEnd, 6 - endWeekday);
  const calendarDays =
    Math.round(
      (new Date(`${calendarEnd}T12:00:00Z`).getTime() -
        new Date(`${calendarStart}T12:00:00Z`).getTime()) /
        86_400_000,
    ) + 1;
  const dates = Array.from({ length: calendarDays }, (_, index) =>
    shiftDate(calendarStart, index),
  );
  const monthMarkers = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const offset = Math.round(
      (new Date(`${date}T12:00:00Z`).getTime() -
        new Date(`${calendarStart}T12:00:00Z`).getTime()) /
        86_400_000,
    );
    return { month: monthIndex + 1, week: Math.floor(offset / 7) };
  });

  return (
    <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <ChartNoAxesCombinedIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-black">연도별 손익 흐름</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {selectedYear}년 · 직전 저장 기록 대비 평가손익 변화
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label
            className="text-muted-foreground text-xs font-bold"
            htmlFor="profit-grid-year"
          >
            연도
          </label>
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger id="profit-grid-year" className="w-[108px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="relative ml-9 h-5">
            {monthMarkers.map(({ month, week }) => (
              <span
                key={month}
                className="text-muted-foreground absolute text-[10px] font-bold"
                style={{ left: `${week * 14}px` }}
              >
                {month}월
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2">
            <div className="text-muted-foreground grid h-[90px] w-7 shrink-0 grid-rows-7 text-[9px] font-semibold">
              <span />
              <span className="self-center">월</span>
              <span />
              <span className="self-center">수</span>
              <span />
              <span className="self-center">금</span>
              <span />
            </div>
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
              {dates.map((date) => {
                const isSelectedYear = date.startsWith(String(selectedYear));
                const record = recordByDate.get(date);
                const change = record?.profitChange ?? null;
                const intensity = intensityFor(change);
                const tileClass = cn(
                  "size-[11px] rounded-[3px] border transition duration-200",
                  !isSelectedYear
                    ? "border-transparent bg-transparent"
                    : record
                      ? profitTileTone(change, intensity)
                      : "border-border/40 bg-muted/35 hover:bg-muted/55",
                );
                const month = Number(date.slice(5, 7));
                const day = Number(date.slice(8, 10));

                return (
                  <Tooltip key={date}>
                    <TooltipTrigger asChild>
                      {record && isSelectedYear ? (
                        <Link
                          to={`/dashboard/history?month=${date.slice(0, 7)}&date=${date}`}
                          className={tileClass}
                          aria-label={`${month}월 ${day}일 분석 기록 보기`}
                        />
                      ) : isSelectedYear ? (
                        <span
                          className={tileClass}
                          aria-label={`${month}월 ${day}일 분석 기록 없음`}
                        />
                      ) : (
                        <span className={tileClass} aria-hidden="true" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={8}
                      className="max-w-64 p-3"
                    >
                      <p className="font-black">
                        {date.replaceAll("-", ".")}{" "}
                        {record ? "분석" : "기록 없음"}
                      </p>
                      {record && change !== null ? (
                        <div className="mt-1.5 space-y-1 text-[11px]">
                          <p>
                            평가손익 {change >= 0 ? "+" : "-"}
                            {formatWon(Math.abs(change))}
                          </p>
                          <p>
                            수익률 {record.returnChange! >= 0 ? "+" : ""}
                            {record.returnChange!.toFixed(1)}%p
                          </p>
                          <p className="opacity-70">
                            {record.previous?.savedOn === shiftDate(date, -1)
                              ? "전일 기록과 비교했어요."
                              : "직전 저장 기록과 비교했어요."}
                          </p>
                        </div>
                      ) : record ? (
                        <p className="mt-1.5 text-[11px] opacity-70">
                          비교할 이전 기록이 없는 첫 분석이에요.
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] opacity-70">
                          이 날짜에는 저장된 분석이 없어요.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div className="text-muted-foreground mt-4 flex items-center justify-end gap-1.5 text-[10px] font-semibold">
            <span>손해</span>
            <span className="size-3 rounded-[3px] bg-blue-600" />
            <span className="size-3 rounded-[3px] bg-blue-300/70 dark:bg-blue-950" />
            <span className="bg-muted size-3 rounded-[3px] border" />
            <span className="size-3 rounded-[3px] bg-rose-300/70 dark:bg-rose-950" />
            <span className="size-3 rounded-[3px] bg-rose-600" />
            <span>수익</span>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground mt-4 text-xs leading-5">
        추가 매수·매도나 보유 수량 변경이 있었다면 평가손익 변화에도 함께 반영될
        수 있어요. 타일을 누르면 해당 날짜의 분석 기록으로 이동해요.
      </p>
    </div>
  );
}
