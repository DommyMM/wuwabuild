// Server-only module: SSR prefetch against the LB API via the Cloudflare gateway
import 'server-only';
import { buildLeaderboardSearchParams, isRecord, toFiniteNumber, parseBuildRowEntry, parseLeaderboardDisplayStats, parseLeaderboardEntry, parseLeaderboardOverviewPayload, parseTeamBuffs, parseTracks, resolveTeamConfiguration, LBBuildRowEntry, LBListBuildsResponse, LBCharacterOverview, LBLeaderboardEntry, LBLeaderboardQuery, LBLeaderboardResponse } from './lb';
import { LB_API_BASE } from './apiEndpoints';
import { loadCharacterDisplayMap } from './server/gameData';

// Centralized TTLs for SSR prefetch caches (seconds).
const PREFETCH_TTL_S = 300; // 5 minutes for character boards and build/profile reads.
const OVERVIEW_PREFETCH_TTL_S = 600; // 10 minutes for aggregate overview/reign surfaces.

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

    const payload = await response.json() as { builds?: unknown[]; total?: number; page?: number; pageSize?: number };
    const rawBuilds = Array.isArray(payload.builds) ? payload.builds : [];
    const builds: LBBuildRowEntry[] = [];
    for (const raw of rawBuilds) {
      try {
        builds.push(parseBuildRowEntry(raw));
      } catch {
        // skip malformed rows
      }
    }
    return {
      builds,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
    };
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

    const payload = await response.json() as {
      builds?: unknown[];
      ghostBuild?: unknown;
      total?: number;
      page?: number;
      pageSize?: number;
      weaponIds?: unknown[];
      tracks?: unknown;
      teamCharacterIds?: unknown[];
      teamMembers?: unknown[];
      teamBuffs?: unknown;
      activeWeaponId?: unknown;
      activeTrack?: unknown;
      erTarget?: unknown;
      displayStats?: unknown;
    };
    const rawBuilds = Array.isArray(payload.builds) ? payload.builds : [];
    const builds: LBLeaderboardEntry[] = [];
    for (const raw of rawBuilds) {
      try {
        builds.push(parseLeaderboardEntry(raw));
      } catch {
        // skip malformed rows
      }
    }

    let ghostBuild: LBLeaderboardEntry | null = null;
    if (isRecord(payload.ghostBuild)) {
      try { ghostBuild = parseLeaderboardEntry(payload.ghostBuild); } catch { /* ignore */ }
    }

    const team = resolveTeamConfiguration(payload.teamMembers, payload.teamCharacterIds);

    return {
      builds,
      ghostBuild,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
      weaponIds: Array.isArray(payload.weaponIds)
        ? (payload.weaponIds as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
      tracks: parseTracks(payload.tracks),
      teamCharacterIds: team.teamCharacterIds,
      teamMembers: team.teamMembers,
      teamBuffs: parseTeamBuffs(payload.teamBuffs),
      activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
      activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
      erTarget: toFiniteNumber(payload.erTarget, 0),
      displayStats: parseLeaderboardDisplayStats(payload.displayStats),
    };
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboard failed', err);
    return null;
  }
}
