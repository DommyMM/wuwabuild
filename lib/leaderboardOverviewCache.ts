'use client';

import { getLocalStorageJSON, removeLocalStorageItem, setLocalStorageJSON } from '@/lib/clientStorage';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';

const LEADERBOARD_OVERVIEW_CACHE_STORAGE_KEY = 'wuwabuilds_lb_overview_cache_v1';
const LEADERBOARD_OVERVIEW_CACHE_VERSION = 1;
const LEADERBOARD_OVERVIEW_MAX_AGE_MS = 60 * 60 * 1000;

interface LeaderboardOverviewCacheStore {
  version: number;
  cachedAt: number;
  expiresAt: number;
  overview: LBCharacterOverview[];
}

let memoryStore: LeaderboardOverviewCacheStore | null = null;
let inflightRequest: Promise<LBCharacterOverview[]> | null = null;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isWeaponTop(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LBCharacterOverview['weapons'][number]>;
  return (
    typeof candidate.weaponId === 'string' &&
    isFiniteNumber(candidate.damage) &&
    !!candidate.owner &&
    typeof candidate.owner.username === 'string' &&
    typeof candidate.owner.uid === 'string'
  );
}

function isCharacterOverview(value: unknown): value is LBCharacterOverview {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LBCharacterOverview>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.trackKey === 'string' &&
    typeof candidate.trackLabel === 'string' &&
    isFiniteNumber(candidate.totalEntries) &&
    Array.isArray(candidate.weapons) &&
    candidate.weapons.every(isWeaponTop) &&
    Array.isArray(candidate.weaponIds) &&
    candidate.weaponIds.every((weaponId) => typeof weaponId === 'string') &&
    Array.isArray(candidate.teamCharacterIds) &&
    candidate.teamCharacterIds.every((characterId) => typeof characterId === 'string')
  );
}

function isCacheStore(value: unknown): value is LeaderboardOverviewCacheStore {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LeaderboardOverviewCacheStore>;
  return (
    candidate.version === LEADERBOARD_OVERVIEW_CACHE_VERSION &&
    isFiniteNumber(candidate.cachedAt) &&
    isFiniteNumber(candidate.expiresAt) &&
    Array.isArray(candidate.overview) &&
    candidate.overview.every(isCharacterOverview)
  );
}

function getNextLocalMidnight(nowMs: number): number {
  const now = new Date(nowMs);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
}

function getCacheExpiry(nowMs: number): number {
  return Math.min(nowMs + LEADERBOARD_OVERVIEW_MAX_AGE_MS, getNextLocalMidnight(nowMs));
}

function readStorageStore(nowMs: number): LeaderboardOverviewCacheStore | null {
  const parsed = getLocalStorageJSON<LeaderboardOverviewCacheStore>(LEADERBOARD_OVERVIEW_CACHE_STORAGE_KEY);
  if (!isCacheStore(parsed)) {
    void removeLocalStorageItem(LEADERBOARD_OVERVIEW_CACHE_STORAGE_KEY);
    return null;
  }

  if (parsed.expiresAt <= nowMs) {
    void removeLocalStorageItem(LEADERBOARD_OVERVIEW_CACHE_STORAGE_KEY);
    return null;
  }

  return parsed;
}

function writeCacheStore(store: LeaderboardOverviewCacheStore): void {
  memoryStore = store;
  void setLocalStorageJSON(LEADERBOARD_OVERVIEW_CACHE_STORAGE_KEY, store);
}

export function readCachedLeaderboardOverview(nowMs: number = Date.now()): LBCharacterOverview[] | null {
  if (memoryStore && memoryStore.expiresAt > nowMs) {
    return memoryStore.overview;
  }

  const stored = readStorageStore(nowMs);
  if (!stored) {
    memoryStore = null;
    return null;
  }

  memoryStore = stored;
  return stored.overview;
}

export function primeLeaderboardOverviewCache(
  overview: LBCharacterOverview[],
  cachedAt: number = Date.now(),
): void {
  const normalizedOverview = Array.isArray(overview) ? overview.filter(isCharacterOverview) : [];
  const store: LeaderboardOverviewCacheStore = {
    version: LEADERBOARD_OVERVIEW_CACHE_VERSION,
    cachedAt,
    expiresAt: getCacheExpiry(cachedAt),
    overview: normalizedOverview,
  };
  writeCacheStore(store);
}

export async function getCachedLeaderboardOverview(forceRefresh = false): Promise<LBCharacterOverview[]> {
  if (!forceRefresh) {
    const cached = readCachedLeaderboardOverview();
    if (cached) {
      return cached;
    }
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = listLeaderboardOverview()
    .then((overview) => {
      primeLeaderboardOverviewCache(overview);
      inflightRequest = null;
      return overview;
    })
    .catch((error) => {
      inflightRequest = null;
      throw error;
    });

  return inflightRequest;
}
