import { useEffect, useSyncExternalStore } from "react";

type CacheEntry = {
  version: string;
  data: unknown;
  cachedAt: number;
};

const routeDataCache = new Map<string, CacheEntry>();
const staleRouteData = new Set<string>();
const listeners = new Set<() => void>();
const VERSION_KEY = "eokka:dashboard-cache-version";

function emitChange() {
  for (const listener of listeners) listener();
}

function matchesKey(key: string, keyPrefix: string) {
  return key === keyPrefix || key.startsWith(`${keyPrefix}:`);
}

function isRouteDataStale(key: string) {
  return [...staleRouteData].some((staleKey) => matchesKey(staleKey, key));
}

function currentVersion() {
  if (typeof window === "undefined") return "server";
  return window.sessionStorage.getItem(VERSION_KEY) ?? "0";
}

export async function loadCachedRouteData<T>(
  key: string,
  serverLoader: () => Promise<T>,
  options?: { maxAgeMs?: number },
) {
  const version = currentVersion();
  const cached = routeDataCache.get(key);
  const isFresh =
    cached?.version === version &&
    !isRouteDataStale(key) &&
    (options?.maxAgeMs === undefined ||
      Date.now() - cached.cachedAt < options.maxAgeMs);
  if (isFresh) return cached.data as T;
  const data = await serverLoader();
  routeDataCache.set(key, { version, data, cachedAt: Date.now() });
  staleRouteData.delete(key);
  emitChange();
  return data;
}

export function hasCachedRouteData(key: string) {
  const cached = routeDataCache.get(key);
  return cached?.version === currentVersion() && !isRouteDataStale(key);
}

export function usePrimeRouteDataCache<T>(key: string, data: T) {
  useEffect(() => {
    const cached = routeDataCache.get(key);
    if (cached?.data === data && cached.version === currentVersion()) return;
    routeDataCache.set(key, {
      version: currentVersion(),
      data,
      cachedAt: Date.now(),
    });
    staleRouteData.delete(key);
    emitChange();
  }, [data, key]);
}

export function invalidateRouteDataCache(keyPrefix: string) {
  let changed = false;
  for (const key of routeDataCache.keys()) {
    if (!matchesKey(key, keyPrefix)) continue;
    staleRouteData.add(key);
    changed = true;
  }
  if (changed) emitChange();
}

export function markRouteDataStale(keyPrefixes: string[]) {
  for (const keyPrefix of keyPrefixes) invalidateRouteDataCache(keyPrefix);
}

export function clearRouteDataCache(keyPrefix?: string) {
  if (keyPrefix === undefined) {
    routeDataCache.clear();
    staleRouteData.clear();
    emitChange();
    return;
  }
  for (const key of [...routeDataCache.keys()])
    if (matchesKey(key, keyPrefix)) routeDataCache.delete(key);
  for (const key of [...staleRouteData])
    if (matchesKey(key, keyPrefix)) staleRouteData.delete(key);
  emitChange();
}

export function refreshRouteDataCache(key: string) {
  clearRouteDataCache(key);
}

export function useIsRouteDataStale(key: string | null) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => key !== null && isRouteDataStale(key),
    () => false,
  );
}

/** Every view derived from an analysis must refresh after it is saved or promoted. */
export function invalidateAnalysisRouteData() {
  for (const key of [
    "home",
    "dashboard",
    "dashboard-layout",
    "analysis-history",
    "investment-insights",
    "precise-analysis",
    "achievements",
    "profile",
    "account",
  ]) {
    invalidateRouteDataCache(key);
  }
}
