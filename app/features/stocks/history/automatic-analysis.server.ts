import { desc, inArray } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { generateAiStrategy } from "~/features/stocks/ai-strategy.server";
import {
  calculateManagedHoldings,
  getManagedPortfolio,
  investmentMonthsSince,
} from "~/features/stocks/portfolio/portfolio.server";
import { managedPortfolios } from "~/features/stocks/portfolio/schema";
import { stocks } from "~/features/stocks/schema";
import { profiles } from "~/features/users/schema";

import { type AnalysisInput, analyzePortfolio } from "../analysis.server";
import {
  saveDailyAnalysisSnapshot,
  seoulDate,
} from "./analysis-history.server";
import { analysisSnapshots } from "./schema";

type AutomaticAnalysisStats = {
  candidates: number;
  analyzed: number;
  skipped: number;
  failed: number;
};

const AUTO_ANALYSIS_ACTIVE_DAYS = 30;

function latestConfigurationKey(userId: string, goalAmount: number) {
  return `${userId}:${goalAmount}`;
}

export async function runAutomaticPortfolioAnalysis(): Promise<AutomaticAnalysisStats> {
  const snapshots = await db
    .select({
      id: analysisSnapshots.analysis_snapshot_id,
      userId: analysisSnapshots.user_id,
      savedOn: analysisSnapshots.saved_on,
      goalAmount: analysisSnapshots.goal_amount,
      monthlyContribution: analysisSnapshots.monthly_contribution,
      analysisMode: analysisSnapshots.analysis_mode,
      managedPortfolioId: analysisSnapshots.managed_portfolio_id,
      result: analysisSnapshots.result,
    })
    .from(analysisSnapshots)
    .orderBy(
      desc(analysisSnapshots.saved_on),
      desc(analysisSnapshots.analysis_snapshot_id),
    );

  const portfolioRows = await db
    .select({
      id: managedPortfolios.managed_portfolio_id,
      userId: managedPortfolios.user_id,
      status: managedPortfolios.status,
    })
    .from(managedPortfolios);
  const activePortfolioByUser = new Map(
    portfolioRows
      .filter((portfolio) => portfolio.status === "active")
      .map((portfolio) => [portfolio.userId, portfolio.id]),
  );

  const latestConfigurations = new Map<string, (typeof snapshots)[number]>();
  for (const snapshot of snapshots) {
    const activePortfolioId = activePortfolioByUser.get(snapshot.userId);
    if (
      (activePortfolioId != null &&
        (snapshot.analysisMode !== "managed" ||
          snapshot.managedPortfolioId !== activePortfolioId)) ||
      (activePortfolioId == null && snapshot.analysisMode !== "quick")
    )
      continue;
    const key = latestConfigurationKey(snapshot.userId, snapshot.goalAmount);
    if (!latestConfigurations.has(key)) latestConfigurations.set(key, snapshot);
  }

  const profileRows = await db
    .select({
      userId: profiles.profile_id,
      preferredGoalAmount: profiles.preferred_goal_amount,
      automaticGoalAmount: profiles.automatic_analysis_goal_amount,
      automaticMonthlyContribution:
        profiles.automatic_analysis_monthly_contribution,
      lastActiveOn: profiles.last_active_on,
    })
    .from(profiles);
  const preferredGoalByUser = new Map(
    profileRows.map((profile) => [profile.userId, profile.preferredGoalAmount]),
  );
  const automaticSettingsByUser = new Map(
    profileRows.map((profile) => [
      profile.userId,
      {
        goalAmount: profile.automaticGoalAmount,
        monthlyContribution: profile.automaticMonthlyContribution,
      },
    ]),
  );
  const lastActiveByUser = new Map(
    profileRows.map((profile) => [profile.userId, profile.lastActiveOn]),
  );
  const configurationsByUser = new Map<string, (typeof snapshots)[number][]>();
  for (const configuration of latestConfigurations.values()) {
    const configurations = configurationsByUser.get(configuration.userId);
    if (configurations) configurations.push(configuration);
    else configurationsByUser.set(configuration.userId, [configuration]);
  }

  const candidates = [...configurationsByUser.entries()].flatMap(
    ([userId, configurations]) => {
      const sortedConfigurations = [...configurations].sort(
        (a, b) => a.goalAmount - b.goalAmount,
      );
      const automaticSettings = automaticSettingsByUser.get(userId);
      const savedPreferredGoal = preferredGoalByUser.get(userId);
      const fallbackGoal =
        savedPreferredGoal != null &&
        sortedConfigurations.some(
          (configuration) => configuration.goalAmount === savedPreferredGoal,
        )
          ? savedPreferredGoal
          : (sortedConfigurations.find(
              (configuration) => configuration.goalAmount === 100_000_000,
            )?.goalAmount ?? sortedConfigurations[0]?.goalAmount);
      const selectedGoal = automaticSettings?.goalAmount ?? fallbackGoal;
      const exactConfiguration = sortedConfigurations.find(
        (configuration) => configuration.goalAmount === selectedGoal,
      );
      const latestConfiguration = [...configurations].sort((a, b) => {
        const dateDifference = b.savedOn.localeCompare(a.savedOn);
        return dateDifference !== 0 ? dateDifference : b.id - a.id;
      })[0];
      const selectedConfiguration = exactConfiguration ?? latestConfiguration;

      return selectedConfiguration
        ? [
            {
              snapshot: selectedConfiguration,
              goalAmount: selectedGoal,
              monthlyContribution:
                automaticSettings?.monthlyContribution ??
                selectedConfiguration.monthlyContribution,
            },
          ]
        : [];
    },
  );
  const tickers = [
    ...new Set(
      candidates.flatMap(({ snapshot }) =>
        snapshot.result.holdings.map((holding) => holding.ticker),
      ),
    ),
  ];
  const stockRows =
    tickers.length > 0
      ? await db.select().from(stocks).where(inArray(stocks.ticker, tickers))
      : [];
  const today = seoulDate();
  const activeSince = new Date(`${today}T00:00:00+09:00`);
  activeSince.setDate(activeSince.getDate() - AUTO_ANALYSIS_ACTIVE_DAYS);
  const activeSinceDate = seoulDate(activeSince);
  const stats: AutomaticAnalysisStats = {
    candidates: candidates.length,
    analyzed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    const { snapshot, goalAmount, monthlyContribution } = candidate;
    if ((lastActiveByUser.get(snapshot.userId) ?? "") < activeSinceDate) {
      stats.skipped += 1;
      continue;
    }
    try {
      const managed = await getManagedPortfolio(snapshot.userId);
      const managedHoldings =
        managed?.portfolio.status === "active"
          ? calculateManagedHoldings(managed.transactions)
          : null;
      const managedInvestmentMonths =
        managed?.portfolio.status === "active"
          ? (() => {
              const firstBoughtOn = managed.transactions.find(
                (transaction) => transaction.type === "BUY",
              )?.tradedOn;
              return firstBoughtOn
                ? investmentMonthsSince(firstBoughtOn, today)
                : null;
            })()
          : null;
      const holdings: AnalysisInput["holdings"] = managedHoldings
        ? managedHoldings.map((holding) => ({
            stockId: holding.stockId,
            averagePrice: holding.averagePrice,
            quantity: holding.quantity,
            currency: holding.currency,
            costKrw: holding.costKrw,
          }))
        : snapshot.result.holdings.map((holding) => {
            const stock = stockRows.find(
              (row) =>
                row.ticker === holding.ticker &&
                row.currency === holding.currency,
            );
            const valueRate =
              holding.currency === "USD"
                ? (snapshot.result.exchangeRate ?? 1)
                : 1;
            const quantity =
              holding.valueKrw / (holding.currentPrice * valueRate);
            const averagePrice = holding.costKrw / (quantity * valueRate);

            if (
              !stock ||
              !Number.isFinite(quantity) ||
              quantity <= 0 ||
              !Number.isFinite(averagePrice) ||
              averagePrice <= 0
            )
              throw new Error(
                `포트폴리오 입력값을 복원할 수 없습니다: ${holding.ticker}`,
              );

            return {
              stockId: stock.stock_id,
              averagePrice,
              quantity,
              currency: holding.currency,
              costKrw: holding.costKrw,
            };
          });
      const input: AnalysisInput = {
        goalAmount,
        monthlyContribution,
        investmentPeriodMonths: managedHoldings
          ? managedInvestmentMonths
          : snapshot.result.investmentPeriodMonths === undefined
            ? 12
            : snapshot.result.investmentPeriodMonths,
        holdings,
      };
      const result = await analyzePortfolio(input);
      if (result.asOf === snapshot.result.asOf) {
        stats.skipped += 1;
        continue;
      }

      let aiStrategy = null;
      try {
        aiStrategy = await generateAiStrategy(result);
      } catch (error) {
        console.error(
          `Automatic AI strategy generation failed for snapshot ${snapshot.id}`,
          error,
        );
      }

      await saveDailyAnalysisSnapshot({
        userId: snapshot.userId,
        result: { ...result, aiStrategy },
        analysisMode: snapshot.analysisMode as "quick" | "managed",
        managedPortfolioId: snapshot.managedPortfolioId,
        updateSource: "automatic",
      });
      stats.analyzed += 1;
    } catch (error) {
      stats.failed += 1;
      console.error(
        `Automatic portfolio analysis failed for snapshot ${snapshot.id}`,
        error,
      );
    }
  }

  return stats;
}
