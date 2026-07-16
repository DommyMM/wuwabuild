// Server-only module: SSR prefetch against the LB API via the Cloudflare gateway
import 'server-only';
import { buildLeaderboardSearchParams, toFiniteNumber, parseBuildListResponsePayload, parseLeaderboardOverviewPayload, parseLeaderboardResponsePayload, LBListBuildsResponse, LBListBuildsResponseRaw, LBCharacterOverview, LBLeaderboardQuery, LBLeaderboardResponse, LBLeaderboardResponseRaw } from './lb';
import { LB_API_BASE } from './apiEndpoints';
import { loadCharacterDisplayMap } from './server/gameData';

// SSR prefetch TTLs (seconds). These mirror the `s-maxage` the LB service emits
// for the same resource (`cachePolicy` in lb `internal/api/helpers.go`), so a
// board has one staleness answer at every layer rather than one per cache.
// Diverging from lb here just means SSR visitors silently see older data than
// client-side fetches of the same endpoint.
const PREFETCH_TTL_S = 120; // lb cacheList: /build, /leaderboard/{id}, /profile/{uid}.
const OVERVIEW_PREFETCH_TTL_S = 600; // lb cacheOverview: aggregate overview/reign surfaces.

export async function prefetchBuilds(
  sort: 'finalCV' | 'timestamp' = 'finalCV',
): Promise<LBListBuildsResponse | null> {
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '12',
      sort,
      direction: 'desc',
    });
    const url = `${LB_API_BASE}/build?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) {
      console.error('[lbServer] prefetchBuilds non-OK response', {
        status: response.status,
      });
      return null;
    }

    const payload = await response.json() as LBListBuildsResponseRaw;
    return parseBuildListResponsePayload(payload, 1, 12);
  } catch (err) {
    console.error('[lbServer] prefetchBuilds failed', err);
    return null;
  }
}

export interface ProfileSummary {
  username: string;
  uid: string;
  buildCount: number;
}

// Reads the canonical profiles table (uid = immutable identity, username = latest
// seen) via GET /profile/{uid}. Used for SSR metadata/header — do not derive the
// owner from an arbitrary build row.
export async function fetchProfileSummary(uid: string): Promise<ProfileSummary | null> {
  const trimmedUid = uid.trim();
  if (!trimmedUid) return null;
  try {
    const url = `${LB_API_BASE}/profile/${encodeURIComponent(trimmedUid)}`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) return null;

    const payload = await response.json() as { uid?: string; username?: string; buildCount?: number };
    return {
      username: typeof payload.username === 'string' ? payload.username : '',
      uid: typeof payload.uid === 'string' && payload.uid ? payload.uid : trimmedUid,
      buildCount: toFiniteNumber(payload.buildCount, 0),
    };
  } catch (err) {
    console.error('[lbServer] fetchProfileSummary failed', err);
    return null;
  }
}

export async function prefetchLeaderboardOverview(): Promise<LBCharacterOverview[] | null> {
  try {
    const url = `${LB_API_BASE}/leaderboard`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: OVERVIEW_PREFETCH_TTL_S },
    });
    if (!response.ok) {
      console.error('[lbServer] prefetchLeaderboardOverview non-OK response', {
        status: response.status,
      });
      return null;
    }

    const result = parseLeaderboardOverviewPayload(await response.json());
    // Resolve display names/element/portrait server-side so the SSR HTML is
    // complete; read once and look up per row.
    const displayMap = loadCharacterDisplayMap();
    return result.map((entry) => ({ ...entry, display: displayMap[entry.id] }));
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboardOverview failed', err);
    return null;
  }
}

export async function prefetchLeaderboard(
  characterId: string,
  query: Partial<LBLeaderboardQuery> = {},
): Promise<LBLeaderboardResponse | null> {
  try {
    const params = buildLeaderboardSearchParams({
      page: 1,
      pageSize: 12,
      sort: 'damage',
      direction: 'desc',
      ...query,
    });
    const url = `${LB_API_BASE}/leaderboard/${encodeURIComponent(characterId)}?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) {
      console.error('[lbServer] prefetchLeaderboard non-OK response', {
        characterId,
        status: response.status,
      });
      return null;
    }

    const payload = await response.json() as LBLeaderboardResponseRaw;
    return parseLeaderboardResponsePayload(payload, 1, 12);
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboard failed', err);
    return null;
  }
}
