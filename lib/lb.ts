import { DEFAULT_FORTE, SavedState } from '@/lib/build';

const LB_PROXY_BASE = '/api/lb';
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

export const LB_STAT_CODES = [
  'H', 'H%',
  'A', 'A%',
  'D', 'D%',
  'CR', 'CD',
  'AD', 'GD', 'FD', 'ED', 'HD', 'SD',
  'BA', 'HA', 'RS', 'RL',
  'ER', 'HB',
] as const;

export type LBStatCode = (typeof LB_STAT_CODES)[number];

export type LBSortKey =
  | 'finalCV'
  | 'timestamp'
  | 'characterId'
  | 'H' | 'H%'
  | 'A' | 'A%'
  | 'D' | 'D%'
  | 'CR' | 'CD'
  | 'AD' | 'GD' | 'FD' | 'ED' | 'HD' | 'SD'
  | 'BA' | 'HA' | 'RS' | 'RL'
  | 'ER';

export type LBSortDirection = 'asc' | 'desc';

export interface LBStatEntry {
  code: LBStatCode;
  label: string;
}

export const LB_STAT_ENTRIES: LBStatEntry[] = [
  { code: 'A', label: 'ATK' },
  { code: 'H', label: 'HP' },
  { code: 'D', label: 'DEF' },
  { code: 'A%', label: 'ATK%' },
  { code: 'H%', label: 'HP%' },
  { code: 'D%', label: 'DEF%' },
  { code: 'ER', label: 'Energy Regen' },
  { code: 'CR', label: 'Crit Rate' },
  { code: 'CD', label: 'Crit DMG' },
  { code: 'AD', label: 'Aero DMG' },
  { code: 'GD', label: 'Glacio DMG' },
  { code: 'FD', label: 'Fusion DMG' },
  { code: 'ED', label: 'Electro DMG' },
  { code: 'HD', label: 'Havoc DMG' },
  { code: 'SD', label: 'Spectro DMG' },
  { code: 'BA', label: 'Basic Attack DMG Bonus' },
  { code: 'HA', label: 'Heavy Attack DMG Bonus' },
  { code: 'RS', label: 'Resonance Skill DMG Bonus' },
  { code: 'RL', label: 'Resonance Liberation DMG Bonus' },
  { code: 'HB', label: 'Healing Bonus' },
];

function clampPageSize(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  const parsed = Math.trunc(Number(value));
  return Math.min(MAX_PAGE_SIZE, Math.max(1, parsed));
}

export interface LBEchoSetFilter {
  count: number;
  setId: number;
}

export interface LBEchoMainFilter {
  cost: number;
  statType: string;
}

export interface LBListBuildsQuery {
  page?: number;
  pageSize?: number;
  sort?: LBSortKey;
  direction?: LBSortDirection;
  characterIds?: string[];
  weaponIds?: string[];
  uid?: string;
  username?: string;
  regionPrefixes?: string[];
  echoSets?: LBEchoSetFilter[];
  echoMains?: LBEchoMainFilter[];
}

export interface LBBuildOwner {
  username: string;
  uid: string;
}

export interface LBBuildCharacter {
  id: string;
}

export interface LBBuildWeapon {
  id: string;
  level: number;
  rank: number;
}

export interface LBBuildEchoSummary {
  sets: Record<string, number>;
  mainStats: Array<{ cost: number; statType: string }>;
}

export interface LBBuildRowEntry {
  id: string;
  owner: LBBuildOwner;
  character: LBBuildCharacter;
  weapon: LBBuildWeapon;
  sequence: number;
  stats: Record<LBStatCode, number>;
  echoSummary: LBBuildEchoSummary;
  cv: number;
  timestamp: string;
}

export interface LBBuildDetailEntry extends LBBuildRowEntry {
  buildState: SavedState;
}

