import type { AnalysisResult } from "../../analysis.types";

import { CircleHelpIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";

import { goalLabel } from "./formatters";

export function AnalysisMethodDialog({ result }: { result: AnalysisResult }) {
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
              5,000개의 미래 자산 경로를 만듭니다. 투자 기간이 6개월 이상이면
              현재 손익으로 계산한 개인 연환산 수익률과 포트폴리오의 과거 연평균
              수익률 차이를 ±10%p로 제한한 뒤, 투자 기간에 따라 5~25%만
              반영합니다. 따라서 미래 경로의 연 수익률 조정폭은 최대
              ±2.5%p입니다. 입력한 월 추가 투자금이 있다면 매월 수익률을 적용한
              뒤 같은 금액을 현재 포트폴리오 비중으로 투자한다고 가정해 별도
              경로를 계산합니다.
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
