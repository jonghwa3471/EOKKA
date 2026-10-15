import { useEffect, useState } from "react";

type RateLimitActionData = {
  error?: unknown;
  retryAfter?: unknown;
  source?: unknown;
};

export function useAuthRequestCooldown(actionData: unknown) {
  const result = (actionData ?? {}) as RateLimitActionData;
  const retryAfter =
    typeof result.retryAfter === "number" && result.retryAfter > 0
      ? Math.ceil(result.retryAfter)
      : 0;
  const [remaining, setRemaining] = useState(retryAfter);

  useEffect(() => {
    setRemaining(retryAfter);
  }, [actionData, retryAfter]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [remaining]);

  const error = typeof result.error === "string" ? result.error : undefined;
  const isRateLimited =
    (result.source === "app" || result.source === "supabase") && remaining > 0;

  return {
    errorMessage: isRateLimited
      ? `${error ?? "요청이 너무 많아요."} ${remaining}초 후 다시 시도해 주세요.`
      : error,
    isRateLimited,
    remaining,
  };
}
