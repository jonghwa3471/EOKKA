import { sql } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";

import db from "~/core/db/drizzle-client.server";
import { analysisRateLimits } from "~/features/stocks/history/schema";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalRateLimitState = globalThis as typeof globalThis & {
  __eokkaRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits =
  globalRateLimitState.__eokkaRateLimits ??
  (globalRateLimitState.__eokkaRateLimits = new Map());

function clientIdentifier(request: Request) {
  const trustedHeader = process.env.RATE_LIMIT_IP_HEADER?.toLowerCase();
  const allowedHeaders = new Set([
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
  ]);
  if (!trustedHeader || !allowedHeaders.has(trustedHeader))
    return process.env.NODE_ENV === "production"
      ? "untrusted-client"
      : "local-development";

  const value = request.headers.get(trustedHeader);
  const identifier =
    trustedHeader === "x-forwarded-for"
      ? value?.split(",")[0]?.trim()
      : value?.trim();
  return identifier || "missing-client-ip";
}

function removeExpiredEntries(now: number) {
  if (rateLimits.size < 10_000) return;
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
}

export function checkRateLimit(
  request: Request,
  { key, limit, windowMs }: RateLimitOptions,
) {
  const now = Date.now();
  removeExpiredEntries(now);

  const identifier = `${key}:${clientIdentifier(request)}`;
  const existing = rateLimits.get(identifier);
  if (!existing && rateLimits.size >= 10_000)
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

  entry.count += 1;
  rateLimits.set(identifier, entry);

  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

const ANALYSIS_BROWSER_COOKIE = "eokka_analysis_browser";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function browserCookie(value: string) {
  return `${ANALYSIS_BROWSER_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function seoulDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function secondsUntilNextSeoulDay() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const elapsed =
    Number(value.hour === "24" ? "0" : value.hour) * 3600 +
    Number(value.minute) * 60 +
    Number(value.second);
  return Math.max(1, 24 * 3600 - elapsed);
}

function durableIdentifiers(request: Request, userId: string | null) {
  if (userId)
    return {
      identifiers: [{ raw: `user:${userId}`, limit: 5 }],
      setCookie: null,
    };

  const existingBrowserId = cookieValue(request, ANALYSIS_BROWSER_COOKIE);
  const browserId = existingBrowserId ?? randomUUID();
  const ip = clientIdentifier(request);
  return {
    identifiers: [
      {
        raw: `anonymous-browser:${browserId}:${request.headers.get("user-agent") ?? "unknown"}`,
        limit: 5,
      },
      ...(ip === "untrusted-client" || ip === "local-development"
        ? []
        : [{ raw: `anonymous-ip:${ip}`, limit: 30 }]),
    ],
    setCookie: existingBrowserId ? null : browserCookie(browserId),
  };
}

function rateLimitSecret() {
  const secret =
    process.env.RATE_LIMIT_HASH_SECRET ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SECRET_KEY;
  if (!secret)
    throw new Error("분석 요청 제한을 위한 서버 비밀키가 설정되지 않았습니다.");
  return secret;
}

function identifierHash(raw: string, secret: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function getManualAnalysisLimitStatus(
  request: Request,
  userId: string | null,
) {
  const limit = 5;
  const identity = durableIdentifiers(request, userId);
  const hash = identifierHash(identity.identifiers[0].raw, rateLimitSecret());
  const [entry] = await db
    .select({ count: analysisRateLimits.count })
    .from(analysisRateLimits)
    .where(
      sql`${analysisRateLimits.identifier_hash} = ${hash} and ${analysisRateLimits.window_on} = ${seoulDay()}`,
    )
    .limit(1);
  const used = Math.min(limit, entry?.count ?? 0);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    setCookie: identity.setCookie,
  };
}

export async function consumeManualAnalysisLimit(
  request: Request,
  userId: string | null,
) {
  const limit = 5;
  const identity = durableIdentifiers(request, userId);
  const secret = rateLimitSecret();
  const windowOn = seoulDay();
  const entries = await db.transaction(async (transaction) => {
    const consumed: { count: number; limit: number }[] = [];
    for (const identifier of identity.identifiers) {
      const hash = identifierHash(identifier.raw, secret);
      const [entry] = await transaction
        .insert(analysisRateLimits)
        .values({
          identifier_hash: hash,
          window_on: windowOn,
          count: 1,
        })
        .onConflictDoUpdate({
          target: [
            analysisRateLimits.identifier_hash,
            analysisRateLimits.window_on,
          ],
          set: {
            count: sql`${analysisRateLimits.count} + 1`,
            updated_at: new Date(),
          },
        })
        .returning({ count: analysisRateLimits.count });
      consumed.push({ count: entry.count, limit: identifier.limit });
    }
    return consumed;
  });
  const primaryEntry = entries[0];

  return {
    allowed: entries.every((entry) => entry.count <= entry.limit),
    limit,
    remaining: Math.max(0, limit - primaryEntry.count),
    retryAfter: secondsUntilNextSeoulDay(),
    setCookie: identity.setCookie,
  };
}

export function manualAnalysisLimitResponse(
  result: Awaited<ReturnType<typeof consumeManualAnalysisLimit>>,
) {
  return Response.json(
    {
      error:
        "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요. 자정 이후 다시 이용해 주세요.",
      code: "ANALYSIS_DAILY_LIMIT",
      limit: result.limit,
      remaining: result.remaining,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfter),
        ...(result.setCookie ? { "Set-Cookie": result.setCookie } : {}),
      },
    },
  );
}