interface LBListBuildsResponseRaw {
  builds?: unknown[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface LBListBuildsResponse {
  builds: LBBuildRowEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCanonicalSavedState(value: unknown): value is SavedState {
  if (!isRecord(value)) return false;
  if (!('characterId' in value)) return false;
  if (!('weaponId' in value)) return false;
  if (!Array.isArray(value.echoPanels)) return false;
  if (!isRecord(value.watermark)) return false;
  return true;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMaybeJSON(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseBuildRowEntry(raw: unknown): LBBuildRowEntry {
  if (!isRecord(raw)) {
    throw new Error('LB row payload is malformed.');
  }

  const owner = isRecord(raw.owner) ? raw.owner : {};
  const character = isRecord(raw.character) ? raw.character : {};
  const weapon = isRecord(raw.weapon) ? raw.weapon : {};
  const echoSummary = isRecord(raw.echoSummary) ? raw.echoSummary : {};

  if (!('id' in raw) || !('owner' in raw) || !('character' in raw) || !('weapon' in raw) || !('echoSummary' in raw)) {
    throw new Error('LB row payload missing compact fields. Expected compact /build contract.');
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    owner: {
      username: typeof owner.username === 'string' ? owner.username : '',
      uid: typeof owner.uid === 'string' ? owner.uid : '',
    },
    character: {
      id: typeof character.id === 'string' ? character.id : '',
    },
    weapon: {
      id: typeof weapon.id === 'string' ? weapon.id : '',
      level: toFiniteNumber(weapon.level, 1),
      rank: toFiniteNumber(weapon.rank, 1),
    },
    sequence: toFiniteNumber(raw.sequence, 0),
    stats: (isRecord(raw.stats) ? raw.stats : {}) as Record<LBStatCode, number>,
    echoSummary: {
      sets: (isRecord(echoSummary.sets) ? echoSummary.sets : {}) as Record<string, number>,
      mainStats: Array.isArray(echoSummary.mainStats)
        ? echoSummary.mainStats
          .filter(isRecord)
          .map((entry) => ({
            cost: toFiniteNumber(entry.cost, 0),
            statType: typeof entry.statType === 'string' ? entry.statType : '',
          }))
        : [],
    },
    cv: toFiniteNumber(raw.cv),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
  };
}

function parseBuildDetailEntry(raw: unknown): LBBuildDetailEntry {
  if (!isRecord(raw)) {
    throw new Error('LB detail payload is malformed.');
  }

  const row = parseBuildRowEntry(raw);
  const buildState = parseMaybeJSON(raw.buildState);

  if (!isCanonicalSavedState(buildState)) {
    throw new Error('LB buildState is not in canonical SavedState format.');
  }

  const forte = Array.isArray(buildState.forte)
    ? buildState.forte
    : (DEFAULT_FORTE.map((entry) => [...entry]) as SavedState['forte']);

  return {
    ...row,
    buildState: { ...buildState, forte },
  };
}

function resolveLBBaseUrl(): string {
  return LB_PROXY_BASE;
}

export async function listBuilds(
  query: LBListBuildsQuery = {},
  signal?: AbortSignal,
): Promise<LBListBuildsResponse> {
  const params = new URLSearchParams();
  const pageSize = clampPageSize(query.pageSize);
  params.set('page', String(query.page ?? 1));
  params.set('size', String(pageSize));
  params.set('pageSize', String(pageSize));
  params.set('sort', query.sort ?? 'finalCV');
  params.set('direction', query.direction ?? 'desc');

  if (query.characterIds?.length) {
    params.set('characterId', JSON.stringify(query.characterIds));
  }
  if (query.weaponIds?.length) {
    params.set('weaponId', JSON.stringify(query.weaponIds));
  }
  if (query.uid) {
    params.set('uid', query.uid);
  }
  if (query.username) {
    params.set('username', query.username);
  }
  if (query.regionPrefixes?.length) {
    params.set('region', JSON.stringify(query.regionPrefixes));
  }
  if (query.echoSets?.length) {
    params.set(
      'echoSets',
      JSON.stringify(query.echoSets.map((entry) => [entry.count, entry.setId])),
    );
  }
  if (query.echoMains?.length) {
    params.set(
      'echoMains',
      JSON.stringify(query.echoMains.map((entry) => [entry.cost, entry.statType])),
    );
  }

  const requestUrl = `${resolveLBBaseUrl()}/build?${params.toString()}`;
  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch builds (${response.status})`);
  }

  const payload = await response.json() as LBListBuildsResponseRaw;
  const rawBuilds = Array.isArray(payload.builds) ? payload.builds : [];
  const builds: LBBuildRowEntry[] = [];
  
  for (const raw of rawBuilds) {
    try {
      builds.push(parseBuildRowEntry(raw));
    } catch (error) {
      console.warn('[LB] dropped malformed build row', {
        buildId: isRecord(raw) ? raw.id : undefined,
        error: error instanceof Error ? error.message : String(error),
        raw,
      });
    }
  }

  const emptySetRows = builds.filter((entry) => Object.keys(entry.echoSummary.sets).length === 0).length;
  console.log('[LB] /build compact rows payload', {
    requestUrl,
    query,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, pageSize),
    rawRowCount: rawBuilds.length,
    parsedRowCount: builds.length,
    droppedRowCount: Math.max(0, rawBuilds.length - builds.length),
    rowsWithEmptySets: emptySetRows,
  });

  return {
    builds,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, pageSize),
  };
}

// Leaderboard types

export interface LBWeaponTop {
  weaponId: string;
  damage: number;
  owner: { username: string; uid: string };
}

export interface LBCharacterOverview {
  id: string;
  totalEntries: number;
  weapons: LBWeaponTop[];
  weaponIds: string[];
  sequences: string[];
  teamCharacterIds: string[];
}

export interface LBLeaderboardEntry {
  id: string;
  buildState: SavedState;
  cv: number;
  cvPenalty: number;
  finalCV: number;
  timestamp: string;
  damage: number;
  filteredRank: number;
  globalRank: number;
  owner: { username: string; uid: string };
  character: { id: string; level: number; roverElement?: string };
  weapon: { id: string; level: number; rank: number };
  sequence: number;
}

export interface LBLeaderboardQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: LBSortDirection;
  weaponIds?: string[];
  uid?: string;
  username?: string;
  regionPrefixes?: string[];
  echoSets?: LBEchoSetFilter[];
  echoMains?: LBEchoMainFilter[];
  weaponIndex?: number;
  sequence?: string;
}

export interface LBLeaderboardResponse {
  builds: LBLeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  weaponIds: string[];
  sequences: string[];
}

function parseLeaderboardEntry(raw: unknown): LBLeaderboardEntry {
  if (!isRecord(raw)) {
    throw new Error('LB leaderboard row payload is malformed.');
  }

  const buildStateRaw = parseMaybeJSON(raw.buildState);
  if (!isCanonicalSavedState(buildStateRaw)) {
    throw new Error('LB leaderboard buildState is not in canonical SavedState format.');
  }

  const forte = Array.isArray(buildStateRaw.forte)
    ? buildStateRaw.forte
    : (DEFAULT_FORTE.map((entry) => [...entry]) as SavedState['forte']);

  const buildState: SavedState = { ...buildStateRaw, forte };
  const watermark = isRecord(buildStateRaw.watermark) ? buildStateRaw.watermark : null;

  return {
    id: typeof raw._id === 'string' ? raw._id : '',
    buildState,
    cv: toFiniteNumber(raw.cv),
    cvPenalty: toFiniteNumber(raw.cvPenalty),
    finalCV: toFiniteNumber(raw.finalCV),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
    damage: toFiniteNumber(raw.damage),
    filteredRank: toFiniteNumber(raw.filteredRank, 0),
    globalRank: toFiniteNumber(raw.globalRank, 0),
    owner: {
      username: watermark && typeof watermark.username === 'string' ? watermark.username : '',
      uid: watermark && typeof watermark.uid === 'string' ? watermark.uid : '',
    },
    character: {
      id: typeof buildState.characterId === 'string' ? buildState.characterId : '',
      level: toFiniteNumber(buildState.characterLevel, 1),
      roverElement: typeof buildState.roverElement === 'string' ? buildState.roverElement : undefined,
    },
    weapon: {
      id: typeof buildState.weaponId === 'string' ? buildState.weaponId : '',
      level: toFiniteNumber(buildState.weaponLevel, 1),
      rank: toFiniteNumber(buildState.weaponRank, 1),
    },
    sequence: toFiniteNumber(buildState.sequence, 0),
  };
}

export async function listLeaderboardOverview(signal?: AbortSignal): Promise<LBCharacterOverview[]> {
  const requestUrl = `${resolveLBBaseUrl()}/leaderboard`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard overview (${response.status})`);
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

    result.push({
      id: typeof raw._id === 'string' ? raw._id : '',
      totalEntries: toFiniteNumber(raw.totalEntries),
      weapons,
      weaponIds: Array.isArray(raw.weaponIds) ? raw.weaponIds.filter((v): v is string => typeof v === 'string') : [],
      sequences: Array.isArray(raw.sequences) ? raw.sequences.filter((v): v is string => typeof v === 'string') : [],
      teamCharacterIds: Array.isArray(raw.teamCharacterIds) ? raw.teamCharacterIds.filter((v): v is string => typeof v === 'string') : [],
    });
  }

  return result;
}

export async function listLeaderboard(
  characterId: string,
  query: LBLeaderboardQuery,
  signal?: AbortSignal,
): Promise<LBLeaderboardResponse> {
  const params = new URLSearchParams();
  const pageSize = clampPageSize(query.pageSize);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(pageSize));
  if (query.sort) params.set('sort', query.sort);
  if (query.direction) params.set('direction', query.direction);
  if (query.weaponIndex !== undefined) params.set('weaponIndex', String(query.weaponIndex));
  if (query.sequence) params.set('sequence', query.sequence);
  if (query.weaponIds?.length) params.set('weaponId', JSON.stringify(query.weaponIds));
  if (query.uid) params.set('uid', query.uid);
  if (query.username) params.set('username', query.username);
  if (query.regionPrefixes?.length) params.set('region', JSON.stringify(query.regionPrefixes));
  if (query.echoSets?.length) {
    params.set('echoSets', JSON.stringify(query.echoSets.map((entry) => [entry.count, entry.setId])));
  }
  if (query.echoMains?.length) {
    params.set('echoMains', JSON.stringify(query.echoMains.map((entry) => [entry.cost, entry.statType])));
  }

  const requestUrl = `${resolveLBBaseUrl()}/leaderboard/${encodeURIComponent(characterId)}?${params.toString()}`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard (${response.status})`);
  }

  const payload = await response.json() as { builds?: unknown[]; total?: number; page?: number; pageSize?: number; weaponIds?: unknown[]; sequences?: unknown[] };
  const rawBuilds = Array.isArray(payload.builds) ? payload.builds : [];
  const builds: LBLeaderboardEntry[] = [];

  for (const raw of rawBuilds) {
    try {
      builds.push(parseLeaderboardEntry(raw));
    } catch (error) {
      console.warn('[LB] dropped malformed leaderboard row', {
        buildId: isRecord(raw) ? raw._id : undefined,
        error: error instanceof Error ? error.message : String(error),
        raw,
      });
    }
  }

  return {
    builds,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, pageSize),
    weaponIds: Array.isArray(payload.weaponIds) ? (payload.weaponIds as unknown[]).filter((v): v is string => typeof v === 'string') : [],
    sequences: Array.isArray(payload.sequences) ? (payload.sequences as unknown[]).filter((v): v is string => typeof v === 'string') : [],
  };
}

// Build by ID

export async function getBuildById(buildId: string, signal?: AbortSignal): Promise<LBBuildDetailEntry> {
  const trimmedBuildId = buildId.trim();
  if (!trimmedBuildId) {
    throw new Error('Build id is required.');
  }

  const requestUrl = `${resolveLBBaseUrl()}/build/${encodeURIComponent(trimmedBuildId)}`;
  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch build detail (${response.status})`);
  }

  const payload = await response.json();
  const detail = parseBuildDetailEntry(payload);

  console.log('[LB] /build/{id} detail payload', {
    requestUrl,
    buildId: trimmedBuildId,
    echoPanelCount: detail.buildState.echoPanels.length,
    setIds: Object.keys(detail.echoSummary.sets),
  });

  return detail;
}
