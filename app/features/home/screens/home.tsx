import type { Route } from "./+types/home";

import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  PieChartIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
  Trash2Icon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
} from "react-router";

import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import i18next from "~/core/lib/i18next.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import { StockAutocomplete } from "~/features/stocks/components/stock-autocomplete";
import {
  getAnalysisHistory,
  getPreferredGoalAmount,
  seoulDate,
} from "~/features/stocks/history/analysis-history.server";
import { getStockMarketMode } from "~/features/stocks/market-mode.server";
import type { StockSearchResult } from "~/features/stocks/types";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: data?.title ?? "억까 — 내 주식, 목표까지" },
  { name: "description", content: data?.subtitle },
];

export async function loader({ request }: Route.LoaderArgs) {
  await i18next.getFixedT(request);
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();

  const [allHistory, savedPreferredGoal] = user
    ? await Promise.all([
        getAnalysisHistory(user.id),
        getPreferredGoalAmount(user.id),
      ])
    : [[], null];
  const goalOptions = [
    ...new Set(allHistory.map((item) => item.goalAmount)),
  ].sort((a, b) => a - b);
  const preferredGoal =
    (savedPreferredGoal && goalOptions.includes(savedPreferredGoal)
      ? savedPreferredGoal
      : goalOptions.includes(100_000_000)
        ? 100_000_000
        : goalOptions[0]) ?? null;
  const goalHistory = preferredGoal
    ? allHistory.filter((item) => item.goalAmount === preferredGoal)
    : [];
  const history = Array.from(
    new Map(goalHistory.map((item) => [item.savedOn, item])).values(),
  );
  const latest = history.at(-1);
  const previous = history.at(-2);
  const latestMonth = latest?.savedOn.slice(0, 7);
  const monthHistory = latestMonth
    ? history.filter((item) => item.savedOn.startsWith(latestMonth))
    : [];
  const beforeMonth = latestMonth
    ? history.filter((item) => item.savedOn < `${latestMonth}-01`).at(-1)
    : undefined;
  const monthBaseline = beforeMonth ?? monthHistory[0];
  const baseScenario = latest?.result.scenarios.find(
    (scenario) => scenario.key === "base",
  );
  const previousBaseScenario = previous?.result.scenarios.find(
    (scenario) => scenario.key === "base",
  );
  const topHolding = latest
    ? [...latest.result.holdings].sort((a, b) => b.valueKrw - a.valueKrw)[0]
    : undefined;
  const topHoldingWeight =
    latest && topHolding && latest.currentValue > 0
      ? (topHolding.valueKrw / latest.currentValue) * 100
      : null;
  const previousHoldingValues = new Map(
    previous?.result.holdings.map((holding) => [
      holding.ticker,
      holding.valueKrw,
    ]) ?? [],
  );
  const holdingChanges =
    latest?.result.holdings
      .filter((holding) => previousHoldingValues.has(holding.ticker))
      .map((holding) => ({
        name: holding.name,
        change:
          holding.valueKrw -
          (previousHoldingValues.get(holding.ticker) ?? holding.valueKrw),
      })) ?? [];
  const dailyChange =
    latest && previous
      ? Math.round(latest.currentValue - previous.currentValue)
      : null;
  const leadingHolding = holdingChanges.length
    ? [...holdingChanges].sort((a, b) =>
        dailyChange !== null && dailyChange < 0
          ? a.change - b.change
          : b.change - a.change,
      )[0]
    : null;

  return {
    title: "억까 — 내 주식, 목표까지",
    subtitle: "보유 주식을 입력하고 목표까지 얼마나 남았는지 확인해보세요.",
    marketMode: getStockMarketMode(),
    isAuthenticated: user !== null,
    moneyInsights:
      latest && preferredGoal
        ? {
            goalAmount: preferredGoal,
            latestSavedOn: latest.savedOn,
            isLatestToday: latest.savedOn === seoulDate(),
            dailyProfitChange: previous
              ? Math.round(latest.currentValue - previous.currentValue)
              : null,
            monthlyProfitChange:
              monthBaseline && monthBaseline.id !== latest.id
                ? Math.round(latest.currentValue - monthBaseline.currentValue)
                : null,
            recordCount: history.length,
            currentValue: latest.currentValue,
            profit: latest.profit,
            returnRate: latest.returnRate,
            remainingAmount: Math.max(0, preferredGoal - latest.currentValue),
            progressPercent: Math.min(
              100,
              (latest.currentValue / preferredGoal) * 100,
            ),
            goalMonth: baseScenario?.goalMonth ?? null,
            goalMonthChange:
              baseScenario?.goalMonth !== null &&
              baseScenario?.goalMonth !== undefined &&
              previousBaseScenario?.goalMonth !== null &&
              previousBaseScenario?.goalMonth !== undefined
                ? previousBaseScenario.goalMonth - baseScenario.goalMonth
                : null,
            profitableHoldingCount: latest.result.holdings.filter(
              (holding) => holding.returnRate > 0,
            ).length,
            holdingCount: latest.result.holdings.length,
            topHoldingName: topHolding?.name ?? null,
            topHoldingWeight,
            leadingHolding,
            trend: history.slice(-7).map((item) => ({
              savedOn: item.savedOn,
              currentValue: item.currentValue,
            })),
          }
        : null,
  };
}

type Holding = {
  id: number;
  symbol: string;
  averagePrice: string;
  currency: "KRW" | "USD";
  quantity: string;
  selectedStock: StockSearchResult | null;
};

const HOLDINGS_STORAGE_KEY = "eokka:portfolio-draft:v1";
const ANALYSIS_STORAGE_KEY = "eokka:portfolio-analysis:v7";
const HOME_TAB_STORAGE_KEY = "eokka:home-tab:v1";
const GOAL_PRESETS = [1, 10, 100];
const MONTHLY_CONTRIBUTION_MAX = 1_000_000_000;
const MONTHLY_CONTRIBUTION_PRESETS = [10_000, 50_000, 100_000];
const ANALYSIS_ESTIMATED_SECONDS = 20;
type CurrencyTrailPoint = {
  x: number;
  y: number;
  time: number;
  speed: number;
};

