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

export type LBStatSortKey =
  | 'hp' | 'hp_pct'
  | 'atk' | 'atk_pct'
  | 'def' | 'def_pct'
  | 'crit_rate' | 'crit_dmg'
  | 'aero_dmg' | 'glacio_dmg' | 'fusion_dmg' | 'electro_dmg' | 'havoc_dmg' | 'spectro_dmg'
  | 'basic_attack_dmg' | 'heavy_attack_dmg' | 'resonance_skill_dmg' | 'resonance_liberation_dmg'
  | 'energy_regen' | 'healing_bonus';

export type LBSortKey = 'finalCV' | 'timestamp' | 'characterId' | LBStatSortKey;
export type LBLeaderboardSortKey = Exclude<LBSortKey, 'characterId'> | 'damage';

export type LBSortDirection = 'asc' | 'desc';

export interface LBStatEntry {
  code: LBStatCode;
  sortKey: LBStatSortKey;
  label: string;
}

export const LB_STAT_ENTRIES: LBStatEntry[] = [
  { code: 'A', sortKey: 'atk', label: 'ATK' },
  { code: 'H', sortKey: 'hp', label: 'HP' },
  { code: 'D', sortKey: 'def', label: 'DEF' },
  { code: 'A%', sortKey: 'atk_pct', label: 'ATK%' },
  { code: 'H%', sortKey: 'hp_pct', label: 'HP%' },
  { code: 'D%', sortKey: 'def_pct', label: 'DEF%' },
  { code: 'ER', sortKey: 'energy_regen', label: 'Energy Regen' },
  { code: 'CR', sortKey: 'crit_rate', label: 'Crit Rate' },
  { code: 'CD', sortKey: 'crit_dmg', label: 'Crit DMG' },
  { code: 'AD', sortKey: 'aero_dmg', label: 'Aero DMG' },
  { code: 'GD', sortKey: 'glacio_dmg', label: 'Glacio DMG' },
  { code: 'FD', sortKey: 'fusion_dmg', label: 'Fusion DMG' },
  { code: 'ED', sortKey: 'electro_dmg', label: 'Electro DMG' },
  { code: 'HD', sortKey: 'havoc_dmg', label: 'Havoc DMG' },
  { code: 'SD', sortKey: 'spectro_dmg', label: 'Spectro DMG' },
  { code: 'BA', sortKey: 'basic_attack_dmg', label: 'Basic Attack DMG Bonus' },
  { code: 'HA', sortKey: 'heavy_attack_dmg', label: 'Heavy Attack DMG Bonus' },
  { code: 'RS', sortKey: 'resonance_skill_dmg', label: 'Resonance Skill DMG Bonus' },
  { code: 'RL', sortKey: 'resonance_liberation_dmg', label: 'Resonance Liberation DMG Bonus' },
  { code: 'HB', sortKey: 'healing_bonus', label: 'Healing Bonus' },
];

const LB_SORT_KEY_SET: ReadonlySet<LBSortKey> = new Set([
  'finalCV', 'timestamp', 'characterId',
  ...LB_STAT_ENTRIES.map((entry) => entry.sortKey),
]);

const LB_STAT_CODE_BY_SORT_KEY: Record<LBStatSortKey, LBStatCode> = Object.fromEntries(
  LB_STAT_ENTRIES.map((entry) => [entry.sortKey, entry.code]),
 ) as Record<LBStatSortKey, LBStatCode>;

const LB_LEADERBOARD_SORT_KEY_SET: ReadonlySet<LBLeaderboardSortKey> = new Set([
  'finalCV',
  'timestamp',
  ...LB_STAT_ENTRIES.map((entry) => entry.sortKey),
  'damage',
]);

export function getLBStatCode(sortKey: LBStatSortKey): LBStatCode {
  return LB_STAT_CODE_BY_SORT_KEY[sortKey];
}

export function toLBApiSortKey(sort: string | undefined): string {
  if (!sort) return 'finalCV';
  return sort;
}

