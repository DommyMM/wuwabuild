import { DEFAULT_FORTE, SavedState } from '@/lib/build';
import { toMainStatApiValue } from '@/lib/mainStatFilters';

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

function appendStringParams(params: URLSearchParams, key: string, values: string[] | undefined): void {
  if (!values?.length) return;

  for (const value of values.map((entry) => entry.trim()).filter(Boolean)) {
    params.append(key, value);
  }
}

function serializeEchoSetFilters(filters: LBEchoSetFilter[] | undefined): string | null {
  if (!filters?.length) return null;
  return filters.map((entry) => `${entry.count}~${entry.setId}`).join('.');
}

function serializeEchoMainFilters(filters: LBEchoMainFilter[] | undefined): string | null {
  if (!filters?.length) return null;
  return filters.map((entry) => `${entry.cost}~${toMainStatApiValue(entry.statType)}`).join('.');
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

export interface LBMoveHitEntry {
  name: string;
  damage: number;
  percentage: number;
}

export interface LBMoveEntry {
  name: string;
  damage: number;
  hits: LBMoveHitEntry[];
}

export interface LBSubstatUpgradeTierSet {
  min: Record<string, number>;
  median: Record<string, number>;
  max: Record<string, number>;
  minRank: Record<string, number>;
  medianRank: Record<string, number>;
  maxRank: Record<string, number>;
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

function parseMoveEntry(raw: unknown): LBMoveEntry | null {
  if (!isRecord(raw)) return null;
  const hits = Array.isArray(raw.hits)
    ? raw.hits
      .filter(isRecord)
      .map((hit) => ({
        name: typeof hit.name === 'string' ? hit.name : '',
        damage: toFiniteNumber(hit.damage, 0),
        percentage: toFiniteNumber(hit.percentage, 0),
      }))
      .filter((hit) => hit.name.length > 0 || hit.damage > 0)
    : [];

  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    damage: toFiniteNumber(raw.damage, 0),
    hits,
  };
}

// parseUpgradeTierSet transposes the API's per-stat format
// { CritRate: { min, median, max, minRank, medianRank, maxRank }, ... }
// into the per-tier format the component expects.
function parseUpgradeTierSet(raw: unknown): LBSubstatUpgradeTierSet | null {
  if (!isRecord(raw)) return null;
  const min: Record<string, number> = {};
  const median: Record<string, number> = {};
  const max: Record<string, number> = {};
  const minRank: Record<string, number> = {};
  const medianRank: Record<string, number> = {};
  const maxRank: Record<string, number> = {};
  for (const [statKey, tierData] of Object.entries(raw)) {
    if (!isRecord(tierData)) continue;
    min[statKey] = toFiniteNumber(tierData.min, 0);
    median[statKey] = toFiniteNumber(tierData.median, 0);
    max[statKey] = toFiniteNumber(tierData.max, 0);
    minRank[statKey] = toFiniteNumber(tierData.minRank, 0);
    medianRank[statKey] = toFiniteNumber(tierData.medianRank, 0);
    maxRank[statKey] = toFiniteNumber(tierData.maxRank, 0);
  }
  if (Object.keys(min).length === 0) return null;
  return { min, median, max, minRank, medianRank, maxRank };
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
  params.set('pageSize', String(pageSize));
  params.set('sort', toLBApiSortKey(query.sort ?? 'finalCV'));
  params.set('direction', query.direction ?? 'desc');

  appendStringParams(params, 'characterId', query.characterIds);
  appendStringParams(params, 'weaponId', query.weaponIds);
  if (query.uid) {
    params.set('uid', query.uid);
  }
  if (query.username) {
    params.set('username', query.username);
  }
  appendStringParams(params, 'region', query.regionPrefixes);
  const echoSets = serializeEchoSetFilters(query.echoSets);
  if (echoSets) {
    params.set('echoSets', echoSets);
  }
  const echoMains = serializeEchoMainFilters(query.echoMains);
  if (echoMains) {
    params.set('echoMains', echoMains);
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

export interface LBTeamMemberConfig {
  charId: string;
  weaponId?: string;
  refinement?: number;
  setId?: string;
  echoId?: string;
}

export interface LBTrack {
  key: string;
  label: string;
  note?: string;
}

export function isHealTrackKey(trackKey: string | null | undefined): boolean {
  return typeof trackKey === 'string' && trackKey.startsWith('heal_');
}

export interface LBCharacterOverview {
  id: string;
  trackKey: string;
  trackLabel: string;
  totalEntries: number;
  weapons: LBWeaponTop[];
  weaponIds: string[]; // derived from weapons array
  teamCharacterIds: string[];
  teamMembers: LBTeamMemberConfig[];
}

export interface LBLeaderboardEntry {
  id: string;
  cv: number;
  cvPenalty: number;
  finalCV: number;
  timestamp: string;
  damage: number;
  globalRank: number;
  stats: Record<LBStatCode, number>;
  owner: { username: string; uid: string };
  character: { id: string; level: number; roverElement?: string };
  weapon: { id: string; level: number; rank: number };
  sequence: number;
  echoSummary: LBBuildEchoSummary;
}

export interface LBLeaderboardQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: LBSortDirection;
  weaponId?: string;
  uid?: string;
  username?: string;
  regionPrefixes?: string[];
  echoSets?: LBEchoSetFilter[];
  echoMains?: LBEchoMainFilter[];
  track?: string;
}

export interface LBLeaderboardResponse {
  builds: LBLeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  weaponIds: string[];
  tracks: LBTrack[];
  teamCharacterIds: string[];
  teamMembers: LBTeamMemberConfig[];
  activeWeaponId: string;
  activeTrack: string;
}

export type LBLeaderboardCharacterConfig = Pick<
  LBLeaderboardResponse,
  'weaponIds' | 'tracks' | 'teamCharacterIds' | 'teamMembers' | 'activeWeaponId' | 'activeTrack'
>;

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
  const row = parseBuildRowEntry(raw);
  const character = isRecord(raw.character) ? raw.character : {};

  return {
    id: row.id,
    cv: row.cv,
    cvPenalty: toFiniteNumber(raw.cvPenalty),
    finalCV: toFiniteNumber(raw.finalCV, row.cv),
    timestamp: row.timestamp,
    damage: toFiniteNumber(raw.damage),
    globalRank: toFiniteNumber(raw.globalRank, 0),
    stats: parseStatsRecord(raw),
    owner: row.owner,
    character: {
      id: row.character.id,
      level: toFiniteNumber(character.level, 1),
      roverElement: typeof character.roverElement === 'string' ? character.roverElement : undefined,
    },
    weapon: row.weapon,
    sequence: row.sequence,
    echoSummary: row.echoSummary,
  };
}

function parseTracks(raw: unknown): LBTrack[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((track) => ({
      key: typeof track.key === 'string' ? track.key : '',
      label: typeof track.label === 'string' ? track.label : '',
      note: typeof track.note === 'string' ? track.note : undefined,
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
      id: typeof raw._id === 'string' ? raw._id : (typeof raw.id === 'string' ? raw.id : ''),
      trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
      trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
      totalEntries: toFiniteNumber(raw.totalEntries),
      weapons,
      weaponIds: weapons.map((w) => w.weaponId).filter(Boolean),
      teamCharacterIds: Array.isArray(raw.teamCharacterIds) ? raw.teamCharacterIds.filter((v): v is string => typeof v === 'string') : [],
      teamMembers: parseTeamMembers(raw.teamMembers),
    });
  }

  return result;
}

export async function listLeaderboard(
  characterId: string,
  query: LBLeaderboardQuery,
  signal?: AbortSignal,
): Promise<LBLeaderboardResponse> {
  const params = buildLeaderboardSearchParams(query);
  const pageSize = clampPageSize(query.pageSize);
  const requestUrl = `${resolveLBBaseUrl()}/leaderboard/${encodeURIComponent(characterId)}?${params.toString()}`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard (${response.status})`);
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
    tracks: parseTracks(payload.tracks),
    teamCharacterIds: Array.isArray(payload.teamCharacterIds) ? payload.teamCharacterIds.filter((v): v is string => typeof v === 'string') : [],
    teamMembers: parseTeamMembers(payload.teamMembers),
    activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
    activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
  };
}

export function buildLeaderboardSearchParams(query: LBLeaderboardQuery): URLSearchParams {
  const params = new URLSearchParams();
  const pageSize = clampPageSize(query.pageSize);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(pageSize));
  if (query.sort) params.set('sort', toLBApiSortKey(query.sort));
  if (query.direction) params.set('direction', query.direction);
  if (query.track) params.set('track', query.track);
  if (query.weaponId) params.set('weaponId', query.weaponId);
  if (query.uid) params.set('uid', query.uid);
  if (query.username) params.set('username', query.username);
  appendStringParams(params, 'region', query.regionPrefixes);
  const leaderboardEchoSets = serializeEchoSetFilters(query.echoSets);
  if (leaderboardEchoSets) params.set('echoSets', leaderboardEchoSets);
  const leaderboardEchoMains = serializeEchoMainFilters(query.echoMains);
  if (leaderboardEchoMains) params.set('echoMains', leaderboardEchoMains);
  return params;
}

export async function getLeaderboardCharacterConfig(
  characterId: string,
  signal?: AbortSignal,
): Promise<LBLeaderboardCharacterConfig> {
  const response = await listLeaderboard(characterId, {
    page: 1,
    pageSize: 1,
    sort: 'damage',
    direction: 'desc',
  }, signal);

  return {
    weaponIds: response.weaponIds,
    tracks: response.tracks,
    teamCharacterIds: response.teamCharacterIds,
    teamMembers: response.teamMembers,
    activeWeaponId: response.activeWeaponId,
    activeTrack: response.activeTrack,
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

export async function getBuildMoves(
  buildId: string,
  weaponId: string,
  trackKey: string,
  signal?: AbortSignal,
): Promise<LBMoveEntry[]> {
  const requestUrl = `${resolveLBBaseUrl()}/build/${encodeURIComponent(buildId)}/moves/${encodeURIComponent(weaponId)}/${encodeURIComponent(trackKey)}`;
  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
  });

  if (response.status === 404) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Ignore malformed error bodies for debug logging.
    }
    console.warn('[LB] /build/{id}/moves payload (404)', {
      requestUrl,
      buildId,
      weaponId,
      trackKey,
      payload,
    });
    return [];
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch build moves (${response.status})`);
  }

  const payload = await response.json() as { moves?: unknown };
  let parsed: LBMoveEntry[] = [];
  if (Array.isArray(payload.moves)) {
    parsed = payload.moves
      .map(parseMoveEntry)
      .filter((entry): entry is LBMoveEntry => entry !== null && (entry.name.length > 0 || entry.damage > 0));
  } else if (isRecord(payload.moves)) {
    parsed = Object.entries(payload.moves)
      .map(([name, damage]) => ({
        name,
        damage: toFiniteNumber(damage, 0),
        hits: [],
      }))
      .filter((entry) => entry.name.length > 0 || entry.damage > 0);
  }
  console.log('[LB] /build/{id}/moves payload', {
    requestUrl,
    buildId,
    weaponId,
    trackKey,
    payload,
  });
  return parsed;
}