function CurrencyMatrixSpotlight({
  canvasRef,
  trailRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  trailRef: React.RefObject<CurrencyTrailPoint[]>;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const spacing = 10;
    const lightRadius = 76;
    const maxTrailLifetime = 460;
    const rippleLifetime = 900;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      trailRef.current = trailRef.current.filter(
        (point) =>
          now - point.time < Math.max(maxTrailLifetime, rippleLifetime),
      );

      const latestPoint = trailRef.current.at(-1);
      if (latestPoint) {
        const idleAge = Math.max(0, now - latestPoint.time - 70);
        const idleFade = Math.max(0, 1 - idleAge / rippleLifetime);
        const speedBrightness =
          0.45 + Math.min(latestPoint.speed / 1.4, 1) * 0.55;
        const glow = context.createRadialGradient(
          latestPoint.x,
          latestPoint.y,
          0,
          latestPoint.x,
          latestPoint.y,
          lightRadius,
        );
        glow.addColorStop(
          0,
          `rgba(16, 185, 129, ${0.13 * idleFade * speedBrightness})`,
        );
        glow.addColorStop(
          0.58,
          `rgba(16, 185, 129, ${0.045 * idleFade * speedBrightness})`,
        );
        glow.addColorStop(1, "rgba(16, 185, 129, 0)");
        context.fillStyle = glow;
        context.fillRect(
          latestPoint.x - lightRadius,
          latestPoint.y - lightRadius,
          lightRadius * 2,
          lightRadius * 2,
        );
      }

      const cells = new Map<string, { x: number; y: number; alpha: number }>();
      for (const point of trailRef.current) {
        const lifetime = Math.min(maxTrailLifetime, 65 + point.speed * 235);
        const age = (now - point.time) / lifetime;
        if (age >= 1) continue;
        const normalizedSpeed = Math.min(point.speed / 1.4, 1);
        const trailTaper = 0.28 + Math.pow(1 - age, 0.8) * 0.72;
        const pointRadius =
          lightRadius * (0.72 + normalizedSpeed * 0.25) * trailTaper;
        const speedBrightness = 0.34 + normalizedSpeed * 0.66;
        const minColumn = Math.floor((point.x - pointRadius) / spacing);
        const maxColumn = Math.ceil((point.x + pointRadius) / spacing);
        const minRow = Math.floor((point.y - pointRadius) / spacing);
        const maxRow = Math.ceil((point.y + pointRadius) / spacing);

        for (let column = minColumn; column <= maxColumn; column += 1) {
          for (let row = minRow; row <= maxRow; row += 1) {
            const x = column * spacing + spacing / 2;
            const baseY = row * spacing + spacing / 2;
            const distance = Math.hypot(x - point.x, baseY - point.y);
            if (distance > pointRadius) continue;
            const distanceFade = Math.pow(1 - distance / pointRadius, 1.7);
            const ageFade = Math.pow(1 - age, 1.8);
            const alpha = distanceFade * ageFade * speedBrightness * 0.92;
            const key = `${column}:${row}`;
            const previous = cells.get(key);
            if (!previous || alpha > previous.alpha)
              cells.set(key, { x, y: baseY, alpha });
          }
        }
      }

      if (latestPoint) {
        const rippleAge = Math.max(0, now - latestPoint.time - 90);
        if (rippleAge > 0 && rippleAge < rippleLifetime) {
          const progress = rippleAge / rippleLifetime;
          const rippleRadius = 18 + progress * 82;
          const ringWidth = 12 + progress * 8;
          const rippleAlpha = Math.pow(1 - progress, 1.5) * 0.52;
          const minColumn = Math.floor(
            (latestPoint.x - rippleRadius - ringWidth) / spacing,
          );
          const maxColumn = Math.ceil(
            (latestPoint.x + rippleRadius + ringWidth) / spacing,
          );
          const minRow = Math.floor(
            (latestPoint.y - rippleRadius - ringWidth) / spacing,
          );
          const maxRow = Math.ceil(
            (latestPoint.y + rippleRadius + ringWidth) / spacing,
          );

          for (let column = minColumn; column <= maxColumn; column += 1) {
            for (let row = minRow; row <= maxRow; row += 1) {
              const x = column * spacing + spacing / 2;
              const y = row * spacing + spacing / 2;
              const distance = Math.hypot(x - latestPoint.x, y - latestPoint.y);
              const ringDistance = Math.abs(distance - rippleRadius);
              if (ringDistance > ringWidth) continue;
              const alpha =
                Math.pow(1 - ringDistance / ringWidth, 1.8) * rippleAlpha;
              const key = `${column}:${row}`;
              const previous = cells.get(key);
              if (!previous || alpha > previous.alpha)
                cells.set(key, { x, y, alpha });
            }
          }
        }
      }

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = '600 7px "SFMono-Regular", Consolas, monospace';
      for (const [key, cell] of cells) {
        const [column, row] = key.split(":").map(Number);
        const startsAsDollar = Math.abs(column + row) % 2 === 0;
        const isSwapped = Math.floor(now / 220) % 2 === 1;
        const symbol = startsAsDollar !== isSwapped ? "$" : "₩";
        context.fillStyle = `rgba(52, 211, 153, ${cell.alpha})`;
        context.fillText(symbol, cell.x, cell.y);
      }

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frame);
    };
  }, [canvasRef, trailRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden motion-reduce:hidden md:block"
    />
  );
}

function formatKoreanMoney(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0원";

  const won = Math.floor(amount);
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  const remainder = won % 10_000;
  const parts = [
    eok > 0 ? `${eok.toLocaleString("ko-KR")}억` : "",
    man > 0 ? `${man.toLocaleString("ko-KR")}만` : "",
    remainder > 0 ? remainder.toLocaleString("ko-KR") : "",
  ].filter(Boolean);

  return `${parts.join(" ")}원`;
}

type MoneyInsight = {
  goalAmount: number;
  latestSavedOn: string;
  isLatestToday: boolean;
  dailyProfitChange: number | null;
  monthlyProfitChange: number | null;
  recordCount: number;
  currentValue: number;
  profit: number;
  returnRate: number;
  remainingAmount: number;
  progressPercent: number;
  goalMonth: number | null;
  goalMonthChange: number | null;
  profitableHoldingCount: number;
  holdingCount: number;
  topHoldingName: string | null;
  topHoldingWeight: number | null;
  leadingHolding: { name: string; change: number } | null;
  trend: Array<{ savedOn: string; currentValue: number }>;
};

