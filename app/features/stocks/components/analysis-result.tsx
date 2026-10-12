import type { AnalysisResult } from "../analysis.types";

import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { cn } from "~/core/lib/utils";

import { AnalysisMethodDialog } from "./analysis-result/analysis-method-dialog";
import {
  RollingNumber,
  useChartRevealOnce,
} from "./analysis-result/chart-animation";
import { CommitteeReview } from "./analysis-result/committee-review";
import {
  compactWon,
  goalDurationLabel,
  goalLabel,
  percent,
  periodOnlyLabel,
  price,
  projectionAnnualRate,
  remainingPeriodLabel,
  won,
} from "./analysis-result/formatters";
import { GoalMomentumCard } from "./analysis-result/goal-momentum-card";
import { GoalProbabilityChart } from "./analysis-result/goal-probability-chart";
import { InvestmentStyleRadar } from "./analysis-result/investment-style-radar";
import { marketComparison } from "./analysis-result/market-comparison";
import { PortfolioAllocation } from "./analysis-result/portfolio-allocation";
import { PurchasePositionCharacter } from "./analysis-result/purchase-position";
import { ScenarioChart } from "./analysis-result/scenario-chart";
import { type ScenarioSeries, colors } from "./analysis-result/scenario-series";
import { AiStrategyRadar } from "./analysis-result/strategy-radar";
import { InvestmentCharacterCard } from "./investment-character-card";

