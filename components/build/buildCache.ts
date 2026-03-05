import { getLocalStorageJSON, setLocalStorageJSON } from '@/lib/clientStorage';
import { LBListBuildsResponse } from '@/lib/lb';

const BUILDS_CACHE_STORAGE_KEY = 'wuwabuilds_lb_build_list_cache_v1';
const BUILDS_CACHE_VERSION = 1;
const BUILDS_CACHE_DEFAULT_TTL_MS = 2 * 60 * 1000;
const BUILDS_CACHE_MAX_ENTRIES = 30;
const DEFAULT_QUERY_KEY = 'default';

interface CachedBuildListEntry {
  cachedAt: number;
  response: LBListBuildsResponse;
}

interface CachedBuildListStore {
  version: number;
  order: string[];
  entries: Record<string, CachedBuildListEntry>;
}

function normalizeQueryKey(queryKey: string): string {
  const trimmed = queryKey.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_QUERY_KEY;
}

function createEmptyCacheStore(): CachedBuildListStore {
  return {
    version: BUILDS_CACHE_VERSION,
    order: [],
    entries: {},
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBuildListResponse(value: unknown): value is LBListBuildsResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LBListBuildsResponse>;
  return (
    Array.isArray(candidate.builds) &&
    isFiniteNumber(candidate.total) &&
    isFiniteNumber(candidate.page) &&
    isFiniteNumber(candidate.pageSize)
  );
}

function getCacheStore(): CachedBuildListStore {
  const parsed = getLocalStorageJSON<CachedBuildListStore>(BUILDS_CACHE_STORAGE_KEY);
  if (!parsed || typeof parsed !== 'object') return createEmptyCacheStore();
  if (parsed.version !== BUILDS_CACHE_VERSION) return createEmptyCacheStore();
  if (!Array.isArray(parsed.order) || !parsed.entries || typeof parsed.entries !== 'object') {
    return createEmptyCacheStore();
  }
  return parsed;
}

function saveCacheStore(store: CachedBuildListStore): void {
  void setLocalStorageJSON(BUILDS_CACHE_STORAGE_KEY, store);
}

function normalizeCachedResponse(response: LBListBuildsResponse): LBListBuildsResponse {
  return {
    builds: response.builds,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
  };
}

export function readCachedBuildList(
  queryKey: string,
  ttlMs: number = BUILDS_CACHE_DEFAULT_TTL_MS,
): LBListBuildsResponse | null {
  const key = normalizeQueryKey(queryKey);
  const store = getCacheStore();
  const entry = store.entries[key];
  if (!entry) return null;

  if (!isFiniteNumber(entry.cachedAt) || Date.now() - entry.cachedAt > ttlMs) {
    delete store.entries[key];
    store.order = store.order.filter((entryKey) => entryKey !== key);
    saveCacheStore(store);
    return null;
  }

  if (!isBuildListResponse(entry.response)) {
    delete store.entries[key];
    store.order = store.order.filter((entryKey) => entryKey !== key);
    saveCacheStore(store);
    return null;
  }

  return normalizeCachedResponse(entry.response);
}

export function writeCachedBuildList(queryKey: string, response: LBListBuildsResponse): void {
  if (!isBuildListResponse(response)) return;

  const key = normalizeQueryKey(queryKey);
  const store = getCacheStore();
  store.entries[key] = {
    cachedAt: Date.now(),
    response: normalizeCachedResponse(response),
  };
  store.order = [key, ...store.order.filter((entryKey) => entryKey !== key)];

  while (store.order.length > BUILDS_CACHE_MAX_ENTRIES) {
    const evictedKey = store.order.pop();
    if (!evictedKey) break;
    delete store.entries[evictedKey];
  }

  saveCacheStore(store);
}
