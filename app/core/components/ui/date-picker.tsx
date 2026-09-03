import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "./button";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  min,
  max,
  required,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const initialDate =
    parseDate(selectedValue) ?? parseDate(max ?? "") ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;

      // Radix Select renders its menu in a portal outside the date picker.
      // Treat year/month menu interactions as part of the calendar so only
      // selecting an actual day (or clicking outside) closes the picker.
      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"]')
      ) {
        return;
      }

      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const update = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    const date = parseDate(nextValue);
    if (date) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();
  const lastDate = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= lastDate ? day : null;
  });
  const minYear =
    parseDate(min ?? "")?.getFullYear() ?? new Date().getFullYear() - 100;
  const maxYear =
    parseDate(max ?? "")?.getFullYear() ?? new Date().getFullYear() + 20;
  const years = Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, index) => maxYear - index,
  );

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          name={name}
          value={selectedValue}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          required={required}
          onChange={(event) => update(event.target.value)}
          className="pr-11 tabular-nums"
        />
        <button
          type="button"
          aria-label="달력 열기"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors hover:bg-emerald-500/10"
        >
          <CalendarDaysIcon className="size-4" />
        </button>
      </div>
      {open && (
        <div className="border-border/80 bg-popover text-popover-foreground absolute top-[calc(100%+8px)] left-0 z-50 w-[min(310px,calc(100vw-3rem))] rounded-2xl border p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              aria-label="이전 달"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Select
                value={String(visibleMonth.getFullYear())}
                onValueChange={(value) =>
                  setVisibleMonth(
                    new Date(Number(value), visibleMonth.getMonth(), 1),
                  )
                }
              >
                <SelectTrigger
                  aria-label="연도 선택"
                  size="sm"
                  className="w-[104px] rounded-lg"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(visibleMonth.getMonth() + 1)}
                onValueChange={(value) =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), Number(value) - 1, 1),
                  )
                }
              >
                <SelectTrigger
                  aria-label="월 선택"
                  size="sm"
                  className="w-[82px] rounded-lg"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (month) => (
                      <SelectItem key={month} value={String(month)}>
                        {month}월
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              aria-label="다음 달"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold">
            {weekdays.map((weekday, index) => (
              <span
                key={weekday}
                className={
                  index === 0
                    ? "py-2 text-rose-500"
                    : index === 6
                      ? "py-2 text-blue-500"
                      : "text-muted-foreground py-2"
                }
              >
                {weekday}
              </span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const date = isoDate(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  day,
                ),
              );
              const disabled = Boolean(
                (min && date < min) || (max && date > max),
              );
              const selected = date === selectedValue;
              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    update(date);
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${selected ? "bg-emerald-500 text-black" : "hover:bg-emerald-500/12"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {max && (
            <button
              type="button"
              className="mt-3 w-full rounded-xl border py-2 text-xs font-black text-emerald-500 transition-colors hover:bg-emerald-500/10"
              onClick={() => {
                update(max);
                setOpen(false);
              }}
            >
              오늘 선택
            </button>
          )}
        </div>
      )}
    </div>
  );
}