export function normalizeLBSortKey(
  value: string | null | undefined,
  fallback: LBSortKey = 'finalCV',
): LBSortKey {
  if (!value) return fallback;
  if (LB_SORT_KEY_SET.has(value as LBSortKey)) {
    return value as LBSortKey;
  }
  return fallback;
}

export function normalizeLBLeaderboardSortKey(
  value: string | null | undefined,
  fallback: LBLeaderboardSortKey = 'damage',
): LBLeaderboardSortKey {
  if (!value) return fallback;
  if (LB_LEADERBOARD_SORT_KEY_SET.has(value as LBLeaderboardSortKey)) {
    return value as LBLeaderboardSortKey;
  }
  return fallback;
}

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

export function isRecord(value: unknown): value is Record<string, unknown> {
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

export function toFiniteNumber(value: unknown, fallback = 0): number {
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

function parseStatsRecord(raw: Record<string, unknown>): Record<LBStatCode, number> {
  return {
    H: toFiniteNumber(raw.statHP),
    'H%': toFiniteNumber(raw.statHPPct),
    A: toFiniteNumber(raw.statATK),
    'A%': toFiniteNumber(raw.statATKPct),
    D: toFiniteNumber(raw.statDEF),
    'D%': toFiniteNumber(raw.statDEFPct),
    CR: toFiniteNumber(raw.statCritRate),
    CD: toFiniteNumber(raw.statCritDmg),
    AD: toFiniteNumber(raw.statAeroDmg),
    GD: toFiniteNumber(raw.statGlacioDmg),
    FD: toFiniteNumber(raw.statFusionDmg),
    ED: toFiniteNumber(raw.statElectroDmg),
    HD: toFiniteNumber(raw.statHavocDmg),
    SD: toFiniteNumber(raw.statSpectroDmg),
    BA: toFiniteNumber(raw.statBasicAttackDmg),
    HA: toFiniteNumber(raw.statHeavyAttackDmg),
    RS: toFiniteNumber(raw.statResonanceSkillDmg),
    RL: toFiniteNumber(raw.statResonanceLiberationDmg),
    ER: toFiniteNumber(raw.statEnergyRegen),
    HB: toFiniteNumber(raw.statHealingBonus),
  };
}

export function parseBuildRowEntry(raw: unknown): LBBuildRowEntry {
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
    stats: parseStatsRecord(raw),
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
  params.set('sort', toLBApiSortKey(query.sort ?? 'finalCV'));
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

  console.log('[LB] /build compact rows payload', {
    requestUrl,
    query,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, pageSize),
    droppedRows: Math.max(0, rawBuilds.length - builds.length),
    builds: builds
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
  stats: Record<LBStatCode, number>;
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

export interface LBSubmitBuildResult {
  id: string;
  requestId?: string;
  action: string;
  damageComputed: boolean;
  warnings: string[];
}

export function parseLeaderboardEntry(raw: unknown): LBLeaderboardEntry {
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
    stats: parseStatsRecord(raw),
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
  if (query.sort) params.set('sort', toLBApiSortKey(query.sort));
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
    payload: payload
  });

  return detail;
}

function parseSubmitBuildResult(raw: unknown): LBSubmitBuildResult {
  if (!isRecord(raw)) {
    throw new Error('LB submit response is malformed.');
  }

  return {
    id: typeof raw._id === 'string' ? raw._id : '',
    requestId: typeof raw.requestId === 'string' ? raw.requestId : undefined,
    action: typeof raw.action === 'string' ? raw.action : 'updated',
    damageComputed: Boolean(raw.damageComputed),
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.length > 0)
      : [],
  };
}

export async function submitBuild(
  buildState: SavedState,
  signal?: AbortSignal,
): Promise<LBSubmitBuildResult> {
  const response = await fetch(`${resolveLBBaseUrl()}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ buildState }),
    signal,
  });

  if (!response.ok) {
    let message = `Failed to submit build (${response.status})`;

    try {
      const payload = await response.json() as { error?: string; message?: string };
      message = payload.error || payload.message || message;
    } catch {
      // Keep the generic message if the error response is not JSON.
    }

    throw new Error(message);
  }

  const payload = await response.json();
  return parseSubmitBuildResult(payload);
}
