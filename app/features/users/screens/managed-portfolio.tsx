import type { Route } from "./+types/managed-portfolio";

import { and, eq, inArray } from "drizzle-orm";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Form, data, redirect, useActionData, useLocation } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
import { StockAutocomplete } from "~/features/stocks/components/stock-autocomplete";
import {
  getAnalysisHistory,
  saveDailyAnalysisSnapshot,
  seoulDate,
  startManagedAnalysisHistory,
} from "~/features/stocks/history/analysis-history.server";
import { getHistoricalUsdKrwRate } from "~/features/stocks/portfolio/exchange-rate.server";
import {
  addPortfolioTransaction,
  addPortfolioTransactions,
  calculateManagedHoldings,
  deletePortfolioTransaction,
  getManagedPortfolio,
  investmentMonthsSince,
} from "~/features/stocks/portfolio/portfolio.server";
import { stocks } from "~/features/stocks/schema";
import type { StockSearchResult } from "~/features/stocks/types";

export const meta: Route.MetaFunction = () => [
  { title: `내 포트폴리오 | ${import.meta.env.VITE_APP_NAME}` },
];

const transactionSchema = z.object({
  stockId: z.coerce.number().int().positive(),
  type: z.enum(["BUY", "SELL"]),
  tradedOn: z.string().date(),
  quantity: z.coerce.number().positive().max(1_000_000_000),
  unitPrice: z.coerce.number().positive().max(10_000_000_000),
  memo: z.string().trim().max(300),
});

const analysisSchema = z.object({
  goalAmount: z.coerce.number().int().min(100_000_000).max(100_000_000_000),
  monthlyContribution: z.coerce.number().int().min(0).max(1_000_000_000),
  confirmReset: z.literal("on").optional(),
});

const quickImportSchema = z
  .array(
    z.object({
      stockId: z.number().int().positive(),
      averagePrice: z.number().positive().max(10_000_000_000),
      quantity: z.number().positive().max(1_000_000_000),
      tradedOn: z.string().date(),
    }),
  )
  .min(1)
  .max(100);

type QuickPortfolioDraft = {
  holdings: Array<{
    stock: StockSearchResult;
    averagePrice: number;
    quantity: number;
  }>;
};

type QuickImportRow = {
  rowId: string;
  stock: StockSearchResult;
  averagePrice: number;
  quantity: number;
  tradedOn: string;
};

