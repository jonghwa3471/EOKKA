import type { Route } from "./+types/home";

import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import i18next from "~/core/lib/i18next.server";
import { cn } from "~/core/lib/utils";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import { AnalysisResultView } from "~/features/stocks/components/analysis-result";
import { StockAutocomplete } from "~/features/stocks/components/stock-autocomplete";
import { getStockMarketMode } from "~/features/stocks/market-mode.server";
import type { StockSearchResult } from "~/features/stocks/types";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: data?.title ?? "억까 — 내 주식, 목표까지" },
  { name: "description", content: data?.subtitle },
];

export async function loader({ request }: Route.LoaderArgs) {
  await i18next.getFixedT(request);
  return {
    title: "억까 — 내 주식, 목표까지",
    subtitle: "보유 주식을 입력하고 목표까지 얼마나 남았는지 확인해보세요.",
    marketMode: getStockMarketMode(),
  };
}

type Holding = {
  id: number;
  symbol: string;
  averagePrice: string;
  currency: "KRW" | "USD";
  quantity: string;
  selectedStock: StockSearchResult | null;
};

const HOLDINGS_STORAGE_KEY = "eokka:portfolio-draft:v1";
const ANALYSIS_STORAGE_KEY = "eokka:portfolio-analysis:v6";
const GOAL_PRESETS = [1, 10, 100];

const emptyHolding = (id: number): Holding => ({
  id,
  symbol: "",
  averagePrice: "",
  currency: "KRW",
  quantity: "",
  selectedStock: null,
});

