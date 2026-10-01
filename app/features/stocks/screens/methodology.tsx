import type { Route } from "./+types/methodology";

import {
  ArrowRightIcon,
  BrainCircuitIcon,
  CalculatorIcon,
  ChartSplineIcon,
  CircleAlertIcon,
  DatabaseIcon,
  GaugeIcon,
  GitCompareArrowsIcon,
  RouteIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => [
  { title: "분석 방법 | EOKKA" },
  {
    name: "description",
    content:
      "EOKKA가 현재 평가금액과 목표 도달 시나리오를 계산하는 방법과 한계를 확인하세요.",
  },
];

const steps = [
  {
    icon: DatabaseIcon,
    title: "분석 기준일 확정",
    description:
      "실시간 가격 대신 분석 시점에 확인할 수 있는 가장 최근 종가를 사용해요. 같은 종가 날짜로 다시 분석하면 새 날짜 기록을 만들지 않고 해당 기준일의 기록을 갱신해, 장중 가격 변화가 장기 통계를 흔들지 않게 합니다.",
  },
  {
    icon: CalculatorIcon,
    title: "현재 평가금액 계산",
    description:
      "모든 종목은 분석에 사용할 수 있는 가장 최근 종가를 기준으로 맞춰요. 종목별 종가에 보유 수량을 곱하고, 해외 주식은 해당 기준일 환율로 원화 환산합니다.",
  },
  {
    icon: GaugeIcon,
    title: "개인 연평균 수익률 계산",
    description:
      "정밀 분석은 매수·매도 날짜, 거래 가격과 당시 환율, 현재 평가금액을 함께 사용해 돈을 넣고 뺀 시점까지 고려한 수익률을 계산해요. 빠른 분석은 거래 날짜가 없으므로 입력한 투자 기간과 원금·현재 가치로 근사해요.",
  },
  {
    icon: DatabaseIcon,
    title: "포트폴리오 월별 흐름 구성",
    description:
      "각 종목의 월별 가격 변화율을 현재 평가금액 비중으로 합쳐 포트폴리오 수익률을 만들어요. 최소 24개월의 공통 데이터가 필요해요.",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "과거와 시장 기준 혼합",
    description:
      "과거 수익률의 평균과 변동성을 분리합니다. 변동성은 유지하고 평균의 영향만 시간이 갈수록 줄여 장기 시장 수준으로 수렴시켜요.",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "개인 성과를 제한적으로 반영",
    description:
      "현재 평가금액은 미래 경로의 출발점에 그대로 반영하고, 개인 연평균 수익률은 투자 이력이 쌓인 만큼만 예상 수익률을 조금 조정하는 데 사용해요. 짧은 기간의 급등이나 급락이 수십 년 전망을 지배하지 않도록 영향에는 상한을 둬요.",
  },
  {
    icon: RouteIcon,
    title: "5,000개 미래 경로 생성",
    description:
      "과거 월별 흐름을 6개월 블록으로 다시 조합해 현재 평가금액에서 시작하는 50년 경로 5,000개를 만들어요. 월 투자금을 입력하면 매월 말 같은 금액을 포트폴리오 비중대로 투자한 비교 경로도 계산해요.",
  },
  {
    icon: ChartSplineIcon,
    title: "시나리오와 목표 기간 계산",
    description:
      "각 시점 결과의 P20·P50·P80을 보수적·평균·낙관적으로 표시하고, 목표 금액을 처음 넘는 시점은 최대 30년까지 확인해요.",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "시장과 같은 시간축으로 비교",
    description:
      "시장 실제 추이는 분석 기준일마다 대표 시장 지수의 변화를 이어 붙여 내 평가금액과 같은 구간에서 비교해요. 미래 시장 기준선은 과거 지수 흐름을 별도로 시뮬레이션하므로, 고정된 장기 시장 가정과 실제 시장 움직임을 구분해 볼 수 있어요.",
  },
  {
    icon: BrainCircuitIcon,
    title: "AI 투자위원회 해설",
    description:
      "포트폴리오 구조, 가격 변동 위험, 확인 가능한 기업 재무정보, 현재가와 평균 매수가의 차이를 먼저 코드로 계산해요. AI는 익명화된 계산 결과를 10가지 투자 원칙으로 풀어 설명하며, 서버가 정한 점수와 종목별 컨센서스를 임의로 바꾸지 않아요.",
  },
];

export default function MethodologyScreen() {
  return (
    <main className="-my-16 overflow-hidden md:-my-32">
      <section className="relative border-b px-5 pt-24 pb-18 md:pt-32 md:pb-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-64 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs font-black tracking-[0.2em] text-sky-500">
            METHODOLOGY
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl md:text-6xl">
            어떻게 계산하나요?
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 md:text-lg">
            가격·환율·매매 기록과 정해진 계산 모델이 숫자를 만들고, AI는 그
            결과를 이해하기 쉬운 말로 설명해요. 같은 입력과 같은 기준일이라면
            시나리오 결과도 같게 유지돼요.
          </p>
        </div>
      </section>

      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className="bg-card grid gap-5 rounded-2xl border p-6 sm:grid-cols-[auto_1fr] sm:items-start md:p-7"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold">
                    STEP {index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{title}</h2>
                  <p className="text-muted-foreground mt-2 leading-7">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 border-y px-5 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-black">
            장기 계산의 핵심 기준
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <article className="bg-background rounded-2xl border p-6">
              <h3 className="font-black">과거 평균수익률 영향</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["현재", "60%"],
                  ["10년", "35%"],
                  ["30년", "10%"],
                  ["50년", "5%"],
                ].map(([period, weight]) => (
                  <div
                    key={period}
                    className="flex justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{period}</dt>
                    <dd className="font-black">{weight}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground mt-4 text-xs leading-5">
                과거 평균은 연 -10~20% 범위로 제한한 뒤 반영해 특정 고성장
                구간이 장기간 반복되는 문제를 줄여요.
              </p>
            </article>

            <article className="bg-background rounded-2xl border p-6">
              <h3 className="font-black">개인 성과 반영 범위</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["6개월 미만", "미반영"],
                  ["6개월~5년", "점진적으로 확대"],
                  ["5년 이상", "최대 25% 신뢰"],
                  ["최종 예상수익률 조정", "최대 ±2.5%p"],
                ].map(([period, weight]) => (
                  <div
                    key={period}
                    className="flex justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{period}</dt>
                    <dd className="text-right font-black">{weight}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground mt-4 text-xs leading-5">
                시장 기준과 비교한 개인 성과 차이는 ±10%p로 먼저 제한해요. 투자
                기간이 하루 늘었다고 결과가 갑자기 바뀌지 않도록 신뢰도는 매일
                부드럽게 높아져요.
              </p>
            </article>

            <article className="bg-background rounded-2xl border p-6">
              <h3 className="font-black">명목 장기 시장 기준</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["KOSPI", "연 7.0%"],
                  ["KOSDAQ", "연 7.5%"],
                  ["S&P 500", "연 7.0%"],
                  ["NASDAQ", "연 8.0%"],
                ].map(([market, rate]) => (
                  <div
                    key={market}
                    className="flex justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{market}</dt>
                    <dd className="font-black">{rate}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground mt-4 text-xs leading-5">
                고정된 모델 기준이며 실시간 시장 전망이 아니에요. 혼합
                포트폴리오는 현재 평가금액 비중으로 시장 기준을 합산해요.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-amber-500/30 bg-amber-500/10 p-7 md:p-10">
          <CircleAlertIcon className="size-7 text-amber-500" />
          <h2 className="mt-4 text-2xl font-black">
            결과를 볼 때 꼭 알아두세요
          </h2>
          <ul className="text-muted-foreground mt-5 grid gap-3 leading-6 md:grid-cols-2">
            <li>• 과거 수익률은 미래 수익률을 보장하지 않아요.</li>
            <li>
              • 세금과 거래 수수료는 반영하지 않아요. 정밀 분석의 과거 성과에는
              입력한 매매 기록을 반영하지만, 미래 경로에는 입력한 월 투자금만
              정기적으로 추가해요.
            </li>
            <li>
              • 빠른 분석의 개인 연평균 수익률은 실제 거래 날짜가 없는
              근사값이에요.
            </li>
            <li>• 30·50년 결과는 기간이 길수록 불확실성이 커져요.</li>
            <li>• 개별 기업의 상장폐지와 사업 변화는 직접 예측하지 않아요.</li>
            <li>• 국내 종가는 기업행사를 완전히 보정하지 못할 수 있어요.</li>
            <li>
              • 기업 재무정보가 확인되지 않는 종목은 해당 항목을 추측하지 않고,
              확보된 가격·비중 정보 안에서만 설명해요.
            </li>
            <li>
              • 투자위원회는 실제 투자 대가의 견해가 아니라, 공개적으로 알려진
              투자 원칙을 적용한 AI 시뮬레이션이에요.
            </li>
            <li>• 모든 결과는 투자 권유나 수익 보장이 아니에요.</li>
          </ul>
        </div>
      </section>

      <section className="px-5 pb-24 text-center md:pb-28">
        <h2 className="text-3xl font-black">계산 기준을 확인했다면</h2>
        <p className="text-muted-foreground mt-4">
          내 보유 주식의 목표 도달 경로를 직접 확인해 보세요.
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
      </section>
    </main>
  );
}
