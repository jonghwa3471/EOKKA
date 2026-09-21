import type { Route } from "./+types/about";

import {
  ArrowRightIcon,
  ChartNoAxesCombinedIcon,
  GoalIcon,
  LockKeyholeIcon,
  NotebookTabsIcon,
  SparklesIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => [
  { title: "서비스 소개 | EOKKA" },
  {
    name: "description",
    content:
      "빠른 분석과 매매일지 기반 정밀 분석으로 보유 주식의 현재 상태와 목표 도달 가능성을 살펴보는 EOKKA를 소개합니다.",
  },
];

const features = [
  {
    icon: ChartNoAxesCombinedIcon,
    title: "현재 상태를 한눈에",
    description:
      "가장 최근 종가를 기준으로 현재 평가금액, 손익과 종목별 수익률을 한눈에 정리해요.",
  },
  {
    icon: GoalIcon,
    title: "목표를 기간으로 변환",
    description:
      "가격 흐름과 시장 기준, 개인 투자 성과를 함께 살펴 목표 금액까지의 보수적·평균·낙관적 경로를 보여줘요.",
  },
  {
    icon: NotebookTabsIcon,
    title: "기록할수록 선명하게",
    description:
      "정밀 분석은 매수·매도 날짜와 당시 환율을 이용해 개인 연평균 수익률과 포트폴리오 변화를 더 정확하게 계산해요.",
  },
];

export default function AboutScreen() {
  return (
    <main className="-my-16 overflow-hidden md:-my-32">
      <section className="relative border-b px-5 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <SparklesIcon className="size-3.5" /> EOKKA BETA
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl md:text-6xl">
            내 주식의 목표를
            <br />더 이해하기 쉬운 시간으로
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 text-pretty md:text-lg">
            EOKKA는 가장 최근 종가와 내 투자 정보를 바탕으로 현재 자산을
            진단하고, 목표 금액까지의 여러 가능성을 쉬운 말로 보여주는 주식
            포트폴리오 분석 서비스예요.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link to="/">
              내 주식 분석하기 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>

      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.18em] text-emerald-500">
              HOW IT WORKS
            </p>
            <h2 className="mt-2 text-3xl font-black">입력부터 목표 분석까지</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="bg-card rounded-2xl border p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Icon className="size-5" />
                </div>
                <p className="text-muted-foreground mt-5 text-xs font-bold">
                  0{index + 1}
                </p>
                <h3 className="mt-1 text-xl font-black">{title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 border-y px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="bg-background rounded-3xl border p-7 md:p-9">
            <LockKeyholeIcon className="size-7 text-emerald-500" />
            <h2 className="mt-5 text-2xl font-black">빠른 분석은 부담 없이</h2>
            <p className="text-muted-foreground mt-3 leading-7">
              로그인 없이 평균 매수가·수량·투자 기간만 입력해 바로 확인할 수
              있어요. 거래 날짜가 없기 때문에 개인 연평균 수익률은 입력한 투자
              기간을 이용한 근사값으로 계산해요.
            </p>
          </div>
          <div className="bg-background rounded-3xl border p-7 md:p-9">
            <GoalIcon className="size-7 text-sky-500" />
            <h2 className="mt-5 text-2xl font-black">
              예언이 아닌 가능성의 범위
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              EOKKA는 특정 수익을 약속하지 않아요. 과거 가격 흐름을 재조합한
              5,000개 미래 경로와 장기 시장 기준을 이용해 목표에 도달할 수 있는
              범위를 보여주는 참고 도구예요.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.18em] text-emerald-500">
              TWO WAYS TO ANALYZE
            </p>
            <h2 className="mt-2 text-3xl font-black">필요한 만큼 자세하게</h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl leading-7">
              먼저 빠르게 확인하고, 더 정확한 기록이 필요할 때 정밀 분석으로
              이어갈 수 있어요.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="bg-card rounded-3xl border p-7 md:p-8">
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-500">
                빠른 분석
              </span>
              <h3 className="mt-5 text-xl font-black">지금 상태를 빠르게</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                평균 매수가와 수량만으로 현재 평가금액과 목표 경로를 확인해요.
                투자 기간을 입력하면 개인 수익률도 대략 계산할 수 있어요.
              </p>
            </article>
            <article className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-7 md:p-8">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                정밀 분석
              </span>
              <h3 className="mt-5 text-xl font-black">
                실제 매매 흐름까지 자세하게
              </h3>
              <p className="text-muted-foreground mt-3 leading-7">
                매수·매도 날짜, 거래 가격과 당시 환율을 반영해 돈을 넣고 뺀
                시점까지 고려한 연평균 수익률을 계산해요. 매매일지를 바꾸면
                달라진 보유 현황으로 다시 분석할 수 있어요.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-black">
            내 목표 속도는 어느 정도일까요?
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">
            국내 주식·ETF·ETN을 먼저 지원하는 베타 서비스입니다. 로컬 테스트
            모드에서는 미국 주식도 분석할 수 있어요.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Link to="/">지금 분석하기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/methodology">분석 방법 확인</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