function JackpotGoal() {
  const [currentGoal, setCurrentGoal] = useState(1);
  const [nextGoal, setNextGoal] = useState(2);
  const [isRolling, setIsRolling] = useState(false);
  const currentGoalRef = useRef(1);

  useEffect(() => {
    const roll = () => {
      let randomGoal = Math.floor(Math.random() * 9) + 1;
      while (randomGoal === currentGoalRef.current)
        randomGoal = Math.floor(Math.random() * 9) + 1;
      setNextGoal(randomGoal);
      setIsRolling(true);
    };

    const interval = window.setInterval(roll, 2_200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      className="relative inline-block h-[1em] w-[1ch] overflow-hidden align-[-0.08em] text-emerald-500 tabular-nums"
      aria-label={`${currentGoal}억`}
    >
      <span
        className="flex flex-col items-end leading-none will-change-transform"
        style={{
          transform: isRolling ? "translateY(-1em)" : "translateY(0)",
          transition: isRolling
            ? "transform 700ms cubic-bezier(0.22, 0.7, 0.24, 1)"
            : "none",
        }}
        onTransitionEnd={() => {
          if (!isRolling) return;
          currentGoalRef.current = nextGoal;
          setCurrentGoal(nextGoal);
          setIsRolling(false);
        }}
        aria-hidden="true"
      >
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {currentGoal}
        </span>
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {nextGoal}
        </span>
      </span>
    </span>
  );
}

export default function Home() {
  const { marketMode } = useLoaderData<typeof loader>();
  const isGlobalTest = marketMode === "global-test";
  const [tab, setTab] = useState<"quick" | "saved">("quick");
  const [holdings, setHoldings] = useState<Holding[]>([emptyHolding(1)]);
  const [targetEok, setTargetEok] = useState("1");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    // 이전 버전에서 장기 저장한 입력값은 남기지 않습니다.
    window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
    window.localStorage.removeItem(ANALYSIS_STORAGE_KEY);

    try {
      const storedDraft = window.sessionStorage.getItem(HOLDINGS_STORAGE_KEY);
      if (storedDraft) {
        const draft = JSON.parse(storedDraft) as {
          holdings?: Holding[];
          targetEok?: string;
        };

        if (
          Array.isArray(draft.holdings) &&
          draft.holdings.length > 0 &&
          draft.holdings.length <= 10 &&
          draft.holdings.every(
            (holding) =>
              Number.isInteger(holding.id) &&
              typeof holding.symbol === "string" &&
              typeof holding.averagePrice === "string" &&
              typeof holding.quantity === "string" &&
              (!holding.selectedStock ||
                isGlobalTest ||
                holding.selectedStock.country === "KR"),
          )
        ) {
          setHoldings(
            draft.holdings.map((holding) => ({
              ...holding,
              currency:
                holding.currency === "USD" && isGlobalTest ? "USD" : "KRW",
            })),
          );
        }
        if (
          typeof draft.targetEok === "string" &&
          Number.isInteger(Number(draft.targetEok)) &&
          Number(draft.targetEok) >= 1 &&
          Number(draft.targetEok) <= 1_000
        )
          setTargetEok(draft.targetEok);
      }
    } catch {
      window.sessionStorage.removeItem(HOLDINGS_STORAGE_KEY);
    }

    try {
      const storedAnalysis =
        window.sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
      if (storedAnalysis) {
        const parsed = JSON.parse(storedAnalysis) as Partial<AnalysisResult>;
        if (
          parsed.marketMode === marketMode &&
          typeof parsed.asOf === "string" &&
          typeof parsed.goalAmount === "number" &&
          Array.isArray(parsed.holdings) &&
          Array.isArray(parsed.scenarios) &&
          Array.isArray(parsed.chart) &&
          Array.isArray(parsed.summary)
        )
          setAnalysis(parsed as AnalysisResult);
        else window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      }
    } catch {
      window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    }

    setDraftLoaded(true);
  }, [isGlobalTest, marketMode]);

  useEffect(() => {
    if (!draftLoaded) return;
    window.sessionStorage.setItem(
      HOLDINGS_STORAGE_KEY,
      JSON.stringify({ holdings, targetEok }),
    );
  }, [draftLoaded, holdings, targetEok]);

  const updateHolding = (
    id: number,
    field: "symbol" | "averagePrice" | "quantity",
    value: string,
  ) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateHoldingSymbol = (id: number, symbol: string) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id ? { ...item, symbol, selectedStock: null } : item,
      ),
    );
  };

  const updateCurrency = (id: number, currency: Holding["currency"]) => {
    setHoldings((items) =>
      items.map((item) => (item.id === id ? { ...item, currency } : item)),
    );
  };

  const selectStock = (id: number, stock: StockSearchResult) => {
    setHoldings((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              symbol: stock.name,
              selectedStock: stock,
              currency: stock.currency,
            }
          : item,
      ),
    );
  };

  const addHolding = () => {
    if (holdings.length >= 10) return;
    const nextId = Math.max(...holdings.map(({ id }) => id), 0) + 1;
    setHoldings((items) => [...items, emptyHolding(nextId)]);
  };

  const clearStoredPortfolio = () => {
    const shouldClear = window.confirm(
      "현재 탭에 저장된 종목과 입력 정보를 모두 삭제할까요?",
    );
    if (!shouldClear) return;
    window.sessionStorage.removeItem(HOLDINGS_STORAGE_KEY);
    window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    setHoldings([emptyHolding(1)]);
    setTargetEok("1");
    setAnalysis(null);
    setAnalysisError("");
  };

  const targetAmount = Number(targetEok) * 100_000_000;
  const canAnalyze =
    Number.isInteger(Number(targetEok)) &&
    Number(targetEok) >= 1 &&
    Number(targetEok) <= 1_000 &&
    holdings.every(
      ({ selectedStock, averagePrice, quantity }) =>
        selectedStock && Number(averagePrice) > 0 && Number(quantity) > 0,
    );

  const analyze = async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/stocks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalAmount: targetAmount,
          holdings: holdings.map((holding) => ({
            stockId: holding.selectedStock!.stockId,
            averagePrice: Number(holding.averagePrice),
            quantity: Number(holding.quantity),
            currency: holding.currency,
          })),
        }),
      });
      const body = (await response.json()) as
        | AnalysisResult
        | { error: string };
      if (!response.ok || "error" in body)
        throw new Error("error" in body ? body.error : "분석에 실패했습니다.");
      setAnalysis(body);
      window.sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(body));
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "분석에 실패했습니다.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="-my-16 overflow-hidden md:-my-32">
      <section className="relative border-b">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-72 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute top-24 -right-48 size-80 rounded-full bg-sky-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-28 md:pb-28">
          <header className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm backdrop-blur dark:text-emerald-400">
              <SparklesIcon className="size-3.5 text-emerald-500" />
              EOKKA BETA
            </div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl md:text-7xl">
              내 주식,{" "}
              <span className="inline-flex items-baseline bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                <JackpotGoal />
                억까지
              </span>
              <br />
              얼마나 남았을까?
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 text-pretty md:text-lg">
              보유 주식의 현재 수익률과 목표 달성 시점을 확인해보세요.
            </p>
            <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <span className="size-2 rounded-full bg-amber-500" />
              {isGlobalTest
                ? "로컬 KIS 테스트 모드 · 국내·미국 주식 지원"
                : "베타 서비스 기간에는 국내 주식·ETF·ETN만 지원합니다"}
            </div>
          </header>

          <div className="mx-auto mt-12 max-w-4xl">
            <div className="mb-4 flex justify-center">
              <div
                className="bg-muted/70 inline-flex rounded-xl p-1"
                role="tablist"
              >
                {[
                  ["quick", "빠른 분석"],
                  ["saved", "나의 억까"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value as typeof tab)}
                    className={cn(
                      "rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                      tab === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === "quick" ? (
              <div className="bg-card/90 rounded-3xl border shadow-2xl shadow-black/5 backdrop-blur dark:shadow-black/20">
                <div className="border-b px-5 py-5 sm:px-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <TrendingUpIcon className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          보유 주식을 알려주세요
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {isGlobalTest
                            ? "국내 주식과 미국 주식을 KIS 시세로 테스트할 수 있어요."
                            : "국내 주식과 ETF·ETN을 입력할 수 있어요. 로그인하면 분석 결과를 저장하고, 추가 매수 후에도 이어서 분석할 수 있어요."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearStoredPortfolio}
                      className="border-red-500/40 text-red-500 hover:border-red-500 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2Icon className="size-4" />
                      현재 탭의 정보 삭제
                    </Button>
                  </div>
                </div>

                <form
                  className="space-y-7 px-5 py-6 sm:px-8 sm:py-8"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void analyze();
                  }}
                >
                  <div className="space-y-4">
                    {holdings.map((holding, index) => (
                      <div
                        key={holding.id}
                        className="bg-muted/35 rounded-2xl border p-4 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                              {index + 1}
                            </span>
                            보유 종목
                          </div>
                          {holdings.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`${index + 1}번째 종목 삭제`}
                              onClick={() =>
                                setHoldings((items) =>
                                  items.filter(({ id }) => id !== holding.id),
                                )
                              }
                              className="text-muted-foreground hover:text-destructive size-8"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
                          <Field
                            label="종목명 또는 티커"
                            id={`symbol-${holding.id}`}
                          >
                            <StockAutocomplete
                              id={`symbol-${holding.id}`}
                              value={holding.symbol}
                              selectedStock={holding.selectedStock}
                              onValueChange={(value) =>
                                updateHoldingSymbol(holding.id, value)
                              }
                              onSelect={(stock) =>
                                selectStock(holding.id, stock)
                              }
                            />
                          </Field>

                          <Field
                            label={
                              <>
                                평균 매수가
                                {isGlobalTest && holding.currency === "USD" && (
                                  <span className="text-muted-foreground ml-1 text-[11px] font-normal">
                                    (달러는 소수점 없이 입력)
                                  </span>
                                )}
                              </>
                            }
                            id={`price-${holding.id}`}
                          >
                            <div className="flex gap-2">
                              {isGlobalTest && (
                                <div
                                  className="bg-muted flex h-11 shrink-0 rounded-md p-1"
                                  aria-label="매수 통화"
                                >
                                  {(["KRW", "USD"] as const).map((currency) => (
                                    <button
                                      key={currency}
                                      type="button"
                                      aria-pressed={
                                        holding.currency === currency
                                      }
                                      onClick={() =>
                                        updateCurrency(holding.id, currency)
                                      }
                                      className={cn(
                                        "min-w-9 rounded-sm px-2 text-sm font-bold transition-all",
                                        holding.currency === currency
                                          ? "bg-background text-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground",
                                      )}
                                    >
                                      {currency === "KRW" ? "₩" : "$"}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="relative min-w-0 flex-1">
                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                  {holding.currency === "KRW" ? "₩" : "$"}
                                </span>
                                <Input
                                  id={`price-${holding.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={holding.averagePrice}
                                  onChange={(event) =>
                                    updateHolding(
                                      holding.id,
                                      "averagePrice",
                                      event.target.value.replace(/\D/g, ""),
                                    )
                                  }
                                  placeholder={
                                    holding.currency === "KRW"
                                      ? "예: 70000"
                                      : "예: 180"
                                  }
                                  className="bg-background h-11 pl-7"
                                />
                              </div>
                            </div>
                          </Field>

                          <Field
                            label="보유 수량"
                            id={`quantity-${holding.id}`}
                          >
                            <div className="relative">
                              <Input
                                id={`quantity-${holding.id}`}
                                type="number"
                                min="0"
                                step="0.000001"
                                inputMode="decimal"
                                value={holding.quantity}
                                onChange={(event) =>
                                  updateHolding(
                                    holding.id,
                                    "quantity",
                                    event.target.value,
                                  )
                                }
                                placeholder="20"
                                className="bg-background h-11 pr-9"
                              />
                              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                                주
                              </span>
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addHolding}
                      disabled={holdings.length >= 10}
                      className="h-11 w-full border-dashed"
                    >
                      <PlusIcon />
                      {holdings.length >= 10
                        ? "최대 10개까지 추가할 수 있어요"
                        : `종목 추가하기 (${holdings.length}/10)`}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                    <Label htmlFor="target-amount" className="font-bold">
                      몇 억을 목표로 하나요?
                    </Label>
                    <p className="text-muted-foreground mt-1 text-xs">
                      1억부터 1,000억까지 원하는 목표를 입력할 수 있어요.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <div className="relative sm:w-44">
                        <Input
                          id="target-amount"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={targetEok}
                          onChange={(event) =>
                            setTargetEok(
                              event.target.value.replace(/\D/g, "").slice(0, 4),
                            )
                          }
                          className="bg-background h-11 pr-9 text-right text-base font-bold"
                          aria-describedby="target-amount-unit"
                        />
                        <span
                          id="target-amount-unit"
                          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
                        >
                          억
                        </span>
                      </div>
                      <div className="grid flex-1 grid-cols-3 gap-2">
                        {GOAL_PRESETS.map((goal) => (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => setTargetEok(String(goal))}
                            className={cn(
                              "h-11 rounded-lg border text-sm font-semibold transition-colors",
                              targetEok === String(goal)
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "bg-background hover:border-emerald-500/50",
                            )}
                          >
                            {goal}억
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canAnalyze || isAnalyzing}
                      className="h-12 w-full bg-emerald-500 text-base text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
                    >
                      {isAnalyzing ? (
                        <>
                          <LoaderCircleIcon className="animate-spin" />
                          시세와 목표 달성 시점 계산 중...
                        </>
                      ) : (
                        <>
                          내 주식 {targetEok || "-"}억까지 분석하기
                          <ArrowRightIcon />
                        </>
                      )}
                    </Button>
                    <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-xs">
                      <LockKeyholeIcon className="size-3.5" />
                      입력 정보는 현재 탭에서만 유지되며, 탭을 닫으면 자동
                      삭제돼요
                    </p>
                  </div>
                  {analysisError && (
                    <p
                      role="alert"
                      className="text-destructive text-center text-sm"
                    >
                      {analysisError}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <div className="bg-card/90 rounded-3xl border p-8 text-center shadow-2xl shadow-black/5 backdrop-blur sm:p-12">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <BarChart3Icon className="size-7" />
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  내 분석을 계속 이어보세요
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
                  로그인하면 보유 종목과 분석 결과를 저장하고, 다시 방문할
                  때마다 달라진 목표 도착일을 확인할 수 있어요.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link to="/login">로그인하기</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/join">무료로 시작하기</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {tab === "quick" && analysis && (
            <div className="mx-auto max-w-4xl">
              <AnalysisResultView result={analysis} />
            </div>
          )}

          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              "현재 가격과 수익률 확인",
              "3가지 성장 시나리오",
              "AI 요약 분석",
            ].map((item) => (
              <div
                key={item}
                className="text-muted-foreground flex items-center justify-center gap-2 text-xs font-medium"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckIcon className="size-3" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: React.ReactNode;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
