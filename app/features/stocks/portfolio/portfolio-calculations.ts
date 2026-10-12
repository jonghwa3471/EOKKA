/** Minimal trade data required for cost-basis and cash-flow calculations. */
export interface PortfolioTrade {
  stockId: number;
  stockName: string;
  ticker: string;
  currency: string;
  type: string;
  tradedOn: string;
  quantity: number;
  unitPrice: number;
  exchangeRate: number;
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

export function calculateManagedHoldings(transactions: PortfolioTrade[]) {
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

export function managedPortfolioCashFlows(transactions: PortfolioTrade[]) {
  return transactions.map((transaction) => ({
    date: transaction.tradedOn,
    amountKrw:
      transaction.unitPrice *
      transaction.quantity *
      transaction.exchangeRate *
      (transaction.type === "BUY" ? -1 : 1),
  }));
}
