import { useEffect } from "react";

type CacheEntry = {
  version: string;
  data: unknown;
};

const routeDataCache = new Map<string, CacheEntry>();
const VERSION_KEY = "eokka:dashboard-cache-version";

function currentVersion() {
  if (typeof window === "undefined") return "server";
  return window.sessionStorage.getItem(VERSION_KEY) ?? "0";
}

export async function loadCachedRouteData<T>(
  key: string,
  serverLoader: () => Promise<T>,
) {
  const version = currentVersion();
  const cached = routeDataCache.get(key);
  if (cached?.version === version) return cached.data as T;
  const data = await serverLoader();
  routeDataCache.set(key, { version, data });
  return data;
}

export function hasCachedRouteData(key: string) {
  const cached = routeDataCache.get(key);
  return cached?.version === currentVersion();
}

export function usePrimeRouteDataCache<T>(key: string, data: T) {
  useEffect(() => {
    routeDataCache.set(key, { version: currentVersion(), data });
  }, [data, key]);
}

export function invalidateRouteDataCache(keyPrefix: string) {
  for (const key of routeDataCache.keys())
    if (key === keyPrefix || key.startsWith(`${keyPrefix}:`))
      routeDataCache.delete(key);
}
