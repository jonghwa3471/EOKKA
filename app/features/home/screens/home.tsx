import type { Route } from "./+types/home";

import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  LockKeyholeIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import i18next from "~/core/lib/i18next.server";
import { cn } from "~/core/lib/utils";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: data?.title ?? "억까 — 내 주식, 1억까지" },
  { name: "description", content: data?.subtitle },
];

export async function loader({ request }: Route.LoaderArgs) {
  await i18next.getFixedT(request);
  return {
    title: "억까 — 내 주식, 1억까지",
    subtitle: "보유 주식을 입력하고 1억까지 얼마나 남았는지 확인해보세요.",
  };
}

type Holding = {
  id: number;
  symbol: string;
  averagePrice: string;
  quantity: string;
};

const emptyHolding = (id: number): Holding => ({
  id,
  symbol: "",
  averagePrice: "",
  quantity: "",
});

export default function Home() {
  const [tab, setTab] = useState<"quick" | "saved">("quick");
  const [holdings, setHoldings] = useState<Holding[]>([emptyHolding(1)]);
  const [showMonthlyInvestment, setShowMonthlyInvestment] = useState(false);
  const [monthlyInvestment, setMonthlyInvestment] = useState("");

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

  const addHolding = () => {
    const nextId = Math.max(...holdings.map(({ id }) => id), 0) + 1;
    setHoldings((items) => [...items, emptyHolding(nextId)]);
  };

  const canAnalyze = holdings.some(
    ({ symbol, averagePrice, quantity }) =>
      symbol.trim() && Number(averagePrice) > 0 && Number(quantity) > 0,
  );

  return (
    <main className="-my-16 overflow-hidden md:-my-32">
      <section className="relative border-b">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-72 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute top-24 -right-48 size-80 rounded-full bg-sky-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-28 md:pb-28">
          <header className="mx-auto max-w-3xl text-center">
            <div className="bg-background/70 mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
              <SparklesIcon className="size-3.5 text-emerald-500" />
              로그인 없이 바로 시작하세요
            </div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl md:text-7xl">
              내 주식,{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                1억까지
              </span>
              <br />
              얼마나 남았을까?
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-7 text-pretty md:text-lg">
              보유 종목과 매수 정보를 입력하면 현재 수익률부터 1억 예상
              도착일까지 한눈에 분석해드려요.
            </p>
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
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <TrendingUpIcon className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">
                        보유 주식을 알려주세요
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        미국 주식 기준이며, 로그인 전에는 입력 정보가 저장되지
                        않아요.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  className="space-y-7 px-5 py-6 sm:px-8 sm:py-8"
                  onSubmit={(event) => event.preventDefault()}
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
                            <div className="relative">
                              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                              <Input
                                id={`symbol-${holding.id}`}
                                value={holding.symbol}
                                onChange={(event) =>
                                  updateHolding(
                                    holding.id,
                                    "symbol",
                                    event.target.value.toUpperCase(),
                                  )
                                }
                                placeholder="예: AAPL, Apple"
                                autoComplete="off"
                                className="bg-background h-11 pl-9"
                              />
                            </div>
                          </Field>

                          <Field label="평균 매수가" id={`price-${holding.id}`}>
                            <div className="relative">
                              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                $
                              </span>
                              <Input
                                id={`price-${holding.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={holding.averagePrice}
                                onChange={(event) =>
                                  updateHolding(
                                    holding.id,
                                    "averagePrice",
                                    event.target.value,
                                  )
                                }
                                placeholder="180.00"
                                className="bg-background h-11 pl-7"
                              />
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
                      className="h-11 w-full border-dashed"
                    >
                      <PlusIcon />
                      종목 추가하기
                    </Button>
                  </div>

                  <div className="rounded-2xl border">
                    <button
                      type="button"
                      aria-expanded={showMonthlyInvestment}
                      onClick={() =>
                        setShowMonthlyInvestment((value) => !value)
                      }
                      className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                          <CircleDollarSignIcon className="size-5" />
                        </span>
                        <span>
                          <strong className="block text-sm">
                            매월 추가 투자금이 있나요?
                          </strong>
                          <small className="text-muted-foreground mt-0.5 block">
                            선택 사항 · 정기 투자 계획이 있을 때만 입력하세요
                          </small>
                        </span>
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "text-muted-foreground size-4 transition-transform",
                          showMonthlyInvestment && "rotate-180",
                        )}
                      />
                    </button>

                    {showMonthlyInvestment && (
                      <div className="border-t p-4 sm:p-5">
                        <Label htmlFor="monthly-investment">
                          월 추가 투자금
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="monthly-investment"
                            type="number"
                            min="0"
                            step="10000"
                            inputMode="numeric"
                            value={monthlyInvestment}
                            onChange={(event) =>
                              setMonthlyInvestment(event.target.value)
                            }
                            placeholder="예: 700000"
                            className="bg-background h-11 pr-10"
                          />
                          <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            원
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canAnalyze}
                      className="h-12 w-full bg-emerald-500 text-base text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
                    >
                      내 주식 1억까지 분석하기
                      <ArrowRightIcon />
                    </Button>
                    <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-xs">
                      <LockKeyholeIcon className="size-3.5" />
                      입력한 정보는 분석 목적으로만 사용돼요
                    </p>
                  </div>
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
                  때마다 달라진 1억 도착일을 확인할 수 있어요.
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
  label: string;
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
