import type { MouseEvent as ReactMouseEvent } from "react";

import type { AnalysisResult } from "../analysis.types";

import { useEffect, useMemo, useState } from "react";

type Scenario = AnalysisResult["scenarios"][number];
type ScenarioKey = Scenario["key"];

const scenarioTone: Record<ScenarioKey, { active: string; accent: string }> = {
  conservative: {
    active: "border-amber-400 bg-amber-400/10 text-amber-600",
    accent: "text-amber-400",
  },
  base: {
    active: "border-emerald-400 bg-emerald-400/10 text-emerald-600",
    accent: "text-emerald-400",
  },
  optimistic: {
    active: "border-sky-400 bg-sky-400/10 text-sky-600",
    accent: "text-sky-400",
  },
};

// Fixed launch thresholds intentionally keep the broad 12–30 year range in
// Bronze/Silver/Gold and narrow each higher tier. Replace these with observed
// user percentiles once the service has enough anonymized analysis data.
const tiers = [
  {
    maxMonth: 18,
    tier: "챌린저",
    speed: "28,000km",
    image: "/images/speed-tiers/challenger-fantasy-v2.webp",
    name: "궤도를 돌파하는 로켓",
    rank: 9,
    frame:
      "from-cyan-200 via-fuchsia-400 to-amber-200 shadow-[0_0_55px_rgba(103,232,249,0.5)]",
    surface: "from-slate-950 via-fuchsia-950 to-slate-950",
    badge: "border-cyan-200/60 bg-cyan-300/20 text-cyan-100",
    headlines: [
      "목표가 시야에 들어오기도 전에 도착하는 속도예요",
      "시간과 공간을 접어 목표를 향하고 있어요",
      "가장 빠른 항로로 목표에 접근하고 있어요",
    ],
  },
  {
    maxMonth: 36,
    tier: "그랜드 마스터",
    speed: "2,400km",
    image: "/images/speed-tiers/grand-master-fantasy-v2.webp",
    name: "음속을 가르는 전투기",
    rank: 8,
    frame:
      "from-red-300 via-amber-300 to-fuchsia-400 shadow-[0_0_45px_rgba(251,113,133,0.45)]",
    surface: "from-slate-950 via-red-950 to-slate-950",
    badge: "border-red-300/60 bg-red-400/20 text-red-100",
    headlines: [
      "중력을 벗어나듯 목표와의 거리를 줄이고 있어요",
      "강력한 추진력으로 목표 궤도에 진입하고 있어요",
      "목표를 향한 카운트다운이 이미 시작됐어요",
    ],
  },
  {
    maxMonth: 60,
    tier: "마스터",
    speed: "900km",
    image: "/images/speed-tiers/master-fantasy-v2.webp",
    name: "구름 위를 나는 여객기",
    rank: 7,
    frame:
      "from-violet-300 via-indigo-500 to-sky-300 shadow-[0_0_38px_rgba(139,92,246,0.4)]",
    surface: "from-slate-950 via-indigo-950 to-slate-950",
    badge: "border-violet-300/60 bg-violet-400/20 text-violet-100",
    headlines: [
      "대기를 가르며 빠른 항로로 진입했어요",
      "흔들림을 뚫고 목표를 향해 고속 비행 중이에요",
      "강한 속도로 목표가 빠르게 가까워지고 있어요",
    ],
  },
  {
    maxMonth: 84,
    tier: "다이아",
    speed: "300km",
    image: "/images/speed-tiers/diamond-fantasy-v2.webp",
    name: "한계를 질주하는 슈퍼카",
    rank: 6,
    frame:
      "from-white via-sky-300 to-violet-200 shadow-[0_0_32px_rgba(186,230,253,0.38)]",
    surface: "from-slate-950 via-sky-950 to-slate-950",
    badge: "border-sky-200/70 bg-white/15 text-sky-50",
    headlines: [
      "구름 위의 빠른 길로 목표를 향하고 있어요",
      "지상의 속도를 넘어 목표에 접근하고 있어요",
      "높고 빠른 항로에서 복리가 비행 중이에요",
    ],
  },
  {
    maxMonth: 108,
    tier: "에메랄드",
    speed: "110km",
    image: "/images/speed-tiers/emerald-fantasy-v2.webp",
    name: "초원을 가르는 치타",
    rank: 5,
    frame:
      "from-emerald-200 via-emerald-500 to-teal-200 shadow-[0_0_27px_rgba(16,185,129,0.35)]",
    surface: "from-slate-950 via-emerald-950 to-slate-950",
    badge: "border-emerald-300/60 bg-emerald-400/20 text-emerald-100",
    headlines: [
      "도시의 불빛을 뒤로하고 목표를 향해 달려요",
      "빠른 차선에서 목표와의 거리를 줄이고 있어요",
      "안정적인 가속으로 목표에 가까워지고 있어요",
    ],
  },
  {
    maxMonth: 144,
    tier: "플래티넘",
    speed: "70km",
    image: "/images/speed-tiers/platinum-fantasy-v2.webp",
    name: "전속력으로 달리는 경주마",
    rank: 4,
    frame:
      "from-slate-100 via-cyan-300 to-slate-300 shadow-[0_0_22px_rgba(148,163,184,0.3)]",
    surface: "from-slate-950 via-slate-800 to-slate-950",
    badge: "border-slate-200/50 bg-slate-200/15 text-slate-100",
    headlines: [
      "탄탄한 속도로 목표를 향해 주행하고 있어요",
      "꾸준한 가속이 목표까지의 길을 줄이고 있어요",
      "목표를 향한 고속도로에 올라섰어요",
    ],
  },
  {
    maxMonth: 216,
    tier: "골드",
    speed: "50km",
    image: "/images/speed-tiers/gold-fantasy-v2.webp",
    name: "황금 궤도의 증기기관차",
    rank: 3,
    frame: "from-yellow-200 via-amber-500 to-yellow-700 shadow-xl",
    surface: "from-stone-950 via-amber-950 to-stone-950",
    badge: "border-amber-300/50 bg-amber-400/15 text-amber-100",
    headlines: [
      "정해진 궤도를 따라 힘차게 전진하고 있어요",
      "꾸준한 증기처럼 복리의 힘이 쌓이고 있어요",
      "멈추지 않는 바퀴가 목표를 가까이 데려와요",
    ],
  },
  {
    maxMonth: 288,
    tier: "실버",
    speed: "20km",
    image: "/images/speed-tiers/silver-fantasy-v2.webp",
    name: "바람을 타는 자전거",
    rank: 2,
    frame: "from-slate-200 via-slate-400 to-slate-600 shadow-lg",
    surface: "from-zinc-950 via-slate-800 to-zinc-950",
    badge: "border-slate-300/40 bg-slate-300/10 text-slate-200",
    headlines: [
      "느긋하지만 분명한 속도로 목적지를 향하고 있어요",
      "차근차근 달리며 긴 여정을 줄이고 있어요",
      "흔들리는 길에서도 방향을 지키고 있어요",
    ],
  },
  {
    maxMonth: 360,
    tier: "브론즈",
    speed: "6km",
    image: "/images/speed-tiers/bronze-fantasy-v2.webp",
    name: "소가 끄는 나무 수레",
    rank: 1,
    frame: "from-amber-900 via-orange-400 to-stone-700 shadow-md",
    surface: "from-stone-950 via-stone-900 to-zinc-950",
    badge: "border-orange-700/50 bg-orange-900/25 text-orange-200",
    headlines: [
      "작은 바퀴부터 목표를 향한 이동이 시작됐어요",
      "아직 느리지만 길 위에서 조금씩 전진하고 있어요",
      "긴 여정의 첫 바퀴를 굴리고 있어요",
    ],
  },
  {
    maxMonth: Number.POSITIVE_INFINITY,
    tier: "아이언",
    speed: "4km",
    image: "/images/speed-tiers/iron-fantasy-v2.webp",
    name: "맨발의 개척자",
    rank: 0,
    frame: "from-zinc-700 via-zinc-500 to-stone-800 shadow-sm",
    surface: "from-zinc-950 via-stone-900 to-black",
    badge: "border-zinc-600 bg-zinc-800 text-zinc-300",
    headlines: [
      "목표까지는 먼 길, 한 걸음부터 시작하고 있어요",
      "지금은 속도보다 새로운 경로를 찾을 때예요",
      "맨발의 첫걸음이 긴 여정의 시작이에요",
    ],
  },
] as const;

