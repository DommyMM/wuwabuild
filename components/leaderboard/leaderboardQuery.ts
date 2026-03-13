import { clampItemsPerPage, ITEMS_PER_PAGE } from '@/components/build/buildConstants';
import { LBEchoMainFilter, LBEchoSetFilter, LBLeaderboardQuery, LBLeaderboardSortKey, LBSortDirection, LBTrack, normalizeLBLeaderboardSortKey, toLBApiSortKey } from '@/lib/lb';
import { toMainStatUrlKey } from '@/lib/mainStatFilters';
import { DEFAULT_LB_SORT, DEFAULT_LB_TRACK } from './leaderboardConstants';

export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseEchoSetCSV(value: string | null): LBEchoSetFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [countRaw, idRaw] = entry.split('~');
      const count = Number.parseInt(countRaw ?? '', 10);
      const setId = Number.parseInt(idRaw ?? '', 10);
      if (!Number.isFinite(count) || !Number.isFinite(setId)) return null;
      return { count, setId };
    })
    .filter((entry): entry is LBEchoSetFilter => entry !== null);
}

export function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [costRaw, statType] = entry.split('~');
      const cost = Number.parseInt(costRaw ?? '', 10);
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType: toMainStatUrlKey(statType) };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}

function parseCSV(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export interface LeaderboardQuerySnapshot {
  page: number;
  pageSize: number;
  sort: LBLeaderboardSortKey;
  direction: LBSortDirection;
  weaponId: string;
  track: string;
  uid: string;
  username: string;
  regionPrefixes: string[];
  echoSets: LBEchoSetFilter[];
  echoMains: LBEchoMainFilter[];
}

export interface LeaderboardQueryDefaults {
  defaultPage?: number;
  defaultPageSize?: number;
  defaultSort?: LBLeaderboardSortKey;
  defaultDirection?: LBSortDirection;
  defaultWeaponId?: string;
  defaultTrack?: string;
}

interface ParseInitialLeaderboardQueryOptions extends LeaderboardQueryDefaults {
  weaponIds?: string[];
  tracks?: LBTrack[];
}

export type SearchParamRecord = Record<string, string | string[] | undefined>;

function resolveDirection(value: string | null | undefined, fallback: LBSortDirection): LBSortDirection {
  return value === 'asc' || value === 'desc' ? value : fallback;
}

function resolveWeaponId(
  searchParams: URLSearchParams,
  weaponIds: string[] | undefined,
  defaultWeaponId: string,
): string {
  const weaponId = searchParams.get('weaponId')?.trim() ?? '';
  if (weaponId) {
    if (!weaponIds?.length || weaponIds.includes(weaponId)) return weaponId;
    return defaultWeaponId;
  }

  const weaponIndex = Number.parseInt(searchParams.get('weaponIndex') ?? '', 10);
  if (weaponIds?.length && Number.isFinite(weaponIndex) && weaponIndex >= 0 && weaponIndex < weaponIds.length) {
    return weaponIds[weaponIndex] ?? defaultWeaponId;
  }

  return defaultWeaponId;
}

function resolveTrackKey(
  searchParams: URLSearchParams,
  tracks: LBTrack[] | undefined,
  defaultTrack: string,
): string {
  const trackKey = searchParams.get('track')?.trim() ?? '';
  if (!trackKey) return defaultTrack;
  if (!tracks?.length || tracks.some((track) => track.key === trackKey)) return trackKey;
  return defaultTrack;
}

export function resolveLeaderboardQuerySnapshot(
  snapshot: Partial<LeaderboardQuerySnapshot>,
  defaults: LeaderboardQueryDefaults = {},
): LeaderboardQuerySnapshot {
  const defaultPage = defaults.defaultPage ?? 1;
  const defaultPageSize = defaults.defaultPageSize ?? ITEMS_PER_PAGE;
  const defaultSort = defaults.defaultSort ?? DEFAULT_LB_SORT;
  const defaultDirection = defaults.defaultDirection ?? 'desc';
  const defaultWeaponId = defaults.defaultWeaponId ?? '';
  const defaultTrack = defaults.defaultTrack ?? DEFAULT_LB_TRACK;

  return {
    page: Number.isFinite(snapshot.page) && (snapshot.page ?? 0) > 0 ? Math.trunc(snapshot.page as number) : defaultPage,
    pageSize: clampItemsPerPage(snapshot.pageSize ?? defaultPageSize),
    sort: normalizeLBLeaderboardSortKey(snapshot.sort, defaultSort),
    direction: resolveDirection(snapshot.direction, defaultDirection),
    weaponId: snapshot.weaponId?.trim() || defaultWeaponId,
    track: snapshot.track?.trim() || defaultTrack,
    uid: snapshot.uid?.trim() ?? '',
    username: snapshot.username?.trim() ?? '',
    regionPrefixes: snapshot.regionPrefixes?.map((entry) => entry.trim()).filter(Boolean) ?? [],
    echoSets: snapshot.echoSets ?? [],
    echoMains: snapshot.echoMains ?? [],
  };
}

export function parseInitialLeaderboardQuery(
  searchParams: URLSearchParams,
  opts: ParseInitialLeaderboardQueryOptions = {},
): LeaderboardQuerySnapshot {
  const defaultPage = opts.defaultPage ?? 1;
  const defaultPageSize = opts.defaultPageSize ?? ITEMS_PER_PAGE;
  const defaultSort = opts.defaultSort ?? DEFAULT_LB_SORT;
  const defaultDirection = opts.defaultDirection ?? 'desc';
  const defaultWeaponId = opts.defaultWeaponId ?? '';
  const defaultTrack = opts.defaultTrack ?? DEFAULT_LB_TRACK;

  return resolveLeaderboardQuerySnapshot({
    page: parsePositiveInt(searchParams.get('page'), defaultPage),
    pageSize: clampItemsPerPage(parsePositiveInt(searchParams.get('pageSize'), defaultPageSize)),
    sort: normalizeLBLeaderboardSortKey(searchParams.get('sort'), defaultSort),
    direction: resolveDirection(searchParams.get('direction'), defaultDirection),
    weaponId: resolveWeaponId(searchParams, opts.weaponIds, defaultWeaponId),
    track: resolveTrackKey(searchParams, opts.tracks, defaultTrack),
    uid: searchParams.get('uid') ?? '',
    username: searchParams.get('username') ?? '',
    regionPrefixes: parseCSV(searchParams.get('regions')),
    echoSets: parseEchoSetCSV(searchParams.get('sets')),
    echoMains: parseEchoMainCSV(searchParams.get('mains')),
  }, {
    defaultPage,
    defaultPageSize,
    defaultSort,
    defaultDirection,
    defaultWeaponId,
    defaultTrack,
  });
}

export function serializeLeaderboardQuery(
  snapshot: Partial<LeaderboardQuerySnapshot>,
  defaults: LeaderboardQueryDefaults = {},
): string {
  const resolved = resolveLeaderboardQuerySnapshot(snapshot, defaults);
  const defaultPage = defaults.defaultPage ?? 1;
  const defaultPageSize = defaults.defaultPageSize ?? ITEMS_PER_PAGE;
  const defaultSort = defaults.defaultSort ?? DEFAULT_LB_SORT;
  const defaultDirection = defaults.defaultDirection ?? 'desc';

  const params = new URLSearchParams();
  if (resolved.page > defaultPage) params.set('page', String(resolved.page));
  if (resolved.pageSize !== defaultPageSize) params.set('pageSize', String(resolved.pageSize));
  if (resolved.sort !== defaultSort) params.set('sort', toLBApiSortKey(resolved.sort));
  if (resolved.direction !== defaultDirection) params.set('direction', resolved.direction);
  if (resolved.weaponId) params.set('weaponId', resolved.weaponId);
  if (resolved.track) params.set('track', resolved.track);
  if (resolved.uid) params.set('uid', resolved.uid);
  if (resolved.username) params.set('username', resolved.username);
  if (resolved.regionPrefixes.length) params.set('regions', resolved.regionPrefixes.join(','));
  if (resolved.echoSets.length) {
    params.set('sets', resolved.echoSets.map((entry) => `${entry.count}~${entry.setId}`).join('.'));
  }
  if (resolved.echoMains.length) {
    params.set('mains', resolved.echoMains.map((entry) => `${entry.cost}~${entry.statType}`).join('.'));
  }
  return params.toString();
}

export function buildLeaderboardHref(
  characterId: string,
  snapshot: Partial<LeaderboardQuerySnapshot>,
  defaults: LeaderboardQueryDefaults = {},
): string {
  const query = serializeLeaderboardQuery(snapshot, defaults);
  return query ? `/leaderboards/${characterId}?${query}` : `/leaderboards/${characterId}`;
}

export function leaderboardSnapshotToApiQuery(
  snapshot: Partial<LeaderboardQuerySnapshot>,
  defaults: LeaderboardQueryDefaults = {},
): LBLeaderboardQuery {
  const resolved = resolveLeaderboardQuerySnapshot(snapshot, defaults);
  return {
    page: resolved.page,
    pageSize: resolved.pageSize,
    sort: resolved.sort,
    direction: resolved.direction,
    weaponId: resolved.weaponId || undefined,
    track: resolved.track || undefined,
    uid: resolved.uid || undefined,
    username: resolved.username || undefined,
    regionPrefixes: resolved.regionPrefixes.length ? resolved.regionPrefixes : undefined,
    echoSets: resolved.echoSets.length ? resolved.echoSets : undefined,
    echoMains: resolved.echoMains.length ? resolved.echoMains : undefined,
  };
}

export function toURLSearchParams(input: URLSearchParams | SearchParamRecord): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input.toString());
  }

  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(input)) {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((value) => {
        if (typeof value === 'string') params.append(key, value);
      });
      continue;
    }
    if (typeof rawValue === 'string') {
      params.set(key, rawValue);
    }
  }
  return params;
}
