import type { Route } from "./+types/about";

import {
  ArrowRightIcon,
  AwardIcon,
  BellIcon,
  BotIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  CrownIcon,
  GoalIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  LockKeyholeIcon,
  MessageCircleQuestionIcon,
  NotebookTabsIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import { cn } from "~/core/lib/utils";

export const meta: Route.MetaFunction = () => [
  { title: "서비스 소개 | EOKKA" },
  {
    name: "description",
    content:
      "빠른 분석부터 정밀 포트폴리오, 대시보드, 투자 인사이트와 EOKKA Pro까지 모든 기능을 예시 화면으로 확인하세요.",
  },
];

const sections = [
  { id: "quick", label: "빠른 분석", icon: SearchIcon },
  { id: "precise", label: "정밀 포트폴리오", icon: NotebookTabsIcon },
  { id: "result", label: "분석 결과", icon: BotIcon },
  { id: "dashboard", label: "대시보드·기록", icon: LayoutDashboardIcon },
  { id: "insights", label: "인사이트·도전과제", icon: AwardIcon },
  { id: "pro", label: "Pro·알림", icon: CrownIcon },
] as const;

const featureGroups = [
  {
    title: "분석을 시작할 때",
    icon: SearchIcon,
    description:
      "보유 종목과 목표를 입력하고 최신 종가 기준 결과를 바로 확인해요.",
    items: [
      "종목명 자동완성으로 보유 종목 찾기",
      "평균 매수가·수량·투자 기간 입력",
      "목표 금액과 월 투자금 빠른 선택",
      "가장 최근 종가 기준으로 바로 분석",
    ],
  },
  {
    title: "포트폴리오를 관리할 때",
    icon: NotebookTabsIcon,
    description:
      "매수·매도 기록을 쌓아 실제 보유 수량과 평균 매수가를 관리해요.",
    items: [
      "매수·매도 거래를 매매일지로 기록",
      "날짜 기준 당시 환율 자동 조회",
      "거래 수정·삭제 후 보유 현황 재계산",
      "종목과 기간별로 거래 기록 필터링",
    ],
  },
  {
    title: "결과를 이해할 때",
    icon: ChartNoAxesCombinedIcon,
    description:
      "목표 시나리오와 투자위원회 조언으로 복잡한 숫자를 쉽게 읽어요.",
    items: [
      "평가금액·손익·수익률과 종목별 성과",
      "보수적·평균·낙관적 목표 시나리오",
      "매입 원금과 평가금액 변화 비교",
      "10인 투자위원회와 종목별 컨센서스",
    ],
  },
  {
    title: "변화를 돌아볼 때",
    icon: CalendarDaysIcon,
    description:
      "기간별 자산 변화와 인사이트를 비교하고 투자 습관을 기록해요.",
    items: [
      "날짜와 목표 금액별 분석 기록",
      "주·월·연간 투자 인사이트",
      "자산 성장·시장 실제 추이 비교",
      "도전과제와 프로필 대표 뱃지",
    ],
  },
] as const;

function useDemoPhase() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(2);
      return;
    }
    const timer = window.setInterval(
      () => setPhase((current) => (current + 1) % 3),
      1_700,
    );
    return () => window.clearInterval(timer);
  }, []);
  return phase;
}

