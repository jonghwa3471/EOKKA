import { and, asc, eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { stocks } from "~/features/stocks/schema";

import { managedPortfolios, portfolioTransactions } from "./schema";

async function markManagedPortfolioChanged(userId: string) {
  await db
    .update(managedPortfolios)
    .set({ updated_at: new Date() })
    .where(eq(managedPortfolios.user_id, userId));
}

export function investmentMonthsSince(
  firstBoughtOn: string,
  analyzedOn: string,
) {
  const [startYear, startMonth, startDay] = firstBoughtOn
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = analyzedOn.split("-").map(Number);
  const fullMonths =
    (endYear - startYear) * 12 +
    (endMonth - startMonth) -
    (endDay < startDay ? 1 : 0);
  return Math.max(1, fullMonths);
}

export async function getManagedPortfolio(userId: string) {
  const [portfolio] = await db
    .select()
    .from(managedPortfolios)
    .where(eq(managedPortfolios.user_id, userId))
    .limit(1);
  if (!portfolio) return null;

  const transactions = await db
    .select({
      id: portfolioTransactions.portfolio_transaction_id,
      stockId: portfolioTransactions.stock_id,
      stockName: stocks.name,
      ticker: stocks.ticker,
      country: stocks.country,
      type: portfolioTransactions.transaction_type,
      tradedOn: portfolioTransactions.traded_on,
      quantity: portfolioTransactions.quantity,
      unitPrice: portfolioTransactions.unit_price,
      currency: portfolioTransactions.currency,
      exchangeRate: portfolioTransactions.exchange_rate,
      memo: portfolioTransactions.memo,
      createdAt: portfolioTransactions.created_at,
      updatedAt: portfolioTransactions.updated_at,
    })
    .from(portfolioTransactions)
    .innerJoin(stocks, eq(portfolioTransactions.stock_id, stocks.stock_id))
    .where(
      and(
        eq(
          portfolioTransactions.managed_portfolio_id,
          portfolio.managed_portfolio_id,
        ),
        eq(portfolioTransactions.user_id, userId),
      ),
    )
    .orderBy(
      asc(portfolioTransactions.traded_on),
      asc(portfolioTransactions.portfolio_transaction_id),
    );

  return { portfolio, transactions };
}

export async function isManagedPortfolioActive(userId: string) {
  const [portfolio] = await db
    .select({ status: managedPortfolios.status })
    .from(managedPortfolios)
    .where(eq(managedPortfolios.user_id, userId))
    .limit(1);
  return portfolio?.status === "active";
}

export async function ensureManagedPortfolio(userId: string) {
  const existing = await getManagedPortfolio(userId);
  if (existing) return existing.portfolio;
  const [created] = await db
    .insert(managedPortfolios)
    .values({ user_id: userId })
    .returning();
  return created;
}

export async function addPortfolioTransaction({
  userId,
  stockId,
  type,
  tradedOn,
  quantity,
  unitPrice,
  currency,
  exchangeRate,
  memo,
}: {
  userId: string;
  stockId: number;
  type: "BUY" | "SELL";
  tradedOn: string;
  quantity: number;
  unitPrice: number;
  currency: "KRW" | "USD";
  exchangeRate: number;
  memo: string | null;
}) {
  const portfolio = await ensureManagedPortfolio(userId);
  await db.insert(portfolioTransactions).values({
    managed_portfolio_id: portfolio.managed_portfolio_id,
    user_id: userId,
    stock_id: stockId,
    transaction_type: type,
    traded_on: tradedOn,
    quantity,
    unit_price: unitPrice,
    currency,
    exchange_rate: currency === "USD" ? exchangeRate : 1,
    memo,
  });
  await markManagedPortfolioChanged(userId);
}

export async function addPortfolioTransactions(
  userId: string,
  transactions: Array<{
    stockId: number;
    tradedOn: string;
    quantity: number;
    unitPrice: number;
    currency: "KRW" | "USD";
    exchangeRate: number;
  }>,
) {
  const portfolio = await ensureManagedPortfolio(userId);
  await db.insert(portfolioTransactions).values(
    transactions.map((transaction) => ({
      managed_portfolio_id: portfolio.managed_portfolio_id,
      user_id: userId,
      stock_id: transaction.stockId,
      transaction_type: "BUY",
      traded_on: transaction.tradedOn,
      quantity: transaction.quantity,
      unit_price: transaction.unitPrice,
      currency: transaction.currency,
      exchange_rate:
        transaction.currency === "USD" ? transaction.exchangeRate : 1,
      memo: "빠른 분석에서 가져온 평균 매수가",
    })),
  );
  await markManagedPortfolioChanged(userId);
}

export async function deletePortfolioTransaction(userId: string, id: number) {
  await db
    .delete(portfolioTransactions)
    .where(
      and(
        eq(portfolioTransactions.portfolio_transaction_id, id),
        eq(portfolioTransactions.user_id, userId),
      ),
    );
  await markManagedPortfolioChanged(userId);
}

export async function deleteAllPortfolioTransactions(userId: string) {
  await db
    .delete(portfolioTransactions)
    .where(eq(portfolioTransactions.user_id, userId));
  await markManagedPortfolioChanged(userId);
}

export async function updatePortfolioTransactions(
  userId: string,
  updates: Array<{
    id: number;
    type: "BUY" | "SELL";
    tradedOn: string;
    quantity: number;
    unitPrice: number;
    exchangeRate: number;
    memo: string | null;
  }>,
) {
  if (updates.length === 0) return;

  await db.transaction(async (transaction) => {
    for (const update of updates) {
      const [updated] = await transaction
        .update(portfolioTransactions)
        .set({
          transaction_type: update.type,
          traded_on: update.tradedOn,
          quantity: update.quantity,
          unit_price: update.unitPrice,
          exchange_rate: update.exchangeRate,
          memo: update.memo,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(portfolioTransactions.portfolio_transaction_id, update.id),
            eq(portfolioTransactions.user_id, userId),
          ),
        )
        .returning({ id: portfolioTransactions.portfolio_transaction_id });

      if (!updated) throw new Error("수정할 거래를 찾지 못했어요.");
    }

    await transaction
      .update(managedPortfolios)
      .set({ updated_at: new Date() })
      .where(eq(managedPortfolios.user_id, userId));
  });
}

export function calculateManagedHoldings(
  transactions: NonNullable<
    Awaited<ReturnType<typeof getManagedPortfolio>>
  >["transactions"],
) {
  const positions = new Map<
    number,
    {
      stockId: number;
      name: string;
      ticker: string;
      currency: "KRW" | "USD";
      quantity: number;
      costKrw: number;
      costInCurrency: number;
    }
  >();

  for (const transaction of transactions) {
    const currency = transaction.currency === "USD" ? "USD" : "KRW";
    const position = positions.get(transaction.stockId) ?? {
      stockId: transaction.stockId,
      name: transaction.stockName,
      ticker: transaction.ticker,
      currency,
      quantity: 0,
      costKrw: 0,
      costInCurrency: 0,
    };

    if (transaction.type === "BUY") {
      const tradeCost = transaction.unitPrice * transaction.quantity;
      position.quantity += transaction.quantity;
      position.costInCurrency += tradeCost;
      position.costKrw += tradeCost * transaction.exchangeRate;
    } else {
      if (transaction.quantity > position.quantity + 1e-8)
        throw new Error(
          `${transaction.stockName}의 매도 수량이 보유 수량보다 많아요.`,
        );
      const ratio = position.quantity
        ? transaction.quantity / position.quantity
        : 0;
      position.costInCurrency *= 1 - ratio;
      position.costKrw *= 1 - ratio;
      position.quantity -= transaction.quantity;
    }

    positions.set(transaction.stockId, position);
  }

  return [...positions.values()]
    .filter((position) => position.quantity > 1e-8)
    .map((position) => ({
      ...position,
      averagePrice: position.costInCurrency / position.quantity,
    }));
}
