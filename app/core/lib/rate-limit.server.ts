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
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedFor?.split(",")[0]?.trim() ||
    "unknown"
  );
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
