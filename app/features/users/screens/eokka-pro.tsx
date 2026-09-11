import type { Route } from "./+types/eokka-pro";

import {
  InfinityIcon,
  ArrowRightIcon,
  CheckIcon,
  Clock3Icon,
  CrownIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

import { getAutomaticAnalysisSettings } from "../automatic-analysis-settings.server";

export const meta: Route.MetaFunction = () => [
  { title: `EOKKA Pro | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const settings = user
    ? await getAutomaticAnalysisSettings(user.id)
    : { isPro: false };
  return { isPro: settings.isPro };
}

const comparison = [
  {
    feature: "분석 가능 종목",
    free: "최대 10개",
    pro: "최대 20개",
  },
  {
    feature: "저장 가능한 목표 금액",
    free: "저장 불가",
    pro: "최대 3개",
  },
  {
    feature: "분석 기록 보관",
    free: "저장 불가",
    pro: "기간 제한 없음",
  },
  {
    feature: "수동 분석",
    free: "하루 5회",
    pro: "하루 15회",
  },
  {
    feature: "자동 분석",
    free: "-",
    pro: "사용 가능",
  },
  {
    feature: "자동 분석 목표",
    free: "-",
    pro: "모든 목표 자동 분석",
  },
  {
    feature: "주간·월간 인사이트",
    free: "-",
    pro: "전체 기록 기준",
  },
  {
    feature: "정밀 포트폴리오·매매일지",
    free: "이용 가능",
    pro: "이용 가능",
  },
] as const;

export default function EokkaPro({ loaderData }: Route.ComponentProps) {
  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-12 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-6xl">
        <section className="via-background relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-violet-500/[0.08] p-7 shadow-sm md:p-10">
          <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
                <CrownIcon className="size-3.5" /> EOKKA Pro 베타
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
                기록은 자동으로,
                <br />
                투자 판단은 더 차분하게
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 break-keep md:text-base">
                거래일마다 최신 종가로 포트폴리오를 기록하고, 쌓인 변화를 주간과
                월간 인사이트로 확인하세요. 아직 성장 중인 베타 서비스라 부담
                없는 가격으로 시작해요.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["자동 분석", "기간 제한 없음"].map((benefit) => (
                  <span
                    key={benefit}
                    className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
                  >
                    <CheckIcon className="size-3.5 text-emerald-500" />
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-background/85 rounded-3xl border border-amber-500/25 p-6 shadow-xl backdrop-blur">
              <p className="text-sm font-black text-amber-600 dark:text-amber-300">
                베타 기간 한정 가격
              </p>
              <div className="mt-3 flex items-end gap-1">
                <strong className="text-4xl font-black tracking-tight">
                  990원
                </strong>
                <span className="text-muted-foreground pb-1 text-sm">/ 월</span>
              </div>
              <p className="text-muted-foreground mt-3 text-xs leading-5 break-keep">
                매월 자동 결제되며 언제든 해지할 수 있어요. 베타 가격의 유지
                조건과 정식 출시 후 가격 변경 여부는 결제 전에 다시 명확히
                안내할게요.
              </p>
              {loaderData.isPro ? (
                <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-black text-emerald-700 dark:text-emerald-300">
                  현재 EOKKA Pro를 이용하고 있어요
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="mt-5 w-full cursor-not-allowed rounded-2xl bg-amber-500 text-black opacity-80 hover:bg-amber-500"
                  disabled
                >
                  <Clock3Icon /> 자동결제 준비 중
                </Button>
              )}
              <p className="text-muted-foreground mt-3 text-center text-[11px] leading-5">
                토스페이먼츠 자동결제 계약이 완료되면 이곳에서 바로 구독할 수
                있어요.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">
              Plan comparison
            </p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              무료와 Pro, 무엇이 다른가요?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              무료로 분석 결과를 바로 확인하고, Pro에서는 결과를 저장해 시간에
              따른 변화까지 이어서 확인할 수 있어요.
            </p>
          </div>
          <div className="bg-card mt-6 overflow-x-auto rounded-3xl border">
            <div className="min-w-[560px]">
              <div className="bg-muted/35 grid grid-cols-[1.35fr_1fr_1fr] border-b px-6 py-4 text-sm font-black">
                <span>기능</span>
                <span className="flex items-center justify-center gap-2 text-center">
                  <span className="text-muted-foreground bg-muted flex size-7 items-center justify-center rounded-full">
                    <UserRoundIcon className="size-3.5" />
                  </span>
                  무료
                </span>
                <span className="flex items-center justify-center gap-2 text-center text-amber-600 dark:text-amber-300">
                  <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/15">
                    <CrownIcon className="size-3.5" />
                  </span>
                  Pro 베타
                </span>
              </div>
              {comparison.map((item) => {
                const isProBenefit = item.free !== item.pro;
                return (
                  <div
                    key={item.feature}
                    className="grid grid-cols-[1.35fr_1fr_1fr] items-center border-b px-6 py-4 text-sm last:border-b-0"
                  >
                    <span className="font-bold break-keep">{item.feature}</span>
                    <span className="text-muted-foreground flex justify-center text-center">
                      {item.free}
                    </span>
                    <span
                      className={
                        isProBenefit
                          ? "flex items-center justify-center gap-1.5 text-center font-black text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground flex items-center justify-center text-center"
                      }
                    >
                      {isProBenefit && <CheckIcon className="size-4" />}
                      {item.pro}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: InfinityIcon,
              title: "분석을 기록으로 남겨요",
              detail:
                "무료 분석은 화면에서 확인하고 끝나지만, Pro는 기록을 기간 제한 없이 보관해 수익률과 목표 기간의 변화를 이어서 보여줘요.",
            },
            {
              icon: RefreshCwIcon,
              title: "세 가지 목표를 매일 확인해요",
              detail:
                "목표 금액을 최대 3개까지 저장하면 거래일마다 모든 목표를 최신 종가와 각 목표에서 마지막으로 사용한 월 투자금으로 자동 분석해요.",
            },
            {
              icon: ShieldCheckIcon,
              title: "더 넓게, 더 자주 분석해요",
              detail:
                "빠른 분석과 정밀 포트폴리오에 최대 20종목을 담고, 수동 분석도 하루 15회까지 이용할 수 있어요.",
            },
          ].map(({ icon: Icon, title, detail }) => (
            <article key={title} className="bg-card rounded-2xl border p-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6 break-keep">
                {detail}
              </p>
            </article>
          ))}
        </section>

        <div className="bg-card mt-8 flex flex-col items-center rounded-3xl border p-6 text-center sm:p-8">
          <SparklesIcon className="size-6 text-amber-500" />
          <p className="mt-3 font-black">EOKKA Pro는 아직 베타 단계예요</p>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 break-keep">
            완벽한 서비스라고 약속하기보다 실제 사용 경험을 바탕으로 분석과 기록
            기능을 꾸준히 개선하겠습니다. 자동결제가 열리기 전에는 비용이
            청구되지 않아요.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-full">
            <Link to="/dashboard">
              대시보드로 돌아가기 <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