function PreviewShell({
  label,
  pro = false,
  children,
}: {
  label: string;
  pro?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="bg-background/90 overflow-hidden rounded-3xl border shadow-xl">
      <div className="bg-muted/35 flex items-center justify-between border-b px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-black">
          {pro && <CrownIcon className="size-3 text-amber-500" />}
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function QuickAnalysisPreview({ phase }: { phase: number }) {
  return (
    <PreviewShell label="빠른 분석 예시">
      <div className="grid min-h-[320px] gap-4 p-5 sm:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 border-b pb-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUpIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-black">보유 주식을 알려주세요</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                국내 주식과 ETF·ETN을 입력할 수 있어요.
              </p>
            </div>
          </div>
          <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
            <Clock3Icon className="mt-0.5 size-3.5 shrink-0" />
            가장 최근 확정 종가를 확인한 뒤 같은 날짜 기준으로 분석해요.
          </div>
          {[
            ["삼성전자", "72,500원", "10주"],
            ["네이버", "198,000원", "3주"],
          ].map(([name, price, quantity], index) => (
            <div
              key={name}
              className={cn(
                "rounded-2xl border p-3 transition-all duration-500",
                phase === index
                  ? "border-emerald-500 bg-emerald-500/8 shadow-md"
                  : "bg-muted/25",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black">{name}</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <span className="bg-background rounded-lg border px-2 py-1.5">
                  <small className="text-muted-foreground block">
                    평균 매수가
                  </small>
                  <strong>{price}</strong>
                </span>
                <span className="bg-background rounded-lg border px-2 py-1.5">
                  <small className="text-muted-foreground block">수량</small>
                  <strong>{quantity}</strong>
                </span>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-xs">
              목표 <strong className="mt-1 block">1억원</strong>
            </div>
            <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-xs">
              월 투자 <strong className="mt-1 block">10만원</strong>
            </div>
          </div>
          <div
            className={cn(
              "flex h-10 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white transition-all duration-500",
              phase === 2 && "scale-[1.02] shadow-lg shadow-emerald-500/20",
            )}
          >
            {phase === 2 ? "분석 완료 ✓" : "포트폴리오 분석하기"}
          </div>
        </div>
        <div
          className={cn(
            "flex flex-col justify-between rounded-2xl border bg-gradient-to-br from-emerald-500/12 to-cyan-500/5 p-4 transition-all duration-700",
            phase === 2
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-45",
          )}
        >
          <div>
            <p className="text-muted-foreground text-[10px] font-bold">
              평균 시나리오
            </p>
            <p className="mt-1 text-lg font-black">1억까지 14년 9개월</p>
          </div>
          <svg viewBox="0 0 220 110" className="mt-4 w-full" aria-hidden>
            <path
              d="M8 96 C42 91 54 80 81 76 S127 57 147 45 S189 28 212 10"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: phase === 2 ? 0 : 1,
                transition: "stroke-dashoffset 900ms ease",
              }}
            />
            <path d="M8 96H212" stroke="currentColor" opacity=".12" />
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <span className="bg-background/70 rounded-lg p-2">현재 수익률</span>
            <span className="bg-background/70 rounded-lg p-2">목표 확률</span>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function PrecisePreview({ phase }: { phase: number }) {
  return (
    <PreviewShell label="매매일지와 보유 현황">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <NotebookTabsIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-black">매매일지 추가</p>
            <p className="text-muted-foreground text-[10px]">
              거래 날짜의 환율은 자동으로 적용해요.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            ["종목명 또는 티커", "삼성전자 (005930)"],
            ["거래 유형", "매수"],
            ["거래 날짜", "2026.09.29"],
            ["수량", "5"],
            ["주당 체결 가격", "72,500원"],
            ["메모", "분할 매수"],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={cn(
                "bg-background rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors duration-500",
                phase === index && "border-cyan-500 bg-cyan-500/10",
              )}
            >
              <span className="text-muted-foreground block text-[10px]">
                {label}
              </span>
              <span
                className={cn(
                  "mt-1 truncate",
                  label === "거래 유형"
                    ? "flex items-center justify-between gap-2"
                    : "block",
                )}
              >
                {value}
                {label === "거래 유형" && (
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="text-muted-foreground size-3.5 shrink-0"
                  />
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex h-9 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white">
          매매일지 저장
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <div className="bg-muted/35 grid grid-cols-[1fr_1.2fr_.8fr] px-4 py-2.5 text-[10px] font-black">
            <span>날짜</span>
            <span>거래</span>
            <span className="text-right">수량</span>
          </div>
          {[
            ["2026.09.11", "삼성전자 · 매수", "5주"],
            ["2026.09.24", "네이버 · 매수", "3주"],
            ["2026.09.29", "삼성전자 · 매수", "5주"],
          ].map((row, index) => (
            <div
              key={`${row[0]}-${row[1]}`}
              className={cn(
                "grid grid-cols-[1fr_1.2fr_.8fr] border-t px-4 py-3 text-[11px] transition-all duration-500",
                phase === index && "bg-cyan-500/8",
              )}
            >
              <span className="text-muted-foreground">{row[0]}</span>
              <strong>{row[1]}</strong>
              <span className="text-right font-bold">{row[2]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 text-xs">
          <span>거래를 바꾸면 보유 현황을 다시 계산해요.</span>
          <RefreshCwIcon
            className={cn("size-4", phase === 2 && "animate-spin")}
          />
        </div>
      </div>
    </PreviewShell>
  );
}

function ResultPreview({ phase }: { phase: number }) {
  const people = ["버핏", "린치", "멍거", "달리오"];
  return (
    <PreviewShell label="분석 결과 미리보기">
      <div className="grid gap-4 p-5 sm:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border p-4">
            <p className="text-muted-foreground text-[10px] font-bold">
              현재 상태
            </p>
            <p className="mt-1 text-xl font-black">양호 · 7.4점</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-500/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: phase === 0 ? "35%" : "74%" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
            {[
              ["보수적", "18년"],
              ["평균", "14년"],
              ["낙관적", "11년"],
            ].map(([label, value]) => (
              <div key={label} className="bg-muted/35 rounded-xl p-2.5">
                <span className="text-muted-foreground block">{label}</span>
                {value}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#171b1f] p-4 text-white">
          <p className="text-[9px] font-black tracking-[0.14em] text-[#fee500] uppercase">
            Committee Talk
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs font-black">
            <BotIcon className="size-4 text-violet-400" /> 10인 투자위원회 분석
            과정
          </div>
          <div className="mt-3 space-y-2">
            {people.map((person, index) => (
              <div
                key={person}
                className={cn(
                  "flex items-start gap-2 transition-all duration-500",
                  index % 2 === 1 && "flex-row-reverse",
                  phase === index % 3 ? "opacity-100" : "opacity-45",
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[9px] font-black text-violet-300 ring-1 ring-white/10">
                  {person.slice(0, 1)}
                </span>
                <div
                  className={cn(
                    "min-w-0 rounded-xl bg-[#242a30] px-3 py-2 text-[10px] leading-4 text-slate-200",
                    index % 2 === 0 ? "rounded-tl-sm" : "rounded-tr-sm",
                  )}
                >
                  {index % 2 === 0
                    ? "좋은 흐름이에요. 다만 한 종목 비중은 더 살펴보죠."
                    : "동의해요. 새 투자금은 균형을 맞추는 데 써볼 만해요."}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function DashboardPreview({ phase }: { phase: number }) {
  return (
    <PreviewShell label="대시보드와 분석 기록">
      <div className="p-5">
        <div className="grid grid-cols-3 gap-2">
          {["평가금액", "평가손익", "목표 기간"].map((label, index) => (
            <div key={label} className="bg-muted/35 rounded-xl p-3">
              <span className="text-muted-foreground text-[9px] font-bold">
                {label}
              </span>
              <span className="mt-1 block text-xs font-black">
                {index === 0
                  ? "1,240만원"
                  : index === 1
                    ? "+82만원"
                    : "14년 9개월"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black">
            <div>
              <span className="text-muted-foreground block text-[9px]">
                전체 기간 기록
              </span>
              <span>내 자산 성장 추이</span>
            </div>
            <span className="bg-muted/60 rounded-full px-2 py-1 text-emerald-500">
              일 · 주 · 월 · 년
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-[8px] font-bold">
            <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-500">
              최초 예상
            </span>
            <span className="rounded-full bg-violet-500/15 px-2 py-1 text-violet-500">
              최초 시장 예상
            </span>
            <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-500">
              시장 실제 추이
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-500">
              실제 평가금액
            </span>
          </div>
          <svg viewBox="0 0 500 150" className="mt-3 w-full" aria-hidden>
            {[35, 75, 115].map((lineY) => (
              <path
                key={lineY}
                d={`M0 ${lineY}H500`}
                stroke="currentColor"
                opacity=".08"
              />
            ))}
            <path
              d="M5 126 C72 113 95 122 148 91 S242 100 289 69 S391 75 495 22"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M5 128 C105 119 177 104 258 86 S397 53 495 37"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeDasharray="8 7"
            />
            <circle
              cx={phase === 0 ? 148 : phase === 1 ? 289 : 495}
              cy={phase === 0 ? 91 : phase === 1 ? 69 : 22}
              r="7"
              fill="#10b981"
              stroke="white"
              strokeWidth="3"
              className="transition-all duration-700"
            />
          </svg>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "size-3 shrink-0 rounded-[3px] transition-colors",
                index % 5 === 0
                  ? "bg-blue-500/65"
                  : index <= 5 + phase * 5
                    ? "bg-rose-500/65"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function ProPreview({ phase }: { phase: number }) {
  return (
    <PreviewShell label="EOKKA Pro 미리보기" pro>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black">최신 종가 자동 분석</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              저장한 목표 3개를 거래일마다 갱신
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-500">
            자동 실행 중
          </span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {["월", "화", "수", "목", "금"].map((day, index) => (
            <div key={day} className="text-center">
              <span className="text-muted-foreground text-[9px] font-bold">
                {day}
              </span>
              <div
                className={cn(
                  "mx-auto mt-2 flex size-10 items-center justify-center rounded-xl border transition-all duration-500",
                  index <= phase + 1
                    ? "border-emerald-500 bg-emerald-500/12 text-emerald-500"
                    : "bg-muted/25 text-muted-foreground",
                )}
              >
                {index <= phase + 1 ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <Clock3Icon className="size-4" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {[
            ["1억 목표", "갱신 완료"],
            ["3억 목표", phase >= 1 ? "갱신 완료" : "분석 중"],
            ["10억 목표", phase >= 2 ? "갱신 완료" : "대기"],
          ].map(([goal, status]) => (
            <div key={goal} className="rounded-xl border p-3">
              <strong className="text-xs">{goal}</strong>
              <span className="text-muted-foreground mt-1 block text-[10px]">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black tracking-[0.16em] text-emerald-500 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
        {title}
      </h2>
      <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7 break-keep">
        {description}
      </p>
    </div>
  );
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="bg-muted/30 flex items-start gap-2 rounded-xl px-3 py-2.5 leading-5"
        >
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AboutScreen() {
  const phase = useDemoPhase();
  const [activeSection, setActiveSection] =
    useState<(typeof sections)[number]["id"]>("quick");
  const scrollToSection = (id: (typeof sections)[number]["id"]) => {
    const element = document.getElementById(id);
    if (!element) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${id}`);
    setActiveSection(id);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          )[0];
        if (visible)
          setActiveSection(
            visible.target.id as (typeof sections)[number]["id"],
          );
      },
      { rootMargin: "-20% 0px -62%", threshold: [0.05, 0.25, 0.5] },
    );
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="-my-16 overflow-x-clip md:-my-32">
      <section className="relative border-b px-5 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <SparklesIcon className="size-3.5" /> EOKKA GUIDE
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl md:text-6xl">
            내 투자 흐름을 이해하는
            <br />
            모든 방법
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 text-pretty md:text-lg">
            처음 분석하는 순간부터 매매일지, 목표 시나리오, 장기 기록과 자동
            분석까지 EOKKA에서 할 수 있는 일을 실제 화면처럼 미리 확인해 보세요.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Link to="/">
                빠른 분석 시작하기 <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/methodology">계산 방법 확인</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b px-5 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs font-black tracking-[0.16em] text-emerald-500 uppercase">
            Everything you can do
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map(({ title, icon: Icon, description }) => (
              <article key={title} className="bg-card rounded-2xl border p-5">
                <Icon className="size-5 text-emerald-500" />
                <h2 className="mt-3 font-black">{title}</h2>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="sticky top-20 z-30 min-w-0 self-start lg:top-24">
            <div className="bg-card/95 overflow-x-auto rounded-2xl border p-2 shadow-lg backdrop-blur lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:p-3">
              <p className="text-muted-foreground hidden px-3 pt-2 pb-3 text-[10px] font-black tracking-[0.14em] uppercase lg:block">
                서비스 목차
              </p>
              <nav
                className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col"
                aria-label="서비스 소개 목차"
              >
                {sections.map(({ id, label, icon: Icon }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(id);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                      activeSection === id
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-8">
            <article
              id="quick"
              className="scroll-mt-28 rounded-[2rem] border bg-gradient-to-br from-sky-500/[0.07] to-transparent p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="01 · Quick analysis"
                title="로그인 없이 빠르게 시작해요"
                description="종목과 평균 매수가, 수량만 입력하면 가장 최근 종가로 현재 상태와 목표 도달 시나리오를 계산해요. 투자 기간을 알고 있다면 개인 연평균 수익률도 근사해 반영해요."
              />
              <FeatureList items={featureGroups[0].items} />
              <div className="mt-7">
                <QuickAnalysisPreview phase={phase} />
              </div>
            </article>

            <article
              id="precise"
              className="scroll-mt-28 rounded-[2rem] border bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="02 · Precise portfolio"
                title="거래 기록으로 더 정확하게 관리해요"
                description="정밀 포트폴리오는 매수·매도 날짜와 거래 가격을 매매일지로 관리해요. 거래 당시 환율과 실제 현금 흐름을 반영해 투자 기간과 연평균 수익률을 더 정확하게 계산해요."
              />
              <FeatureList items={featureGroups[1].items} />
              <div className="mt-7">
                <PrecisePreview phase={phase} />
              </div>
            </article>

            <article
              id="result"
              className="scroll-mt-28 rounded-[2rem] border bg-gradient-to-br from-violet-500/[0.07] to-transparent p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="03 · Analysis report"
                title="숫자를 쉬운 말과 장면으로 바꿔요"
                description="현재 손익만 보여주는 데서 끝나지 않아요. 목표까지의 여러 경로, 시장 기준과의 차이, 투자 균형과 성향, 종목별 추가 매수 관점까지 한 리포트에서 확인해요."
              />
              <FeatureList items={featureGroups[2].items} />
              <div className="mt-7">
                <ResultPreview phase={phase} />
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/7 px-4 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                투자 대가 10인의 공개된 원칙을 조합한 AI 시뮬레이션이며, 실제
                인물의 의견이나 수익 보장이 아니에요.
              </div>
            </article>

            <article
              id="dashboard"
              className="scroll-mt-28 rounded-[2rem] border bg-gradient-to-br from-emerald-500/[0.07] to-transparent p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="04 · Dashboard & history"
                title="기록이 쌓일수록 변화가 보여요"
                description="자산 성장 추이와 시장 실제 움직임, 매입 원금과 평가금액을 일·주·월·년 단위로 비교해요. 날짜별 분석은 캘린더에서 다시 열고 목표 금액별로 관리할 수 있어요."
              />
              <FeatureList items={featureGroups[3].items} />
              <div className="mt-7">
                <DashboardPreview phase={phase} />
              </div>
            </article>

            <article
              id="insights"
              className="scroll-mt-28 rounded-[2rem] border bg-gradient-to-br from-rose-500/[0.06] to-transparent p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="05 · Insights & achievements"
                title="기록을 재미있는 이야기로 돌아봐요"
                description="주간·월간·연간 흐름에 맞는 인사이트와 포디움으로 어떤 종목이 힘을 보탰는지 살펴봐요. 투자 습관으로 도전과제를 달성하고 마음에 드는 뱃지를 프로필에 전시할 수도 있어요."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: TrendingUpIcon,
                    title: "기간별 인사이트",
                    text: "주·월·연간마다 서로 다른 관점으로 기록을 요약해요.",
                  },
                  {
                    icon: AwardIcon,
                    title: "포트폴리오 포디움",
                    text: "기간 동안 수익률이 돋보인 종목을 시상대처럼 보여줘요.",
                  },
                  {
                    icon: WalletCardsIcon,
                    title: "도전과제 뱃지",
                    text: "투자 기간과 기록 습관으로 뱃지를 모으고 프로필을 꾸며요.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="bg-card rounded-2xl border p-5">
                    <Icon className="size-5 text-rose-500" />
                    <h3 className="mt-3 font-black">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-7 grid max-w-xl grid-cols-3 items-end gap-3 text-center">
                {[
                  { rank: 2, height: "h-20", color: "bg-slate-400/20" },
                  { rank: 1, height: "h-28", color: "bg-amber-400/25" },
                  { rank: 3, height: "h-16", color: "bg-orange-500/20" },
                ].map(({ rank, height, color }) => (
                  <div
                    key={rank}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-t-2xl border transition-all duration-500",
                      height,
                      color,
                      phase === rank - 1 && "-translate-y-2 shadow-lg",
                    )}
                  >
                    <span className="text-2xl">{rank === 1 ? "🏆" : "📈"}</span>
                    <strong className="mt-1 text-xs">{rank}위</strong>
                  </div>
                ))}
              </div>
            </article>

            <article
              id="pro"
              className="scroll-mt-28 rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.09] to-violet-500/[0.05] p-5 md:p-8"
            >
              <SectionHeading
                eyebrow="06 · EOKKA Pro"
                title="들어오지 않은 날에도 기록이 이어져요"
                description="Pro는 목표를 최대 3개까지 저장하고 거래일마다 최신 종가로 모두 자동 분석해요. 최대 20종목과 하루 15회 수동 분석, 기간 제한 없는 기록과 주·월·연간 인사이트를 제공해요."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "거래일 자동 분석",
                  "기록 기간 제한 없음",
                  "목표 최대 3개",
                  "최대 20종목",
                  "하루 15회 분석",
                ].map((item) => (
                  <span
                    key={item}
                    className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black"
                  >
                    <CrownIcon className="size-3 text-amber-500" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-7">
                <ProPreview phase={phase} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: BellIcon,
                    title: "알림",
                    text: "자동 분석 완료, 도전과제 달성, 문의 답변 같은 중요한 변화를 모아 확인해요.",
                  },
                  {
                    icon: UserRoundIcon,
                    title: "프로필",
                    text: "투자 기간과 성향, 대표 뱃지처럼 부담 없이 보여줄 정보를 꾸며요.",
                  },
                  {
                    icon: MessageCircleQuestionIcon,
                    title: "문의하기",
                    text: "기능 제안과 오류를 남기고 운영자의 답변을 이어서 확인해요.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="bg-background/65 rounded-2xl border p-4"
                  >
                    <Icon className="size-5 text-amber-500" />
                    <h3 className="mt-3 text-sm font-black">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-amber-500 text-black hover:bg-amber-400"
                >
                  <Link to="/dashboard/pro">
                    Pro 자세히 보기 <ArrowRightIcon />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/methodology">분석 기준 살펴보기</Link>
                </Button>
              </div>
            </article>

            <section className="bg-muted/25 rounded-[2rem] border p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: LockKeyholeIcon,
                    title: "종가 기준",
                    text: "분석 날짜에 이용 가능한 가장 최근 종가를 사용해 같은 기준으로 비교해요.",
                  },
                  {
                    icon: LineChartIcon,
                    title: "가능성의 범위",
                    text: "5,000개 미래 경로를 바탕으로 보수적·평균·낙관적 범위를 보여줘요.",
                  },
                  {
                    icon: GoalIcon,
                    title: "판단을 돕는 도구",
                    text: "특정 수익을 약속하거나 매수·매도를 대신 결정하지 않아요.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title}>
                    <Icon className="size-5 text-emerald-500" />
                    <h2 className="mt-3 font-black">{title}</h2>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-t px-5 py-20 text-center md:py-24">
        <div className="mx-auto max-w-2xl">
          <CircleDollarSignIcon className="mx-auto size-8 text-emerald-500" />
          <h2 className="mt-5 text-3xl font-black">
            이제 내 포트폴리오로 확인해 보세요
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">
            빠른 분석은 로그인 없이 시작할 수 있고, 더 자세히 기록하고 싶을 때
            정밀 포트폴리오로 이어갈 수 있어요.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-7 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link to="/">
              내 주식 분석하기 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
