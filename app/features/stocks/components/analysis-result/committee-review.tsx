import type { AnalysisResult } from "../../analysis.types";

import { CircleAlertIcon, CircleCheckIcon, SparklesIcon } from "lucide-react";

import { cn } from "~/core/lib/utils";

import { restoreStoredHoldingAliases } from "../../holding-aliases";
import { COMMITTEE_MEMBERS, CommitteeMemberDialog } from "./committee-members";
import { price } from "./formatters";

export function CommitteeReview({ result }: { result: AnalysisResult }) {
  const aiText = (text: string) =>
    restoreStoredHoldingAliases(text, result.holdings).replaceAll(
      "정보가 더 필요해요",
      "현재 확인된 범위로 살펴봤어요",
    );
  const committeeConclusionLine = result.aiStrategy?.committeeConclusion
    ? (aiText(result.aiStrategy.committeeConclusion)
        .split(/\n+|(?<=[.!?])\s+(?=[가-힣A-Za-z0-9])/)
        .map((sentence) => sentence.trim())
        .find(Boolean) ?? "")
    : "";
  const committeeDiagnosisPoints = result.aiStrategy?.diagnosis
    ? aiText(result.aiStrategy.diagnosis)
        .split(/\n+|(?<=[.!?])\s+(?=[가-힣A-Za-z0-9])/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    : [];
  const monthlyPlanPoints = aiText(result.aiStrategy?.monthlyPlan ?? "")
    .split(/\n+|(?<=[.!?])\s+(?=[가-힣A-Za-z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const diversificationPoints = aiText(result.aiStrategy?.diversification ?? "")
    .split(/\n+|(?<=[.!?])\s+(?=[가-힣A-Za-z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const committeeVerdict =
    typeof result.aiStrategy?.overallCommitteeScore === "number"
      ? result.aiStrategy.overallCommitteeScore >= 7
        ? "좋음"
        : result.aiStrategy.overallCommitteeScore >= 4.5
          ? "양호"
          : "위험"
      : null;
  return (
    result.aiStrategy && (
      <section className="via-background via-background mt-5 overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-violet-500/10">
        <div className="grid border-b border-emerald-500/15 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="p-5 sm:p-6 md:py-8">
            <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-emerald-600 uppercase dark:text-emerald-400">
              <SparklesIcon className="size-4" />
              EOKKA Investment Committee
            </p>
            <h3 className="mt-3 text-2xl font-black">
              재미로 보는 투자 대가 10인의 포트폴리오 심사
            </h3>
            {typeof result.aiStrategy.overallCommitteeScore === "number" && (
              <div
                className={cn(
                  "mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black",
                  committeeVerdict === "좋음"
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : committeeVerdict === "양호"
                      ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300",
                )}
              >
                포트폴리오 상태 · {committeeVerdict}
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
              <p className="text-base leading-7 font-black break-keep sm:text-lg">
                {aiText(result.aiStrategy.headline)}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {(committeeDiagnosisPoints.length > 0
                ? committeeDiagnosisPoints
                : [aiText(result.aiStrategy.diagnosis)]
              ).map((point, index) => (
                <div
                  key={`${index}-${point}`}
                  className="flex items-start gap-2.5"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-muted-foreground text-sm leading-6 break-keep">
                    {point}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-[11px] leading-5">
              실제 투자 대가들의 의견이나 추천이 아닌, 공개적으로 알려진 10가지
              투자 철학으로 현재 포트폴리오를 심사하고 조언하는 AI 투자위원회
              시뮬레이션이에요.
            </p>
          </div>
          <div className="relative min-h-56 overflow-hidden border-t border-emerald-500/15 bg-[#07100f] md:min-h-full md:border-t-0 md:border-l">
            <img
              src="/images/investment-committee-discussion.webp"
              alt="원탁에서 포트폴리오를 토론하는 투자 대가 10인 캐릭터"
              className="absolute inset-0 size-full object-cover object-center"
              loading="lazy"
            />
            <div className="from-background/35 md:from-background/20 absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />
          </div>
        </div>

        <div className="border-b border-emerald-500/15 px-5 py-6 sm:px-6">
          <div>
            <p className="text-xs font-black tracking-[0.14em] text-emerald-600 uppercase dark:text-emerald-400">
              Who checks what?
            </p>
            <h4 className="mt-2 text-xl font-black">
              열 명은 이런 부분을 살펴봐요
            </h4>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              같은 포트폴리오도 보는 기준이 달라요. 어려운 표현 대신 각자 맡은
              역할을 쉽게 정리했어요.
            </p>
          </div>
          <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-2.5 md:grid-cols-5">
            {COMMITTEE_MEMBERS.map((member) => (
              <CommitteeMemberDialog
                key={member.key}
                member={member}
                advice={aiText(
                  result.aiStrategy!.committeeAdvice?.[member.key] ??
                    result.aiStrategy!.committeeDiscussion[member.key],
                )}
                score={result.aiStrategy!.committeeScores?.[member.key]}
              />
            ))}
          </div>
        </div>

        <div className="border-b border-emerald-500/15 bg-[#171b1f] px-5 py-6 sm:px-6">
          <div>
            <p className="text-xs font-black tracking-[0.14em] text-[#fee500] uppercase">
              Committee Talk
            </p>
            <h4 className="mt-2 text-xl font-black text-white">
              10인 투자위원회 분석 과정
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              한 가지 주장으로 결론내리지 않고, 서로 다른 관점이 어떻게
              이어지는지 대화처럼 보여드려요.
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-4xl space-y-4">
            {COMMITTEE_MEMBERS.map((member, index) => (
              <div
                key={member.key}
                className={cn(
                  "flex items-start gap-2.5",
                  index % 2 === 1 && "flex-row-reverse",
                )}
              >
                <img
                  src={member.image}
                  alt=""
                  className="size-10 shrink-0 rounded-full object-cover object-top ring-1 ring-white/10"
                  loading="lazy"
                />
                <div
                  className={cn("max-w-[82%]", index % 2 === 1 && "text-right")}
                >
                  <div
                    className={cn(
                      "mb-1 flex flex-wrap items-center gap-x-2",
                      index % 2 === 1 && "justify-end",
                    )}
                  >
                    <span className="text-xs font-black text-white">
                      {member.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {member.role}
                    </span>
                    {result.aiStrategy!.committeeScores && (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        {result.aiStrategy!.committeeScores![
                          member.key
                        ].toFixed(1)}{" "}
                        / 10
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm",
                      index % 2 === 1
                        ? "rounded-tr-sm bg-[#fee500] text-[#191919]"
                        : "rounded-tl-sm bg-[#2b3137] text-slate-100",
                    )}
                  >
                    {aiText(result.aiStrategy!.committeeDiscussion[member.key])}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {result.aiStrategy.committeeConclusion && (
            <div className="mx-auto mt-7 max-w-4xl rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black tracking-[0.12em] text-emerald-300 uppercase">
                  회의 결론
                </p>
                {typeof result.aiStrategy.overallCommitteeScore ===
                  "number" && (
                  <div className="rounded-xl border border-emerald-300/25 bg-black/20 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold text-emerald-200/70">
                      최종 포트폴리오 점수
                    </p>
                    <p className="mt-0.5 text-lg font-black text-emerald-300">
                      {result.aiStrategy.overallCommitteeScore.toFixed(1)}
                      <span className="ml-1 text-xs text-emerald-200/70">
                        / 10
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 break-keep text-slate-100">
                {committeeConclusionLine ||
                  aiText(result.aiStrategy.committeeConclusion)}
              </p>
            </div>
          )}
        </div>

        {(result.aiStrategy.holdingInsights?.length ?? 0) > 0 && (
          <div className="border-t border-violet-500/15 px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#07100f] sm:grid sm:min-h-64 sm:grid-cols-[minmax(260px,0.85fr)_minmax(0,1fr)]">
              <div className="relative min-h-52 sm:min-h-full">
                <img
                  src="/images/investment-committee-discussion.webp"
                  alt="종목별 투자 컨센서스를 논의하는 투자 대가 10인 캐릭터"
                  className="absolute inset-0 size-full object-cover object-center"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07100f] via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#07100f]" />
              </div>
              <div className="flex flex-col justify-center p-5 sm:p-6">
                <p className="text-xs font-black tracking-[0.14em] text-emerald-400 uppercase">
                  10-Investor Consensus
                </p>
                <h4 className="mt-2 text-xl font-black text-white">
                  종목별 투자 컨센서스
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  현재가와 내 평균 매수가를 먼저 비교하고, 종목 비중과 기업
                  상태까지 함께 살펴 지금 추가 매수를 검토해도 되는지
                  정리했어요.
                </p>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  종목명과 실제 금액은 AI에 보내지 않으며, 결과가 매수·매도
                  지시를 뜻하지는 않아요.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {result.aiStrategy.holdingInsights?.map((insight) => {
                const holding = result.holdings.find(
                  (item) => item.name === aiText(insight.name),
                );
                const averagePrice = holding
                  ? (holding.averagePrice ??
                    (holding.returnRate > -100
                      ? holding.currentPrice / (1 + holding.returnRate / 100)
                      : 0))
                  : 0;
                const priceGapPercent =
                  holding && averagePrice > 0
                    ? ((holding.currentPrice - averagePrice) / averagePrice) *
                      100
                    : null;
                return (
                  <article
                    key={insight.name}
                    className="bg-background/70 rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">{aiText(insight.name)}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          insight.verdict === "좋은 위치"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : insight.verdict === "주의 필요"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {insight.consensus === "긍정"
                          ? "조건부 추가 매수 검토"
                          : insight.consensus === "신중"
                            ? "추가 매수보다 비중 점검"
                            : "가격을 조금 더 지켜봐요"}
                      </span>
                    </div>
                    {holding && averagePrice > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="bg-muted/45 rounded-xl px-3 py-2.5">
                          <p className="text-muted-foreground text-[10px] font-bold">
                            현재가
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {price(holding.currentPrice, holding.currency)}
                          </p>
                        </div>
                        <div className="bg-muted/45 rounded-xl px-3 py-2.5">
                          <p className="text-muted-foreground text-[10px] font-bold">
                            내 평균 매수가
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {price(averagePrice, holding.currency)}
                          </p>
                        </div>
                        <div className="bg-muted/45 rounded-xl px-3 py-2.5">
                          <p className="text-muted-foreground text-[10px] font-bold">
                            현재가와 평균 매수가 비교
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-sm font-black",
                              (priceGapPercent ?? 0) > 0
                                ? "text-rose-500"
                                : (priceGapPercent ?? 0) < 0
                                  ? "text-blue-500"
                                  : "text-muted-foreground",
                            )}
                          >
                            {priceGapPercent === null
                              ? "비교 전"
                              : priceGapPercent === 0
                                ? "현재가가 평균 매수가와 같아요"
                                : `현재가가 평균 매수가보다 ${Math.abs(priceGapPercent).toFixed(1)}% ${priceGapPercent > 0 ? "높아요" : "낮아요"}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {insight.consensus && insight.votes && (
                      <div className="mt-3 rounded-xl border border-white/5 bg-black/10 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-black">
                            위원회 결론 · {insight.consensus}
                          </p>
                          <p className="text-muted-foreground text-[10px] font-bold">
                            총 10표
                          </p>
                        </div>
                        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-500/15">
                          <span
                            className="bg-emerald-500"
                            style={{
                              width: `${insight.votes.positive * 10}%`,
                            }}
                          />
                          <span
                            className="bg-amber-400"
                            style={{
                              width: `${insight.votes.neutral * 10}%`,
                            }}
                          />
                          <span
                            className="bg-rose-500"
                            style={{
                              width: `${insight.votes.cautious * 10}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">
                          <span className="text-emerald-500">
                            긍정 {insight.votes.positive}
                          </span>
                          <span className="text-amber-500">
                            중립 {insight.votes.neutral}
                          </span>
                          <span className="text-rose-500">
                            신중 {insight.votes.cautious}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {aiText(insight.evidence)}
                    </p>
                    <div className="mt-3 rounded-lg bg-violet-500/[0.08] p-3">
                      <p className="text-[10px] font-black tracking-wide text-violet-600 uppercase dark:text-violet-400">
                        추가 매수 판단
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        {aiText(insight.strategy)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 px-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pt-6">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
              <CircleCheckIcon className="size-4" />
              잘하고 있는 점
            </p>
            <ul className="mt-3 space-y-3">
              {(result.aiStrategy.strengths ?? []).map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-bold">{aiText(item.title)}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {aiText(item.detail)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-300">
              <CircleAlertIcon className="size-4" />
              아쉬운 점
            </p>
            <ul className="mt-3 space-y-3">
              {(result.aiStrategy.improvements ?? []).map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-bold">{aiText(item.title)}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {aiText(item.detail)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <div className="bg-background/70 rounded-xl border p-4">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              월 투자 전략
            </p>
            <div className="mt-3 space-y-2.5">
              {monthlyPlanPoints.map((point, index) => (
                <div
                  key={`${index}-${point}`}
                  className="flex items-start gap-2.5 rounded-lg bg-emerald-500/[0.055] px-3 py-2.5"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-sm leading-6 break-keep">{point}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-background/70 rounded-xl border p-4">
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
              포트폴리오 점검
            </p>
            <div className="mt-3 space-y-2.5">
              {diversificationPoints.map((point, index) => (
                <div
                  key={`${index}-${point}`}
                  className="flex items-start gap-2.5 rounded-lg bg-sky-500/[0.055] px-3 py-2.5"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-500" />
                  <p className="text-sm leading-6 break-keep">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div>
            <p className="text-sm font-black">지금 확인할 3가지</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              우선순위가 높은 항목부터 하나씩 확인해 보세요.
            </p>
          </div>
          <ol className="mt-4 grid gap-3 lg:grid-cols-3">
            {result.aiStrategy.actions.map((action, index) => {
              const detailPoints = aiText(action.detail)
                .split(/\n+|(?<=[.!?])\s+(?=[가-힣A-Za-z0-9])/)
                .map((sentence) => sentence.trim())
                .filter(Boolean);

              return (
                <li
                  key={`${action.title}-${index}`}
                  className="bg-background/70 overflow-hidden rounded-2xl border"
                >
                  <div className="flex items-center justify-between gap-3 border-b bg-violet-500/[0.055] px-4 py-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-black text-violet-600 dark:text-violet-300">
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-black",
                        action.priority === "높음"
                          ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                          : action.priority === "보통"
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
                      )}
                    >
                      우선순위 {action.priority}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-base leading-6 font-black break-keep">
                      {aiText(action.title)}
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {detailPoints.map((point, pointIndex) => (
                        <div
                          key={`${pointIndex}-${point}`}
                          className="flex items-start gap-2.5"
                        >
                          <CircleCheckIcon className="mt-1 size-3.5 shrink-0 text-violet-500" />
                          <p className="text-muted-foreground text-xs leading-5 break-keep">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-muted-foreground mt-4 text-[11px] leading-5">
            {aiText(result.aiStrategy.disclaimer)}
          </p>
        </div>
      </section>
    )
  );
}