function formatGoalPeriod(months: number | null) {
  if (months === null) return "50년 안에는 예측하기 어려워요";
  if (months <= 0) return "이미 목표를 달성했어요";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years ? `${years}년` : "",
    remainingMonths ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function koreanParticle(
  word: string,
  withBatchim: string,
  withoutBatchim: string,
) {
  const lastCharacter = word.trim().at(-1);
  if (!lastCharacter) return withoutBatchim;

  const code = lastCharacter.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
  }

  if (/\d/.test(lastCharacter)) {
    return ["0", "1", "3", "6", "7", "8"].includes(lastCharacter)
      ? withBatchim
      : withoutBatchim;
  }

  return withoutBatchim;
}

function GoalTrend({ points }: { points: MoneyInsight["trend"] }) {
  if (points.length < 2) {
    return (
      <div className="text-muted-foreground flex h-28 items-center justify-center text-sm">
        기록이 하나 더 쌓이면 흐름을 그려드려요.
      </div>
    );
  }

  const values = points.map((point) => point.currentValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  const coordinates = points.map((point, index) => ({
    x: (index / (points.length - 1)) * 100,
    y: 36 - ((point.currentValue - minimum) / range) * 30,
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox="0 0 100 42"
        role="img"
        aria-label="최근 평가금액 변화"
        className="h-28 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="home-goal-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,42 ${line} 100,42`} fill="url(#home-goal-trend)" />
        <polyline
          points={line}
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coordinates.map((point, index) => (
          <circle
            key={points[index].savedOn}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill="rgb(16 185 129)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{points[0].savedOn.slice(5).replace("-", ".")}</span>
        <span>{points.at(-1)!.savedOn.slice(5).replace("-", ".")}</span>
      </div>
    </div>
  );
}

const MONEY_METAPHORS = [
  {
    max: 10_000,
    label: "커피 한 잔",
    image: "/images/money-metaphors/coffee.png",
  },
  {
    max: 50_000,
    label: "치킨 한 마리",
    image: "/images/money-metaphors/chicken.png",
  },
  {
    max: 300_000,
    label: "운동화 한 켤레",
    image: "/images/money-metaphors/sneakers.png",
  },
  {
    max: 500_000,
    label: "무선 이어폰 한 세트",
    image: "/images/money-metaphors/earbuds.png",
  },
  {
    max: 1_000_000,
    label: "태블릿 한 대",
    image: "/images/money-metaphors/tablet.png",
  },
  {
    max: 2_000_000,
    label: "게임기 한 대",
    image: "/images/money-metaphors/console.png",
  },
  {
    max: 5_000_000,
    label: "가까운 여행 한 번",
    image: "/images/money-metaphors/travel.png",
  },
  {
    max: 30_000_000,
    label: "프리미엄 시계 하나",
    image: "/images/money-metaphors/watch.png",
  },
  {
    max: 100_000_000,
    label: "자동차 한 대",
    image: "/images/money-metaphors/car.png",
  },
  {
    max: Number.POSITIVE_INFINITY,
    label: "집 한 채",
    image: "/images/money-metaphors/house.png",
  },
] as const;

function moneyMetaphor(amount: number) {
  const absoluteAmount = Math.abs(amount);
  return (
    MONEY_METAPHORS.find((metaphor) => absoluteAmount < metaphor.max) ??
    MONEY_METAPHORS.at(-1)!
  );
}

function ProfitMetaphorCard({
  amount,
  period,
  periodLabel: customPeriodLabel,
}: {
  amount: number | null;
  period: "daily" | "monthly";
  periodLabel?: string;
}) {
  const periodLabel =
    customPeriodLabel ?? (period === "daily" ? "오늘" : "이번 달");

  if (amount === null) {
    return (
      <div className="bg-muted/35 flex min-h-56 flex-col justify-center rounded-2xl border border-dashed p-6 text-left">
        <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
          {period === "daily" ? "Today" : "This month"}
        </p>
        <p className="mt-3 text-lg font-black">비교 기록이 하나 더 필요해요</p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          다음 분석이 저장되면 {periodLabel} 손익을 친숙한 물건으로
          바꿔드릴게요.
        </p>
      </div>
    );
  }

  const metaphor = moneyMetaphor(amount);
  const isGain = amount > 0;
  const isFlat = amount === 0;
  const message = isFlat
    ? `${periodLabel}은 자산이 제자리예요`
    : isGain
      ? `${periodLabel} ${metaphor.label}값을 벌었어요!`
      : `${periodLabel} ${metaphor.label}값을 날렸어요 ㅠㅠ`;

  return (
    <div
      className={cn(
        "relative min-h-56 overflow-hidden rounded-2xl border p-6 text-left",
        isGain
          ? "via-background border-red-500/20 bg-gradient-to-br from-red-500/10 to-amber-500/10"
          : isFlat
            ? "bg-muted/35"
            : "via-background border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-sky-500/10",
      )}
    >
      <div className="relative z-10 max-w-[68%]">
        <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
          {period === "daily" ? "Today" : "This month"}
        </p>
        <p className="mt-3 text-xl leading-snug font-black text-balance sm:text-2xl">
          {message}
        </p>
        <p
          className={cn(
            "mt-4 text-lg font-black tabular-nums",
            isGain
              ? "text-red-500"
              : isFlat
                ? "text-muted-foreground"
                : "text-blue-500",
          )}
        >
          {isGain ? "+" : amount < 0 ? "-" : ""}
          {formatKoreanMoney(Math.abs(amount))}
        </p>
      </div>
      <img
        src={metaphor.image}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -bottom-6 size-40 object-contain drop-shadow-2xl sm:size-48"
      />
    </div>
  );
}

function MyEokkaSummary({ insight }: { insight: MoneyInsight }) {
  const latestDate = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${insight.latestSavedOn}T12:00:00+09:00`));

  return (
    <div className="bg-card/90 rounded-3xl border p-5 text-left shadow-2xl shadow-black/5 backdrop-blur sm:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-500 uppercase">
            My EOKKA
          </p>
          <h2 className="mt-2 text-2xl font-black">내 돈의 오늘을 쉽게 봐요</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {formatKoreanMoney(insight.goalAmount)} 목표 · 최근{" "}
            {insight.recordCount}개 기록 기준
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {insight.isLatestToday ? "오늘 업데이트" : `${latestDate} 업데이트`}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            현재 평가금액
          </p>
          <p className="mt-2 text-xl font-black tabular-nums">
            {formatKoreanMoney(insight.currentValue)}
          </p>
        </div>
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            평가손익
          </p>
          <p
            className={cn(
              "mt-2 text-xl font-black tabular-nums",
              insight.profit > 0
                ? "text-red-500"
                : insight.profit < 0
                  ? "text-blue-500"
                  : "text-muted-foreground",
            )}
          >
            {insight.profit > 0 ? "+" : insight.profit < 0 ? "-" : ""}
            {formatKoreanMoney(Math.abs(insight.profit))}
          </p>
        </div>
        <div className="bg-muted/25 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-semibold">
            현재 수익률
          </p>
          <p
            className={cn(
              "mt-2 text-xl font-black tabular-nums",
              insight.returnRate > 0
                ? "text-red-500"
                : insight.returnRate < 0
                  ? "text-blue-500"
                  : "text-muted-foreground",
            )}
          >
            {insight.returnRate > 0 ? "+" : ""}
            {insight.returnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ProfitMetaphorCard
          amount={insight.dailyProfitChange}
          period="daily"
          periodLabel={insight.isLatestToday ? "오늘" : "최근 하루"}
        />
        <ProfitMetaphorCard
          amount={insight.monthlyProfitChange}
          period="monthly"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                <TargetIcon className="size-4 text-emerald-500" /> Goal progress
              </p>
              <p className="mt-3 text-2xl font-black sm:text-3xl">
                {formatGoalPeriod(insight.goalMonth)}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                평균 시나리오 기준 목표 도달 예상 기간
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-emerald-500 tabular-nums">
                {insight.progressPercent.toFixed(1)}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">목표 달성률</p>
            </div>
          </div>
          <div className="bg-muted mt-5 h-2.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${insight.progressPercent}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col justify-between gap-2 text-sm sm:flex-row">
            <span className="text-muted-foreground">
              현재 {formatKoreanMoney(insight.currentValue)}
            </span>
            <strong>
              목표까지 {formatKoreanMoney(insight.remainingAmount)}
            </strong>
          </div>
        </section>

        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
            <Clock3Icon className="size-4 text-emerald-500" /> Time change
          </p>
          {insight.goalMonthChange === null ? (
            <>
              <p className="mt-4 text-xl font-black">비교 기록이 필요해요</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                다음 기록부터 목표가 얼마나 가까워졌는지 알려드려요.
              </p>
            </>
          ) : insight.goalMonthChange === 0 ? (
            <>
              <p className="mt-4 text-xl font-black">예상 기간이 그대로예요</p>
              <p className="text-muted-foreground mt-2 text-sm">
                이전 기록과 같은 예상 기간이에요.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-xl leading-snug font-black">
                목표가 {Math.abs(insight.goalMonthChange)}개월{" "}
                <span
                  className={
                    insight.goalMonthChange > 0
                      ? "text-red-500"
                      : "text-blue-500"
                  }
                >
                  {insight.goalMonthChange > 0 ? "가까워졌어요" : "멀어졌어요"}
                </span>
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                이전 분석의 평균 시나리오와 비교했어요.
              </p>
            </>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                <TrophyIcon className="size-4 text-amber-500" /> Portfolio check
              </p>
              <h3 className="mt-2 text-lg font-black">
                오늘의 포트폴리오 한눈에
              </h3>
            </div>
            <PieChartIcon className="text-muted-foreground size-6" />
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <p>
              <strong>
                {insight.holdingCount}개 종목 중{" "}
                {insight.profitableHoldingCount}개
              </strong>
              가 수익 구간이에요.
            </p>
            {insight.topHoldingName && insight.topHoldingWeight !== null && (
              <p className="text-muted-foreground leading-6">
                <strong className="text-foreground">
                  {insight.topHoldingName}
                </strong>
                {koreanParticle(insight.topHoldingName, "이", "가")} 현재 자산의{" "}
                <strong className="text-foreground">
                  {insight.topHoldingWeight.toFixed(1)}%
                </strong>
                를 차지해요.
              </p>
            )}
            {insight.leadingHolding && (
              <p className="text-muted-foreground leading-6">
                최근 변화에 가장 크게 영향을 준 종목은{" "}
                <strong className="text-foreground">
                  {insight.leadingHolding.name}
                </strong>
                {koreanParticle(insight.leadingHolding.name, "이에요", "예요")}
                <span
                  className={
                    insight.leadingHolding.change >= 0
                      ? "text-red-500"
                      : "text-blue-500"
                  }
                >
                  {" "}
                  ({insight.leadingHolding.change >= 0 ? "+" : "-"}
                  {formatKoreanMoney(Math.abs(insight.leadingHolding.change))})
                </span>
                .
              </p>
            )}
          </div>
        </section>

        <section className="bg-muted/25 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
                <BarChart3Icon className="size-4 text-emerald-500" /> Recent
                records
              </p>
              <h3 className="mt-2 text-lg font-black">최근 자산 흐름</h3>
            </div>
            <span className="text-muted-foreground text-xs">
              최근 {insight.trend.length}개
            </span>
          </div>
          <div className="mt-3">
            <GoalTrend points={insight.trend} />
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-xs leading-5">
          저장된 분석의 평가금액 변화를 비교한 값이에요. 매수·매도나 입출금이
          있으면 실제 투자 수익과 차이가 날 수 있어요.
        </p>
        <div className="flex shrink-0">
          <Button asChild>
            <Link to="/dashboard">
              대시보드 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

const emptyHolding = (id: number): Holding => ({
  id,
  symbol: "",
  averagePrice: "",
  currency: "KRW",
  quantity: "",
  selectedStock: null,
});

function JackpotGoal() {
  const [currentGoal, setCurrentGoal] = useState(1);
  const [nextGoal, setNextGoal] = useState(2);
  const [isRolling, setIsRolling] = useState(false);
  const currentGoalRef = useRef(1);

  useEffect(() => {
    const roll = () => {
      let randomGoal = Math.floor(Math.random() * 9) + 1;
      while (randomGoal === currentGoalRef.current)
        randomGoal = Math.floor(Math.random() * 9) + 1;
      setNextGoal(randomGoal);
      setIsRolling(true);
    };

    const interval = window.setInterval(roll, 2_200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      className="relative inline-block h-[1em] w-[1ch] overflow-hidden align-[-0.08em] text-emerald-500 tabular-nums"
      aria-label={`${currentGoal}억`}
    >
      <span
        className="flex flex-col items-end leading-none will-change-transform"
        style={{
          transform: isRolling ? "translateY(-1em)" : "translateY(0)",
          transition: isRolling
            ? "transform 700ms cubic-bezier(0.22, 0.7, 0.24, 1)"
            : "none",
        }}
        onTransitionEnd={() => {
          if (!isRolling) return;
          currentGoalRef.current = nextGoal;
          setCurrentGoal(nextGoal);
          setIsRolling(false);
        }}
        aria-hidden="true"
      >
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {currentGoal}
        </span>
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {nextGoal}
        </span>
      </span>
    </span>
  );
}

export default function Home() {
  const { marketMode, isAuthenticated, moneyInsights } =
    useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const isGlobalTest = marketMode === "global-test";
  const hasPortfolioDraft = Boolean(
    (location.state as { portfolioDraft?: unknown } | null)?.portfolioDraft,
  );
  const [tab, setTab] = useState<"quick" | "saved">(() =>
    isAuthenticated && !hasPortfolioDraft ? "saved" : "quick",
  );
  const [holdings, setHoldings] = useState<Holding[]>([emptyHolding(1)]);
  const [targetEok, setTargetEok] = useState("1");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [investmentYears, setInvestmentYears] = useState("");
  const [investmentMonths, setInvestmentMonths] = useState("");
  const [investmentPeriodUnknown, setInvestmentPeriodUnknown] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSecondsLeft, setAnalysisSecondsLeft] = useState(
    ANALYSIS_ESTIMATED_SECONDS,
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const matrixTrailRef = useRef<CurrencyTrailPoint[]>([]);

  const selectTab = (nextTab: "quick" | "saved") => {
    setTab(nextTab);
    if (isAuthenticated)
      window.sessionStorage.setItem(HOME_TAB_STORAGE_KEY, nextTab);
  };

  const moveMatrixSpotlight = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const now = performance.now();
    const latest = matrixTrailRef.current.at(-1);
    const distance = latest
      ? Math.hypot(event.clientX - latest.x, event.clientY - latest.y)
      : 0;
    const elapsed = latest ? Math.max(1, now - latest.time) : 16;
    if (!latest || distance > 4) {
      matrixTrailRef.current.push({
        x: event.clientX,
        y: event.clientY,
        time: now,
        speed: Math.min(1.75, distance / elapsed),
      });
      if (matrixTrailRef.current.length > 34) matrixTrailRef.current.shift();
    }
  };

  useEffect(() => {
    if (!isAnalyzing) return;
    setAnalysisSecondsLeft(ANALYSIS_ESTIMATED_SECONDS);
    const timer = window.setInterval(() => {
      setAnalysisSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  useEffect(() => {
    if (!isAuthenticated) {
      window.sessionStorage.removeItem(HOME_TAB_STORAGE_KEY);
      return;
    }
    if (hasPortfolioDraft) return;

    const storedTab = window.sessionStorage.getItem(HOME_TAB_STORAGE_KEY);
    if (storedTab === "quick" || storedTab === "saved") setTab(storedTab);
  }, [hasPortfolioDraft, isAuthenticated]);

  useEffect(() => {
    // 이전 버전에서 장기 저장한 입력값은 남기지 않습니다.
    window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
    window.localStorage.removeItem(ANALYSIS_STORAGE_KEY);

    try {
      const navigationDraft = (
        location.state as {
          portfolioDraft?: {
            holdings?: Holding[];
            targetEok?: string;
            monthlyContribution?: string;
            investmentYears?: string;
            investmentMonths?: string;
            investmentPeriodUnknown?: boolean;
          };
        } | null
      )?.portfolioDraft;
      if (navigationDraft) {
        setTab("quick");
        if (isAuthenticated) {
          window.sessionStorage.setItem(HOME_TAB_STORAGE_KEY, "quick");
        }
      }
      const storedDraft = navigationDraft
        ? JSON.stringify(navigationDraft)
        : window.sessionStorage.getItem(HOLDINGS_STORAGE_KEY);
      if (storedDraft) {
        const draft = JSON.parse(storedDraft) as {
          holdings?: Holding[];
          targetEok?: string;
          monthlyContribution?: string;
          investmentYears?: string;
          investmentMonths?: string;
          investmentPeriodUnknown?: boolean;
        };

        if (
          Array.isArray(draft.holdings) &&
          draft.holdings.length > 0 &&
          draft.holdings.length <= 10 &&
          draft.holdings.every(
            (holding) =>
              Number.isInteger(holding.id) &&
              typeof holding.symbol === "string" &&
              typeof holding.averagePrice === "string" &&
              typeof holding.quantity === "string" &&
              (!holding.selectedStock ||
                isGlobalTest ||
                holding.selectedStock.country === "KR"),
          )
        ) {
          setHoldings(
            draft.holdings.map((holding) => ({
              ...holding,
              currency:
                holding.currency === "USD" && isGlobalTest ? "USD" : "KRW",
            })),
          );
        }
        if (
          typeof draft.targetEok === "string" &&
          Number.isInteger(Number(draft.targetEok)) &&
          Number(draft.targetEok) >= 1 &&
          Number(draft.targetEok) <= 1_000
        )
          setTargetEok(draft.targetEok);
        if (
          typeof draft.monthlyContribution === "string" &&
          /^\d*$/.test(draft.monthlyContribution) &&
          Number(draft.monthlyContribution || 0) <= 1_000_000_000
        )
          setMonthlyContribution(draft.monthlyContribution);
        if (
          typeof draft.investmentYears === "string" &&
          /^\d*$/.test(draft.investmentYears) &&
          Number(draft.investmentYears || 0) <= 100
        )
          setInvestmentYears(draft.investmentYears);
        if (
          typeof draft.investmentMonths === "string" &&
          /^\d*$/.test(draft.investmentMonths) &&
          Number(draft.investmentMonths || 0) <= 11
        )
          setInvestmentMonths(draft.investmentMonths);
        if (draft.investmentPeriodUnknown === true) {
          setInvestmentPeriodUnknown(true);
          setInvestmentYears("");
          setInvestmentMonths("");
        }
      }
    } catch {
      window.sessionStorage.removeItem(HOLDINGS_STORAGE_KEY);
    }

    try {
      const storedAnalysis =
        window.sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
      if (storedAnalysis) {
        const parsed = JSON.parse(storedAnalysis) as Partial<AnalysisResult>;
        if (
          parsed.marketMode === marketMode &&
          typeof parsed.asOf === "string" &&
          typeof parsed.goalAmount === "number" &&
          Array.isArray(parsed.holdings) &&
          Array.isArray(parsed.scenarios) &&
          Array.isArray(parsed.chart) &&
          Array.isArray(parsed.summary)
        )
          setAnalysis(parsed as AnalysisResult);
        else window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      }
    } catch {
      window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    }

    setDraftLoaded(true);
    if ((location.state as { portfolioDraft?: unknown } | null)?.portfolioDraft)
      navigate(location.pathname, { replace: true, state: null });
  }, [isGlobalTest, location.pathname, location.state, marketMode, navigate]);

  useEffect(() => {
    if (!draftLoaded) return;
    window.sessionStorage.setItem(
      HOLDINGS_STORAGE_KEY,
      JSON.stringify({
        holdings,
        targetEok,
        monthlyContribution,
        investmentYears,
        investmentMonths,
        investmentPeriodUnknown,
      }),
    );
  }, [
    draftLoaded,
    holdings,
    investmentMonths,
    investmentPeriodUnknown,
    investmentYears,
    monthlyContribution,
    targetEok,
  ]);

  const updateHolding = (
    id: number,
    field: "symbol" | "averagePrice" | "quantity",
    value: string,
  ) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateHoldingSymbol = (id: number, symbol: string) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id ? { ...item, symbol, selectedStock: null } : item,
      ),
    );
  };

  const updateCurrency = (id: number, currency: Holding["currency"]) => {
    setHoldings((items) =>
      items.map((item) => (item.id === id ? { ...item, currency } : item)),
    );
  };

  const selectStock = (id: number, stock: StockSearchResult) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              symbol: stock.name,
              selectedStock: stock,
              currency: stock.currency,
            }
          : item,
      ),
    );
  };

  const addHolding = () => {
    if (holdings.length >= 10) return;
    const nextId = Math.max(...holdings.map(({ id }) => id), 0) + 1;
    setHoldings((items) => [...items, emptyHolding(nextId)]);
  };

  const clearStoredPortfolio = () => {
    const shouldClear = window.confirm(
      "현재 탭에 저장된 종목과 입력 정보를 모두 삭제할까요?",
    );
    if (!shouldClear) return;
    window.sessionStorage.removeItem(HOLDINGS_STORAGE_KEY);
    window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    setHoldings([emptyHolding(1)]);
    setTargetEok("1");
    setMonthlyContribution("");
    setInvestmentYears("");
    setInvestmentMonths("");
    setInvestmentPeriodUnknown(false);
    setAnalysis(null);
    setAnalysisError("");
  };

  const targetAmount = Number(targetEok) * 100_000_000;
  const monthlyContributionAmount = Number(monthlyContribution || 0);
  const investmentPeriodMonths = investmentPeriodUnknown
    ? null
    : Number(investmentYears || 0) * 12 + Number(investmentMonths || 0);
  const updateMonthlyContribution = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (!digits) {
      setMonthlyContribution("");
      return;
    }

    setMonthlyContribution(
      String(Math.min(Number(digits), MONTHLY_CONTRIBUTION_MAX)),
    );
  };
  const addMonthlyContribution = (amount: number) => {
    setMonthlyContribution(
      String(
        Math.min(monthlyContributionAmount + amount, MONTHLY_CONTRIBUTION_MAX),
      ),
    );
  };
  const canAnalyze =
    Number.isInteger(Number(targetEok)) &&
    Number(targetEok) >= 1 &&
    Number(targetEok) <= 1_000 &&
    Number.isInteger(monthlyContributionAmount) &&
    monthlyContributionAmount >= 0 &&
    monthlyContributionAmount <= MONTHLY_CONTRIBUTION_MAX &&
    (investmentPeriodUnknown ||
      (Number.isInteger(investmentPeriodMonths) &&
        investmentPeriodMonths !== null &&
        investmentPeriodMonths >= 1 &&
        investmentPeriodMonths <= 1_200)) &&
    holdings.every(
      ({ selectedStock, averagePrice, quantity }) =>
        selectedStock && Number(averagePrice) > 0 && Number(quantity) > 0,
    );

  const analyze = async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/stocks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalAmount: targetAmount,
          monthlyContribution: monthlyContributionAmount,
          investmentPeriodMonths,
          holdings: holdings.map((holding) => ({
            stockId: holding.selectedStock!.stockId,
            averagePrice: Number(holding.averagePrice),
            quantity: Number(holding.quantity),
            currency: holding.currency,
          })),
        }),
      });
      const body = (await response.json()) as
        | AnalysisResult
        | { error: string };
      if (!response.ok || "error" in body)
        throw new Error("error" in body ? body.error : "분석에 실패했습니다.");
      setAnalysis(body);
      window.sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(body));
      if (isAuthenticated) void revalidator.revalidate();
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "분석에 실패했습니다.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main
      className="relative -my-16 overflow-hidden md:-my-32"
      onPointerMove={moveMatrixSpotlight}
      onPointerEnter={moveMatrixSpotlight}
      onPointerLeave={() => {
        matrixTrailRef.current = [];
      }}
    >
      <CurrencyMatrixSpotlight
        canvasRef={matrixCanvasRef}
        trailRef={matrixTrailRef}
      />
      <section className="relative z-10 border-b">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-72 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute top-24 -right-48 size-80 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-28 md:pb-28">
          <header className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm backdrop-blur dark:text-emerald-400">
              <SparklesIcon className="size-3.5 text-emerald-500" />
              EOKKA BETA
            </div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl md:text-7xl">
              내 주식,{" "}
              <span className="inline-flex items-baseline bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                <JackpotGoal />
                억까지
              </span>
              <br />
              얼마나 남았을까?
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 text-pretty md:text-lg">
              보유 주식의 현재 수익률과 목표 달성 시점을 확인해보세요.
            </p>
            <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <span className="size-2 rounded-full bg-amber-500" />
              {isGlobalTest
                ? "로컬 KIS 테스트 모드 · 국내·미국 주식 지원"
                : "베타 서비스 기간에는 국내 주식·ETF·ETN만 지원합니다"}
            </div>
          </header>

          <div className="mx-auto mt-12 max-w-4xl">
            <div className="mb-4 flex justify-center">
              <div
                className="bg-muted/70 inline-flex rounded-xl p-1"
                role="tablist"
              >
                {[
                  ["quick", "빠른 분석"],
                  ["saved", "오늘의 억까"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => selectTab(value as typeof tab)}
                    className={cn(
                      "rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                      tab === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === "quick" ? (
              <div className="bg-card/90 rounded-3xl border shadow-2xl shadow-black/5 backdrop-blur dark:shadow-black/20">
                <div className="border-b px-5 py-5 sm:px-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <TrendingUpIcon className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          보유 주식을 알려주세요
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {isGlobalTest
                            ? "국내 주식과 미국 주식을 KIS 시세로 테스트할 수 있어요."
                            : "국내 주식과 ETF·ETN을 입력할 수 있어요. 로그인하면 분석 결과를 저장하고, 추가 매수 후에도 이어서 분석할 수 있어요."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearStoredPortfolio}
                      className="border-red-500/40 text-red-500 hover:border-red-500 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2Icon className="size-4" />
                      현재 탭의 정보 삭제
                    </Button>
                  </div>
                </div>

                <form
                  className="space-y-7 px-5 py-6 sm:px-8 sm:py-8"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void analyze();
                  }}
                >
                  <div className="space-y-4">
                    {holdings.map((holding, index) => (
                      <div
                        key={holding.id}
                        className="bg-muted/35 rounded-2xl border p-4 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                              {index + 1}
                            </span>
                            보유 종목
                          </div>
                          {holdings.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`${index + 1}번째 종목 삭제`}
                              onClick={() =>
                                setHoldings((items) =>
                                  items.filter(({ id }) => id !== holding.id),
                                )
                              }
                              className="text-muted-foreground hover:text-destructive size-8"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
                          <Field
                            label="종목명 또는 티커"
                            id={`symbol-${holding.id}`}
                          >
                            <StockAutocomplete
                              id={`symbol-${holding.id}`}
                              value={holding.symbol}
                              selectedStock={holding.selectedStock}
                              onValueChange={(value) =>
                                updateHoldingSymbol(holding.id, value)
                              }
                              onSelect={(stock) =>
                                selectStock(holding.id, stock)
                              }
                            />
                          </Field>

                          <Field
                            label={
                              <>
                                평균 매수가
                                {isGlobalTest && holding.currency === "USD" && (
                                  <span className="text-muted-foreground ml-1 text-[11px] font-normal">
                                    (달러는 소수점 없이 입력)
                                  </span>
                                )}
                              </>
                            }
                            id={`price-${holding.id}`}
                          >
                            <div className="flex gap-2">
                              {isGlobalTest && (
                                <div
                                  className="bg-muted flex h-11 shrink-0 rounded-md p-1"
                                  aria-label="매수 통화"
                                >
                                  {(["KRW", "USD"] as const).map((currency) => (
                                    <button
                                      key={currency}
                                      type="button"
                                      aria-pressed={
                                        holding.currency === currency
                                      }
                                      onClick={() =>
                                        updateCurrency(holding.id, currency)
                                      }
                                      className={cn(
                                        "min-w-9 rounded-sm px-2 text-sm font-bold transition-all",
                                        holding.currency === currency
                                          ? "bg-background text-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground",
                                      )}
                                    >
                                      {currency === "KRW" ? "₩" : "$"}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="relative min-w-0 flex-1">
                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                  {holding.currency === "KRW" ? "₩" : "$"}
                                </span>
                                <Input
                                  id={`price-${holding.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={holding.averagePrice}
                                  onChange={(event) =>
                                    updateHolding(
                                      holding.id,
                                      "averagePrice",
                                      event.target.value.replace(/\D/g, ""),
                                    )
                                  }
                                  placeholder={
                                    holding.currency === "KRW"
                                      ? "예: 70000"
                                      : "예: 180"
                                  }
                                  className="bg-background h-11 pl-7"
                                />
                              </div>
                            </div>
                          </Field>

                          <Field
                            label="보유 수량"
                            id={`quantity-${holding.id}`}
                          >
                            <div className="relative">
                              <Input
                                id={`quantity-${holding.id}`}
                                type="number"
                                min="0"
                                step="0.000001"
                                inputMode="decimal"
                                value={holding.quantity}
                                onChange={(event) =>
                                  updateHolding(
                                    holding.id,
                                    "quantity",
                                    event.target.value,
                                  )
                                }
                                placeholder="20"
                                className="bg-background h-11 pr-9"
                              />
                              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                                주
                              </span>
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addHolding}
                      disabled={holdings.length >= 10}
                      className="h-11 w-full border-dashed"
                    >
                      <PlusIcon />
                      {holdings.length >= 10
                        ? "최대 10개까지 추가할 수 있어요"
                        : `종목 추가하기 (${holdings.length}/10)`}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                    <div>
                      <Label htmlFor="investment-years" className="font-bold">
                        주식 투자를 시작한 지 얼마나 됐나요?
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        현재 누적 수익률을 대략적인 연평균 수익률로 환산하는 데
                        사용해요.
                      </p>
                      <div className="mt-3 flex max-w-sm items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="investment-years"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={investmentYears}
                            disabled={investmentPeriodUnknown}
                            onChange={(event) => {
                              const value = event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 3);
                              setInvestmentYears(
                                value
                                  ? String(Math.min(Number(value), 100))
                                  : "",
                              );
                            }}
                            placeholder="예: 3"
                            className="bg-background h-11 pr-9 text-right font-bold tabular-nums"
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            년
                          </span>
                        </div>
                        <div className="relative flex-1">
                          <Input
                            id="investment-months"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={investmentMonths}
                            disabled={investmentPeriodUnknown}
                            onChange={(event) => {
                              const value = event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 2);
                              setInvestmentMonths(
                                value
                                  ? String(Math.min(Number(value), 11))
                                  : "",
                              );
                            }}
                            placeholder="예: 6"
                            aria-label="추가 투자 개월 수"
                            className="bg-background h-11 pr-12 text-right font-bold tabular-nums"
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            개월
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-start gap-2.5">
                        <Checkbox
                          id="investment-period-unknown"
                          checked={investmentPeriodUnknown}
                          onCheckedChange={(checked) => {
                            const isUnknown = checked === true;
                            setInvestmentPeriodUnknown(isUnknown);
                            if (isUnknown) {
                              setInvestmentYears("");
                              setInvestmentMonths("");
                            }
                          }}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor="investment-period-unknown"
                          className="text-muted-foreground cursor-pointer text-sm leading-5 font-medium"
                        >
                          1개월 미만이거나 투자 기간을 잘 모르겠어요
                        </Label>
                      </div>
                      {investmentPeriodMonths !== null &&
                        investmentPeriodMonths > 0 &&
                        investmentPeriodMonths <= 1_200 && (
                          <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            투자 기간 약{" "}
                            {Math.floor(investmentPeriodMonths / 12) > 0
                              ? `${Math.floor(investmentPeriodMonths / 12)}년 `
                              : ""}
                            {investmentPeriodMonths % 12 > 0
                              ? `${investmentPeriodMonths % 12}개월`
                              : ""}
                          </p>
                        )}
                    </div>

                    <div className="mt-5 border-t border-emerald-500/15 pt-5">
                      <Label htmlFor="target-amount" className="font-bold">
                        몇 억을 목표로 하나요?
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        1억부터 1,000억까지 원하는 목표를 입력할 수 있어요.
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="relative sm:w-44">
                          <Input
                            id="target-amount"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={targetEok}
                            onChange={(event) =>
                              setTargetEok(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4),
                              )
                            }
                            className="bg-background h-11 pr-9 text-right text-base font-bold"
                            aria-describedby="target-amount-unit"
                          />
                          <span
                            id="target-amount-unit"
                            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
                          >
                            억
                          </span>
                        </div>
                        <div className="grid flex-1 grid-cols-3 gap-2">
                          {GOAL_PRESETS.map((goal) => (
                            <button
                              key={goal}
                              type="button"
                              onClick={() => setTargetEok(String(goal))}
                              className={cn(
                                "h-11 rounded-lg border text-sm font-semibold transition-colors",
                                targetEok === String(goal)
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "bg-background hover:border-emerald-500/50",
                              )}
                            >
                              {goal}억
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-emerald-500/15 pt-5">
                      <Label
                        htmlFor="monthly-contribution"
                        className="font-bold"
                      >
                        매월 추가 투자금{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (선택)
                        </span>
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        매달 같은 금액을 현재 포트폴리오 비중대로 투자한다고
                        가정해 목표 기간이 얼마나 줄어드는지 비교해요.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-80">
                          <Input
                            id="monthly-contribution"
                            type="text"
                            inputMode="numeric"
                            value={
                              monthlyContribution
                                ? monthlyContributionAmount.toLocaleString(
                                    "ko-KR",
                                  )
                                : ""
                            }
                            onChange={(event) =>
                              updateMonthlyContribution(event.target.value)
                            }
                            placeholder="예: 1,000,000"
                            className="bg-background h-11 pr-12 text-right font-bold tabular-nums"
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            원
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {MONTHLY_CONTRIBUTION_PRESETS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => addMonthlyContribution(amount)}
                              className="bg-background h-8 rounded-full border px-3 text-xs font-semibold transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                              aria-label={`월 투자금에 ${formatKoreanMoney(amount)} 추가`}
                            >
                              +{formatKoreanMoney(amount)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {monthlyContributionAmount > 0 && (
                        <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {`매월 ${formatKoreanMoney(monthlyContributionAmount)}씩 투자`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canAnalyze || isAnalyzing}
                      className="h-12 w-full bg-emerald-500 text-base text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
                    >
                      {isAnalyzing ? (
                        <>
                          <LoaderCircleIcon className="animate-spin" />
                          시세와 목표 달성 시점 계산 중...
                        </>
                      ) : (
                        <>
                          내 주식 {targetEok || "-"}억까지 분석하기
                          <ArrowRightIcon />
                        </>
                      )}
                    </Button>
                    {isAnalyzing && (
                      <div className="mt-3" role="status" aria-live="polite">
                        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
                          <span>시세·시나리오·AI 전략을 분석하고 있어요</span>
                          <span className="shrink-0 font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                            {analysisSecondsLeft > 0
                              ? `약 ${analysisSecondsLeft}초 남음`
                              : "마무리 중..."}
                          </span>
                        </div>
                        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-linear"
                            style={{
                              width: `${Math.min(
                                95,
                                ((ANALYSIS_ESTIMATED_SECONDS -
                                  analysisSecondsLeft) /
                                  ANALYSIS_ESTIMATED_SECONDS) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-center text-[11px]">
                          데이터 조회 상황에 따라 실제 시간은 달라질 수 있어요
                        </p>
                      </div>
                    )}
                    <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-xs">
                      <LockKeyholeIcon className="size-3.5" />
                      입력 정보는 현재 탭에서만 유지되며, 탭을 닫으면 자동
                      삭제돼요
                    </p>
                  </div>
                  {analysisError && (
                    <p
                      role="alert"
                      className="text-destructive text-center text-sm"
                    >
                      {analysisError}
                    </p>
                  )}
                </form>
              </div>
            ) : isAuthenticated && moneyInsights ? (
              <MyEokkaSummary insight={moneyInsights} />
            ) : isAuthenticated ? (
              <div className="bg-card/90 rounded-3xl border p-8 text-center shadow-2xl shadow-black/5 backdrop-blur sm:p-12">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <BarChart3Icon className="size-7" />
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  첫 분석을 기다리고 있어요
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
                  분석 기록이 쌓이면 오늘과 이번 달의 손익을 커피·치킨·여행 같은
                  익숙한 물건으로 바꿔 보여드려요.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-6"
                  onClick={() => selectTab("quick")}
                >
                  첫 분석 시작하기
                </Button>
              </div>
            ) : (
              <div className="bg-card/90 rounded-3xl border p-8 text-center shadow-2xl shadow-black/5 backdrop-blur sm:p-12">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <BarChart3Icon className="size-7" />
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  내 분석을 계속 이어보세요
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
                  로그인하면 보유 종목과 분석 결과를 저장하고, 다시 방문할
                  때마다 달라진 목표 도착일을 확인할 수 있어요.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link to="/login">로그인하기</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/join">무료로 시작하기</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {tab === "quick" && analysis && (
            <div className="mx-auto max-w-4xl">
              <AnalysisResultView
                result={analysis}
                showAuthCta={!isAuthenticated}
              />
            </div>
          )}

          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              "현재 가격과 수익률 확인",
              "3가지 성장 시나리오",
              "AI 요약 분석",
            ].map((item) => (
              <div
                key={item}
                className="text-muted-foreground flex items-center justify-center gap-2 text-xs font-medium"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckIcon className="size-3" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: React.ReactNode;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
