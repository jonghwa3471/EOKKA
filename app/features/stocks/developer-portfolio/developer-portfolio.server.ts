import { desc } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { isLocalDevelopmentEnvironment } from "~/core/lib/app-environment.server";
import { generateAiStrategy } from "~/features/stocks/ai-strategy.server";
import { analyzePortfolio } from "~/features/stocks/analysis.server";
import type { AnalysisResult } from "~/features/stocks/analysis.types";
import {
  getAnalysisHistory,
  seoulDate,
} from "~/features/stocks/history/analysis-history.server";
import {
  calculateManagedHoldings,
  getManagedPortfolio,
  investmentMonthsSince,
  managedPortfolioCashFlows,
} from "~/features/stocks/portfolio/portfolio.server";

import {
  type PublicDeveloperPortfolioSnapshot,
  publicDeveloperPortfolioSnapshotSchema,
  toPublicDeveloperPortfolioSnapshot,
} from "./developer-portfolio.types";
import { developerPortfolioSnapshots } from "./schema";

export async function getLatestDeveloperPortfolioSnapshot() {
  const [row] = await db
    .select()
    .from(developerPortfolioSnapshots)
    .orderBy(
      desc(developerPortfolioSnapshots.as_of),
      desc(developerPortfolioSnapshots.published_at),
    )
    .limit(1);
  return row ?? null;
}

async function getDeveloperAnalysisInput(userId: string) {
  const [managed, history] = await Promise.all([
    getManagedPortfolio(userId),
    getAnalysisHistory(userId),
  ]);
  if (!managed)
    throw new Error("먼저 내 포트폴리오에 매매일지를 등록해 주세요.");

  const holdings = calculateManagedHoldings(managed.transactions);
  if (!holdings.length)
    throw new Error("현재 보유 중인 종목이 없어 공개할 수 없어요.");
  const firstBoughtOn = managed.transactions.find(
    (transaction) => transaction.type === "BUY",
  )?.tradedOn;
  if (!firstBoughtOn) throw new Error("투자 기간을 계산할 매수 기록이 없어요.");

  const managedHistory = history.filter(
    (record) =>
      record.analysisMode === "managed" &&
      record.managedPortfolioId === managed.portfolio.managed_portfolio_id,
  );
  const latestOneHundredMillion = managedHistory
    .filter((record) => record.goalAmount === 100_000_000)
    .at(-1);

  return {
    // The public developer portfolio is always an isolated 100 million won
    // analysis. Publishing it never changes the user's preferred goal/history.
    goalAmount: 100_000_000,
    monthlyContribution: latestOneHundredMillion?.monthlyContribution ?? 0,
    investmentPeriodMonths: investmentMonthsSince(firstBoughtOn, seoulDate()),
    cashFlows: managedPortfolioCashFlows(managed.transactions),
    holdings: holdings.map((holding) => ({
      stockId: holding.stockId,
      averagePrice: holding.averagePrice,
      quantity: holding.quantity,
      currency: holding.currency,
      costKrw: holding.costKrw,
    })),
  };
}

export async function analyzeDeveloperPortfolio(
  userId: string,
  includeAi: boolean,
): Promise<AnalysisResult> {
  const result = await analyzePortfolio(
    await getDeveloperAnalysisInput(userId),
  );
  if (!includeAi) return result;

  try {
    return { ...result, aiStrategy: await generateAiStrategy(result) };
  } catch (error) {
    console.error("Developer portfolio AI strategy generation failed", error);
    return { ...result, aiStrategy: null };
  }
}

export async function publishDeveloperPortfolio(
  userId: string,
  result: AnalysisResult,
) {
  const publishedAt = new Date();
  const snapshot = toPublicDeveloperPortfolioSnapshot(result, publishedAt);
  if (isLocalDevelopmentEnvironment()) {
    await publishDeveloperPortfolioToProduction(snapshot);
    return storeDeveloperPortfolioSnapshot(snapshot, userId);
  }
  return storeDeveloperPortfolioSnapshot(snapshot, userId);
}

export async function storeDeveloperPortfolioSnapshot(
  snapshot: PublicDeveloperPortfolioSnapshot,
  publishedBy: string | null,
) {
  const validatedSnapshot =
    publicDeveloperPortfolioSnapshotSchema.parse(snapshot);
  const publishedAt = new Date(validatedSnapshot.publishedAt);
  const [row] = await db
    .insert(developerPortfolioSnapshots)
    .values({
      as_of: validatedSnapshot.asOf,
      snapshot: validatedSnapshot,
      published_by: publishedBy,
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .onConflictDoUpdate({
      target: developerPortfolioSnapshots.as_of,
      set: {
        snapshot: validatedSnapshot,
        published_by: publishedBy,
        published_at: publishedAt,
        updated_at: publishedAt,
      },
    })
    .returning();
  return row;
}

async function publishDeveloperPortfolioToProduction(
  snapshot: PublicDeveloperPortfolioSnapshot,
) {
  const secret = process.env.DEVELOPER_PORTFOLIO_PUBLISH_SECRET?.trim();
  if (!secret)
    throw new Error(
      "DEVELOPER_PORTFOLIO_PUBLISH_SECRET을 로컬 환경에 설정해 주세요.",
    );
  const endpoint =
    process.env.DEVELOPER_PORTFOLIO_PUBLISH_URL?.trim() ||
    "https://eokka.qualius.co/api/admin/developer-portfolio";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshot),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `운영 포트폴리오 공개에 실패했어요 (${response.status})${message ? `: ${message}` : ""}`,
    );
  }
}

export function isLocalDeveloperPortfolioPublishingEnabled() {
  return isLocalDevelopmentEnvironment();
}
