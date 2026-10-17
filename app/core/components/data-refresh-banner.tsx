import { useEffect, useRef } from "react";
import { useLocation, useRevalidator } from "react-router";

import {
  markRouteDataStale,
  refreshRouteDataCache,
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
  const shellKey =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/account")
      ? "dashboard-layout"
      : null;
  const revisionsRef = useRef<DataRevisions | null>(null);
  const actionWasBusy = useRef(false);
  const currentKeyRef = useRef(key);
  const shellKeyRef = useRef(shellKey);
  const revalidatorRef = useRef(revalidator);

  currentKeyRef.current = key;
  shellKeyRef.current = shellKey;
  revalidatorRef.current = revalidator;

  function applyRevisions(next: DataRevisions, markChanges: boolean) {
    const previous = revisionsRef.current;
    revisionsRef.current = next;
    if (!previous || !markChanges) return;

    const changedRouteKeys = (
      Object.keys(next) as (keyof DataRevisions)[]
    ).flatMap((revisionKey) =>
      previous[revisionKey] === next[revisionKey]
        ? []
        : revisionRouteKeys[revisionKey],
    );
    if (changedRouteKeys.length === 0) return;

    markRouteDataStale(changedRouteKeys);

    const currentKey = currentKeyRef.current;
    const currentShellKey = shellKeyRef.current;
    const refreshContent =
      currentKey !== null && changedRouteKeys.includes(currentKey);
    const refreshShell =
      currentShellKey !== null && changedRouteKeys.includes(currentShellKey);
    if (!refreshContent && !refreshShell) return;

    if (refreshContent && currentKey) refreshRouteDataCache(currentKey);
    if (refreshShell && currentShellKey) refreshRouteDataCache(currentShellKey);
    void revalidatorRef.current.revalidate();
  }

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
        applyRevisions(next, markChanges);
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
        applyRevisions(next, true);
      })
      .catch(() => undefined);
  }, [actionBusy]);

  return null;
}
