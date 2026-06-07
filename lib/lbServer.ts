// Server-only module, fetches directly from LB_URL with X-Internal-Key
import { buildLeaderboardSearchParams, isRecord, toFiniteNumber, parseBuildRowEntry, parseLeaderboardDisplayStats, parseLeaderboardEntry, LBBuildRowEntry, LBListBuildsResponse, LBCharacterOverview, LBWeaponTop, LBLeaderboardEntry, LBLeaderboardQuery, LBLeaderboardResponse, LBTrack, LBTeamMemberConfig } from './lb';
import { loadCharacterDisplayMap } from './server/gameData';

// Centralized TTL for all SSR prefetch caches (seconds).
const PREFETCH_TTL_S = 300; // 5 minutes

function parseTracks(raw: unknown): LBTrack[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((track) => ({
      key: typeof track.key === 'string' ? track.key : '',
      label: typeof track.label === 'string' ? track.label : '',
      note: typeof track.note === 'string' ? track.note : undefined,
      erBrackets: Array.isArray(track.erBrackets)
        ? track.erBrackets
          .map((value) => toFiniteNumber(value, 0))
          .filter((value) => Number.isFinite(value) && value > 0)
        : undefined,
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
      sequence: typeof member.sequence === 'number' && Number.isFinite(member.sequence) ? member.sequence : undefined,
    }))
    .filter((member) => member.charId.length > 0);
}

function parseTeamCharSpec(spec: string): LBTeamMemberConfig {
  const [charId, seqRaw] = spec.split(':', 2);
  const seq = seqRaw === undefined ? NaN : Number(seqRaw);
  return {
    charId,
    sequence: Number.isFinite(seq) ? Math.max(0, Math.min(6, Math.trunc(seq))) : undefined,
  };
}

function parseTeamCharacterSpecs(raw: unknown): LBTeamMemberConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((spec) => parseTeamCharSpec(spec))
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
    const url = `${getLBUrl()}/profile/${encodeURIComponent(trimmedUid)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getInternalHeaders(),
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
    // Resolve display names/element/portrait server-side so the SSR HTML is
    // complete; read once and look up per row.
    const displayMap = loadCharacterDisplayMap();

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
      const fallbackTeamMembers = parseTeamCharacterSpecs(raw.teamCharacterIds);
      const teamMembers = parseTeamMembers(raw.teamMembers);
      const id = typeof raw._id === 'string' ? raw._id : (typeof raw.id === 'string' ? raw.id : '');
      result.push({
        id,
        trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
        trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
        totalEntries: toFiniteNumber(raw.totalEntries),
        weapons,
        weaponIds,
        teamCharacterIds: fallbackTeamMembers.map((member) => member.charId),
        teamMembers: teamMembers.length > 0 ? teamMembers : fallbackTeamMembers,
        display: displayMap[id],
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
      ghostBuild?: unknown;
      total?: number;
      page?: number;
      pageSize?: number;
      weaponIds?: unknown[];
      tracks?: unknown;
      teamCharacterIds?: unknown[];
      teamMembers?: unknown[];
      activeWeaponId?: unknown;
      activeTrack?: unknown;
      erMin?: unknown;
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

    console.log('[lbServer] prefetchLeaderboard payload', {
      url,
      characterId,
      query,
      total: toFiniteNumber(payload.total, 0),
      page: toFiniteNumber(payload.page, 1),
      pageSize: toFiniteNumber(payload.pageSize, 12),
      droppedRows: Math.max(0, rawBuilds.length - builds.length),
      hasGhost: ghostBuild !== null,
      payload,
    });
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
      teamCharacterIds: Array.isArray(payload.teamCharacterIds)
        ? payload.teamCharacterIds.filter((v): v is string => typeof v === 'string')
        : [],
      teamMembers: parseTeamMembers(payload.teamMembers),
      activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
      activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
      erMin: toFiniteNumber(payload.erMin, 0),
      displayStats: parseLeaderboardDisplayStats(payload.displayStats),
    };
  } catch (err) {
    console.error('[lbServer] prefetchLeaderboard failed', err);
    return null;
  }
}
