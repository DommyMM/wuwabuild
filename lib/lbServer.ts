// Server-only module, fetches directly from LB_URL with X-Internal-Key
import { buildLeaderboardSearchParams, isRecord, toFiniteNumber, parseBuildRowEntry, parseLeaderboardEntry, LBBuildRowEntry, LBListBuildsResponse, LBCharacterOverview, LBWeaponTop, LBLeaderboardEntry, LBLeaderboardQuery, LBLeaderboardResponse, LBTrack, LBTeamMemberConfig } from './lb';

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

function parseTeamMembers(raw: unknown): LBTeamMemberConfig[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((member) => ({
      charId: typeof member.charId === 'string' ? member.charId : '',
      weaponId: typeof member.weaponId === 'string' ? member.weaponId : undefined,
      refinement: typeof member.refinement === 'number' && Number.isFinite(member.refinement) ? member.refinement : undefined,
      setId: typeof member.setId === 'string' ? member.setId : undefined,
      echoId: typeof member.echoId === 'string' ? member.echoId : undefined,
    }))
    .filter((member) => member.charId.length > 0);
}

function getLBUrl(): string {
  const url = process.env.LB_URL?.trim();
  if (!url) {
    throw new Error('LB_URL is not configured.');
  }
  return url.replace(/\/$/, '');
}

function getInternalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY?.trim();
  if (!key) {
    throw new Error('INTERNAL_API_KEY is not configured.');
  }
  return { 'X-Internal-Key': key };
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
    if (!response.ok) {
      console.error('[lbServer] prefetchBuilds non-OK response', {
        url,
        status: response.status,
        body: await response.text(),
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
    console.log('[lbServer] prefetchBuilds payload', {
      url,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
      droppedRows: Math.max(0, rawBuilds.length - builds.length),
      payload,
    });
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
    if (!response.ok) {
      console.error('[lbServer] prefetchLeaderboardOverview non-OK response', {
        url,
        status: response.status,
        body: await response.text(),
      });
      return null;
    }

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
      const weaponIds = Array.isArray(raw.weaponIds)
        ? raw.weaponIds.filter((v): v is string => typeof v === 'string')
        : weapons.map((weapon) => weapon.weaponId).filter(Boolean);
      result.push({
        id: typeof raw._id === 'string' ? raw._id : (typeof raw.id === 'string' ? raw.id : ''),
        trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
        trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
        totalEntries: toFiniteNumber(raw.totalEntries),
        weapons,
        weaponIds,
        teamCharacterIds: Array.isArray(raw.teamCharacterIds)
          ? raw.teamCharacterIds.filter((v): v is string => typeof v === 'string')
          : [],
        teamMembers: parseTeamMembers(raw.teamMembers),
      });
    }
    console.log('[lbServer] prefetchLeaderboardOverview payload', {
      url,
      characters: result.length,
      payload,
    });
    return result;
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
    const url = `${getLBUrl()}/leaderboard/${encodeURIComponent(characterId)}?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getInternalHeaders(),
      next: { revalidate: PREFETCH_TTL_S },
    });
    if (!response.ok) {
      console.error('[lbServer] prefetchLeaderboard non-OK response', {
        url,
        characterId,
        query,
        status: response.status,
        body: await response.text(),
      });
      return null;
    }

    const payload = await response.json() as {
      builds?: unknown[];
      total?: number;
      page?: number;
      pageSize?: number;
      weaponIds?: unknown[];
      tracks?: unknown;
      teamCharacterIds?: unknown[];
      teamMembers?: unknown[];
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
    console.log('[lbServer] prefetchLeaderboard payload', {
      url,
      characterId,
      query,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
      droppedRows: Math.max(0, rawBuilds.length - builds.length),
      payload,
    });
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
      teamMembers: parseTeamMembers(payload.teamMembers),
      activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
      activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
    };
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboard failed', err);
    return null;
  }
}
