import type { AnalysisResult } from "../analysis.types";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";

import { InvestmentCharacterCard } from "./investment-character-card";

const colors = {
  conservative: "#f59e0b",
  base: "#10b981",
  optimistic: "#0ea5e9",
  market: "#a78bfa",
};
const allocationColors = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#f97316",
  "#ec4899",
];
const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const price = (value: number, currency: "KRW" | "USD") =>
  currency === "USD"
    ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : won(value);
const compactWon = (value: number) => {
  const rounded = Math.round(value);
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  if (eok > 0)
    return man > 0
      ? `${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만원`
      : `${eok.toLocaleString("ko-KR")}억원`;
  if (man > 0) return `${man.toLocaleString("ko-KR")}만원`;
  return won(rounded);
};
const percent = (value: number | null) =>
  value === null ? "데이터 부족" : `${value.toFixed(1)}%`;
const projectionAnnualRate = (
  futureValue: number,
  currentValue: number,
  years: number,
) =>
  currentValue > 0 && futureValue > 0
    ? ((futureValue / currentValue) ** (1 / years) - 1) * 100
    : -100;
const goalLabel = (value: number) =>
  `${(value / 100_000_000).toLocaleString("ko-KR")}억`;

function useChartRevealOnce<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const { key: pageVisitKey } = useLocation();
  const previousPageVisitKey = useRef(pageVisitKey);

  useEffect(() => {
    if (previousPageVisitKey.current === pageVisitKey) return;
    previousPageVisitKey.current = pageVisitKey;
    setIsRevealed(false);
  }, [pageVisitKey]);

  useEffect(() => {
    const element = ref.current;
    if (!element || isRevealed) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isRevealed, pageVisitKey, threshold]);

  return { ref, isRevealed };
}

