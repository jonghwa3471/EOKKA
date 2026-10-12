import type { AnalysisResult } from "../../analysis.types";

import { ChevronLeftIcon, ChevronRightIcon, QuoteIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";
import { INVESTMENT_MASTERS } from "~/core/data/investment-wisdom";
import { cn } from "~/core/lib/utils";

type CommitteeDiscussion = NonNullable<
  AnalysisResult["aiStrategy"]
>["committeeDiscussion"];

interface CommitteeMember {
  key: keyof CommitteeDiscussion;
  name: string;
  role: string;
  description: string;
  introduction: string;
  philosophy: string;
  image: string;
}

export const COMMITTEE_MEMBERS: CommitteeMember[] = [
  {
    key: "warrenBuffett",
    name: "워런 버핏",
    role: "좋은 회사와 긴 시간",
    description: "오래 믿고 보유할 만한 회사인지 살펴봐요.",
    introduction:
      "기업을 단순한 주가가 아니라 실제 사업으로 바라보고, 좋은 회사를 합리적인 가격에 산 뒤 오래 기다리는 투자로 잘 알려져 있어요.",
    philosophy:
      "꾸준히 돈을 버는 힘과 오래 유지될 경쟁력을 먼저 보고, 단기적인 가격 움직임에는 쉽게 흔들리지 않아요.",
    image: "/images/buffett-principles-advisor.webp",
  },
  {
    key: "charlieMunger",
    name: "찰리 멍거",
    role: "피해야 할 실수",
    description: "조급함이나 반복되는 판단 실수가 없는지 봐요.",
    introduction:
      "복잡한 예측보다 큰 실수를 피하는 태도와 오래 기다리는 힘을 중요하게 여긴 투자자예요.",
    philosophy:
      "잘 모르는 투자, 감정적인 매매, 지나친 자신감을 피하는 것만으로도 장기 결과가 좋아질 수 있다고 봐요.",
    image: "/images/charlie-munger-loading-character.webp",
  },
  {
    key: "benjaminGraham",
    name: "벤저민 그레이엄",
    role: "가격과 안전 여유",
    description: "좋은 주식도 너무 비싸게 산 것은 아닌지 확인해요.",
    introduction:
      "가치투자의 기초를 세운 인물로, 회사의 가치보다 충분히 낮은 가격에 사는 안전 여유를 강조했어요.",
    philosophy:
      "예상과 다른 일이 생겨도 큰 손실을 피할 수 있도록 매수 가격에 여유를 두는 것을 중요하게 생각해요.",
    image: "/images/benjamin-graham-loading-character.webp",
  },
  {
    key: "peterLynch",
    name: "피터 린치",
    role: "이해하기 쉬운 회사",
    description: "회사가 무엇으로 돈을 버는지 쉽게 설명할 수 있는지 봐요.",
    introduction:
      "일상에서 발견한 좋은 회사를 직접 공부하는 방식으로 유명한 성장주 투자자예요.",
    philosophy:
      "유행을 따라가기보다 회사가 무엇으로 돈을 벌고 왜 성장하는지 자신의 말로 설명할 수 있어야 한다고 봐요.",
    image: "/images/peter-lynch-loading-character.webp",
  },
  {
    key: "philipFisher",
    name: "필립 피셔",
    role: "오래 성장할 힘",
    description: "매출과 이익이 꾸준히 커질 힘이 있는지 살펴봐요.",
    introduction:
      "숫자뿐 아니라 제품, 경쟁력, 경영 능력까지 살펴 장기간 성장할 뛰어난 회사를 찾는 투자자예요.",
    philosophy:
      "잠깐 싼 회사보다 여러 해 동안 매출과 이익을 키울 수 있는 좋은 회사를 오래 보유하는 데 집중해요.",
    image: "/images/philip-fisher-loading-character.webp",
  },
  {
    key: "johnTempleton",
    name: "존 템플턴",
    role: "공포 속 기회",
    description: "사람들이 지나치게 겁먹거나 들떠 있지는 않은지 봐요.",
    introduction:
      "사람들이 외면하는 시장에서 기회를 찾고 전 세계로 투자 범위를 넓힌 역발상 투자자로 알려져 있어요.",
    philosophy:
      "모두가 낙관할 때는 조심하고, 지나친 공포로 가격이 낮아졌을 때는 차분하게 기회를 살펴봐요.",
    image: "/images/john-templeton-loading-character.webp",
  },
  {
    key: "johnBogle",
    name: "존 보글",
    role: "분산과 낮은 비용",
    description: "한곳에 몰리지 않고 꾸준히 투자할 수 있는지 확인해요.",
    introduction:
      "낮은 비용으로 시장 전체에 투자하는 인덱스 펀드를 널리 알린 장기 투자자예요.",
    philosophy:
      "몇 종목을 맞히려 애쓰기보다 충분히 분산하고 비용을 낮춘 채 오래 투자하는 습관을 중요하게 생각해요.",
    image: "/images/john-bogle-loading-character.webp",
  },
  {
    key: "howardMarks",
    name: "하워드 막스",
    role: "손실 위험과 시장 흐름",
    description: "좋은 전망 뒤에 가려진 위험까지 한 번 더 생각해요.",
    introduction:
      "시장의 분위기와 반복되는 투자 심리를 관찰하며 수익보다 먼저 손실 위험을 살피는 투자자예요.",
    philosophy:
      "좋은 자산도 너무 비싸게 사면 위험할 수 있으므로, 시장이 지나치게 들떠 있는지 함께 확인해요.",
    image: "/images/howard-marks-loading-character.webp",
  },
  {
    key: "rayDalio",
    name: "레이 달리오",
    role: "경제 변화에 대비",
    description: "경제 상황이 달라져도 자산이 버틸 수 있는지 살펴봐요.",
    introduction:
      "경제가 성장하거나 침체하고 물가가 오르내리는 여러 상황에 대비하는 분산 원칙으로 잘 알려져 있어요.",
    philosophy:
      "한 가지 예상에 모든 돈을 걸지 않고, 서로 다르게 움직이는 자산과 사업에 나눠 위험을 낮추려고 해요.",
    image: "/images/ray-dalio-loading-character.webp",
  },
  {
    key: "joelGreenblatt",
    name: "조엘 그린블라트",
    role: "좋은 회사를 좋은 가격에",
    description: "회사의 힘과 내가 지불한 가격을 함께 비교해요.",
    introduction:
      "돈을 효율적으로 잘 버는 회사 중 가격이 지나치게 비싸지 않은 회사를 찾는 투자 방식으로 유명해요.",
    philosophy:
      "좋은 회사라는 이유만으로 비싸게 사지 않고, 회사의 수익성과 매수 가격을 반드시 함께 비교해요.",
    image: "/images/joel-greenblatt-loading-character.webp",
  },
];

export function CommitteeMemberDialog({
  member,
  advice,
  score,
}: {
  member: CommitteeMember;
  advice?: string;
  score?: number;
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteDirection, setQuoteDirection] = useState<-1 | 1>(1);
  const quotes =
    INVESTMENT_MASTERS.find((investor) => investor.author === member.name)
      ?.quotes ?? [];
  const quote = quotes[quoteIndex];
  const moveQuote = (direction: -1 | 1) => {
    if (quotes.length < 2) return;
    setQuoteDirection(direction);
    setQuoteIndex(
      (current) => (current + direction + quotes.length) % quotes.length,
    );
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setQuoteIndex(0);
          setQuoteDirection(1);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-background/70 group flex h-full min-h-36 cursor-pointer flex-col rounded-2xl border border-white/5 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.07] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          aria-label={`${member.name}의 투자 조언과 철학 보기`}
        >
          <div className="flex items-center gap-3">
            <img
              src={member.image}
              alt={`${member.name} 캐릭터`}
              className="size-10 shrink-0 rounded-xl object-cover object-top ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-black break-keep">
                {member.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 font-black break-keep text-emerald-600 dark:text-emerald-400">
                {member.role}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 flex-1 text-[11px] leading-[1.15rem] break-keep">
            {member.description}
          </p>
          <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-emerald-400">
            자세히 보기
            <ChevronRightIcon className="size-3" />
          </p>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-3xl p-0 sm:max-w-2xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") moveQuote(-1);
          if (event.key === "ArrowRight") moveQuote(1);
        }}
      >
        <div className="relative overflow-hidden rounded-t-3xl border-b bg-[#07100f]">
          <div className="grid min-h-64 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative min-h-56 overflow-hidden">
              <img
                src={member.image}
                alt={`${member.name} 캐릭터`}
                className="absolute inset-0 size-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07100f] via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#07100f]" />
            </div>
            <DialogHeader className="justify-center p-6 pr-14 text-left sm:pl-2">
              <p className="text-xs font-black tracking-[0.14em] text-emerald-400 uppercase">
                Investment Master
              </p>
              <DialogTitle className="mt-1 text-3xl font-black text-white">
                {member.name}
              </DialogTitle>
              <p className="text-sm font-bold text-emerald-300">
                {member.role}
              </p>
              <DialogDescription className="mt-2 leading-6 text-slate-300">
                {member.introduction}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-7">
          {advice && (
            <section className="mb-4 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.12] to-cyan-500/[0.05] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                  내 포트폴리오를 위한 조언
                </p>
                {typeof score === "number" && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-300">
                    {score.toFixed(1)} / 10
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 font-medium break-keep">
                {advice}
              </p>
            </section>
          )}
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
            <p className="text-xs font-black tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
              이 관점으로 포트폴리오를 봐요
            </p>
            <p className="mt-2 text-sm leading-7">{member.philosophy}</p>
          </section>

          {quote && (
            <section className="mt-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/[0.08] via-transparent to-emerald-500/[0.08] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-black tracking-wide text-violet-600 uppercase dark:text-violet-400">
                  <QuoteIcon className="size-4" />
                  투자 명언
                </p>
                <span className="text-muted-foreground text-[11px] font-bold tabular-nums">
                  {quoteIndex + 1} / {quotes.length}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 cursor-pointer rounded-full"
                  onClick={() => moveQuote(-1)}
                  disabled={quotes.length < 2}
                  aria-label="이전 명언"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <div
                  className="relative flex h-60 min-w-0 items-center justify-center overflow-hidden sm:h-52"
                  aria-live="polite"
                >
                  <blockquote
                    key={`${member.key}-${quoteIndex}`}
                    className={cn(
                      "w-full min-w-0 text-center motion-reduce:animate-none",
                      quoteDirection === 1
                        ? "animate-in fade-in-0 slide-in-from-right-6 duration-300"
                        : "animate-in fade-in-0 slide-in-from-left-6 duration-300",
                    )}
                  >
                    <p className="text-base leading-7 font-black text-balance">
                      “{quote[0]}”
                    </p>
                    <p className="text-muted-foreground mt-3 text-sm leading-6 text-balance">
                      “{quote[1]}”
                    </p>
                  </blockquote>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 cursor-pointer rounded-full"
                  onClick={() => moveQuote(1)}
                  disabled={quotes.length < 2}
                  aria-label="다음 명언"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
