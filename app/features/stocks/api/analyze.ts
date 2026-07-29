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
      .max(5),
  })
  .strict();

export async function action({ request }: Route.ActionArgs) {
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
    return data(
      {
        error: error instanceof Error ? error.message : "분석에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
