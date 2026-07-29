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