type Tier = (typeof tiers)[number];

const goalLabel = (value: number) =>
  `${(value / 100_000_000).toLocaleString("ko-KR")}억`;

function tierFor(month: number | null) {
  const comparableMonth = month ?? Number.POSITIVE_INFINITY;
  return tiers.find((tier) => comparableMonth <= tier.maxMonth)!;
}

function arrivalHeadline({
  asOf,
  goalMonth,
  target,
}: {
  asOf: string;
  goalMonth: number | null;
  target: string;
}) {
  if (goalMonth === null || !Number.isFinite(goalMonth))
    return `현재 흐름으로는 ${target} 도착 시점을 잡기 어려워요`;
  if (goalMonth <= 0) return `이미 ${target}에 도착했어요`;

  const roundedMonth = Math.max(1, Math.ceil(goalMonth));
  const years = Math.floor(roundedMonth / 12);
  const months = roundedMonth % 12;
  const duration = [
    years > 0 ? `${years}년` : "",
    months > 0 ? `${months}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const [baseYear, baseMonth] = asOf.split("-").map(Number);
  const safeYear = Number.isFinite(baseYear)
    ? baseYear
    : new Date().getFullYear();
  const safeMonth = Number.isFinite(baseMonth)
    ? Math.min(12, Math.max(1, baseMonth))
    : 1;
  const arrivalMonthIndex = safeYear * 12 + (safeMonth - 1) + roundedMonth;
  const arrivalYear = Math.floor(arrivalMonthIndex / 12);
  const arrivalMonth = (arrivalMonthIndex % 12) + 1;
  const season =
    arrivalMonth >= 3 && arrivalMonth <= 5
      ? "봄"
      : arrivalMonth >= 6 && arrivalMonth <= 8
        ? "여름"
        : arrivalMonth >= 9 && arrivalMonth <= 11
          ? "가을"
          : "겨울";

  return `약 ${duration} 뒤, ${arrivalYear}년 ${season}쯤 ${target}에 도착해요`;
}

function TierCard({
  tier,
  scenario,
  headline,
  progress,
  target,
  expanded = false,
}: {
  tier: Tier;
  scenario: Scenario;
  headline: string;
  progress: number;
  target: string;
  expanded?: boolean;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  function moveCard(event: ReactMouseEvent<HTMLElement>) {
    if (!expanded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 14,
      y: (px - 0.5) * 14,
      glareX: px * 100,
      glareY: py * 100,
    });
  }

  return (
    <article
      onMouseMove={moveCard}
      onMouseLeave={() =>
        expanded && setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 })
      }
      className={`group relative mx-auto w-full rounded-[28px] bg-gradient-to-br p-[5px] transition-transform duration-200 ${expanded ? "max-w-[510px]" : "max-w-[420px]"} ${tier.frame}`}
      style={{
        transform: expanded
          ? `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(0.96)`
          : undefined,
        transformStyle: "preserve-3d",
      }}
      aria-label={`${scenario.label} 시나리오 ${tier.tier} 티어 카드`}
    >
      <div
        className={`relative isolate overflow-hidden rounded-[23px] bg-gradient-to-b ${tier.surface} p-3 text-white`}
      >
        {tier.rank >= 4 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.04)_35%,rgba(103,232,249,0.28)_45%,rgba(244,114,182,0.2)_52%,transparent_68%)] bg-[length:240%_100%] opacity-70 mix-blend-screen transition-[background-position] duration-1000 group-hover:bg-[position:100%_0]"
          />
        )}
        {tier.rank >= 7 && (
          <>
            <div className="pointer-events-none absolute top-1/4 -left-20 z-20 size-48 animate-pulse rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-1/4 z-20 size-48 animate-pulse rounded-full bg-fuchsia-300/20 blur-3xl" />
          </>
        )}
        {expanded && tier.rank >= 3 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-40 opacity-70 mix-blend-screen"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.45), transparent 30%)`,
            }}
          />
        )}

        <header className="relative z-10 flex items-start justify-between gap-3 px-2 pt-1 pb-3">
          <div>
            <p
              className={`text-[10px] font-black tracking-[0.22em] ${scenarioTone[scenario.key].accent}`}
            >
              {scenario.label.toUpperCase()} SCENARIO
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight sm:text-xl">
              {tier.name}
            </h3>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] backdrop-blur ${tier.badge}`}
          >
            {tier.tier}
          </span>
        </header>

        <div className="relative z-10 overflow-hidden rounded-2xl border border-white/20 bg-black">
          <img
            src={tier.image}
            alt={tier.name}
            width={900}
            height={900}
            className="aspect-square w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent px-4 pt-16 pb-4">
            <p className="text-[11px] leading-4 font-medium text-white/55">
              당신의 자산 증가 속도를
              <br />
              이동 수단에 비유하자면...
            </p>
            <strong className="mt-1 block text-2xl font-black tracking-tight text-white">
              시속 {tier.speed}
            </strong>
          </div>
          {tier.rank >= 6 && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,white_0_1px,transparent_2px),radial-gradient(circle_at_75%_35%,white_0_1px,transparent_2px),radial-gradient(circle_at_55%_72%,white_0_1px,transparent_2px)] bg-[length:70px_70px,95px_95px,120px_120px] opacity-60" />
          )}
        </div>

        <div className="relative z-10 px-2 pt-4 pb-2">
          <div
            className={`rounded-xl border px-4 py-4 ${tier.rank <= 1 ? "border-white/10 bg-black/20" : "border-white/15 bg-white/[0.07] backdrop-blur-sm"}`}
          >
            <p className="text-[10px] font-black tracking-[0.18em] text-white/45">
              TIME TO GOAL
            </p>
            <strong className="mt-1 block text-lg leading-snug font-black sm:text-xl">
              {headline}
            </strong>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/70">
              <span>목표 달성률 {progress.toFixed(1)}%</span>
              <span>{target}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  tier.rank >= 7
                    ? "bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 shadow-[0_0_14px_rgba(103,232,249,0.9)]"
                    : tier.rank >= 4
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-[0_0_9px_rgba(52,211,153,0.6)]"
                      : tier.rank >= 2
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-[9px] font-black tracking-[0.2em] text-white/35">
              EOKKA SPEED COLLECTION
            </span>
            <span className="text-xs font-black tracking-[0.22em]">EOKKA</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function InvestmentCharacterCard({
  result,
}: {
  result: AnalysisResult;
}) {
  const [selectedKey, setSelectedKey] = useState<ScenarioKey>("base");
  const [detailOpen, setDetailOpen] = useState(false);
  const scenario =
    result.scenarios.find((item) => item.key === selectedKey) ??
    result.scenarios[1];
  const tier = tierFor(scenario.goalMonth);
  const target = goalLabel(result.goalAmount);
  const progress = Math.min(
    100,
    Math.max(0, (result.currentValue / result.goalAmount) * 100),
  );
  const scenarioLabels = useMemo(
    () =>
      Object.fromEntries(
        result.scenarios.map((item) => [item.key, item.label]),
      ),
    [result.scenarios],
  );

  useEffect(() => {
    if (!detailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailOpen]);

  const cardProps = {
    tier,
    scenario,
    headline: arrivalHeadline({
      asOf: result.asOf,
      goalMonth: scenario.goalMonth,
      target,
    }),
    progress,
    target,
  };

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border">
      <div className="border-b px-5 py-5 sm:px-7">
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          나의 목표 달성 속도 티어
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {result.scenarios.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedKey(item.key)}
              aria-pressed={item.key === selectedKey}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                item.key === selectedKey
                  ? scenarioTone[item.key].active
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)] px-4 py-8 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mx-auto block w-full rounded-[28px] text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4"
          aria-label={`${tier.tier} 티어 카드 자세히 보기`}
        >
          <TierCard {...cardProps} />
        </button>
        <p className="text-muted-foreground mt-4 text-center text-xs font-semibold">
          카드를 클릭하면 크게 볼 수 있어요
        </p>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center text-[11px]">
          티어는 투자 실력이 아니라 {scenarioLabels[selectedKey]} 시나리오의
          목표 도달 예상 속도를 표현해요.
        </p>
      </div>

      {detailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${tier.tier} 티어 카드 상세 보기`}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 px-4 py-8 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailOpen(false);
          }}
        >
          <div className="relative w-full max-w-[560px] py-10">
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="absolute top-0 right-0 z-50 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            >
              닫기
            </button>
            <p className="mb-4 text-center text-xs font-bold text-white/60">
              마우스를 움직여 카드의 홀로그램 효과를 확인해 보세요
            </p>
            <TierCard {...cardProps} expanded />
          </div>
        </div>
      )}
    </div>
  );
}
