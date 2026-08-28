import { desc, inArray } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
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
      result: analysisSnapshots.result,
    })
    .from(analysisSnapshots)
    .orderBy(
      desc(analysisSnapshots.saved_on),
      desc(analysisSnapshots.analysis_snapshot_id),
    );

  const latestConfigurations = new Map<string, (typeof snapshots)[number]>();
  for (const snapshot of snapshots) {
    const key = latestConfigurationKey(snapshot.userId, snapshot.goalAmount);
    if (!latestConfigurations.has(key)) latestConfigurations.set(key, snapshot);
  }

  const profileRows = await db
    .select({
      userId: profiles.profile_id,
      preferredGoalAmount: profiles.preferred_goal_amount,
    })
    .from(profiles);
  const preferredGoalByUser = new Map(
    profileRows.map((profile) => [profile.userId, profile.preferredGoalAmount]),
  );
  const configurationsByUser = new Map<string, (typeof snapshots)[number][]>();
  for (const configuration of latestConfigurations.values()) {
    const configurations = configurationsByUser.get(configuration.userId);
    if (configurations) configurations.push(configuration);
    else configurationsByUser.set(configuration.userId, [configuration]);
  }

  const candidates = [...configurationsByUser.entries()].flatMap(
    ([userId, configurations]) => {
      const sortedConfigurations = configurations.sort(
        (a, b) => a.goalAmount - b.goalAmount,
      );
      const savedPreferredGoal = preferredGoalByUser.get(userId);
      const selectedGoal =
        savedPreferredGoal != null &&
        sortedConfigurations.some(
          (configuration) => configuration.goalAmount === savedPreferredGoal,
        )
          ? savedPreferredGoal
          : (sortedConfigurations.find(
              (configuration) => configuration.goalAmount === 100_000_000,
            )?.goalAmount ?? sortedConfigurations[0]?.goalAmount);
      const selectedConfiguration = sortedConfigurations.find(
        (configuration) => configuration.goalAmount === selectedGoal,
      );

      return selectedConfiguration ? [selectedConfiguration] : [];
    },
  );
  const tickers = [
    ...new Set(
      candidates.flatMap((snapshot) =>
        snapshot.result.holdings.map((holding) => holding.ticker),
      ),
    ),
  ];
  const stockRows =
    tickers.length > 0
      ? await db.select().from(stocks).where(inArray(stocks.ticker, tickers))
      : [];
  const today = seoulDate();
  const stats: AutomaticAnalysisStats = {
    candidates: candidates.length,
    analyzed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const snapshot of candidates) {
    // A manual analysis already saved today contains the freshest inputs and AI
    // response, so the automatic job must not replace it.
    if (snapshot.savedOn === today) {
      stats.skipped += 1;
      continue;
    }

    try {
      const holdings: AnalysisInput["holdings"] = snapshot.result.holdings.map(
        (holding) => {
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
          };
        },
      );
      const input: AnalysisInput = {
        goalAmount: snapshot.goalAmount,
        monthlyContribution: snapshot.monthlyContribution,
        investmentPeriodMonths:
          snapshot.result.investmentPeriodMonths === undefined
            ? 12
            : snapshot.result.investmentPeriodMonths,
        holdings,
      };
      const result = await analyzePortfolio(input);
      if (result.asOf === snapshot.result.asOf) {
        stats.skipped += 1;
        continue;
      }

      await saveDailyAnalysisSnapshot({
        userId: snapshot.userId,
        result: { ...result, aiStrategy: null },
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
