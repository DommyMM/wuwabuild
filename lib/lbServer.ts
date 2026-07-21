// Server-only module: SSR prefetch against the LB API via the Cloudflare gateway
import 'server-only';
import { buildLeaderboardSearchParams, toFiniteNumber, parseBuildListResponsePayload, parseLeaderboardOverviewPayload, parseLeaderboardResponsePayload, LBListBuildsResponse, LBListBuildsResponseRaw, LBCharacterOverview, LBLeaderboardQuery, LBLeaderboardResponse, LBLeaderboardResponseRaw, LBMoveEntry } from './lb';
import { LB_API_BASE } from './apiEndpoints';
import { loadCharacterDisplayMap } from './server/gameData';

// SSR prefetch TTLs (seconds). These are the *data-freshness* defaults: they mirror
// the `s-maxage` the LB service emits for the same resource (`cachePolicy` in lb
// `internal/api/helpers.go`), so a board fetched for SSR is no staler than a client
// fetch of the same endpoint.
//
// IMPORTANT: a fetch's `revalidate` also sets the *page's* ISR floor (Next uses the
// lowest revalidate in a route). Long-lived ISR pages therefore pass an explicit
// `revalidateS` to decouple page-regeneration cadence (a cost lever) from data
// freshness (a UX lever) — the page HTML regenerates rarely while the browser
// re-fetches live data client-side through the short Cloudflare cache.
const PREFETCH_TTL_S = 120; // lb cacheList: /build, /leaderboard/{id}, /profile/{uid}.
const OVERVIEW_PREFETCH_TTL_S = 600; // lb cacheOverview: aggregate overview/reign surfaces.

export async function prefetchBuilds(
  sort: 'finalCV' | 'timestamp' = 'finalCV',
  revalidateS: number | false = PREFETCH_TTL_S,
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
      next: { revalidate: revalidateS },
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

// Move breakdown for one build on one board. The home page bakes the first hero
// slide's profile bar into the ISR HTML with this, so the record card's
// signature graphic is present at first paint instead of popping in after
// hydration. 404 (no computed moves) and failures both resolve to null: the
// bar is an enhancement, never a blocking dependency.
export async function prefetchBuildMoves(
  buildId: string,
  weaponId: string,
  trackKey: string,
  revalidateS: number | false = PREFETCH_TTL_S,
): Promise<LBMoveEntry[] | null> {
  try {
    const url = `${LB_API_BASE}/build/${encodeURIComponent(buildId)}/moves/${encodeURIComponent(weaponId)}/${encodeURIComponent(trackKey)}`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: revalidateS },
    });
    if (!response.ok) {
      if (response.status !== 404) {
        console.error('[lbServer] prefetchBuildMoves non-OK response', {
          buildId,
          status: response.status,
        });
      }
      return null;
    }

    const payload = await response.json() as { moves?: LBMoveEntry[] };
    return Array.isArray(payload.moves) ? payload.moves : null;
  } catch (err) {
    console.error('[lbServer] prefetchBuildMoves failed', err);
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

export async function prefetchLeaderboardOverview(
  revalidateS: number | false = OVERVIEW_PREFETCH_TTL_S,
): Promise<LBCharacterOverview[] | null> {
  try {
    const url = `${LB_API_BASE}/leaderboard`;
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: revalidateS },
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
  revalidateS: number | false = PREFETCH_TTL_S,
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
      next: { revalidate: revalidateS },
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