const quickImportTones = [
  {
    card: "border-emerald-500/35 bg-emerald-500/[0.07]",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    card: "border-violet-500/35 bg-violet-500/[0.07]",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  {
    card: "border-sky-500/35 bg-sky-500/[0.07]",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    card: "border-amber-500/35 bg-amber-500/[0.07]",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    card: "border-rose-500/35 bg-rose-500/[0.07]",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
];

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatKoreanMoney(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || value === "") return "";
  const rounded = Math.round(amount);
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  const won = rounded % 10_000;
  const parts = [
    eok > 0 ? `${eok.toLocaleString("ko-KR")}억` : "",
    man > 0 ? `${man.toLocaleString("ko-KR")}만` : "",
    won > 0 ? won.toLocaleString("ko-KR") : "",
  ].filter(Boolean);
  return `${parts.join(" ") || "0"}원`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [managed, quickHistory] = await Promise.all([
    getManagedPortfolio(user.id),
    getAnalysisHistory(user.id),
  ]);
  const holdings = managed
    ? calculateManagedHoldings(managed.transactions)
    : [];
  const latest = quickHistory.at(-1) ?? null;

  return {
    today: seoulDate(),
    managed,
    holdings,
    quickRecordCount: quickHistory.filter(
      (record) => record.analysisMode === "quick",
    ).length,
    investmentStartedOn:
      managed?.transactions.find((transaction) => transaction.type === "BUY")
        ?.tradedOn ?? null,
    defaults: {
      goalAmount: latest?.goalAmount ?? 100_000_000,
      monthlyContribution: latest?.monthlyContribution ?? 0,
      investmentPeriodMonths: latest?.result.investmentPeriodMonths ?? null,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "add-transaction") {
      const parsed = transactionSchema.parse({
        stockId: formData.get("stockId"),
        type: formData.get("type"),
        tradedOn: formData.get("tradedOn"),
        quantity: formData.get("quantity"),
        unitPrice: formData.get("unitPrice"),
        memo: formData.get("memo") ?? "",
      });
      const [stock] = await db
        .select()
        .from(stocks)
        .where(
          and(eq(stocks.stock_id, parsed.stockId), eq(stocks.is_active, true)),
        )
        .limit(1);
      if (!stock)
        return data(
          { error: "등록된 종목 코드를 찾지 못했어요." },
          { status: 400 },
        );

      const historicalRate =
        stock.currency === "USD"
          ? await getHistoricalUsdKrwRate(parsed.tradedOn)
          : { rate: 1, basedOn: parsed.tradedOn };

      if (parsed.type === "SELL") {
        const managed = await getManagedPortfolio(user.id);
        const currentHolding = managed
          ? calculateManagedHoldings(managed.transactions).find(
              (holding) => holding.stockId === stock.stock_id,
            )
          : null;
        if (!currentHolding || parsed.quantity > currentHolding.quantity + 1e-8)
          throw new Error("매도 수량이 현재 보유 수량보다 많아요.");
      }

      await addPortfolioTransaction({
        userId: user.id,
        stockId: stock.stock_id,
        type: parsed.type,
        tradedOn: parsed.tradedOn,
        quantity: parsed.quantity,
        unitPrice: parsed.unitPrice,
        currency: stock.currency === "USD" ? "USD" : "KRW",
        exchangeRate: historicalRate.rate,
        memo: parsed.memo || null,
      });
      return redirect("/dashboard/portfolio");
    }

    if (intent === "delete-transaction") {
      const transactionId = Number(formData.get("transactionId"));
      if (!Number.isSafeInteger(transactionId) || transactionId <= 0)
        throw new Error("삭제할 거래를 확인하지 못했어요.");
      const managed = await getManagedPortfolio(user.id);
      if (!managed) throw new Error("포트폴리오를 찾지 못했어요.");
      calculateManagedHoldings(
        managed.transactions.filter(
          (transaction) => transaction.id !== transactionId,
        ),
      );
      await deletePortfolioTransaction(user.id, transactionId);
      return redirect("/dashboard/portfolio");
    }

    if (intent === "import-quick-portfolio") {
      const parsed = quickImportSchema.parse(
        JSON.parse(String(formData.get("draft") ?? "[]")),
      );
      const stockIds = [...new Set(parsed.map((holding) => holding.stockId))];
      const stockRows = await db
        .select()
        .from(stocks)
        .where(
          and(inArray(stocks.stock_id, stockIds), eq(stocks.is_active, true)),
        );
      if (stockRows.length !== stockIds.length)
        throw new Error("가져올 종목 정보를 다시 확인해 주세요.");

      const transactions = await Promise.all(
        parsed.map(async (holding) => {
          const stock = stockRows.find(
            (row) => row.stock_id === holding.stockId,
          )!;
          const currency: "USD" | "KRW" =
            stock.currency === "USD" ? "USD" : "KRW";
          const historicalRate =
            currency === "USD"
              ? await getHistoricalUsdKrwRate(holding.tradedOn)
              : { rate: 1 };
          return {
            stockId: holding.stockId,
            tradedOn: holding.tradedOn,
            quantity: holding.quantity,
            unitPrice: holding.averagePrice,
            currency,
            exchangeRate: historicalRate.rate,
          };
        }),
      );
      await addPortfolioTransactions(user.id, transactions);
      return redirect("/dashboard/portfolio");
    }

    if (intent === "analyze-managed") {
      const parsed = analysisSchema.parse({
        goalAmount: formData.get("goalAmount"),
        monthlyContribution: formData.get("monthlyContribution") || 0,
        confirmReset: formData.get("confirmReset") ?? undefined,
      });
      const managed = await getManagedPortfolio(user.id);
      if (!managed)
        throw new Error("먼저 매매일지를 한 건 이상 작성해 주세요.");
      const holdings = calculateManagedHoldings(managed.transactions);
      if (holdings.length === 0)
        throw new Error("현재 보유 중인 종목이 없어 분석할 수 없어요.");
      if (holdings.length > 10)
        throw new Error("정밀 분석은 현재 최대 10개 보유 종목을 지원해요.");
      if (managed.portfolio.status !== "active" && parsed.confirmReset !== "on")
        throw new Error("정밀 분석 전환에 동의해 주세요.");

      const firstBoughtOn = managed.transactions.find(
        (transaction) => transaction.type === "BUY",
      )?.tradedOn;
      if (!firstBoughtOn)
        throw new Error("투자 기간을 계산할 매수 기록이 없어요.");
      const investmentPeriodMonths = investmentMonthsSince(
        firstBoughtOn,
        seoulDate(),
      );
      const result = await analyzePortfolio({
        goalAmount: parsed.goalAmount,
        monthlyContribution: parsed.monthlyContribution,
        investmentPeriodMonths,
        holdings: holdings.map((holding) => ({
          stockId: holding.stockId,
          averagePrice: holding.averagePrice,
          quantity: holding.quantity,
          currency: holding.currency,
          costKrw: holding.costKrw,
        })),
      });

      if (managed.portfolio.status === "active") {
        await saveDailyAnalysisSnapshot({
          userId: user.id,
          result,
          analysisMode: "managed",
          managedPortfolioId: managed.portfolio.managed_portfolio_id,
        });
      } else {
        await startManagedAnalysisHistory({
          userId: user.id,
          portfolioId: managed.portfolio.managed_portfolio_id,
          result,
        });
      }
      return redirect("/dashboard");
    }
  } catch (error) {
    return data(
      {
        error:
          error instanceof z.ZodError
            ? "입력한 거래 정보를 다시 확인해 주세요."
            : error instanceof Error
              ? error.message
              : "요청을 처리하지 못했어요.",
      },
      { status: 400 },
    );
  }

  return data({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}

export default function ManagedPortfolio({ loaderData }: Route.ComponentProps) {
  const {
    today,
    managed,
    holdings,
    quickRecordCount,
    investmentStartedOn,
    defaults,
  } = loaderData;
  const actionData = useActionData<typeof action>();
  const location = useLocation();
  const quickDraft = (
    location.state as { quickPortfolioDraft?: QuickPortfolioDraft } | null
  )?.quickPortfolioDraft;
  const quickDraftHoldings = quickDraft?.holdings ?? [];
  const [quickImportRows, setQuickImportRows] = useState<QuickImportRow[]>(() =>
    quickDraftHoldings.map((holding, index) => ({
      rowId: `${holding.stock.stockId}-${index}`,
      stock: holding.stock,
      averagePrice: holding.averagePrice,
      quantity: holding.quantity,
      tradedOn: today,
    })),
  );
  const [stockQuery, setStockQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    null,
  );
  const [goalAmountInput, setGoalAmountInput] = useState(
    String(defaults.goalAmount),
  );
  const [monthlyContributionInput, setMonthlyContributionInput] = useState(
    String(defaults.monthlyContribution),
  );
  const isActive = managed?.portfolio.status === "active";
  const updateQuickImportRow = (
    rowId: string,
    field: "averagePrice" | "quantity" | "tradedOn",
    value: number | string,
  ) =>
    setQuickImportRows((rows) =>
      rows.map((row) =>
        row.rowId === rowId ? { ...row, [field]: value } : row,
      ),
    );
  const splitQuickImportRow = (rowId: string) =>
    setQuickImportRows((rows) => {
      const index = rows.findIndex((row) => row.rowId === rowId);
      if (index < 0) return rows;
      const source = rows[index];
      const dividedQuantity = source.quantity / 2;
      const next = [...rows];
      next.splice(
        index,
        1,
        { ...source, quantity: dividedQuantity },
        {
          ...source,
          rowId: `${source.stock.stockId}-${Date.now()}-${Math.random()}`,
          quantity: dividedQuantity,
        },
      );
      return next;
    });

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-12 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-500">
              <BriefcaseBusinessIcon className="size-4" /> MANAGED PORTFOLIO
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              내 포트폴리오
            </h1>
            <p className="text-muted-foreground mt-2 leading-6">
              매수·매도 날짜와 당시 환율을 기록해 실제 원화 매입원금으로
              분석해요.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${
              isActive
                ? "bg-emerald-500/12 text-emerald-500"
                : "bg-amber-500/12 text-amber-500"
            }`}
          >
            {isActive ? "정밀 분석 사용 중" : "전환 준비 중"}
          </span>
        </header>

        {actionData?.error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-600 dark:text-red-400">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {actionData.error}
          </div>
        )}

        {quickDraftHoldings.length > 0 && (
          <section className="mt-7 rounded-3xl border border-violet-500/25 bg-violet-500/[0.06] p-5 shadow-sm md:p-6">
            <p className="text-sm font-bold text-violet-500">
              빠른 분석에서 이어서 작성하기
            </p>
            <h2 className="mt-1 text-xl font-black">
              실제 매수 내역을 확인해 주세요
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              빠른 분석에서 입력한 종목·평균 매수가·수량을 가져왔어요. 여러
              날짜에 나누어 매수했다면 실제 매수 내역을 각각 등록해 주세요.
            </p>
            <Form method="post" className="mt-5 space-y-3">
              <input
                type="hidden"
                name="intent"
                value="import-quick-portfolio"
              />
              <input
                type="hidden"
                name="draft"
                value={JSON.stringify(
                  quickImportRows.map((row) => ({
                    stockId: row.stock.stockId,
                    averagePrice: row.averagePrice,
                    quantity: row.quantity,
                    tradedOn: row.tradedOn,
                  })),
                )}
              />
              {quickImportRows.map((row) => {
                const stockIds = [
                  ...new Set(quickImportRows.map((item) => item.stock.stockId)),
                ];
                const tone =
                  quickImportTones[
                    stockIds.indexOf(row.stock.stockId) %
                      quickImportTones.length
                  ];
                const sameStockIndex =
                  quickImportRows
                    .filter((item) => item.stock.stockId === row.stock.stockId)
                    .findIndex((item) => item.rowId === row.rowId) + 1;
                const sameStockCount = quickImportRows.filter(
                  (item) => item.stock.stockId === row.stock.stockId,
                ).length;
                return (
                  <div
                    key={row.rowId}
                    className={cn("rounded-2xl border p-4", tone.card)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn("size-2 rounded-full", tone.dot)}
                          />
                          <p className="font-black">{row.stock.name}</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-black",
                              tone.badge,
                            )}
                          >
                            {sameStockCount > 1
                              ? `${sameStockIndex}번째 매수`
                              : "매수 내역"}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {row.stock.ticker} · {row.stock.currency}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => splitQuickImportRow(row.rowId)}
                        >
                          <PlusIcon className="size-3.5" /> 매수 내역 나누기
                        </Button>
                        {quickImportRows.filter(
                          (item) => item.stock.stockId === row.stock.stockId,
                        ).length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`${row.stock.name} 매수 내역 삭제`}
                            onClick={() =>
                              setQuickImportRows((rows) =>
                                rows.filter((item) => item.rowId !== row.rowId),
                              )
                            }
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`import-date-${row.rowId}`}>
                          매수 날짜
                        </Label>
                        <Input
                          id={`import-date-${row.rowId}`}
                          type="date"
                          value={row.tradedOn}
                          max={loaderData.today}
                          onChange={(event) =>
                            updateQuickImportRow(
                              row.rowId,
                              "tradedOn",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`import-price-${row.rowId}`}>
                          주당 체결 가격
                        </Label>
                        <Input
                          id={`import-price-${row.rowId}`}
                          type="number"
                          min="0.000001"
                          step="any"
                          value={row.averagePrice}
                          onChange={(event) =>
                            updateQuickImportRow(
                              row.rowId,
                              "averagePrice",
                              Number(event.target.value),
                            )
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`import-quantity-${row.rowId}`}>
                          매수 수량
                        </Label>
                        <Input
                          id={`import-quantity-${row.rowId}`}
                          type="number"
                          min="0.000001"
                          step="any"
                          value={row.quantity}
                          onChange={(event) =>
                            updateQuickImportRow(
                              row.rowId,
                              "quantity",
                              Number(event.target.value),
                            )
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button type="submit" className="w-full" size="lg">
                매매일지로 가져오기 <ArrowRightIcon />
              </Button>
            </Form>
          </section>
        )}

        <section className="mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-2">
              <PlusIcon className="size-5 text-emerald-500" />
              <h2 className="text-xl font-black">매매일지 추가</h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              해외주식 환율은 거래 날짜를 기준으로 자동 적용해요. 주말과
              휴장일은 직전 기준 환율을 사용해요.
            </p>
            <Form method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="intent" value="add-transaction" />
              <div className="space-y-2">
                <Label htmlFor="managed-stock">종목명 또는 티커</Label>
                <input
                  type="hidden"
                  name="stockId"
                  value={selectedStock?.stockId ?? ""}
                />
                <StockAutocomplete
                  id="managed-stock"
                  value={stockQuery}
                  selectedStock={selectedStock}
                  onValueChange={(value) => {
                    setStockQuery(value);
                    setSelectedStock(null);
                  }}
                  onSelect={(stock) => {
                    setSelectedStock(stock);
                    setStockQuery(`${stock.name} (${stock.ticker})`);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">거래 유형</Label>
                <Select name="type" defaultValue="BUY">
                  <SelectTrigger id="type" className="h-11 w-full">
                    <SelectValue placeholder="거래 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">매수</SelectItem>
                    <SelectItem value="SELL">매도</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradedOn">거래 날짜</Label>
                <Input
                  id="tradedOn"
                  name="tradedOn"
                  type="date"
                  defaultValue={today}
                  max={today}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">수량</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.000001"
                  step="any"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">주당 체결 가격</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="memo">메모</Label>
                <Input
                  id="memo"
                  name="memo"
                  maxLength={300}
                  placeholder="매수 이유나 당시 생각을 기록해 보세요."
                />
              </div>
              <Button type="submit" className="sm:col-span-2">
                <PlusIcon /> 매매일지 저장
              </Button>
            </Form>
          </div>

          <div className="bg-card rounded-3xl border p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">현재 보유 현황</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  매매일지 기준 {holdings.length}개 종목
                </p>
              </div>
              <BookOpenIcon className="size-5 text-violet-500" />
            </div>
            {holdings.length ? (
              <div className="mt-5 space-y-3">
                {holdings.map((holding) => (
                  <div
                    key={holding.stockId}
                    className="bg-muted/25 flex items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black">{holding.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {holding.ticker} ·{" "}
                        {holding.quantity.toLocaleString("ko-KR")}주
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black">
                        {formatWon(holding.costKrw)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        원화 매입원금
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
                매수 기록을 추가하면 보유 현황이 계산돼요.
              </div>
            )}
          </div>
        </section>

        <section className="bg-card mt-5 rounded-3xl border p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="size-5 text-violet-500" />
            <h2 className="text-xl font-black">매매일지</h2>
          </div>
          {managed?.transactions.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr className="border-b">
                    <th className="px-3 py-3">날짜</th>
                    <th className="px-3 py-3">종목</th>
                    <th className="px-3 py-3">구분</th>
                    <th className="px-3 py-3">수량</th>
                    <th className="px-3 py-3">체결가</th>
                    <th className="px-3 py-3">환율</th>
                    <th className="px-3 py-3">메모</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...managed.transactions].reverse().map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-0">
                      <td className="px-3 py-3">{transaction.tradedOn}</td>
                      <td className="px-3 py-3 font-bold">
                        {transaction.stockName}
                      </td>
                      <td
                        className={`px-3 py-3 font-black ${transaction.type === "BUY" ? "text-rose-500" : "text-blue-500"}`}
                      >
                        {transaction.type === "BUY" ? "매수" : "매도"}
                      </td>
                      <td className="px-3 py-3">
                        {transaction.quantity.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-3">
                        {transaction.unitPrice.toLocaleString("ko-KR")}{" "}
                        {transaction.currency}
                      </td>
                      <td className="px-3 py-3">
                        {transaction.currency === "USD"
                          ? `${transaction.exchangeRate.toLocaleString("ko-KR")}원`
                          : "—"}
                      </td>
                      <td className="text-muted-foreground max-w-44 truncate px-3 py-3">
                        {transaction.memo || "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Form method="post">
                          <input
                            type="hidden"
                            name="intent"
                            value="delete-transaction"
                          />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            aria-label={`${transaction.stockName} 거래 삭제`}
                          >
                            <Trash2Icon />
                          </Button>
                        </Form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground mt-5 rounded-2xl border border-dashed p-8 text-center text-sm">
              아직 작성한 매매일지가 없어요.
            </p>
          )}
        </section>

        <section
          className={`mt-5 rounded-3xl border p-5 shadow-sm md:p-6 ${isActive ? "bg-card" : "border-amber-500/25 bg-amber-500/[0.06]"}`}
        >
          <h2 className="text-xl font-black">
            {isActive ? "정밀 분석 업데이트" : "정밀 포트폴리오로 전환"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {isActive
              ? "저장된 매매일지를 반영해 오늘의 정밀 분석 기록을 업데이트해요."
              : `전환하면 기존 빠른 분석 기록 ${quickRecordCount}개는 분석 기록에 보관되고, 대시보드와 인사이트는 정밀 분석 기록으로 새로 시작해요.`}
          </p>
          {investmentStartedOn && (
            <p className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              투자 기간은 최초 매수일 {investmentStartedOn.replaceAll("-", ".")}
              부터 자동 계산해요.
            </p>
          )}
          <Form method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="intent" value="analyze-managed" />
            <div className="space-y-2">
              <Label htmlFor="goalAmount">목표 금액</Label>
              <Input
                id="goalAmount"
                name="goalAmount"
                type="number"
                min="100000000"
                step="100000000"
                value={goalAmountInput}
                onChange={(event) => setGoalAmountInput(event.target.value)}
                required
              />
              {formatKoreanMoney(goalAmountInput) && (
                <p className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatKoreanMoney(goalAmountInput)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">매월 투자금</Label>
              <Input
                id="monthlyContribution"
                name="monthlyContribution"
                type="number"
                min="0"
                value={monthlyContributionInput}
                onChange={(event) =>
                  setMonthlyContributionInput(event.target.value)
                }
              />
              {formatKoreanMoney(monthlyContributionInput) && (
                <p className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatKoreanMoney(monthlyContributionInput)}
                </p>
              )}
            </div>
            {!isActive && (
              <label className="bg-background/70 flex items-start gap-3 rounded-2xl border border-amber-500/25 p-4 text-sm leading-6 sm:col-span-2">
                <input
                  type="checkbox"
                  name="confirmReset"
                  className="mt-1 size-4"
                  required
                />
                <span>
                  기존 기록은 보관되며, 대시보드와 인사이트가 정밀 분석 기준으로
                  전환되는 것을 확인했어요.
                </span>
              </label>
            )}
            <Button
              type="submit"
              size="lg"
              className="sm:col-span-2"
              disabled={!holdings.length}
            >
              {isActive ? "정밀 분석 업데이트" : "정밀 포트폴리오로 전환"}{" "}
              <ArrowRightIcon />
            </Button>
          </Form>
        </section>
      </div>
    </main>
  );
}
