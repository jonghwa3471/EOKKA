import type { Route } from "./+types/about";

import {
  ArrowRightIcon,
  ChartNoAxesCombinedIcon,
  GoalIcon,
  LockKeyholeIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => [
  { title: "서비스 소개 | EOKKA" },
  {
    name: "description",
    content:
      "보유 주식이 목표 금액에 도달하는 예상 기간을 쉽고 재미있게 확인하는 EOKKA를 소개합니다.",
  },
];

const features = [
  {
    icon: ChartNoAxesCombinedIcon,
    title: "현재 상태를 한눈에",
    description:
      "평균 매수가와 보유 수량을 바탕으로 현재 평가금액, 손익과 종목별 수익률을 계산해요.",
  },
  {
    icon: GoalIcon,
    title: "목표를 기간으로 변환",
    description:
      "보유 주식이 목표 금액에 언제쯤 도달할지 보수적·평균·낙관적 경로로 보여줘요.",
  },
  {
    icon: Share2Icon,
    title: "재미있는 결과 공유",
    description:
      "목표 도달 속도를 티어 카드로 만들고, 친구가 직접 움직여볼 수 있는 링크로 공유해요.",
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
            EOKKA는 복잡한 재무제표 대신 현재 보유 정보를 입력하면 목표
            금액까지의 거리와 예상 시간을 쉽고 재미있게 보여주는 주식 목표 분석
            서비스예요.
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
            <h2 className="mt-2 text-3xl font-black">입력부터 공유까지</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="rounded-2xl border bg-card p-6">
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

      <section className="border-y bg-muted/30 px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border bg-background p-7 md:p-9">
            <LockKeyholeIcon className="size-7 text-emerald-500" />
            <h2 className="mt-5 text-2xl font-black">빠른 분석은 부담 없이</h2>
            <p className="text-muted-foreground mt-3 leading-7">
              로그인하지 않아도 분석할 수 있어요. 입력 정보와 분석 결과는 현재
              탭에서만 유지되며, 공유 카드에는 종목명·원금·실제 수익률을 넣지
              않아요.
            </p>
          </div>
          <div className="rounded-3xl border bg-background p-7 md:p-9">
            <GoalIcon className="size-7 text-sky-500" />
            <h2 className="mt-5 text-2xl font-black">
              예언이 아닌 가능성의 범위
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              EOKKA는 특정 수익을 약속하지 않아요. 과거 가격 흐름과 장기 시장
              가정을 이용해 다양한 경로를 만들고, 목표에 도달할 수 있는 범위와
              확률을 보여주는 참고 도구예요.
            </p>
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
