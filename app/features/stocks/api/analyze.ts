import type { Route } from "./+types/analyze";

import { data } from "react-router";
import { z } from "zod";

import {
  checkRateLimit,
  rateLimitResponse,
} from "~/core/lib/rate-limit.server";

import { type AnalysisInput, analyzePortfolio } from "../analysis.server";

const MAX_REQUEST_SIZE = 10_000;
const inputSchema = z
  .object({
    goalAmount: z.number().int().min(100_000_000).max(100_000_000_000),
    holdings: z
      .array(
        z
          .object({
            stockId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
            averagePrice: z.number().finite().positive().max(10_000_000_000),
            quantity: z.number().finite().positive().max(1_000_000_000),
            currency: z.enum(["KRW", "USD"]),
          })
          .strict(),
      )
      .min(1)
      .max(10),
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

    const input: AnalysisInput = validation.data;
    return data(await analyzePortfolio(input));
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