export function AnalysisResultView({
  result,
  showAuthCta = true,
  showProHistoryCta = false,
  showContributionDetails = false,
  onStartManagedAnalysis,
}: {
  result: AnalysisResult;
  showAuthCta?: boolean;
  showProHistoryCta?: boolean;
  showContributionDetails?: boolean;
  onStartManagedAnalysis?: () => void;
}) {
  const { ref: metricsRef, isRevealed: areMetricsRevealed } =
    useChartRevealOnce<HTMLDivElement>();
  const [selectedPurchaseHolding, setSelectedPurchaseHolding] = useState<
    AnalysisResult["holdings"][number] | null
  >(null);
  const [dimmedScenarioSeries, setDimmedScenarioSeries] = useState<
    ScenarioSeries[]
  >([]);
  const annualizedReturnRate =
    (result.investmentPeriodMonths ?? 0) >= 12
      ? (result.annualizedReturnRate ?? null)
      : null;
  const toggleScenarioSeries = (series: ScenarioSeries) => {
    setDimmedScenarioSeries((current) =>
      current.includes(series)
        ? current.filter((item) => item !== series)
        : [...current, series],
    );
  };
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
  const marketAnnualReturn = result.benchmark?.investmentPeriodCagr ?? null;
  const annualReturnDifference =
    annualizedReturnRate == null || marketAnnualReturn == null
      ? null
      : annualizedReturnRate - marketAnnualReturn;
  const annualReturnComparison = (() => {
    if (annualizedReturnRate == null) return "1년 기록이 쌓이면 표시해요";
    if (!result.benchmark) return "시장 비교 데이터 없음";
    if (marketAnnualReturn == null) return "같은 기간의 시장 데이터가 부족해요";
    if (annualReturnDifference === null) return undefined;
    if (Math.abs(annualReturnDifference) < 0.05)
      return `${result.benchmark.label}과 비슷해요`;
    return `${result.benchmark.label}보다 ${Math.abs(annualReturnDifference).toFixed(1)}%p ${annualReturnDifference > 0 ? "높아요" : "낮아요"}`;
  })();
  const benchmarkComponentReturns =
    result.benchmark?.componentAnnualReturns?.map(({ label, annualReturn }) =>
      annualReturn === null
        ? `${label} 데이터 부족`
        : `${label} ${annualReturn >= 0 ? "+" : ""}${annualReturn.toFixed(1)}%`,
    ) ?? null;
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
            종가 기준
          </p>
          <p className="mt-1">실시간 시세 미반영 · 투자 조언이 아닙니다</p>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
        <p>
          실시간 가격이 아닌 <strong>해당 거래일의 마감 종가</strong>로
          평가금액과 분석 결과를 계산했어요.
        </p>
      </div>

      <PortfolioAllocation result={result} />

      <div
        ref={metricsRef}
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
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
          {
            label: "내 연평균 수익률",
            value:
              annualizedReturnRate == null
                ? "1년 기록 필요"
                : `${annualizedReturnRate >= 0 ? "+" : ""}${annualizedReturnRate.toFixed(1)}%`,
            rollingValue: annualizedReturnRate ?? undefined,
            rollingFormat:
              annualizedReturnRate == null
                ? undefined
                : (value: number) =>
                    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
            tone:
              annualizedReturnRate == null
                ? undefined
                : annualizedReturnRate >= 0
                  ? "profit"
                  : "loss",
            detail: annualReturnComparison,
            subdetails: benchmarkComponentReturns,
          },
        ].map(
          (
            {
              label,
              value,
              rollingValue,
              rollingFormat,
              tone,
              detail,
              subdetails,
            },
            index,
          ) => (
            <div
              key={label}
              className={cn(
                "bg-muted/40 rounded-2xl p-4",
                label === "내 연평균 수익률" && "sm:col-span-2 lg:col-span-4",
              )}
            >
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
              {detail && (
                <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
                  {detail}
                </p>
              )}
              {subdetails?.map((subdetail) => (
                <p
                  key={subdetail}
                  className="mt-1 text-[11px] leading-4 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  {subdetail}
                </p>
              ))}
            </div>
          ),
        )}
      </div>
      <p className="text-muted-foreground mt-2 text-[11px] leading-5">
        현재 수익률은 매수 이후의 누적 수익률이에요. 내 연평균 수익률은{" "}
        {result.personalReturnMethod === "money-weighted"
          ? "매매일지의 매수·매도 날짜, 거래 당시 환율과 현재 평가금액을 반영한 금액가중 연환산 수익률이에요."
          : "입력한 투자 기간과 현재 매입원금·평가금액으로 계산한 근사 연복리 수익률이에요."}
      </p>

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
              높이인지 계산하고, EOKKA 마스코트가 쉽게 알려드려요.
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
                <strong>최근 최대 10년 기준 내 매수가 위치</strong> · 가격
                범위의{" "}
                {selectedPurchaseHolding.purchasePosition.tenYearPosition.toFixed(
                  1,
                )}
                % 높이
              </p>
              <p>
                <strong>최근 1년 기준 내 매수가 위치</strong> · 가격 범위의{" "}
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
            <button
              key={scenario.key}
              type="button"
              onClick={() => toggleScenarioSeries(scenario.key)}
              aria-pressed={!dimmedScenarioSeries.includes(scenario.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition",
                dimmedScenarioSeries.includes(scenario.key)
                  ? "bg-muted opacity-40 hover:opacity-65"
                  : "ring-1",
              )}
              style={
                dimmedScenarioSeries.includes(scenario.key)
                  ? { color: colors[scenario.key] }
                  : {
                      color: colors[scenario.key],
                      backgroundColor: `${colors[scenario.key]}18`,
                      boxShadow: `inset 0 0 0 1px ${colors[scenario.key]}38`,
                    }
              }
            >
              <i
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colors[scenario.key] }}
              />
              <span>{scenario.label}</span>
            </button>
          ))}
          {result.benchmark && (
            <button
              type="button"
              onClick={() => toggleScenarioSeries("market")}
              aria-pressed={!dimmedScenarioSeries.includes("market")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-violet-500 transition",
                dimmedScenarioSeries.includes("market")
                  ? "bg-muted opacity-40 hover:opacity-65"
                  : "bg-violet-500/15 ring-1 ring-violet-500/30",
              )}
            >
              <i
                className="h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: colors.market }}
              />
              <span>시장 기준</span>
            </button>
          )}
        </div>
        <ScenarioChart result={result} dimmedSeries={dimmedScenarioSeries} />
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
              {showContributionDetails &&
                result.monthlyContribution > 0 &&
                (() => {
                  const contributed = result.contributionScenarios.find(
                    (item) => item.key === scenario.key,
                  );
                  return contributed ? (
                    <p className="mt-2 text-xs leading-5 font-semibold text-sky-600 dark:text-sky-400">
                      매월 {compactWon(result.monthlyContribution)} 투자 시{" "}
                      {goalDurationLabel(contributed.goalMonth)}
                    </p>
                  ) : null;
                })()}
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
                  {showContributionDetails &&
                    result.monthlyContribution > 0 &&
                    (() => {
                      const contributed = result.contributionScenarios.find(
                        (item) => item.key === scenario.key,
                      );
                      const contributionValue =
                        period.valueKey === "valueAt10Years"
                          ? contributed?.valueAt10Years
                          : period.valueKey === "valueAt30Years"
                            ? contributed?.valueAt30Years
                            : contributed?.valueAt50Years;
                      return typeof contributionValue === "number" ? (
                        <p className="mt-2 border-t border-sky-500/15 pt-2 text-[11px] leading-5 font-semibold text-sky-600 dark:text-sky-400">
                          매월 {compactWon(result.monthlyContribution)} 투자 시{" "}
                          {compactWon(contributionValue)}
                        </p>
                      ) : null;
                    })()}
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
        <section className="mt-5 space-y-5">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.11] via-emerald-500/[0.04] to-cyan-500/[0.08] shadow-[0_18px_50px_-35px_rgba(16,185,129,0.65)]">
            {result.aiStrategy.scores?.length === 6 && (
              <AiStrategyRadar scores={result.aiStrategy.scores} />
            )}
          </div>
          <div className="overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.1] via-violet-500/[0.04] to-violet-500/[0.1] shadow-[0_18px_50px_-35px_rgba(168,85,247,0.65)]">
            {result.investmentStyle?.scores?.length === 6 && (
              <InvestmentStyleRadar style={result.investmentStyle} />
            )}
          </div>
        </section>
      )}

      <CommitteeReview result={result} />

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

      {onStartManagedAnalysis && (
        <div className="mt-5 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-emerald-500/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="text-xs font-bold text-violet-500">
              이 결과를 더 정확하게 관리하고 싶다면
            </p>
            <h3 className="mt-1 text-lg font-black">
              정밀 분석으로 이어가세요
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              입력한 종목·평균 매수가·수량은 그대로 가져가고, 종목별 매수 날짜만
              추가하면 당시 환율까지 자동 반영해요.
            </p>
            <p className="mt-2 max-w-xl text-xs leading-5 font-bold text-amber-600 dark:text-amber-400">
              전환하면 대시보드와 인사이트 차트는 정밀 분석 기준으로 초기화되어
              전환한 날부터 다시 기록돼요. 이전 빠른 분석은 분석 기록에서 계속
              확인할 수 있어요. 빠른 분석으로 획득한 도전과제도 초기화되고 정밀
              분석 기준으로 다시 시작해요.
            </p>
          </div>
          <Button
            type="button"
            onClick={onStartManagedAnalysis}
            className="mt-5 shrink-0 sm:mt-0"
          >
            정밀 분석으로 전환 <ArrowRightIcon />
          </Button>
        </div>
      )}

      {showProHistoryCta && (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.10] to-violet-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black">이번 분석은 저장되지 않아요</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              EOKKA Pro를 이용하면 분석 기록을 보관하고 대시보드와 주간·월간
              인사이트에서 변화를 확인할 수 있어요.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-full bg-amber-500 text-black hover:bg-amber-400"
          >
            <Link to="/dashboard/pro">Pro로 기록 저장하기</Link>
          </Button>
        </div>
      )}

      {showAuthCta && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              분석 결과는 지금 바로 확인할 수 있어요
            </p>
            <h3 className="mt-1 text-lg font-black">
              기록하고 비교하려면 EOKKA Pro를 이용하세요
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              빠른 분석의 입력 정보는 현재 탭에서만 유지되며, 탭을 닫으면 자동
              삭제됩니다. Pro에서는 분석 기록을 저장하고 대시보드와 인사이트에서
              변화를 이어서 확인할 수 있어요.
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
              <Link to="/dashboard/pro">Pro 알아보기</Link>
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

export { restoreStoredHoldingAliases } from "../holding-aliases";
