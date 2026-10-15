import { RefreshCwIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useRevalidator } from "react-router";

import {
  markRouteDataStale,
  refreshRouteDataCache,
  useIsRouteDataStale,
} from "~/core/lib/route-data-cache";

type DataRevisions = {
  analysis: string;
  notifications: string;
  portfolio: string;
  achievements: string;
  profile: string;
};

const revisionRouteKeys: Record<keyof DataRevisions, string[]> = {
  analysis: [
    "home",
    "dashboard",
    "analysis-history",
    "investment-insights",
    "precise-analysis",
    "achievements",
    "profile",
  ],
  notifications: ["notifications", "dashboard-layout"],
  portfolio: ["managed-portfolio", "precise-analysis", "dashboard", "home"],
  achievements: ["achievements", "profile", "account"],
  profile: [
    "profile",
    "account",
    "dashboard-layout",
    "home",
    "eokka-pro",
    "payments",
    "subscription-checkout",
  ],
};

function cacheKey(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/dashboard/history")) return "analysis-history";
  if (pathname.startsWith("/dashboard/portfolio")) return "managed-portfolio";
  if (pathname.startsWith("/dashboard/precise-analysis"))
    return "precise-analysis";
  if (pathname.startsWith("/dashboard/insights")) return "investment-insights";
  if (pathname.startsWith("/dashboard/achievements")) return "achievements";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/pro")) return "eokka-pro";
  if (pathname.startsWith("/dashboard/payments")) return "payments";
  if (pathname.startsWith("/payments/checkout")) return "subscription-checkout";
  if (pathname === "/account") return "profile";
  if (pathname.startsWith("/account/edit")) return "account";
  return null;
}

export function DataRefreshBanner({ actionBusy }: { actionBusy: boolean }) {
  const location = useLocation();
  const revalidator = useRevalidator();
  const key = cacheKey(location.pathname);
  const contentStale = useIsRouteDataStale(key);
  const shellStale = useIsRouteDataStale(
    location.pathname.startsWith("/dashboard") ||
      location.pathname.startsWith("/account")
      ? "dashboard-layout"
      : null,
  );
  const stale = contentStale || shellStale;
  const revisionsRef = useRef<DataRevisions | null>(null);
  const actionWasBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRevisions(markChanges: boolean) {
      try {
        const response = await fetch("/api/users/data-revisions", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const next = (await response.json()) as DataRevisions;
        if (cancelled) return;
        const previous = revisionsRef.current;
        revisionsRef.current = next;
        if (!previous || !markChanges) return;
        for (const revisionKey of Object.keys(next) as (keyof DataRevisions)[])
          if (previous[revisionKey] !== next[revisionKey])
            markRouteDataStale(revisionRouteKeys[revisionKey]);
      } catch {
        // A revision check must never interrupt normal navigation.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkRevisions(true);
    };
    void checkRevisions(false);
    const interval = window.setInterval(
      () => void checkRevisions(true),
      300_000,
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (actionBusy) {
      actionWasBusy.current = true;
      return;
    }
    if (!actionWasBusy.current) return;
    actionWasBusy.current = false;
    void fetch("/api/users/data-revisions", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((next: DataRevisions | null) => {
        if (!next) return;
        const previous = revisionsRef.current;
        revisionsRef.current = next;
        if (!previous) return;
        for (const revisionKey of Object.keys(next) as (keyof DataRevisions)[])
          if (previous[revisionKey] !== next[revisionKey])
            markRouteDataStale(revisionRouteKeys[revisionKey]);
      })
      .catch(() => undefined);
  }, [actionBusy]);

  if (!key || !stale) return null;

  return (
    <aside className="fixed inset-x-4 top-4 z-[90] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
      <div>
        <strong className="block font-bold">새로운 데이터가 있어요</strong>
        <span className="text-slate-300">현재 화면을 유지하고 있어요.</span>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold text-slate-950 transition hover:bg-slate-200"
        onClick={() => {
          if (key) refreshRouteDataCache(key);
          if (shellStale) refreshRouteDataCache("dashboard-layout");
          void revalidator.revalidate();
        }}
      >
        <RefreshCwIcon className="size-4" /> 업데이트
      </button>
    </aside>
  );
}