function RollingNumber({
  value,
  isActive,
  format,
  delay = 0,
  duration = 950,
}: {
  value: number;
  isActive: boolean;
  format: (displayValue: number) => string;
  delay?: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayValue(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    let startedAt = 0;
    const timeout = window.setTimeout(() => {
      const animate = (time: number) => {
        if (startedAt === 0) startedAt = time;
        const progress = Math.min(1, (time - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        const remainingJitter = progress < 0.72 ? 1 - progress / 0.72 : 0;
        const jitter =
          (Math.random() - 0.5) *
          Math.max(Math.abs(value) * 0.12, 8) *
          remainingJitter;
        const nextValue = progress === 1 ? value : value * eased + jitter;
        setDisplayValue(nextValue);
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, isActive, value]);

  return (
    <span className="inline-block tabular-nums" aria-label={format(value)}>
      <span aria-hidden="true">{format(displayValue)}</span>
    </span>
  );
}

const purchasePosition = (rangePosition: number) => {
  if (rangePosition <= 20)
    return {
      label: "발에서 샀어요",
      y: 87,
      face: "♥‿♥",
      bubble: "완전 잘 샀다!",
      faceTone: "text-pink-400",
    };
  if (rangePosition <= 40)
    return {
      label: "무릎에서 샀어요",
      y: 78,
      face: "^‿^",
      bubble: "제법 좋은데?",
      faceTone: "text-emerald-300",
    };
  if (rangePosition <= 60)
    return {
      label: "배에서 샀어요",
      y: 65,
      face: "•ᴗ•",
      bubble: "나쁘지 않아요",
      faceTone: "text-amber-200",
    };
  if (rangePosition <= 80)
    return {
      label: "어깨에서 샀어요",
      y: 49,
      face: "•_•",
      bubble: "…",
      faceTone: "text-slate-200",
    };
  return {
    label: "머리에서 샀어요",
    y: 28,
    face: "×﹏×",
    bubble: "조금 비싸게 샀어요",
    faceTone: "text-rose-300",
  };
};

function PurchasePositionCharacter({
  holding,
}: {
  holding: AnalysisResult["holdings"][number];
}) {
  const data = holding.purchasePosition;
  const hasCalculatedPosition =
    data && typeof data.tenYearPosition === "number";
  const position = hasCalculatedPosition
    ? purchasePosition(data.tenYearPosition)
    : {
        label: "위치 계산 전",
        y: 65,
        face: "•_•",
        bubble: "다시 분석해 주세요",
        faceTone: "text-slate-300",
      };
  const averagePrice =
    holding.returnRate > -100
      ? holding.currentPrice / (1 + holding.returnRate / 100)
      : 0;
  return (
    <div className="mx-auto mt-6 w-full max-w-md min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#171d21]">
      <div className="px-6 pt-6 pb-3">
        <p className="text-2xl font-black text-white">{holding.name}</p>
        <p
          className={`mt-2 text-xl font-bold ${holding.returnRate >= 0 ? "text-rose-400" : "text-blue-400"}`}
        >
          {holding.returnRate >= 0 ? "+" : ""}
          {holding.returnRate.toFixed(2)}%
        </p>
        <p className="mt-3 text-sm text-white/55">
          내 평균가 {price(averagePrice, holding.currency)}
        </p>
      </div>
      <div className="relative h-[320px] w-full overflow-hidden bg-[#071018]">
        <img
          src="/images/purchase-position-human.png?v=2"
          alt="매수 위치를 표시하는 둥근 사람 실루엣"
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
        <div
          className={`absolute top-[27%] left-[37%] z-10 -translate-x-1/2 -translate-y-1/2 text-2xl font-black tracking-tighter ${position.faceTone}`}
          aria-hidden="true"
        >
          {position.face}
        </div>
        <div className="absolute top-[12%] left-[54%] z-10 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs font-black whitespace-nowrap text-slate-900 shadow-xl">
          {position.bubble}
        </div>
        <div
          className="absolute right-5 left-[43%] z-10 flex -translate-y-1/2 items-center"
          style={{ top: `${position.y}%` }}
        >
          <span className="min-w-7 flex-1 border-t-2 border-dashed border-white" />
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black whitespace-nowrap text-slate-900 shadow-lg">
            {position.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function remainingPeriodLabel(month: number | null) {
  if (month === null) return "30년 내 도달이 어려워요";
  if (month === 0) return "목표를 달성했어요!";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${period} 남았어요`;
}

function goalDurationLabel(month: number | null) {
  if (month === null) return "30년 내 미도달";
  if (month === 0) return "현재 목표 달성";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `약 ${period}`;
}

function periodOnlyLabel(months: number) {
  if (months <= 0) return "변화 없음";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function PortfolioAllocation({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  const totalValue = result.holdings.reduce(
    (sum, holding) => sum + Math.max(0, holding.valueKrw),
    0,
  );
  const allocations = result.holdings
    .map((holding, originalIndex) => ({
      ...holding,
      color: allocationColors[originalIndex % allocationColors.length],
      ratio:
        totalValue > 0 ? (Math.max(0, holding.valueKrw) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio);
  let cursor = 0;
  const gradient = allocations
    .map((holding) => {
      const start = cursor;
      cursor += holding.ratio;
      return `${holding.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <section
      ref={ref}
      className="mt-6 rounded-2xl border bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-5"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto shrink-0 sm:mx-0">
          <div
            className="relative size-40 rounded-full shadow-lg shadow-emerald-500/10"
            style={{
              background: gradient
                ? `conic-gradient(${gradient})`
                : "var(--muted)",
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed
                ? "rotate(0deg) scale(1)"
                : "rotate(-70deg) scale(0.72)",
              transition:
                "opacity 450ms ease-out, transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            role="img"
            aria-label={`현재 평가금액 기준 ${allocations
              .map(
                (holding) =>
                  `${holding.name} ${holding.ratio.toFixed(1)}퍼센트`,
              )
              .join(", ")}`}
          >
            <div className="bg-card absolute inset-[22%] flex flex-col items-center justify-center rounded-full border shadow-inner">
              <strong className="text-xl font-black tabular-nums">
                {allocations.length}
              </strong>
              <span className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                보유 종목
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div>
            <h3 className="font-black">포트폴리오 비중</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              현재 평가금액을 기준으로 계산했어요.
            </p>
          </div>
          <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {allocations.map((holding, index) => (
              <li
                key={`${holding.ticker}-${holding.name}`}
                className="flex min-w-0 items-center gap-2.5"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? "translateX(0)" : "translateX(12px)",
                  transition: `opacity 420ms ease-out ${180 + index * 55}ms, transform 420ms ease-out ${180 + index * 55}ms`,
                }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: holding.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{holding.name}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {holding.ticker}
                  </p>
                </div>
                <strong className="shrink-0 text-sm tabular-nums">
                  {holding.ratio.toFixed(1)}%
                </strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function GoalProbabilityChart({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const values = [
    [10, result.probability.tenYears],
    [20, result.probability.twentyYears],
    [30, result.probability.thirtyYears],
    [40, result.probability.fortyYears],
    [50, result.probability.fiftyYears],
  ] as const;

  return (
    <div ref={ref} className="rounded-2xl border p-5">
      <h3 className="font-bold">
        기간 내 {goalLabel(result.goalAmount)} 도달 확률
      </h3>
      <dl className="mt-4 space-y-3">
        {values.map(([year, value], index) => (
          <div key={year} className="text-sm">
            <div className="flex items-center justify-between">
              <dt>{year}년 이내</dt>
              <dd className="font-bold">
                {typeof value === "number"
                  ? `${value.toFixed(1)}%`
                  : "재분석 필요"}
              </dd>
            </div>
            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                style={{
                  width:
                    isRevealed && typeof value === "number"
                      ? `${Math.min(100, Math.max(0, value))}%`
                      : "0%",
                  transition: `width 750ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

type StrategyScores = NonNullable<AnalysisResult["aiStrategy"]>["scores"];

function AiStrategyRadar({ scores }: { scores: StrategyScores }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const size = 340;
  const center = size / 2;
  const radius = 105;
  const point = (index: number, score: number, extraRadius = 0) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / scores.length;
    const distance = radius * (score / 100) + extraRadius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const polygonPoints = scores
    .map((item, index) => {
      const { x, y } = point(index, item.score);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div ref={ref} className="border-b border-violet-500/15 px-5 py-5 sm:px-6">
      <div>
        <h4 className="text-sm font-black">투자 균형 한눈에 보기</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          현재 계산 결과를 EOKKA 내부 기준으로 100점 환산했어요.
        </p>
      </div>
      <div className="mt-4 grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto w-full max-w-[360px] overflow-visible"
          role="img"
          aria-label={scores
            .map((item) => `${item.label} ${item.score}점`)
            .join(", ")}
        >
          <defs>
            <linearGradient id="ai-radar-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80, 100].map((level) => (
            <polygon
              key={level}
              points={scores
                .map((_, index) => {
                  const { x, y } = point(index, level);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={level === 100 ? 1.2 : 0.7}
              className="text-border"
            />
          ))}
          {scores.map((_, index) => {
            const outer = point(index, 100);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth="0.7"
                className="text-border"
              />
            );
          })}
          <polygon
            points={polygonPoints}
            fill="url(#ai-radar-fill)"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? "scale(1)" : "scale(0.08)",
              transformOrigin: "50% 50%",
              transition:
                "opacity 350ms ease-out, transform 850ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {scores.map((item, index) => {
            const dataPoint = point(index, item.score);
            const labelPoint = point(index, 100, 28);
            const anchor =
              labelPoint.x < center - 10
                ? "end"
                : labelPoint.x > center + 10
                  ? "start"
                  : "middle";
            return (
              <g key={item.key}>
                <circle
                  cx={dataPoint.x}
                  cy={dataPoint.y}
                  r="4"
                  fill="#8b5cf6"
                  stroke="white"
                  strokeWidth="1.5"
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? "scale(1)" : "scale(0)",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transition: `opacity 250ms ease-out ${420 + index * 70}ms, transform 350ms ease-out ${420 + index * 70}ms`,
                  }}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[11px] font-bold"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {scores.map((item) => (
            <li
              key={item.key}
              className="bg-background/70 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold">{item.label}</span>
                <span className="text-muted-foreground mt-0.5 block text-[10px] leading-4">
                  {item.description}
                </span>
              </span>
              <strong
                className={`text-sm tabular-nums ${
                  item.score >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : item.score < 40
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-violet-600 dark:text-violet-400"
                }`}
              >
                <RollingNumber
                  value={item.score}
                  isActive={isRevealed}
                  delay={160 + scores.indexOf(item) * 70}
                  format={(value) => `${Math.round(value)}점`}
                />
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvestmentStyleRadar({
  style,
}: {
  style: AnalysisResult["investmentStyle"];
}) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const size = 320;
  const center = size / 2;
  const radius = 92;
  const point = (index: number, score: number, extraRadius = 0) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / style.scores.length;
    const distance = radius * (score / 100) + extraRadius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  const dataPoints = style.scores
    .map((item, index) => {
      const { x, y } = point(index, item.score);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div ref={ref} className="border-b border-violet-500/15 px-5 py-5 sm:px-6">
      <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.06] p-4 text-center">
        <p className="text-xs font-black tracking-[0.14em] text-fuchsia-600 uppercase dark:text-fuchsia-400">
          My Investment Type
        </p>
        <h4 className="mt-2 text-xl font-black">{style.title}</h4>
        <div className="bg-background/60 mx-auto mt-3 max-w-xl rounded-xl border border-fuchsia-500/20 px-4 py-3 text-left">
          <p className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400">
            투자 성향 분석
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {style.description} {style.reason}
          </p>
        </div>
      </div>

      <div className="mt-4 grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto w-full max-w-[340px] overflow-visible"
          role="img"
          aria-label={style.scores
            .map((item) => `${item.label} ${item.score}점`)
            .join(", ")}
        >
          <defs>
            <linearGradient
              id="investment-style-fill"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          {[25, 50, 75, 100].map((level) => (
            <polygon
              key={level}
              points={style.scores
                .map((_, index) => {
                  const { x, y } = point(index, level);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={level === 100 ? 1.2 : 0.7}
              className="text-border"
            />
          ))}
          {style.scores.map((_, index) => {
            const outer = point(index, 100);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth="0.7"
                className="text-border"
              />
            );
          })}
          <polygon
            points={dataPoints}
            fill="url(#investment-style-fill)"
            stroke="#ec4899"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? "scale(1)" : "scale(0.08)",
              transformOrigin: "50% 50%",
              transition:
                "opacity 350ms ease-out, transform 850ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {style.scores.map((item, index) => {
            const dataPoint = point(index, item.score);
            const labelPoint = point(index, 100, 27);
            const anchor =
              labelPoint.x < center - 10
                ? "end"
                : labelPoint.x > center + 10
                  ? "start"
                  : "middle";
            return (
              <g key={item.key}>
                <circle
                  cx={dataPoint.x}
                  cy={dataPoint.y}
                  r="4"
                  fill="#ec4899"
                  stroke="white"
                  strokeWidth="1.5"
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? "scale(1)" : "scale(0)",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transition: `opacity 250ms ease-out ${420 + index * 70}ms, transform 350ms ease-out ${420 + index * 70}ms`,
                  }}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[11px] font-bold"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {style.scores.map((item) => (
            <li
              key={item.key}
              className="bg-background/70 flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-xs font-bold">{item.label}</span>
              <strong className="text-sm text-fuchsia-600 tabular-nums dark:text-fuchsia-400">
                <RollingNumber
                  value={item.score}
                  isActive={isRevealed}
                  delay={160 + style.scores.indexOf(item) * 70}
                  format={(value) => `${Math.round(value)}`}
                />
              </strong>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-[10px] leading-4">
        투자 유형 점수는 높고 낮음의 우열이 아니라 현재 성향의 강도를 뜻해요.
      </p>
    </div>
  );
}

type MarketComparisonResult = {
  message: string;
  tone: string;
  period?: string;
  direction?: "빠르게" | "느리게";
};

function marketComparison(
  baseMonth: number | null,
  marketMonth: number | null,
  marketLabel: string,
): MarketComparisonResult {
  if (baseMonth === null && marketMonth === null)
    return {
      message: `내 평균 시나리오와 ${marketLabel} 기준 모두 30년 안에 목표 도달이 어려워요.`,
      tone: "text-muted-foreground",
    };
  if (baseMonth !== null && marketMonth === null)
    return {
      message: `내 평균 시나리오는 목표에 도달하지만 ${marketLabel} 기준은 30년 안에 도달하지 못해요.`,
      tone: "text-emerald-600 dark:text-emerald-400",
    };
  if (baseMonth === null && marketMonth !== null)
    return {
      message: `${marketLabel} 기준은 목표에 도달하지만 내 평균 시나리오는 30년 안에 도달하지 못해요.`,
      tone: "text-amber-600 dark:text-amber-400",
    };

  const difference = marketMonth! - baseMonth!;
  if (Math.abs(difference) <= 1)
    return {
      message: `내 평균 시나리오와 ${marketLabel} 기준의 목표 도달 속도가 비슷해요.`,
      tone: "text-muted-foreground",
    };

  const months = Math.abs(difference);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return difference > 0
    ? {
        message: `내 평균 시나리오가 ${marketLabel} 기준보다 약 ${period} 빠르게 목표에 도착해요.`,
        tone: "text-emerald-600 dark:text-emerald-400",
        period,
        direction: "빠르게",
      }
    : {
        message: `내 평균 시나리오가 ${marketLabel} 기준보다 약 ${period} 늦게 목표에 도착해요.`,
        tone: "text-amber-600 dark:text-amber-400",
        period,
        direction: "느리게",
      };
}

function AnalysisMethodDialog({ result }: { result: AnalysisResult }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          aria-label="분석과 계산 방법 확인"
        >
          <CircleHelpIcon className="size-3.5" aria-hidden="true" />
          어떻게 계산했나요?
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>목표 도달 시점은 이렇게 계산해요</DialogTitle>
          <DialogDescription>
            입력한 보유 정보와 과거 가격 흐름으로 여러 미래 경로를 계산한 통계적
            시나리오입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm leading-6">
          <section className="rounded-xl border p-4">
            <h3 className="font-bold">1. 현재 자산 가치 계산</h3>
            <p className="text-muted-foreground mt-1">
              종목별 현재가에 보유 수량을 곱해 현재 평가금액을 계산합니다. 매수
              원금은 평균 매수가와 보유 수량을 기준으로 하며, 미국 주식은 조회
              시점 환율로 원화 환산합니다.
            </p>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="font-bold">2. 포트폴리오의 과거 월별 수익률 구성</h3>
            <p className="text-muted-foreground mt-1">
              각 종목에서 공통으로 확보되는 과거 월별 수익률을 현재 평가금액
              비중에 따라 합산합니다. 신뢰할 수 있는 경로 계산을 위해 최소
              24개월의 공통 데이터가 필요합니다.
            </p>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="font-bold">3. 미래 경로 5,000개 생성</h3>
            <p className="text-muted-foreground mt-1">
              과거 월별 흐름을 6개월 단위 블록으로 다시 조합해 최대 50년까지
              5,000개의 미래 자산 경로를 만듭니다. 입력한 월 추가 투자금이
              있다면 매월 수익률을 적용한 뒤 같은 금액을 현재 포트폴리오
              비중으로 투자한다고 가정해 별도 경로를 계산합니다.
            </p>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="font-bold">4. 30·50년 장기 금액 안정화</h3>
            <p className="text-muted-foreground mt-1">
              10·30·50년 금액은 모두 현재 평가금액에서 출발한 같은 5,000개
              경로의 해당 시점 값입니다. 과거 월별 변동성은 유지하되 평균
              수익률의 영향은 시간이 갈수록 낮추고, 국내·미국 시장의 장기 기대
              수준으로 점차 수렴시켜 과도한 복리 확대를 완화합니다.
            </p>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="font-bold">5. 세 가지 시나리오와 도달 시점</h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ["보수적", "P20", "경로 중 하위 20% 지점"],
                ["평균", "P50", "경로의 중앙값"],
                ["낙관적", "P80", "경로 중 상위 20% 지점"],
              ].map(([label, percentile, description]) => (
                <div key={label} className="bg-muted/40 rounded-lg p-3">
                  <dt className="font-bold">
                    {label}{" "}
                    <span className="text-muted-foreground">{percentile}</span>
                  </dt>
                  <dd className="text-muted-foreground mt-1 text-xs">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground mt-3">
              각 시나리오의 예상 자산이 목표 금액을 처음 넘어서는 월을 목표 도달
              시점으로 표시합니다. 30년 이내 넘지 못하면 ‘미도달’로 표시합니다.
            </p>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="font-bold">6. 목표 달성 확률</h3>
            <p className="text-muted-foreground mt-1">
              5,000개 경로 중 {goalLabel(result.goalAmount)}을 10년·20년·30년
              안에 한 번이라도 넘은 경로의 비율입니다.
            </p>
          </section>

          {result.benchmark && (
            <section className="rounded-xl border p-4">
              <h3 className="font-bold">7. 시장 기준선</h3>
              <p className="text-muted-foreground mt-1">
                현재 평가금액에서 출발해 {result.benchmark.label}의 과거 월별
                흐름을 같은 방식으로 시뮬레이션한 중앙값입니다. 내 평균
                시나리오와 시장 기준의 목표 도달 속도를 비교할 수 있어요.
              </p>
            </section>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h3 className="font-bold text-amber-700 dark:text-amber-300">
              결과를 볼 때 참고해 주세요
            </h3>
            <ul className="text-muted-foreground mt-2 space-y-1">
              <li>• 과거 수익률이 미래 수익률을 보장하지 않습니다.</li>
              <li>
                • 세금과 거래 수수료, 입력한 월 투자금 외의 비정기 추가 매수는
                반영하지 않습니다.
              </li>
              <li>
                • 국내 종가는 수정주가가 아니므로 액면분할·병합 등이 과거
                수익률에 영향을 줄 수 있습니다.
              </li>
              <li>• 분석 결과는 투자 권유나 수익 보장이 아닙니다.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScenarioChart({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLDivElement>();
  const goal = result.goalAmount;
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const width = 900,
    height = 320,
    left = 72,
    right = 20,
    top = 24,
    bottom = 42;
  const finiteGoalMonths = result.scenarios.flatMap((scenario) =>
    scenario.goalMonth === null ? [] : [scenario.goalMonth],
  );
  if (
    result.benchmark?.goalMonth !== null &&
    result.benchmark?.goalMonth !== undefined
  )
    finiteGoalMonths.push(result.benchmark.goalMonth);
  const endMonth = Math.min(
    360,
    finiteGoalMonths.length > 0 ? Math.max(...finiteGoalMonths) + 12 : 360,
  );
  const visibleChart = result.chart.filter((point) => point.month <= endMonth);
  const max = goal * 1.2;
  const x = (month: number) =>
    left + (month / endMonth) * (width - left - right);
  const y = (value: number) =>
    top + (1 - Math.min(value, max) / max) * (height - top - bottom);
  type ScenarioKey = "conservative" | "base" | "optimistic";
  const scenarioPoints = (key: ScenarioKey) => {
    const goalMonth = result.scenarios.find(
      (scenario) => scenario.key === key,
    )?.goalMonth;
    const points = visibleChart
      .filter((point) => goalMonth == null || point.month < goalMonth)
      .map((point) => ({ month: point.month, value: point[key] }));
    if (typeof goalMonth === "number")
      points.push({ month: goalMonth, value: goal });
    return points.sort((a, b) => a.month - b.month);
  };
  const marketPoints = () => {
    if (!result.benchmark) return [];
    const points = visibleChart
      .filter(
        (point) =>
          point.market !== null &&
          (result.benchmark!.goalMonth === null ||
            point.month < result.benchmark!.goalMonth),
      )
      .map((point) => ({ month: point.month, value: point.market! }));
    if (result.benchmark.goalMonth !== null)
      points.push({ month: result.benchmark.goalMonth, value: goal });
    return points.sort((a, b) => a.month - b.month);
  };
  const valueAtMonth = (key: ScenarioKey, month: number) => {
    const points = scenarioPoints(key);
    if (points.length === 0 || month > points.at(-1)!.month) return null;
    const nextIndex = points.findIndex((point) => point.month >= month);
    if (nextIndex <= 0) return points[0].value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio = (month - previous.month) / (next.month - previous.month);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const marketValueAtMonth = (month: number) => {
    const points = marketPoints();
    if (points.length === 0 || month > points.at(-1)!.month) return null;
    const nextIndex = points.findIndex((point) => point.month >= month);
    if (nextIndex <= 0) return points[0].value;
    const previous = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio = (month - previous.month) / (next.month - previous.month);
    return previous.value + (next.value - previous.value) * ratio;
  };
  const periodAt = (month: number) => {
    const years = Math.floor(month / 12);
    const months = month % 12;
    if (years === 0) return `${months}개월 후`;
    return months === 0 ? `${years}년 후` : `${years}년 ${months}개월 후`;
  };
  const hoverX = hoverMonth === null ? null : x(hoverMonth);
  const tooltipItems =
    hoverMonth === null
      ? []
      : result.scenarios.flatMap((scenario) => {
          const value = valueAtMonth(scenario.key, hoverMonth);
          return value === null ? [] : [{ scenario, value }];
        });
  const marketTooltipValue =
    hoverMonth === null ? null : marketValueAtMonth(hoverMonth);

  return (
    <div ref={ref} className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[700px]"
        role="img"
        aria-label={`${goalLabel(goal)} 도달 미래 자산 시나리오 차트`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const value = max * ratio;
          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                className="stroke-border"
                strokeDasharray="4 5"
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[12px]"
              >
                {value === 0 ? "0" : `${(value / 100_000_000).toFixed(1)}억`}
              </text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={width - right}
          y1={y(goal)}
          y2={y(goal)}
          stroke="#ef4444"
          strokeDasharray="7 5"
          opacity=".8"
        />
        <text
          x={width - right}
          y={y(goal) - 8}
          textAnchor="end"
          fill="#ef4444"
          className="text-[12px] font-bold"
        >
          {goalLabel(goal)} 목표
        </text>
        {(["conservative", "base", "optimistic"] as const).map((key, index) => (
          <polyline
            key={key}
            points={scenarioPoints(key)
              .map((point) => `${x(point.month)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={colors[key]}
            strokeWidth={key === "base" ? 4 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: `stroke-dashoffset 1100ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 120}ms`,
            }}
          />
        ))}
        {result.benchmark && (
          <polyline
            points={marketPoints()
              .map((point) => `${x(point.month)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={colors.market}
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: "0.025 0.018",
              strokeDashoffset: isRevealed ? 0 : 1,
              transition: "stroke-dashoffset 1200ms ease-out 300ms",
            }}
          />
        )}
        {result.scenarios.map(
          (scenario) =>
            scenario.goalMonth !== null && (
              <g key={`${scenario.key}-goal`}>
                <circle
                  cx={x(scenario.goalMonth)}
                  cy={y(goal)}
                  r="6"
                  fill={colors[scenario.key]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={x(scenario.goalMonth)}
                  y={y(goal) - 12}
                  textAnchor="middle"
                  fill={colors[scenario.key]}
                  className="text-[11px] font-bold"
                >
                  달성!
                </text>
              </g>
            ),
        )}
        {result.benchmark?.goalMonth !== null &&
          result.benchmark?.goalMonth !== undefined && (
            <g>
              <circle
                cx={x(result.benchmark.goalMonth)}
                cy={y(goal)}
                r="6"
                fill={colors.market}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={x(result.benchmark.goalMonth)}
                y={y(goal) - 12}
                textAnchor="middle"
                fill={colors.market}
                className="text-[11px] font-bold"
              >
                시장
              </text>
            </g>
          )}
        {Array.from(
          { length: Math.floor(endMonth / 60) + 1 },
          (_, index) => index * 5,
        ).map((year) => (
          <text
            key={year}
            x={x(year * 12)}
            y={height - 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[12px]"
          >
            {year === 0 ? "현재" : `${year}년`}
          </text>
        ))}
        <rect
          x={left}
          y={top}
          width={width - left - right}
          height={height - top - bottom}
          fill="transparent"
          onMouseMove={(event) => {
            const rect =
              event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            const svgX = ((event.clientX - rect.left) / rect.width) * width;
            const month = Math.round(
              ((Math.min(width - right, Math.max(left, svgX)) - left) /
                (width - left - right)) *
                endMonth,
            );
            setHoverMonth(month);
          }}
          onMouseLeave={() => setHoverMonth(null)}
        />
        {hoverMonth !== null &&
          hoverX !== null &&
          (tooltipItems.length > 0 || marketTooltipValue !== null) && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                x2={hoverX}
                y1={top}
                y2={height - bottom}
                className="stroke-muted-foreground"
                strokeDasharray="3 4"
                opacity=".6"
              />
              {tooltipItems.map(({ scenario, value }) => (
                <circle
                  key={scenario.key}
                  cx={hoverX}
                  cy={y(value)}
                  r="4"
                  fill={colors[scenario.key]}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
              {marketTooltipValue !== null && (
                <circle
                  cx={hoverX}
                  cy={y(marketTooltipValue)}
                  r="4"
                  fill={colors.market}
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              <g
                transform={`translate(${hoverX > width - 210 ? hoverX - 188 : hoverX + 12}, ${top + 8})`}
              >
                <rect
                  width="176"
                  height={
                    34 +
                    (tooltipItems.length +
                      (marketTooltipValue === null ? 0 : 1)) *
                      21
                  }
                  rx="10"
                  className="fill-background stroke-border"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="20"
                  className="fill-foreground text-[11px] font-bold"
                >
                  {periodAt(hoverMonth)}
                </text>
                {tooltipItems.map(({ scenario, value }, index) => (
                  <text
                    key={scenario.key}
                    x="12"
                    y={42 + index * 21}
                    fill={colors[scenario.key]}
                    className="text-[11px] font-semibold"
                  >
                    {scenario.label} · {won(value)}
                  </text>
                ))}
                {marketTooltipValue !== null && result.benchmark && (
                  <text
                    x="12"
                    y={42 + tooltipItems.length * 21}
                    fill={colors.market}
                    className="text-[11px] font-semibold"
                  >
                    시장 기준 · {won(marketTooltipValue)}
                  </text>
                )}
              </g>
            </g>
          )}
      </svg>
    </div>
  );
}

function GoalMomentumCard({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  const baseGoalMonth = result.scenarios[1].goalMonth;
  const marketGoalMonth = result.benchmark?.goalMonth ?? null;
  const hasBenchmark =
    result.benchmark !== null && result.benchmark !== undefined;
  const hasComparableGoals =
    hasBenchmark && baseGoalMonth !== null && marketGoalMonth !== null;
  const speedRatio = hasComparableGoals
    ? baseGoalMonth === 0
      ? Number.POSITIVE_INFINITY
      : marketGoalMonth / baseGoalMonth
    : null;
  const speedScore =
    speedRatio === null
      ? null
      : speedRatio === Number.POSITIVE_INFINITY
        ? 100
        : Math.round(Math.min(100, Math.max(0, (speedRatio - 0.5) * 100)));
  const speedLabel = !hasBenchmark
    ? "시장 기준 없음"
    : baseGoalMonth === null && marketGoalMonth === null
      ? "50년 내 도달 어려움"
      : baseGoalMonth !== null && marketGoalMonth === null
        ? "시장보다 빠른 편"
        : baseGoalMonth === null && marketGoalMonth !== null
          ? "시장보다 느린 편"
          : speedScore === null
            ? "비교할 수 없음"
            : speedScore >= 85
              ? "매우 빠른 편"
              : speedScore >= 60
                ? "빠른 편"
                : speedScore >= 40
                  ? "시장과 비슷한 편"
                  : speedScore >= 15
                    ? "느린 편"
                    : "매우 느린 편";
  const isFaster =
    (baseGoalMonth !== null && marketGoalMonth === null) ||
    (speedRatio !== null && speedRatio > 1.01);
  const isSlower =
    (baseGoalMonth === null && marketGoalMonth !== null) ||
    (speedRatio !== null && speedRatio < 0.99);
  const lineColor = isFaster ? "#ef4444" : isSlower ? "#3b82f6" : "#10b981";
  const endCandidates = [baseGoalMonth, marketGoalMonth].filter(
    (month): month is number => month !== null,
  );
  const endMonth = Math.max(
    12,
    Math.min(
      360,
      endCandidates.length > 0 ? Math.max(...endCandidates) + 12 : 120,
    ),
  );
  const width = 720;
  const height = 210;
  const left = 18;
  const right = 18;
  const top = 18;
  const bottom = 28;
  const x = (month: number) =>
    left + (month / endMonth) * (width - left - right);
  const y = (value: number) =>
    top +
    (1 - Math.min(1, Math.max(0, value / result.goalAmount))) *
      (height - top - bottom);
  const pathPoints = (key: "base" | "market", goalMonth: number | null) => {
    const points = result.chart
      .filter(
        (point) =>
          point.month <= endMonth &&
          (goalMonth === null || point.month <= goalMonth) &&
          (key === "base" || point.market !== null),
      )
      .map((point) => ({
        month: point.month,
        value: key === "base" ? point.base : point.market!,
      }));
    if (
      goalMonth !== null &&
      goalMonth <= endMonth &&
      points.at(-1)?.month !== goalMonth
    )
      points.push({ month: goalMonth, value: result.goalAmount });
    return points;
  };
  const basePoints = pathPoints("base", baseGoalMonth);
  const marketPoints = result.benchmark
    ? pathPoints("market", marketGoalMonth)
    : [];
  const polyline = (points: Array<{ month: number; value: number }>) =>
    points.map((point) => `${x(point.month)},${y(point.value)}`).join(" ");
  const baseArea =
    basePoints.length > 0
      ? `${x(basePoints[0].month)},${height - bottom} ${polyline(basePoints)} ${x(basePoints.at(-1)!.month)},${height - bottom}`
      : "";
  const comparisonText = !hasBenchmark
    ? "시장 기준 데이터가 없어 상대 속도를 계산하지 못했어요."
    : baseGoalMonth === null && marketGoalMonth === null
      ? "내 평균 시나리오와 시장 기준 모두 50년 안에 목표 도달이 확인되지 않았어요."
      : baseGoalMonth !== null && marketGoalMonth === null
        ? "내 평균 시나리오는 50년 안에 목표에 도달하지만 시장 기준은 도달하지 못했어요."
        : baseGoalMonth === null && marketGoalMonth !== null
          ? "시장 기준은 50년 안에 목표에 도달하지만 내 평균 시나리오는 도달하지 못했어요."
          : speedRatio === null
            ? "목표 도달 속도를 비교할 수 없어요."
            : speedRatio === Number.POSITIVE_INFINITY
              ? "평균 시나리오 기준으로 이미 목표에 도착했어요."
              : isFaster
                ? `시장보다 약 ${speedRatio.toFixed(2)}배 빠르게 목표에 접근하고 있어요.`
                : isSlower
                  ? `현재 목표 접근 속도는 시장의 약 ${speedRatio.toFixed(2)}배예요.`
                  : "시장과 거의 같은 속도로 목표에 접근하고 있어요.";

  return (
    <section
      ref={ref}
      className="from-background via-background to-muted/40 mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.16em]">
            GOAL MOMENTUM
          </p>
          <h3 className="mt-1 text-xl font-black">목표 접근 속도</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            평균 시나리오와 시장 기준의 목표 도달 속도를 비교했어요.
          </p>
        </div>
        <div className="sm:text-right">
          <strong className="text-2xl font-black" style={{ color: lineColor }}>
            {speedLabel}
          </strong>
          {speedScore !== null && (
            <p className="text-muted-foreground mt-1 text-xs">
              속도 점수 {speedScore}/100
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-black/[0.03] p-2 dark:bg-black/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`목표 접근 속도 ${speedLabel}`}
        >
          <defs>
            <linearGradient id="goal-momentum-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={left}
              x2={width - right}
              y1={y(result.goalAmount * ratio)}
              y2={y(result.goalAmount * ratio)}
              className="stroke-border"
              strokeDasharray="4 7"
            />
          ))}
          {baseArea && (
            <polygon
              points={baseArea}
              fill="url(#goal-momentum-area)"
              style={{
                opacity: isRevealed ? 1 : 0,
                transition: "opacity 700ms ease-out 350ms",
              }}
            />
          )}
          {marketPoints.length > 0 && (
            <polyline
              points={polyline(marketPoints)}
              fill="none"
              stroke={colors.market}
              strokeWidth="3"
              strokeDasharray="9 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
              pathLength="1"
              style={{
                strokeDasharray: "0.025 0.02",
                strokeDashoffset: isRevealed ? 0 : 1,
                transition: "stroke-dashoffset 1100ms ease-out 180ms",
              }}
            />
          )}
          <polyline
            points={polyline(basePoints)}
            fill="none"
            stroke={lineColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition:
                "stroke-dashoffset 1050ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {basePoints.length > 0 && (
            <circle
              cx={x(basePoints.at(-1)!.month)}
              cy={y(basePoints.at(-1)!.value)}
              r="6"
              fill={lineColor}
              stroke="white"
              strokeWidth="2"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? "scale(1)" : "scale(0)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition:
                  "opacity 250ms ease-out 850ms, transform 350ms ease-out 850ms",
              }}
            />
          )}
          <text
            x={left}
            y={height - 8}
            className="fill-muted-foreground text-[12px]"
          >
            현재
          </text>
          <text
            x={width - right}
            y={height - 8}
            textAnchor="end"
            className="fill-muted-foreground text-[12px]"
          >
            목표 {goalLabel(result.goalAmount)}
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold">{comparisonText}</p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <i
              className="h-0 w-4 border-t-2"
              style={{ borderColor: lineColor }}
            />
            내 평균
          </span>
          {result.benchmark && (
            <span className="flex items-center gap-1.5 text-violet-500">
              <i className="h-0 w-4 border-t-2 border-dashed border-violet-500" />
              시장 기준
            </span>
          )}
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-[11px]">
        실제 과거 자산 차트가 아니라 목표 도달 예상 경로를 요약한 그래프예요.
      </p>
    </section>
  );
}

function compoundValueLabel(value: number) {
  if (!Number.isFinite(value)) return "계산 범위를 넘는 금액";
  if (value >= 1_000_000_000_000_000) {
    return `약 ${value.toExponential(2)}원`;
  }
  return compactWon(value);
}

function CompoundGrowthChart({ result }: { result: AnalysisResult }) {
  const { ref, isRevealed } = useChartRevealOnce<HTMLElement>();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const annualizedReturnRate = result.annualizedReturnRate ?? result.returnRate;
  const annualRate = Math.max(-0.99, annualizedReturnRate / 100);
  const startLog = Math.log10(Math.max(result.currentValue, 1));
  const annualLogGrowth = Math.log10(1 + annualRate);
  const points = Array.from({ length: 8 }, (_, index) => {
    const year = index * 10;
    const logValue = startLog + annualLogGrowth * year;
    return {
      year,
      logValue,
      value: logValue < 307 ? 10 ** logValue : Number.POSITIVE_INFINITY,
    };
  });
  const logValues = points.map((point) => point.logValue);
  const minLog = Math.min(...logValues);
  const maxLog = Math.max(...logValues);
  const width = 720;
  const height = 250;
  const left = 20;
  const right = 20;
  const top = 20;
  const bottom = 34;
  const x = (year: number) => left + (year / 70) * (width - left - right);
  const y = (logValue: number) => {
    const ratio =
      maxLog === minLog ? 0.5 : (logValue - minLog) / (maxLog - minLog);
    return top + (1 - ratio) * (height - top - bottom);
  };
  const polyline = points
    .map((point) => `${x(point.year)},${y(point.logValue)}`)
    .join(" ");
  const area = `${x(0)},${height - bottom} ${polyline} ${x(70)},${height - bottom}`;
  const hovered = points.find((point) => point.year === hoveredYear) ?? null;
  const rateTone =
    annualRate > 0
      ? "text-rose-500"
      : annualRate < 0
        ? "text-blue-500"
        : "text-muted-foreground";

  return (
    <section
      ref={ref}
      className="from-background via-background mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br to-rose-500/[0.04] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.16em]">
            COMPOUND EFFECT
          </p>
          <h3 className="mt-1 text-xl font-black">현 수익률이 계속된다면</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            현재 평가금액에 현 수익률을 매년 동일하게 복리 적용했어요.
          </p>
        </div>
        <div className="sm:text-right">
          <strong className={`text-2xl font-black ${rateTone}`}>
            연 {annualizedReturnRate >= 0 ? "+" : ""}
            {annualizedReturnRate.toFixed(1)}%
          </strong>
          <p className="text-muted-foreground mt-1 text-xs">
            {result.investmentPeriodMonths
              ? `${Math.floor(result.investmentPeriodMonths / 12) > 0 ? `${Math.floor(result.investmentPeriodMonths / 12)}년 ` : ""}${result.investmentPeriodMonths % 12 > 0 ? `${result.investmentPeriodMonths % 12}개월` : ""} 기준 연환산`
              : "누적 수익률 기준"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-black/[0.03] p-2 dark:bg-black/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`연평균 수익률 ${annualizedReturnRate.toFixed(1)}퍼센트의 70년 복리 성장 그래프`}
          onPointerLeave={() => setHoveredYear(null)}
        >
          <defs>
            <linearGradient
              id="compound-effect-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const guideY = top + ratio * (height - top - bottom);
            return (
              <line
                key={ratio}
                x1={left}
                x2={width - right}
                y1={guideY}
                y2={guideY}
                className="stroke-border"
                strokeDasharray="4 7"
              />
            );
          })}
          <polygon
            points={area}
            fill="url(#compound-effect-area)"
            style={{
              opacity: isRevealed ? 1 : 0,
              transition: "opacity 700ms ease-out 280ms",
            }}
          />
          <polyline
            points={polyline}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: isRevealed ? 0 : 1,
              transition:
                "stroke-dashoffset 1050ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {points.map((point, index) => (
            <g key={point.year}>
              <circle
                cx={x(point.year)}
                cy={y(point.logValue)}
                r={hoveredYear === point.year ? 6 : 4}
                fill="#f43f5e"
                stroke="white"
                strokeWidth="2"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transition: `opacity 250ms ease-out ${350 + index * 85}ms, r 150ms ease-out`,
                }}
                onPointerEnter={() => setHoveredYear(point.year)}
              />
              <text
                x={x(point.year)}
                y={height - 9}
                textAnchor={
                  point.year === 0
                    ? "start"
                    : point.year === 70
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground text-[11px]"
              >
                {point.year === 0 ? "현재" : `${point.year}년`}
              </text>
            </g>
          ))}
          {hovered && (
            <g
              transform={`translate(${Math.min(width - 180, Math.max(10, x(hovered.year) - 80))}, ${Math.max(8, y(hovered.logValue) - 55)})`}
            >
              <rect
                width="160"
                height="46"
                rx="10"
                className="fill-background stroke-border"
              />
              <text
                x="10"
                y="17"
                className="fill-muted-foreground text-[10px] font-bold"
              >
                {hovered.year === 0 ? "현재" : `${hovered.year}년 뒤`}
              </text>
              <text
                x="10"
                y="35"
                className="fill-foreground text-[12px] font-black"
              >
                {compoundValueLabel(hovered.value)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="text-muted-foreground mt-3 text-[11px] leading-5">
        장기 구간은 값 차이가 매우 커질 수 있어 세로축을 로그 기준으로 표시해요.
        실제 수익률은 매년 달라질 수 있으며, 이 그래프는 미래 수익을 보장하지
        않습니다.
      </p>
    </section>
  );
}

export function AnalysisResultView({
  result,
  showAuthCta = true,
}: {
  result: AnalysisResult;
  showAuthCta?: boolean;
}) {
  const { ref: metricsRef, isRevealed: areMetricsRevealed } =
    useChartRevealOnce<HTMLDivElement>();
  const [selectedPurchaseHolding, setSelectedPurchaseHolding] = useState<
    AnalysisResult["holdings"][number] | null
  >(null);
  const remainingToGoal = Math.max(0, result.goalAmount - result.currentValue);
  const targetLabel = goalLabel(result.goalAmount);
  const benchmarkComparison = result.benchmark
    ? marketComparison(
        result.scenarios[1].goalMonth,
        result.benchmark.goalMonth,
        result.benchmark.label,
      )
    : null;
  const projectionPeriods = [
    { years: 10, valueKey: "valueAt10Years" },
    { years: 30, valueKey: "valueAt30Years" },
    { years: 50, valueKey: "valueAt50Years" },
  ] as const;
  const contributedBase = result.contributionScenarios.find(
    (scenario) => scenario.key === "base",
  );
  const holdingsByReturn = [...result.holdings].sort(
    (a, b) => b.returnRate - a.returnRate,
  );
  const returnMedals = new Map<string, { icon: string; label: string }>(
    holdingsByReturn.slice(0, 3).map((holding, index) => [
      `${holding.ticker}-${holding.name}`,
      {
        icon: ["🥇", "🥈", "🥉"][index],
        label: `수익률 ${index + 1}위`,
      },
    ]),
  );

  return (
    <section
      className="bg-card mt-8 rounded-3xl border p-5 shadow-xl sm:p-8"
      aria-labelledby="analysis-title"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-500">분석 완료</p>
          <h2 id="analysis-title" className="mt-1 text-2xl font-black">
            내 주식의 {targetLabel} 도달 시나리오
          </h2>
          <p className="text-muted-foreground mt-2 text-xs">
            과거 수익률로 만든 5,000개의 미래 경로를 바탕으로 계산했어요.
          </p>
        </div>
        <div className="text-muted-foreground text-xs sm:text-right">
          <p className="font-semibold">
            {new Date(`${result.asOf}T00:00:00`).toLocaleDateString("ko-KR")}{" "}
            {result.marketMode === "domestic"
              ? "전 거래일 종가 기준"
              : "KIS 시세 기준"}
          </p>
          <p className="mt-1">
            {result.marketMode === "domestic"
              ? "매일 오후 2시 이후 갱신"
              : "로컬 테스트 모드"}{" "}
            · 투자 조언이 아닙니다
          </p>
        </div>
      </div>

      <PortfolioAllocation result={result} />

      <div ref={metricsRef} className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "매수 원금", value: won(result.totalCost) },
          { label: "현재 평가금액", value: won(result.currentValue) },
          {
            label: "평가손익",
            value: `${result.profit >= 0 ? "+" : ""}${won(result.profit)}`,
            rollingValue: result.profit,
            rollingFormat: (value: number) =>
              `${value >= 0 ? "+" : ""}${won(value)}`,
            tone: result.profit >= 0 ? "profit" : "loss",
          },
          {
            label: "현재 수익률",
            value: `${result.returnRate >= 0 ? "+" : ""}${result.returnRate.toFixed(1)}%`,
            rollingValue: result.returnRate,
            rollingFormat: (value: number) =>
              `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
            tone: result.returnRate >= 0 ? "profit" : "loss",
          },
        ].map(({ label, value, rollingValue, rollingFormat, tone }, index) => (
          <div key={label} className="bg-muted/40 rounded-2xl p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <strong
              className={`mt-1 block text-lg ${
                tone === "profit"
                  ? "text-red-500"
                  : tone === "loss"
                    ? "text-blue-500"
                    : ""
              }`}
            >
              {typeof rollingValue === "number" && rollingFormat ? (
                <RollingNumber
                  value={rollingValue}
                  isActive={areMetricsRevealed}
                  delay={index * 100}
                  format={rollingFormat}
                />
              ) : (
                value
              )}
            </strong>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border p-5">
        <div>
          <h3 className="text-lg font-black">종목별 수익률</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            수익률이 높은 순서예요. 종목을 누르면 과거 가격 범위에서 내 평균
            매수가의 위치를 확인할 수 있어요.
          </p>
        </div>
        <div className="mt-4 divide-y">
          {holdingsByReturn.map((holding) => {
            const isProfit = holding.profitKrw >= 0;
            const holdingKey = `${holding.ticker}-${holding.name}`;
            const medal = returnMedals.get(holdingKey);
            return (
              <button
                key={holdingKey}
                type="button"
                onClick={() => setSelectedPurchaseHolding(holding)}
                className="group hover:bg-muted/40 focus-visible:ring-ring -mx-3 block w-[calc(100%+1.5rem)] cursor-pointer rounded-xl px-3 py-6 text-left transition-colors first:pt-3 last:pb-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] sm:items-center">
                  <div className="min-w-0">
                    <strong className="flex min-w-0 items-center gap-1.5">
                      {medal && (
                        <span
                          className="shrink-0 text-lg"
                          title={medal.label}
                          aria-label={medal.label}
                        >
                          {medal.icon}
                        </span>
                      )}
                      <span className="truncate">{holding.name}</span>
                    </strong>
                    <span className="text-muted-foreground text-xs">
                      {holding.ticker} · 현재가{" "}
                      {price(holding.currentPrice, holding.currency)}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      매수 위치 보기
                      <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">매수 원금</p>
                    <p className="mt-0.5 font-bold">{won(holding.costKrw)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      현재 평가금액
                    </p>
                    <p className="mt-0.5 font-bold">{won(holding.valueKrw)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">평가손익</p>
                    <p
                      className={`mt-0.5 font-bold ${
                        isProfit ? "text-red-500" : "text-blue-500"
                      }`}
                    >
                      {isProfit ? "+" : ""}
                      {won(holding.profitKrw)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-muted-foreground text-xs">수익률</p>
                    <p
                      className={`mt-0.5 text-lg font-black ${
                        isProfit ? "text-red-500" : "text-blue-500"
                      }`}
                    >
                      {holding.returnRate >= 0 ? "+" : ""}
                      {holding.returnRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={selectedPurchaseHolding !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPurchaseHolding(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>내 평균 매수 위치</DialogTitle>
            <DialogDescription>
              평균 매수가가 최근 최대 10년의 최저가와 최고가 사이에서 어느
              높이인지 계산했어요.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseHolding && (
            <PurchasePositionCharacter holding={selectedPurchaseHolding} />
          )}
          {selectedPurchaseHolding?.purchasePosition &&
          typeof selectedPurchaseHolding.purchasePosition.tenYearPosition ===
            "number" ? (
            <div className="bg-muted/50 grid gap-2 rounded-2xl p-4 text-xs leading-5">
              <p>
                <strong>장기 기준</strong> · 최근 최대 10년 가격 범위의{" "}
                {selectedPurchaseHolding.purchasePosition.tenYearPosition.toFixed(
                  1,
                )}
                % 높이
              </p>
              <p>
                <strong>최근 기준</strong> · 최근 1년 가격 범위의{" "}
                {selectedPurchaseHolding.purchasePosition.oneYearPosition.toFixed(
                  1,
                )}
                % 높이
              </p>
              <p className="text-muted-foreground">
                0%에 가까울수록 기간 내 최저가에, 100%에 가까울수록 최고가에
                가까운 평균 매수가예요.
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-2xl border border-dashed p-4 text-center text-sm">
              이전 분석 기록에는 가격 범위 데이터가 없어요. 정확한 매수 위치를
              표시하려면 홈에서 다시 분석해 주세요.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center sm:py-8">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          평균 시나리오 기준 {targetLabel}까지
        </p>
        <strong className="mt-2 block text-3xl font-black tracking-tight sm:text-4xl">
          {remainingToGoal === 0
            ? "목표를 달성했어요!"
            : remainingPeriodLabel(result.scenarios[1].goalMonth)}
        </strong>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          현재 평가금액 기준 {won(remainingToGoal)} 남았어요
        </p>
      </div>

      {result.monthlyContribution > 0 && contributedBase && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-sky-500/25 bg-sky-500/[0.06]">
          <div className="border-b border-sky-500/15 px-5 py-5">
            <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
              매월 {compactWon(result.monthlyContribution)}을 꾸준히 투자하면
            </p>
            <h3 className="mt-1 text-xl font-black">
              평균 목표 기간이{" "}
              {result.scenarios[1].goalMonth === null &&
              contributedBase.goalMonth !== null ? (
                <span className="text-sky-600 dark:text-sky-400">
                  30년 이내로 들어와요
                </span>
              ) : contributedBase.shortenedByMonths ? (
                <>
                  <span className="text-red-500">
                    {periodOnlyLabel(contributedBase.shortenedByMonths)}
                  </span>{" "}
                  당겨져요
                </>
              ) : (
                "뚜렷하게 줄어들지 않아요"
              )}
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              매월 말에 현재 포트폴리오 비중대로 추가 투자하고, 다음 달부터 해당
              금액에도 같은 수익률이 적용된다고 가정했어요.
            </p>
          </div>

          <div className="bg-border grid gap-px sm:grid-cols-3">
            {result.contributionScenarios.map((contributed) => {
              const baseline = result.scenarios.find(
                (scenario) => scenario.key === contributed.key,
              )!;
              return (
                <div key={contributed.key} className="bg-card/95 px-5 py-4">
                  <strong style={{ color: colors[contributed.key] }}>
                    {contributed.label}
                  </strong>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-[11px]">
                        현재만 유지
                      </p>
                      <p className="mt-0.5 font-bold">
                        {goalDurationLabel(baseline.goalMonth)}
                      </p>
                    </div>
                    <span className="text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                    <div className="text-right">
                      <p className="text-muted-foreground text-[11px]">
                        매월 추가 투자
                      </p>
                      <p className="mt-0.5 font-black text-sky-600 dark:text-sky-400">
                        {goalDurationLabel(contributed.goalMonth)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-bold text-red-500">
                    {baseline.goalMonth === null &&
                    contributed.goalMonth !== null
                      ? "30년 내 도달 가능"
                      : contributed.shortenedByMonths
                        ? `${periodOnlyLabel(contributed.shortenedByMonths)} 단축`
                        : contributed.goalMonth === null
                          ? "30년 내 미도달"
                          : "기간 변화 없음"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <InvestmentCharacterCard result={result} />

      <div className="mt-7 rounded-2xl border p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold">
          {result.scenarios.map((scenario) => (
            <span key={scenario.key} className="flex items-center gap-1.5">
              <i
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colors[scenario.key] }}
              />
              <span style={{ color: colors[scenario.key] }}>
                {scenario.label}
              </span>
            </span>
          ))}
          {result.benchmark && (
            <span className="flex items-center gap-1.5">
              <i
                className="h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: colors.market }}
              />
              <span style={{ color: colors.market }}>시장 기준</span>
            </span>
          )}
        </div>
        <ScenarioChart result={result} />
        {result.benchmark && (
          <>
            <div className="bg-muted/40 mt-3 flex flex-col gap-2 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong style={{ color: colors.market }}>
                  {result.benchmark.label} 기준
                </strong>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  현재 평가금액에서 출발한 시장 중앙값 경로예요.
                </p>
              </div>
              <div className="sm:text-right">
                <strong>{goalDurationLabel(result.benchmark.goalMonth)}</strong>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  과거 연평균 {percent(result.benchmark.cagr)}
                </p>
              </div>
            </div>
            {benchmarkComparison && (
              <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm leading-relaxed">
                <p className="text-foreground">
                  {benchmarkComparison.period &&
                  benchmarkComparison.direction ? (
                    <>
                      내 평균 시나리오가 {result.benchmark.label} 기준보다{" "}
                      <strong className="text-base font-black text-red-600 underline decoration-2 underline-offset-2 dark:text-red-400">
                        약 {benchmarkComparison.period}
                      </strong>{" "}
                      <strong
                        className={`text-base font-black ${
                          benchmarkComparison.direction === "빠르게"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {benchmarkComparison.direction}
                      </strong>{" "}
                      목표에 도착해요.
                    </>
                  ) : (
                    <strong className={`font-bold ${benchmarkComparison.tone}`}>
                      {benchmarkComparison.message}
                    </strong>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl border p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black">{targetLabel} 도달 예상 기간</h3>
            <AnalysisMethodDialog result={result} />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            시나리오별로 목표 금액에 도달하기까지 걸리는 예상 기간이에요.
          </p>
        </div>
        <div
          className={`mt-4 grid gap-3 ${result.benchmark ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          {result.scenarios.map((scenario) => (
            <div
              key={scenario.key}
              className="bg-muted/40 rounded-xl px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <strong style={{ color: colors[scenario.key] }}>
                  {scenario.label}
                </strong>
                <span className="text-muted-foreground text-xs">
                  P{scenario.percentile * 100}
                </span>
              </div>
              <p className="mt-2 text-xl font-black">
                {goalDurationLabel(scenario.goalMonth)}
              </p>
            </div>
          ))}
          {result.benchmark && (
            <div className="bg-muted/40 rounded-xl px-4 py-4">
              <strong className="block" style={{ color: colors.market }}>
                시장 기준
              </strong>
              <span className="text-muted-foreground mt-1 block text-xs leading-4 break-keep">
                {result.benchmark.label}
              </span>
              <p className="mt-3 text-xl font-black">
                {goalDurationLabel(result.benchmark.goalMonth)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border p-5">
        {projectionPeriods.map((period, index) => (
          <section
            key={period.years}
            className={index === 0 ? "" : "mt-6 border-t pt-6"}
          >
            <div>
              <h3 className="text-lg font-black">
                {period.years}년 뒤엔 얼마가 되어 있을까?
              </h3>
              {index === 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  추가 매수 없이 현재 보유 주식만 유지했을 때의 시나리오별 예상
                  금액이에요. 추가 매수 후 정보를 수정하면 다시 분석할 수
                  있어요.
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {result.scenarios.map((scenario) => (
                <div
                  key={`${scenario.key}-${period.years}-years`}
                  className="bg-muted/40 rounded-xl px-4 py-4"
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: colors[scenario.key] }}
                  >
                    {scenario.label}
                  </p>
                  <strong className="mt-1 block text-xl font-black">
                    {compactWon(scenario[period.valueKey])}
                  </strong>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    현재 평가금액 기준 연환산{" "}
                    {projectionAnnualRate(
                      scenario[period.valueKey],
                      result.currentValue,
                      period.years,
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="text-muted-foreground mt-5 text-[11px] leading-5">
          기간이 길어질수록 작은 수익률 차이도 복리로 크게 확대되므로 30년·50년
          수치는 장기 가능성을 살펴보는 참고값으로만 확인해 주세요.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-5">
          <h3 className="font-bold">과거 연평균 수익률</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            내 실제 투자 수익률이 아니라, 현재 보유 종목들이 과거 각 기간 동안
            매년 평균적으로 얼마나 상승하거나 하락했는지를 연복리로 환산한
            참고값이에요. 여러 종목은 현재 평가금액 비중으로 합산해요.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">최근 1년</dt>
              <dd className="font-bold">{percent(result.cagr.oneYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">최근 3년</dt>
              <dd className="font-bold">{percent(result.cagr.threeYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">최근 5년</dt>
              <dd className="font-bold">{percent(result.cagr.fiveYear)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">가용 전체</dt>
              <dd className="font-bold">{percent(result.cagr.available)}</dd>
            </div>
          </dl>
        </div>
        <GoalProbabilityChart result={result} />
      </div>

      {result.riskWarnings.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-300">
            레버리지·인버스 상품 유의사항
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {result.riskWarnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <GoalMomentumCard result={result} />

      {result.aiStrategy && (
        <section className="via-background mt-5 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-emerald-500/10">
          <div className="border-b border-violet-500/15 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-violet-600 uppercase dark:text-violet-400">
              <SparklesIcon className="size-4" />
              AI Strategy
            </p>
            <h3 className="mt-2 text-xl font-black">
              {result.aiStrategy.headline}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {result.aiStrategy.diagnosis}
            </p>
          </div>

          {result.aiStrategy.scores?.length === 6 && (
            <AiStrategyRadar scores={result.aiStrategy.scores} />
          )}

          {result.investmentStyle?.scores?.length === 6 && (
            <InvestmentStyleRadar style={result.investmentStyle} />
          )}

          {(result.aiStrategy.holdingInsights?.length ?? 0) > 0 && (
            <div className="border-t border-violet-500/15 px-5 pt-5 sm:px-6 sm:pt-6">
              <div>
                <p className="text-sm font-black">종목별 매수 전략</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  종목명과 실제 금액은 AI에 보내지 않고, 익명화한 비중·수익률·
                  매수 위치만으로 분석했어요.
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {result.aiStrategy.holdingInsights?.map((insight) => (
                  <article
                    key={insight.name}
                    className="bg-background/70 rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">{insight.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          insight.verdict === "좋은 위치"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : insight.verdict === "주의 필요"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {insight.verdict}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {insight.evidence}
                    </p>
                    <div className="mt-3 rounded-lg bg-violet-500/[0.08] p-3">
                      <p className="text-[10px] font-black tracking-wide text-violet-600 uppercase dark:text-violet-400">
                        다음 매수 기준
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        {insight.strategy}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 px-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pt-6">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                <CircleCheckIcon className="size-4" />
                잘하고 있는 점
              </p>
              <ul className="mt-3 space-y-3">
                {(result.aiStrategy.strengths ?? []).map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <p className="flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-300">
                <CircleAlertIcon className="size-4" />
                아쉬운 점
              </p>
              <ul className="mt-3 space-y-3">
                {(result.aiStrategy.improvements ?? []).map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <div className="bg-background/70 rounded-xl border p-4">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                월 투자 전략
              </p>
              <p className="mt-2 text-sm leading-6">
                {result.aiStrategy.monthlyPlan}
              </p>
            </div>
            <div className="bg-background/70 rounded-xl border p-4">
              <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                포트폴리오 점검
              </p>
              <p className="mt-2 text-sm leading-6">
                {result.aiStrategy.diversification}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <p className="text-sm font-black">지금 확인할 3가지</p>
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
              {result.aiStrategy.actions.map((action, index) => (
                <li
                  key={`${action.title}-${index}`}
                  className="bg-background/70 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold">
                      우선순위 {action.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{action.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {action.detail}
                  </p>
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground mt-4 text-[11px] leading-5">
              {result.aiStrategy.disclaimer}
            </p>
          </div>
        </section>
      )}

      <div className="mt-5 rounded-2xl bg-emerald-500/10 p-5">
        <h3 className="font-bold text-emerald-600 dark:text-emerald-400">
          분석 요약
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {result.summary.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      {showAuthCta && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              분석 결과를 계속 관리하고 싶다면
            </p>
            <h3 className="mt-1 text-lg font-black">
              로그인하고 이 분석 정보를 저장하세요
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              빠른 분석의 입력 정보는 현재 탭에서만 유지되며, 탭을 닫으면 자동
              삭제됩니다. 가입하면 보유 종목과 분석 결과를 저장하고 다음
              방문에도 이어서 확인할 수 있어요.
            </p>
          </div>
          <div className="mt-5 flex shrink-0 gap-2 sm:mt-0">
            <Button asChild variant="outline">
              <Link to="/login">로그인</Link>
            </Button>
            <Button
              asChild
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Link to="/join">무료 회원가입</Link>
            </Button>
          </div>
        </div>
      )}

      {result.marketMode === "domestic" ? (
        <p className="text-muted-foreground mt-4 text-xs">
          금융위원회 공공데이터의 종가를 사용합니다. 수정주가가 아니므로
          액면분할·병합 등 기업행사가 과거 수익률에 영향을 줄 수 있습니다.
        </p>
      ) : (
        <p className="text-muted-foreground mt-4 text-xs">
          KIS 수정주가를 사용하는 로컬 테스트 결과입니다.
          {result.exchangeRate && (
            <>
              {" "}
              미국 주식은 조회 시점 환율 1달러 ={" "}
              {result.exchangeRate.toLocaleString("ko-KR")}원으로 환산했습니다.
            </>
          )}
        </p>
      )}
    </section>
  );
}
