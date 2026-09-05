import type { Route } from "./+types/managed-portfolio";

import { and, eq, inArray } from "drizzle-orm";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleAlertIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLocation,
} from "react-router";
import { z } from "zod";

import { DestructiveConfirmDialog } from "~/core/components/destructive-confirm-dialog";
import { Button } from "~/core/components/ui/button";
import { DatePicker } from "~/core/components/ui/date-picker";
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
import { StockAutocomplete } from "~/features/stocks/components/stock-autocomplete";
import {
  getAnalysisHistory,
  seoulDate,
} from "~/features/stocks/history/analysis-history.server";
import { getHistoricalUsdKrwRate } from "~/features/stocks/portfolio/exchange-rate.server";
import {
  addPortfolioTransaction,
  addPortfolioTransactions,
  calculateManagedHoldings,
  deleteAllPortfolioTransactions,
  deletePortfolioTransaction,
  getManagedPortfolio,
  updatePortfolioTransactions,
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

const pendingTransactionUpdateSchema = transactionSchema
  .omit({ stockId: true })
  .extend({
    id: z.number().int().positive(),
  });

const pendingTransactionUpdatesSchema = z
  .array(pendingTransactionUpdateSchema)
  .max(500);

type PendingTransactionUpdate = z.infer<
  typeof pendingTransactionUpdatesSchema
>[number];

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

type JournalPeriod = "all" | "1m" | "3m" | "6m" | "1y" | "custom";

const journalPeriods: Array<{
  value: JournalPeriod;
  label: string;
  days: number;
}> = [
  { value: "all", label: "전체", days: 0 },
  { value: "1m", label: "1개월", days: 30 },
  { value: "3m", label: "3개월", days: 90 },
  { value: "6m", label: "6개월", days: 180 },
  { value: "1y", label: "1년", days: 365 },
  { value: "custom", label: "직접 설정", days: 0 },
];

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
  const lastManagedAnalysisAt = managed
    ? quickHistory
        .filter(
          (record) =>
            record.analysisMode === "managed" &&
            record.managedPortfolioId ===
              managed.portfolio.managed_portfolio_id,
        )
        .reduce<Date | null>(
          (latest, record) =>
            !latest || record.updatedAt > latest ? record.updatedAt : latest,
          null,
        )
    : null;
  const hasUnappliedChanges = Boolean(
    managed?.portfolio.status === "active" &&
      (!lastManagedAnalysisAt ||
        new Date(managed.portfolio.updated_at).getTime() >
          new Date(lastManagedAnalysisAt).getTime()),
  );

  return {
    today: seoulDate(),
    managed,
    holdings,
    lastManagedAnalysisAt,
    hasUnappliedChanges,
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
      return data({
        success: "매매일지를 추가했어요.",
        portfolioChanged: true,
        operation: "add",
      });
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
      return data({
        success: "매매일지에서 거래를 삭제했어요.",
        portfolioChanged: true,
        operation: "delete",
      });
    }

    if (intent === "delete-all-transactions") {
      const managed = await getManagedPortfolio(user.id);
      if (!managed?.transactions.length)
        throw new Error("삭제할 매매 기록이 없어요.");
      await deleteAllPortfolioTransactions(user.id);
      return data({
        success: "매매일지를 전부 삭제했어요.",
        portfolioChanged: true,
        operation: "delete-all-transactions",
      });
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
      return data({
        success: "빠른 분석의 종목을 매매일지에 추가했어요.",
        portfolioChanged: true,
        operation: "import",
      });
    }

    if (intent === "apply-transaction-updates") {
      const pendingUpdates = pendingTransactionUpdatesSchema.parse(
        JSON.parse(String(formData.get("transactionUpdates") ?? "[]")),
      );
      if (pendingUpdates.length === 0)
        throw new Error("저장할 수정사항이 없어요.");
      const managed = await getManagedPortfolio(user.id);
      if (!managed) throw new Error("포트폴리오를 찾지 못했어요.");

      const preparedUpdates = await Promise.all(
        pendingUpdates.map(async (update) => {
          const existing = managed.transactions.find(
            (transaction) => transaction.id === update.id,
          );
          if (!existing) throw new Error("수정할 거래를 찾지 못했어요.");
          const historicalRate =
            existing.currency === "USD"
              ? await getHistoricalUsdKrwRate(update.tradedOn)
              : { rate: 1 };
          return {
            ...update,
            exchangeRate: historicalRate.rate,
            memo: update.memo || null,
          };
        }),
      );
      const updateById = new Map(
        preparedUpdates.map((update) => [update.id, update]),
      );
      const transactions = managed.transactions
        .map((transaction) => {
          const update = updateById.get(transaction.id);
          return update
            ? {
                ...transaction,
                type: update.type,
                tradedOn: update.tradedOn,
                quantity: update.quantity,
                unitPrice: update.unitPrice,
                exchangeRate: update.exchangeRate,
                memo: update.memo,
              }
            : transaction;
        })
        .sort((a, b) => a.tradedOn.localeCompare(b.tradedOn) || a.id - b.id);
      calculateManagedHoldings(transactions);
      await updatePortfolioTransactions(user.id, preparedUpdates);

      return data({
        success: `매매일지 수정 ${preparedUpdates.length}건을 저장했어요.`,
        portfolioChanged: true,
        operation: "batch-update",
      });
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
    lastManagedAnalysisAt,
    hasUnappliedChanges,
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
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  const [pendingTransactionUpdates, setPendingTransactionUpdates] = useState<
    Record<number, PendingTransactionUpdate>
  >({});
  const [holdingFilter, setHoldingFilter] = useState<number | null>(null);
  const [journalPeriod, setJournalPeriod] = useState<JournalPeriod>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState(today);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(10);
  const [dismissedPortfolioPrompt, setDismissedPortfolioPrompt] =
    useState(false);
  const [quickImportCompleted, setQuickImportCompleted] = useState(false);
  const journalRef = useRef<HTMLElement>(null);
  const transactionCount = managed?.transactions.length ?? 0;
  const effectiveTransactions = (managed?.transactions ?? []).map(
    (transaction) => {
      const update = pendingTransactionUpdates[transaction.id];
      return update ? { ...transaction, ...update } : transaction;
    },
  );
  const pendingUpdateCount = Object.keys(pendingTransactionUpdates).length;
  const portfolioStockIds = [
    ...new Set(effectiveTransactions.map((transaction) => transaction.stockId)),
  ];
  const getPortfolioTone = (stockId: number) =>
    quickImportTones[
      Math.max(0, portfolioStockIds.indexOf(stockId)) % quickImportTones.length
    ];
  const selectedJournalPeriod = journalPeriods.find(
    (period) => period.value === journalPeriod,
  )!;
  const journalStartDate = (() => {
    if (journalPeriod === "custom") return customStartDate || null;
    if (!selectedJournalPeriod.days) return null;
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - selectedJournalPeriod.days + 1);
    return date.toISOString().slice(0, 10);
  })();
  const journalTransactions = [...effectiveTransactions]
    .reverse()
    .filter(
      (transaction) =>
        (holdingFilter === null || transaction.stockId === holdingFilter) &&
        (!journalStartDate || transaction.tradedOn >= journalStartDate) &&
        (journalPeriod !== "custom" ||
          !customEndDate ||
          transaction.tradedOn <= customEndDate),
    );
  const displayedJournalTransactions = journalTransactions.slice(
    0,
    visibleTransactionCount,
  );
  useEffect(() => {
    setVisibleTransactionCount(10);
  }, [holdingFilter, journalPeriod, customStartDate, customEndDate]);
  useEffect(() => {
    setStockQuery("");
    setSelectedStock(null);
  }, [transactionCount]);
  const actionError =
    actionData && "error" in actionData ? actionData.error : null;
  const actionSuccess =
    actionData && "success" in actionData ? actionData.success : null;
  const portfolioChanged =
    actionData && "portfolioChanged" in actionData
      ? actionData.portfolioChanged
      : false;
  const actionOperation =
    actionData && "operation" in actionData ? actionData.operation : null;
  useEffect(() => {
    if (!actionSuccess) return;
    setEditingTransactionId(null);
    setDismissedPortfolioPrompt(false);
    if (actionOperation === "import") setQuickImportCompleted(true);
    if (
      actionOperation === "batch-update" ||
      actionOperation === "delete-all-transactions"
    )
      setPendingTransactionUpdates({});
  }, [actionData]);
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
  const stageTransactionUpdate = (
    event: FormEvent<HTMLFormElement>,
    transactionId: number,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = pendingTransactionUpdateSchema.safeParse({
      id: transactionId,
      type: formData.get("type"),
      tradedOn: formData.get("tradedOn"),
      quantity: formData.get("quantity"),
      unitPrice: formData.get("unitPrice"),
      memo: formData.get("memo") ?? "",
    });
    if (!parsed.success) return;
    setPendingTransactionUpdates((updates) => ({
      ...updates,
      [transactionId]: parsed.data,
    }));
    setEditingTransactionId(null);
    setDismissedPortfolioPrompt(false);
  };

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

        {actionError && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-600 dark:text-red-400">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {actionError}
          </div>
        )}

        {((actionSuccess && portfolioChanged) || hasUnappliedChanges) &&
          !dismissedPortfolioPrompt && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2Icon className="size-5" />
                </span>
                <div>
                  <p className="font-black">
                    {actionSuccess ?? "매매일지 변경사항이 저장되어 있어요."}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    보유 현황은 다시 계산됐지만 대시보드의 정밀 분석에는 아직
                    반영되지 않았어요. 모든 변경을 마쳤다면 분석을 업데이트해
                    주세요.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setDismissedPortfolioPrompt(true)}
                >
                  나중에
                </Button>
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/dashboard/precise-analysis">
                    {isActive ? "분석 업데이트하기" : "정밀 분석 시작하기"}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

        {quickDraftHoldings.length > 0 && !quickImportCompleted && (
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
                        <DatePicker
                          id={`import-date-${row.rowId}`}
                          value={row.tradedOn}
                          max={loaderData.today}
                          onChange={(value) =>
                            updateQuickImportRow(row.rowId, "tradedOn", value)
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
            <Form
              key={`transaction-form-${transactionCount}`}
              method="post"
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
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
                <DatePicker
                  id="tradedOn"
                  name="tradedOn"
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
                {holdings.map((holding) => {
                  const tone = getPortfolioTone(holding.stockId);
                  return (
                    <div
                      key={holding.stockId}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-2xl border p-4",
                        tone.card,
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              tone.dot,
                            )}
                          />
                          <p className="truncate font-black">{holding.name}</p>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {holding.ticker} ·{" "}
                          {holding.quantity.toLocaleString("ko-KR")}주
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-black">
                            {formatWon(holding.costKrw)}
                          </p>
                          <p className="text-muted-foreground mt-1 text-[11px]">
                            원화 매입원금
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          aria-label={`${holding.name} 보유 현황 수정`}
                          title="이 종목의 매매일지 수정"
                          onClick={() => {
                            setHoldingFilter(holding.stockId);
                            setEditingTransactionId(null);
                            window.requestAnimationFrame(() =>
                              journalRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              }),
                            );
                          }}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
                매수 기록을 추가하면 보유 현황이 계산돼요.
              </div>
            )}
          </div>
        </section>

        <section
          ref={journalRef}
          className="bg-card mt-5 scroll-mt-6 rounded-3xl border p-5 shadow-sm md:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="size-5 text-violet-500" />
              <div>
                <h2 className="text-xl font-black">매매일지</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  최근 매매 기록을 10건씩 보여드려요.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Boolean(managed?.transactions.length) && (
                <DestructiveConfirmDialog
                  title="매매일지를 전부 삭제할까요?"
                  description="등록한 모든 매수·매도 기록과 수정 대기 내용이 삭제됩니다. 기존 분석 기록은 보관되지만, 매매일지는 복구할 수 없어요."
                  confirmLabel="매매일지 전체 삭제"
                  fields={{ intent: "delete-all-transactions" }}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-500/25 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2Icon className="size-3.5" /> 전체 삭제
                    </Button>
                  }
                />
              )}
              {holdingFilter !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setHoldingFilter(null);
                    setEditingTransactionId(null);
                  }}
                >
                  전체 종목 보기 <XIcon className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          {holdingFilter !== null && (
            <p className="mt-2 text-sm font-bold text-emerald-500">
              {
                holdings.find((holding) => holding.stockId === holdingFilter)
                  ?.name
              }
              의 거래만 보고 있어요. 수정하면 보유 현황이 자동으로 다시
              계산돼요.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 text-xs font-bold">
              조회 기간
            </span>
            {journalPeriods.map((period) => (
              <Button
                key={period.value}
                type="button"
                size="sm"
                variant={journalPeriod === period.value ? "default" : "ghost"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  setJournalPeriod(period.value);
                  setEditingTransactionId(null);
                }}
              >
                {period.label}
              </Button>
            ))}
            <span className="text-muted-foreground ml-auto text-xs">
              {journalTransactions.length}건
            </span>
          </div>
          {journalPeriod === "custom" && (
            <div className="bg-muted/20 mt-3 grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="journal-start-date">시작일</Label>
                <DatePicker
                  id="journal-start-date"
                  value={customStartDate}
                  max={customEndDate || today}
                  onChange={setCustomStartDate}
                />
              </div>
              <span className="text-muted-foreground hidden pb-2 text-sm sm:block">
                부터
              </span>
              <div className="space-y-2">
                <Label htmlFor="journal-end-date">종료일</Label>
                <DatePicker
                  id="journal-end-date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  max={today}
                  onChange={setCustomEndDate}
                />
              </div>
            </div>
          )}
          {pendingUpdateCount > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm leading-6">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-black text-amber-700 dark:text-amber-300">
                  매매일지 {pendingUpdateCount}건을 수정하고 있어요
                </p>
                <p className="text-muted-foreground mt-1">
                  아직 DB와 분석에는 반영되지 않았어요. 모든 수정을 마친 뒤
                  <strong className="text-foreground mx-1">수정 확인</strong>을
                  눌러 한 번에 저장해 주세요.
                </p>
              </div>
            </div>
          )}
          {managed?.transactions.length ? (
            journalTransactions.length ? (
              <>
                <div className="mt-4 overflow-x-auto">
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
                      {displayedJournalTransactions.map((transaction) => {
                        const tone = getPortfolioTone(transaction.stockId);
                        const wasEdited =
                          new Date(transaction.updatedAt).getTime() >
                            new Date(transaction.createdAt).getTime() &&
                          (!lastManagedAnalysisAt ||
                            new Date(transaction.updatedAt).getTime() >
                              new Date(lastManagedAnalysisAt).getTime());
                        return editingTransactionId === transaction.id ? (
                          <tr
                            key={transaction.id}
                            className={cn("border-b last:border-0", tone.card)}
                          >
                            <td colSpan={8} className="p-3">
                              <Form
                                className="grid gap-3 md:grid-cols-6"
                                onSubmit={(event) =>
                                  stageTransactionUpdate(event, transaction.id)
                                }
                              >
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor={`edit-date-${transaction.id}`}
                                  >
                                    날짜
                                  </Label>
                                  <DatePicker
                                    id={`edit-date-${transaction.id}`}
                                    name="tradedOn"
                                    defaultValue={transaction.tradedOn}
                                    max={today}
                                    required
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor={`edit-type-${transaction.id}`}
                                  >
                                    구분
                                  </Label>
                                  <Select
                                    name="type"
                                    defaultValue={transaction.type}
                                  >
                                    <SelectTrigger
                                      id={`edit-type-${transaction.id}`}
                                      className="w-full"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="BUY">매수</SelectItem>
                                      <SelectItem value="SELL">매도</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor={`edit-quantity-${transaction.id}`}
                                  >
                                    수량
                                  </Label>
                                  <Input
                                    id={`edit-quantity-${transaction.id}`}
                                    name="quantity"
                                    type="number"
                                    min="0.000001"
                                    step="any"
                                    defaultValue={transaction.quantity}
                                    required
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor={`edit-price-${transaction.id}`}
                                  >
                                    체결가
                                  </Label>
                                  <Input
                                    id={`edit-price-${transaction.id}`}
                                    name="unitPrice"
                                    type="number"
                                    min="0.000001"
                                    step="any"
                                    defaultValue={transaction.unitPrice}
                                    required
                                  />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                  <Label
                                    htmlFor={`edit-memo-${transaction.id}`}
                                  >
                                    메모
                                  </Label>
                                  <Input
                                    id={`edit-memo-${transaction.id}`}
                                    name="memo"
                                    maxLength={300}
                                    defaultValue={transaction.memo ?? ""}
                                  />
                                </div>
                                <div className="flex justify-end gap-2 md:col-span-6">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                      setEditingTransactionId(null)
                                    }
                                  >
                                    취소
                                  </Button>
                                  <Button type="submit">수정 보관</Button>
                                </div>
                              </Form>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={transaction.id}
                            className={cn("border-b last:border-0", tone.card)}
                          >
                            <td className="px-3 py-3">
                              {transaction.tradedOn}
                            </td>
                            <td className="px-3 py-3 font-bold">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black",
                                  tone.badge,
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    tone.dot,
                                  )}
                                />
                                {transaction.stockName}
                              </span>
                              {pendingTransactionUpdates[transaction.id] ? (
                                <span className="bg-foreground text-background ml-1.5 inline-flex rounded-full border border-transparent px-2 py-1 text-[10px] font-black shadow-sm">
                                  수정 대기
                                </span>
                              ) : wasEdited ? (
                                <span className="border-border/80 bg-background/80 text-muted-foreground ml-1.5 inline-flex rounded-full border border-dashed px-2 py-1 text-[10px] font-black shadow-sm">
                                  수정됨
                                </span>
                              ) : null}
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
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`${transaction.stockName} 거래 수정`}
                                  onClick={() =>
                                    setEditingTransactionId(transaction.id)
                                  }
                                >
                                  <PencilIcon />
                                </Button>
                                {pendingTransactionUpdates[transaction.id] && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                                    aria-label={`${transaction.stockName} 수정 대기 취소`}
                                    onClick={() =>
                                      setPendingTransactionUpdates(
                                        (updates) => {
                                          const next = { ...updates };
                                          delete next[transaction.id];
                                          return next;
                                        },
                                      )
                                    }
                                  >
                                    <XIcon />
                                  </Button>
                                )}
                                <DestructiveConfirmDialog
                                  title={`${transaction.stockName} 거래를 삭제할까요?`}
                                  description={`${transaction.tradedOn}에 기록한 ${transaction.stockName} ${transaction.type === "BUY" ? "매수" : "매도"} 내역을 삭제합니다. 삭제한 거래는 복구할 수 없어요.`}
                                  confirmLabel="거래 삭제"
                                  fields={{
                                    intent: "delete-transaction",
                                    transactionId: transaction.id,
                                  }}
                                  trigger={
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      aria-label={`${transaction.stockName} 거래 삭제`}
                                    >
                                      <Trash2Icon />
                                    </Button>
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(displayedJournalTransactions.length <
                  journalTransactions.length ||
                  pendingUpdateCount > 0 ||
                  (actionSuccess && portfolioChanged) ||
                  hasUnappliedChanges) && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {displayedJournalTransactions.length <
                      journalTransactions.length && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-5"
                        onClick={() => {
                          setVisibleTransactionCount((count) =>
                            Math.min(count + 10, journalTransactions.length),
                          );
                          setEditingTransactionId(null);
                        }}
                      >
                        10건 더 보기
                        <ChevronDownIcon className="size-3.5" />
                      </Button>
                    )}
                    {pendingUpdateCount > 0 ? (
                      <Form method="post">
                        <input
                          type="hidden"
                          name="intent"
                          value="apply-transaction-updates"
                        />
                        <input
                          type="hidden"
                          name="transactionUpdates"
                          value={JSON.stringify(
                            Object.values(pendingTransactionUpdates),
                          )}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="rounded-full px-5"
                        >
                          <CheckCircle2Icon className="size-3.5" />
                          {pendingUpdateCount}건 수정 확인
                        </Button>
                      </Form>
                    ) : (actionSuccess && portfolioChanged) ||
                      hasUnappliedChanges ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-full border-amber-500/35 bg-amber-500/[0.07] px-4 text-amber-600 hover:bg-amber-500/15 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400"
                      >
                        <Link to="/dashboard/precise-analysis">
                          <RefreshCwIcon className="size-3.5" />
                          분석에 변경사항 반영하기
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground mt-5 rounded-2xl border border-dashed p-8 text-center text-sm">
                선택한 기간에 해당하는 매매 기록이 없어요.
              </p>
            )
          ) : (
            <p className="text-muted-foreground mt-5 rounded-2xl border border-dashed p-8 text-center text-sm">
              아직 작성한 매매일지가 없어요.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
