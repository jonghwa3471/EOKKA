import type { Route } from "./+types/analyze";

import { data } from "react-router";
import { z } from "zod";

import {
  checkRateLimit,
  consumeManualAnalysisLimit,
  manualAnalysisLimitResponse,
  rateLimitResponse,
} from "~/core/lib/rate-limit.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";

import { generateAiStrategy } from "../ai-strategy.server";
import { type AnalysisInput, analyzePortfolio } from "../analysis.server";
import {
  FreeGoalConflictError,
  ProGoalLimitError,
  assertFreeAccountGoal,
  saveDailyAnalysisSnapshot,
} from "../history/analysis-history.server";
import { getManagedPortfolio } from "../portfolio/portfolio.server";

const MAX_REQUEST_SIZE = 10_000;
const inputSchema = z
  .object({
    goalAmount: z.number().int().min(100_000_000).max(100_000_000_000),
    monthlyContribution: z.number().int().min(0).max(1_000_000_000).default(0),
    investmentPeriodMonths: z.number().int().min(1).max(1_200).nullable(),
    replaceExistingGoal: z.boolean().optional().default(false),
    holdings: z
      .array(
        z
          .object({
            stockId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
            averagePrice: z.number().finite().positive().max(10_000_000_000),
            quantity: z.number().finite().positive().max(1_000_000_000),
            currency: z.enum(["KRW", "USD"]),
            costKrw: z
              .number()
              .finite()
              .positive()
              .max(10_000_000_000_000)
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST")
    return data({ error: "허용되지 않은 요청 방식입니다." }, { status: 405 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return data({ error: "JSON 요청만 허용됩니다." }, { status: 415 });

  const rateLimit = checkRateLimit(request, {
    key: "stocks:analyze",
    limit: 3,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_SIZE)
      return data({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });

    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_SIZE)
      return data({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });

    const parsed: unknown = JSON.parse(rawBody);
    const validation = inputSchema.safeParse(parsed);
    if (!validation.success)
      return data(
        { error: "입력한 주식 정보를 다시 확인해 주세요." },
        { status: 400 },
      );

    const { replaceExistingGoal, ...input } = validation.data satisfies z.infer<
      typeof inputSchema
    >;
    const [client] = makeServerClient(request);
    const {
      data: { user },
    } = await client.auth.getUser();
    const managed = user ? await getManagedPortfolio(user.id) : null;
    const isPro = user
      ? (await getAutomaticAnalysisSettings(user.id)).isPro
      : false;
    const holdingLimit = isPro ? 20 : 10;
    if (input.holdings.length > holdingLimit)
      return data(
        {
          error: `${isPro ? "EOKKA Pro" : "무료 분석"}에서는 최대 ${holdingLimit}개 종목까지 분석할 수 있어요.`,
        },
        { status: 400 },
      );
    if (user && isPro && managed?.portfolio.status !== "active") {
      try {
        await assertFreeAccountGoal({
          userId: user.id,
          goalAmount: input.goalAmount,
          replaceExistingGoal,
        });
      } catch (error) {
        if (
          error instanceof FreeGoalConflictError ||
          error instanceof ProGoalLimitError
        )
          return data(
            {
              error: error.message,
              code: error.code,
              currentGoalAmount:
                error instanceof FreeGoalConflictError
                  ? error.currentGoalAmount
                  : undefined,
            },
            { status: 409 },
          );
        throw error;
      }
    }

    const durableLimit = await consumeManualAnalysisLimit(
      request,
      user?.id ?? null,
    );
    if (!durableLimit.allowed) return manualAnalysisLimitResponse(durableLimit);

    const result = await analyzePortfolio(input);
    let aiStrategy = null;
    try {
      aiStrategy = await generateAiStrategy(result);
    } catch (error) {
      console.error("AI strategy generation failed", error);
    }
    const completeResult = { ...result, aiStrategy };

    // Anonymous and free analyses remain ephemeral. Pro users get one snapshot
    // for each goal and closing-price date combination.
    try {
      if (user && isPro) {
        if (managed?.portfolio.status !== "active") {
          await saveDailyAnalysisSnapshot({
            userId: user.id,
            result: completeResult,
            replaceOtherGoals: replaceExistingGoal,
          });
        }
      }
    } catch (snapshotError) {
      // A storage problem must not discard an otherwise valid analysis.
      console.error("Analysis snapshot save failed", snapshotError);
    }

    return data(
      { ...completeResult, historySaved: isPro },
      {
        headers: {
          "X-RateLimit-Limit": String(durableLimit.limit),
          "X-RateLimit-Remaining": String(durableLimit.remaining),
          ...(durableLimit.setCookie
            ? { "Set-Cookie": durableLimit.setCookie }
            : {}),
        },
      },
    );
  } catch (error) {
    console.error("Stock analysis failed", error);
    return data(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "분석 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
