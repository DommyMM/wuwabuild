// Server-only module, fetches directly from LB_URL with X-Internal-Key
import { isRecord, toFiniteNumber, parseBuildRowEntry, parseLeaderboardEntry, LBBuildRowEntry, LBListBuildsResponse, LBCharacterOverview, LBWeaponTop, LBLeaderboardEntry, LBLeaderboardResponse, LBTrack } from './lb';

// Centralized TTL for all SSR prefetch caches (seconds).
const PREFETCH_TTL_S = 120; // 2 minutes

function parseTracks(raw: unknown): LBTrack[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((track) => ({
      key: typeof track.key === 'string' ? track.key : '',
      label: typeof track.label === 'string' ? track.label : '',
    }))
    .filter((track) => track.key.length > 0);
}

function getLBUrl(): string {
  return (process.env.LB_URL ?? 'http://localhost:8080').replace(/\/$/, '');
}

function getInternalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY;
  return key ? { 'X-Internal-Key': key } : {};
}

export async function prefetchBuilds(): Promise<LBListBuildsResponse | null> {
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '12',
      sort: 'finalCV',
      direction: 'desc',
    });
    const url = `${getLBUrl()}/build?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getInternalHeaders(),
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) return null;

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

export async function prefetchLeaderboardOverview(): Promise<LBCharacterOverview[] | null> {
  try {
    const url = `${getLBUrl()}/leaderboard`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getInternalHeaders(),
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) return null;

    const payload = await response.json() as { characters?: unknown[] };
    const rawChars = Array.isArray(payload.characters) ? payload.characters : [];
    const result: LBCharacterOverview[] = [];

    for (const raw of rawChars) {
      if (!isRecord(raw)) continue;
      const rawWeapons = Array.isArray(raw.weapons) ? raw.weapons : [];
      const weapons: LBWeaponTop[] = rawWeapons
        .filter(isRecord)
        .map((w) => {
          const owner = isRecord(w.owner) ? w.owner : {};
          return {
            weaponId: typeof w.weaponId === 'string' ? w.weaponId : '',
            damage: toFiniteNumber(w.damage),
            owner: {
              username: typeof owner.username === 'string' ? owner.username : '',
              uid: typeof owner.uid === 'string' ? owner.uid : '',
            },
          };
        });
      result.push({
        id: typeof raw._id === 'string' ? raw._id : (typeof raw.id === 'string' ? raw.id : ''),
        totalEntries: toFiniteNumber(raw.totalEntries),
        weapons,
        weaponIds: Array.isArray(raw.weaponIds)
          ? raw.weaponIds.filter((v): v is string => typeof v === 'string')
          : [],
        tracks: parseTracks(raw.tracks),
        teamCharacterIds: Array.isArray(raw.teamCharacterIds)
          ? raw.teamCharacterIds.filter((v): v is string => typeof v === 'string')
          : [],
      });
    }
    return result;
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboardOverview failed', err);
    return null;
  }
}

export async function prefetchLeaderboard(characterId: string): Promise<LBLeaderboardResponse | null> {
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '12',
      sort: 'damage',
      direction: 'desc',
      weaponIndex: '0',
    });
    const url = `${getLBUrl()}/leaderboard/${encodeURIComponent(characterId)}?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getInternalHeaders(),
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) return null;

    const payload = await response.json() as {
      builds?: unknown[];
      total?: number;
      page?: number;
      pageSize?: number;
      weaponIds?: unknown[];
      tracks?: unknown;
      teamCharacterIds?: unknown[];
      activeWeaponId?: unknown;
      activeTrack?: unknown;
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
    return {
      builds,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
      weaponIds: Array.isArray(payload.weaponIds)
        ? (payload.weaponIds as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
      tracks: parseTracks(payload.tracks),
      teamCharacterIds: Array.isArray(payload.teamCharacterIds)
        ? payload.teamCharacterIds.filter((v): v is string => typeof v === 'string')
        : [],
      activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
      activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
    };
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboard failed', err);
    return null;
  }
}