export async function getBuildSubstatUpgrades(
  buildId: string,
  weaponId: string,
  trackKey: string,
  signal?: AbortSignal,
): Promise<LBSubstatUpgradeTierSet | null> {
  const requestUrl = `${resolveLBBaseUrl()}/build/${encodeURIComponent(buildId)}/substat-upgrades/${encodeURIComponent(weaponId)}/${encodeURIComponent(trackKey)}`;
  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
  });

  if (response.status === 404) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Ignore malformed error bodies for debug logging.
    }
    console.warn('[LB] /build/{id}/substat-upgrades payload (404)', {
      requestUrl,
      buildId,
      weaponId,
      trackKey,
      payload,
    });
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch substat upgrades (${response.status})`);
  }

  const payload = await response.json() as { weaponId?: unknown; track?: unknown; tiers?: unknown };
  const parsed = parseUpgradeTierSet(payload.tiers);

  console.log('[LB] /build/{id}/substat-upgrades payload', {
    requestUrl,
    buildId,
    weaponId,
    trackKey,
    payload,
  });
  return parsed;
}

export interface LBStandingEntry {
  key: string;
  weaponId: string;
  trackKey: string;
  rank: number;
  total: number;
  trackLabel: string;
  teamCharacterIds: string[];
  damage: number;
}

export async function getBuildStandings(
  characterId: string,
  buildId: string,
  signal?: AbortSignal,
): Promise<LBStandingEntry[]> {
  const requestUrl = `${resolveLBBaseUrl()}/leaderboard/${encodeURIComponent(characterId)}/build/${encodeURIComponent(buildId)}/standings`;
  const response = await fetch(requestUrl, { method: 'GET', signal });

  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch standings (${response.status})`);
  }

  const payload = await response.json() as { standings?: unknown };
  console.log('[LB] /leaderboard/{id}/build/{id}/standings payload', { requestUrl, characterId, buildId, payload });
  if (!Array.isArray(payload.standings)) return [];

  const result: LBStandingEntry[] = [];
  for (const raw of payload.standings) {
    if (!isRecord(raw)) continue;
    result.push({
      key: typeof raw.key === 'string' ? raw.key : '',
      weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
      trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
      rank: toFiniteNumber(raw.rank, 0),
      total: toFiniteNumber(raw.total, 0),
      trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
      teamCharacterIds: Array.isArray(raw.teamCharacterIds)
        ? raw.teamCharacterIds.filter((v): v is string => typeof v === 'string')
        : [],
      damage: toFiniteNumber(raw.damage, 0),
    });
  }
  return result;
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
