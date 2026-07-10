import { DEFAULT_FORTE, ForteState, SavedState } from '@/lib/build';
import { EchoPanelState } from '@/lib/echo';
import { toMainStatApiValue } from '@/lib/mainStatFilters';
import { isPercentStat } from '@/lib/constants/statMappings';

import { LB_API_BASE } from '@/lib/apiEndpoints';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

export type LBStatCode =
  | 'H'
  | 'H%'
  | 'A'
  | 'A%'
  | 'D'
  | 'D%'
  | 'CR'
  | 'CD'
  | 'AD'
  | 'GD'
  | 'FD'
  | 'ED'
  | 'HD'
  | 'SD'
  | 'BA'
  | 'HA'
  | 'RS'
  | 'RL'
  | 'ER'
  | 'HB';

export type LBStatSortKey =
  | 'hp' | 'hp_pct'
  | 'atk' | 'atk_pct'
  | 'def' | 'def_pct'
  | 'crit_rate' | 'crit_dmg'
  | 'aero_dmg' | 'glacio_dmg' | 'fusion_dmg' | 'electro_dmg' | 'havoc_dmg' | 'spectro_dmg'
  | 'basic_attack_dmg' | 'heavy_attack_dmg' | 'resonance_skill_dmg' | 'resonance_liberation_dmg'
  | 'energy_regen' | 'healing_bonus';

export type LBSortKey = 'finalCV' | 'timestamp' | 'characterId' | 'sequence' | LBStatSortKey;
export type LBLeaderboardSortKey = Exclude<LBSortKey, 'characterId'> | 'damage';

export type LBSortDirection = 'asc' | 'desc';

export interface LBStatEntry {
  code: LBStatCode;
  sortKey: LBStatSortKey;
  label: string;
  echoSubstat?: boolean;
}

// Percent is not stored here: it derives from the single base-stat rule (only
// the flat ATK/HP/DEF are non-percent). See isLBPercentStatSortKey.
export const LB_STAT_ENTRIES: readonly LBStatEntry[] = [
  { code: 'A', sortKey: 'atk', label: 'ATK', echoSubstat: true },
  { code: 'H', sortKey: 'hp', label: 'HP', echoSubstat: true },
  { code: 'D', sortKey: 'def', label: 'DEF', echoSubstat: true },
  { code: 'A%', sortKey: 'atk_pct', label: 'ATK%', echoSubstat: true },
  { code: 'H%', sortKey: 'hp_pct', label: 'HP%', echoSubstat: true },
  { code: 'D%', sortKey: 'def_pct', label: 'DEF%', echoSubstat: true },
  { code: 'ER', sortKey: 'energy_regen', label: 'Energy Regen', echoSubstat: true },
  { code: 'CR', sortKey: 'crit_rate', label: 'Crit Rate', echoSubstat: true },
  { code: 'CD', sortKey: 'crit_dmg', label: 'Crit DMG', echoSubstat: true },
  { code: 'AD', sortKey: 'aero_dmg', label: 'Aero DMG' },
  { code: 'GD', sortKey: 'glacio_dmg', label: 'Glacio DMG' },
  { code: 'FD', sortKey: 'fusion_dmg', label: 'Fusion DMG' },
  { code: 'ED', sortKey: 'electro_dmg', label: 'Electro DMG' },
  { code: 'HD', sortKey: 'havoc_dmg', label: 'Havoc DMG' },
  { code: 'SD', sortKey: 'spectro_dmg', label: 'Spectro DMG' },
  { code: 'BA', sortKey: 'basic_attack_dmg', label: 'Basic Attack DMG Bonus', echoSubstat: true },
  { code: 'HA', sortKey: 'heavy_attack_dmg', label: 'Heavy Attack DMG Bonus', echoSubstat: true },
  { code: 'RS', sortKey: 'resonance_skill_dmg', label: 'Resonance Skill DMG Bonus', echoSubstat: true },
  { code: 'RL', sortKey: 'resonance_liberation_dmg', label: 'Resonance Liberation DMG Bonus', echoSubstat: true },
  { code: 'HB', sortKey: 'healing_bonus', label: 'Healing Bonus' },
];

const LB_STAT_SORT_KEY_SET: ReadonlySet<LBStatSortKey> = new Set(
  LB_STAT_ENTRIES.map((entry) => entry.sortKey),
);
export const LB_ECHO_SUBSTAT_SORT_KEYS = LB_STAT_ENTRIES
  .filter((entry) => entry.echoSubstat)
  .map((entry) => entry.sortKey);

const LB_SORT_KEY_SET: ReadonlySet<LBSortKey> = new Set([
  'finalCV', 'timestamp', 'characterId', 'sequence',
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

function isLBStatSortKey(value: unknown): value is LBStatSortKey {
  return typeof value === 'string' && LB_STAT_SORT_KEY_SET.has(value as LBStatSortKey);
}

export function isLBEchoSubstatSortKey(value: unknown): value is LBStatSortKey {
  return typeof value === 'string' && LB_ECHO_SUBSTAT_SORT_KEYS.includes(value as LBStatSortKey);
}

export function getLBStatLabel(sortKey: LBStatSortKey): string {
  return LB_STAT_ENTRIES.find((entry) => entry.sortKey === sortKey)?.label ?? sortKey;
}

export function getLBStatSortKeyForLabel(label: string | null | undefined): LBStatSortKey | null {
  if (!label) return null;
  return LB_STAT_ENTRIES.find((entry) => entry.label === label)?.sortKey ?? null;
}

// Single source for sort-key display labels: stat keys resolve through the
// registry, the non-stat keys (CV/date/sequence/character) are named here.
export function getLBSortLabel(sortKey: LBSortKey): string {
  if (isLBStatSortKey(sortKey)) return getLBStatLabel(sortKey);
  switch (sortKey) {
    case 'finalCV': return 'Crit Value';
    case 'sequence': return 'Sequence';
    case 'timestamp': return 'Date';
    default: return sortKey;
  }
}

// Percent derives from the single base-stat rule (isPercentStat): only the flat
// base stats (ATK/HP/DEF) are non-percent; every other stat is a percent.
export function isLBPercentStatSortKey(sortKey: LBSortKey | LBLeaderboardSortKey | LBStatSortKey): boolean {
  if (!isLBStatSortKey(sortKey)) return false;
  return isPercentStat(getLBStatLabel(sortKey));
}

export function parseLeaderboardDisplayStats(raw: unknown): LBStatSortKey[] {
  if (!Array.isArray(raw)) return [];
  const result: LBStatSortKey[] = [];
  for (const value of raw) {
    if (!isLBStatSortKey(value) || result.includes(value)) continue;
    result.push(value);
  }
  return result;
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
  return filters.map((entry) => `${entry.count}-${entry.setId}`).join('.');
}

function serializeEchoMainFilters(filters: LBEchoMainFilter[] | undefined): string | null {
  if (!filters?.length) return null;
  return filters.map((entry) => `${entry.cost}-${toMainStatApiValue(entry.statType)}`).join('.');
}

// Appends structured build filters shared by /build and /leaderboard: a card-sequence
// level set (`seq=0,4,6`, matches builds whose sequence ∈ set) and compact stat
// thresholds (`stats=<sortKey>:<op>:<value>.<sortKey>:<op>:<value>`).
function appendBuildFilterParams(
  params: URLSearchParams,
  query: { sequences?: number[]; statFilters?: LBStatThreshold[] },
): void {
  const sequences = (query.sequences ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (sequences.length) params.set('seq', sequences.join(','));
  const statFilters = (query.statFilters ?? [])
    .filter((filter) => isLBStatSortKey(filter.stat) && Number.isFinite(filter.value) && (filter.op === 'gte' || filter.op === 'lte'))
    .map((filter) => `${filter.stat}:${filter.op}:${filter.value}`);
  if (statFilters.length) params.set('stats', statFilters.join('.'));
}

export interface LBEchoSetFilter {
  count: number;
  setId: number;
}

export interface LBEchoMainFilter {
  cost: number;
  statType: string;
}

export type LBStatFilterOp = 'gte' | 'lte';

/** A single "stat ≥/≤ value" threshold. Serialized inside compact `stats=` CSV-ish query data. */
export interface LBStatThreshold {
  stat: LBStatSortKey;
  op: LBStatFilterOp;
  value: number;
}

interface LBListBuildsQuery {
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
  sequences?: number[];
  statFilters?: LBStatThreshold[];
}

interface LBBuildOwner {
  username: string;
  uid: string;
}

interface LBBuildCharacter {
  id: string;
}

interface LBBuildWeapon {
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

interface LBMoveHitEntry {
  name: string;
  damage: number;
  percentage: number;
}

export interface LBMoveEntry {
  name: string;
  damage: number;
  elemType?: string;
  moveTypes?: string[];
  hits: LBMoveHitEntry[];
}

export interface LBSubstatUpgradeTierSet {
  min: Record<string, number>;
  median: Record<string, number>;
  max: Record<string, number>;
  minRank: Record<string, number>;
  medianRank: Record<string, number>;
  maxRank: Record<string, number>;
  /** Canonical Score for the current board, returned by the upgrades endpoint. */
  baseDamage?: number;
  /** Canonical Score rank for the current board, when visible/projectable. */
  currentRank?: number;
  currentRankVisible?: boolean;
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

  const moveTypes = Array.isArray(raw.moveTypes)
    ? raw.moveTypes.filter((t): t is string => typeof t === 'string')
    : undefined;

  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    damage: toFiniteNumber(raw.damage, 0),
    elemType: typeof raw.elemType === 'string' ? raw.elemType : undefined,
    moveTypes: moveTypes && moveTypes.length > 0 ? moveTypes : undefined,
    hits,
  };
}

// parseUpgradeTierSet transposes the API's per-stat format
// { crit_rate: { min, median, max, minRank, medianRank, maxRank }, ... }
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
  return LB_API_BASE;
}

function buildBuildListSearchParams(query: LBListBuildsQuery, includeOwnerFilters: boolean): URLSearchParams {
  const params = new URLSearchParams();
  const pageSize = clampPageSize(query.pageSize);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(pageSize));
  params.set('sort', toLBApiSortKey(query.sort ?? 'finalCV'));
  params.set('direction', query.direction ?? 'desc');

  appendStringParams(params, 'characterId', query.characterIds);
  appendStringParams(params, 'weaponId', query.weaponIds);
  if (includeOwnerFilters) {
    if (query.uid) {
      params.set('uid', query.uid);
    }
    if (query.username) {
      params.set('username', query.username);
    }
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
  appendBuildFilterParams(params, query);

  return params;
}

function parseBuildListResponsePayload(
  payload: LBListBuildsResponseRaw,
  fallbackPage: number,
  fallbackPageSize: number,
): LBListBuildsResponse {
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

  return {
    builds,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, fallbackPage),
    pageSize: toFiniteNumber(payload.pageSize, fallbackPageSize),
  };
}

export async function listBuilds(
  query: LBListBuildsQuery = {},
  signal?: AbortSignal,
): Promise<LBListBuildsResponse> {
  const params = buildBuildListSearchParams(query, true);
  const pageSize = clampPageSize(query.pageSize);

  const requestUrl = `${resolveLBBaseUrl()}/build?${params.toString()}`;
  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch builds (${response.status})`);
  }

  const payload = await response.json() as LBListBuildsResponseRaw;
  const parsed = parseBuildListResponsePayload(payload, query.page ?? 1, pageSize);
  console.log('[LB] build list fetch', {
    requestUrl,
    total: parsed.total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    rows: parsed.builds.length,
  });
  return parsed;
}

export async function listProfileBuilds(
  uid: string,
  query: Omit<LBListBuildsQuery, 'uid' | 'username'> = {},
  signal?: AbortSignal,
): Promise<LBListBuildsResponse> {
  const trimmedUid = uid.trim();
  if (!trimmedUid) {
    throw new Error('Profile uid is required.');
  }

  const params = buildBuildListSearchParams(query, false);
  const pageSize = clampPageSize(query.pageSize);
  const requestUrl = `${resolveLBBaseUrl()}/profile/${encodeURIComponent(trimmedUid)}/builds?${params.toString()}`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch profile builds (${response.status})`);
  }

  const payload = await response.json() as LBListBuildsResponseRaw;
  return parseBuildListResponsePayload(payload, query.page ?? 1, pageSize);
}

// Profile echo inventory -----------------------------------------------------
// Backed by GET /profile/{uid}/echoes. Sort keys map 1:1 to the backend
// echoSortClause whitelist: cv/rv/cost/mainStatValue/timestamp plus any substat
// stat key (snake_case, e.g. crit_dmg) which sorts by that sub_* column.

export type LBEchoSortKey =
  | 'cv'
  | 'rv'
  | 'cost'
  | 'mainStatValue'
  | 'timestamp'
  | 'crit_rate'
  | 'crit_dmg'
  | 'atk'
  | 'atk_pct'
  | 'hp'
  | 'hp_pct'
  | 'def'
  | 'def_pct'
  | 'energy_regen'
  | 'healing_bonus'
  | 'aero_dmg'
  | 'glacio_dmg'
  | 'fusion_dmg'
  | 'electro_dmg'
  | 'havoc_dmg'
  | 'spectro_dmg'
  | 'basic_attack_dmg'
  | 'heavy_attack_dmg'
  | 'resonance_liberation_dmg'
  | 'resonance_skill_dmg';

// panelData round-trips the stored echo panel; shape matches EchoPanelState.
interface LBEchoPanel {
  id: string | null;
  level: number;
  phantom: boolean;
  resolvedSetId: number | null;
  stats: {
    mainStat: { type: string | null; value: number | null };
    subStats: Array<{ type: string | null; value: number | null }>;
  };
}

export interface LBEcho {
  echoKey: string;
  echoId: string;
  cost: number;
  activeSetId: string;
  mainStatType: string;
  mainStatValue: number;
  substats: Record<string, number>;
  cv: number;
  rv: number;
  usageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  panel: LBEchoPanel | null;
}

export interface LBEchoListResponse {
  uid: string;
  echoes: LBEcho[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LBEchoListQuery {
  page?: number;
  pageSize?: number;
  sort?: LBEchoSortKey;
  direction?: LBSortDirection;
  costs?: number[];
  setIds?: string[];
  mainStatTypes?: string[];
}

function parseEchoPanel(raw: unknown): LBEchoPanel | null {
  if (!isRecord(raw)) return null;
  const stats = isRecord(raw.stats) ? raw.stats : null;
  const mainStat = stats && isRecord(stats.mainStat) ? stats.mainStat : null;
  const subStatsRaw = stats && Array.isArray(stats.subStats) ? stats.subStats : [];
  return {
    id: typeof raw.id === 'string' ? raw.id : null,
    level: toFiniteNumber(raw.level, 0),
    phantom: raw.phantom === true,
    resolvedSetId: typeof raw.resolvedSetId === 'number' ? raw.resolvedSetId : null,
    stats: {
      mainStat: {
        type: mainStat && typeof mainStat.type === 'string' ? mainStat.type : null,
        value: mainStat && Number.isFinite(Number(mainStat.value)) ? Number(mainStat.value) : null,
      },
      subStats: subStatsRaw.map((sub) => ({
        type: isRecord(sub) && typeof sub.type === 'string' ? sub.type : null,
        value: isRecord(sub) && Number.isFinite(Number(sub.value)) ? Number(sub.value) : null,
      })),
    },
  };
}

function parseEchoEntry(raw: unknown): LBEcho {
  if (!isRecord(raw)) throw new Error('echo row is not an object');
  const echoId = typeof raw.echoId === 'string' ? raw.echoId : '';
  if (!echoId) throw new Error('echo row missing echoId');

  const substats: Record<string, number> = {};
  if (isRecord(raw.substats)) {
    for (const [key, value] of Object.entries(raw.substats)) {
      const num = Number(value);
      if (Number.isFinite(num) && num !== 0) substats[key] = num;
    }
  }

  return {
    echoKey: typeof raw.echoKey === 'string' ? raw.echoKey : '',
    echoId,
    cost: toFiniteNumber(raw.cost, 0),
    activeSetId: typeof raw.activeSetId === 'string' ? raw.activeSetId : '',
    mainStatType: typeof raw.mainStatType === 'string' ? raw.mainStatType : '',
    mainStatValue: toFiniteNumber(raw.mainStatValue, 0),
    substats,
    cv: toFiniteNumber(raw.cv, 0),
    rv: toFiniteNumber(raw.rv, 0),
    usageCount: toFiniteNumber(raw.usageCount, 0),
    firstSeenAt: typeof raw.firstSeenAt === 'string' ? raw.firstSeenAt : '',
    lastSeenAt: typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : '',
    panel: parseEchoPanel(raw.panelData),
  };
}

export async function listProfileEchoes(
  uid: string,
  query: LBEchoListQuery = {},
  signal?: AbortSignal,
): Promise<LBEchoListResponse> {
  const trimmedUid = uid.trim();
  if (!trimmedUid) {
    throw new Error('Profile uid is required.');
  }

  const pageSize = clampPageSize(query.pageSize);
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(pageSize));
  params.set('sort', query.sort ?? 'cv');
  params.set('direction', query.direction ?? 'desc');
  for (const cost of query.costs ?? []) params.append('cost', String(cost));
  for (const setId of query.setIds ?? []) if (setId) params.append('setId', setId);
  for (const main of query.mainStatTypes ?? []) if (main) params.append('mainStatType', main);

  const requestUrl = `${resolveLBBaseUrl()}/profile/${encodeURIComponent(trimmedUid)}/echoes?${params.toString()}`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch profile echoes (${response.status})`);
  }

  const payload: unknown = await response.json();
  const rawEchoes = isRecord(payload) && Array.isArray(payload.echoes) ? payload.echoes : [];
  const echoes: LBEcho[] = [];
  for (const raw of rawEchoes) {
    try {
      echoes.push(parseEchoEntry(raw));
    } catch (error) {
      console.warn('[LB] dropped malformed echo row', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    uid: trimmedUid,
    echoes,
    total: isRecord(payload) ? toFiniteNumber(payload.total, echoes.length) : echoes.length,
    page: isRecord(payload) ? toFiniteNumber(payload.page, query.page ?? 1) : (query.page ?? 1),
    pageSize: isRecord(payload) ? toFiniteNumber(payload.pageSize, pageSize) : pageSize,
  };
}

// One build that equips a given echo, for the profile echo "used by" strip.
export interface LBEchoUsage {
  buildId: string;
  slotIndex: number;
  characterId: string;
  weaponId: string;
  cv: number;
  sequence: number;
  saved: boolean;
  /** Echo main-stat summary of the whole build, so CV grades on the right scale. */
  mainStats: Array<{ cost: number; statType: string }>;
}

function parseEchoUsage(raw: unknown): LBEchoUsage | null {
  if (!isRecord(raw)) return null;
  const buildId = typeof raw.buildId === 'string' ? raw.buildId : '';
  if (!buildId) return null;
  return {
    buildId,
    slotIndex: toFiniteNumber(raw.slotIndex, 0),
    characterId: typeof raw.characterId === 'string' ? raw.characterId : '',
    weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
    cv: toFiniteNumber(raw.cv, 0),
    sequence: toFiniteNumber(raw.sequence, 0),
    saved: raw.saved === true,
    mainStats: Array.isArray(raw.mainStats)
      ? raw.mainStats
        .filter(isRecord)
        .map((entry) => ({
          cost: toFiniteNumber(entry.cost, 0),
          statType: typeof entry.statType === 'string' ? entry.statType : '',
        }))
      : [],
  };
}

// Lazily fetch which builds use one echo (by echo_key), for the inventory
// expansion "used by" strip. Ordered most-impressive CV first by the API.
export async function getEchoUsages(
  uid: string,
  echoKey: string,
  signal?: AbortSignal,
): Promise<LBEchoUsage[]> {
  const trimmedUid = uid.trim();
  if (!trimmedUid || !echoKey) return [];

  const requestUrl = `${resolveLBBaseUrl()}/profile/${encodeURIComponent(trimmedUid)}/echoes/${encodeURIComponent(echoKey)}/usages`;
  const response = await fetch(requestUrl, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch echo usages (${response.status})`);
  }

  const payload: unknown = await response.json();
  const rawUsages = isRecord(payload) && Array.isArray(payload.usages) ? payload.usages : [];
  const usages: LBEchoUsage[] = [];
  for (const raw of rawUsages) {
    const parsed = parseEchoUsage(raw);
    if (parsed) usages.push(parsed);
  }
  return usages;
}

// Leaderboard types

export interface LBWeaponTop {
  weaponId: string;
  damage: number;
  owner: { username: string; uid: string };
  /** RFC3339 start of the current rank-1 hold for this weapon/track board. */
  reignSince: string;
}

export interface LBTeamMemberConfig {
  charId: string;
  weaponId?: string;
  refinement?: number;
  setId?: string;
  echoId?: string;
  sequence?: number;
}

export interface LBTrack {
  key: string;
  label: string;
  note?: string;
  /** Board ER target: score = damage × min(1, ER/target). Absent = no ER requirement. */
  erTarget?: number;
}

/** One support's full resolved buff contribution on a board (kit + weapon + sonata
 * set + echo + sequence tiers), as label → value (percent unless flat ATK/HP/DEF). */
interface LBTeamSupportBuff {
  charId: string;
  seq: number;
  buffs: Record<string, number>;
}

/** Team buff contribution to the on-field carry on a board: per-support breakdown
 * plus the merged total. Empty (`{}` / `[]`) on solo boards. */
export interface LBTeamBuffs {
  total: Record<string, number>;
  bySupport: LBTeamSupportBuff[];
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
  // Server-resolved English display fields (SSR/SEO). The client refines to the
  // user's locale once GameDataContext loads; for `en` it's identical, so no flash.
  display?: { name: string; element: string; head: string | null };
}

export interface LBLeaderboardEntry {
  id: string;
  cv: number;
  cvPenalty: number;
  finalCV: number;
  timestamp: string;
  /** Active board metric: Score by default, or raw Damage when scoring=raw. */
  damage: number;
  globalRank: number;
  /** RFC3339 start of the current rank-1 hold; only set on the #1 row of the board. */
  reignSince?: string;
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
  sequences?: number[];
  statFilters?: LBStatThreshold[];
  track?: string;
  buildId?: string;
  /** Scoring lens. 'raw' ranks the board by pure rotation damage (ER shown, not scored). */
  scoring?: 'adjusted' | 'raw';
}

export interface LBLeaderboardResponse {
  builds: LBLeaderboardEntry[];
  ghostBuild: LBLeaderboardEntry | null;
  total: number;
  page: number;
  pageSize: number;
  weaponIds: string[];
  tracks: LBTrack[];
  teamCharacterIds: string[];
  teamMembers: LBTeamMemberConfig[];
  /** Resolved team buff contributions for the active board (per-support + total). */
  teamBuffs: LBTeamBuffs;
  activeWeaponId: string;
  activeTrack: string;
  /** Active track's ER target (0 = no requirement). Scores are damage × min(1, ER/target). */
  erTarget: number;
  /**
   * Backend-derived four-column stat selection for this board (same for every
   * row). Canonical stat-sort keys, e.g. ['hp','aero_dmg','basic_attack_dmg',
   * 'resonance_liberation_dmg']. Empty when no board reference is available —
   * the UI then falls back to its per-row heuristic.
   */
  displayStats: LBStatSortKey[];
}

interface LBSubmitBuildResult {
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
    reignSince: typeof raw.reignSince === 'string' ? raw.reignSince : undefined,
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
      erTarget: toFiniteNumber(track.erTarget, 0) > 0 ? toFiniteNumber(track.erTarget, 0) : undefined,
    }))
    .filter((track) => track.key.length > 0);
}

function parseTeamCharSpec(spec: string): { charId: string; sequence?: number } {
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

function parseBuffMap(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [label, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
      out[label] = value;
    }
  }
  return out;
}

export function parseTeamBuffs(raw: unknown): LBTeamBuffs {
  if (!isRecord(raw)) return { total: {}, bySupport: [] };
  const bySupport = Array.isArray(raw.bySupport)
    ? raw.bySupport
        .filter(isRecord)
        .map((s) => ({
          charId: typeof s.charId === 'string' ? s.charId : '',
          seq: typeof s.seq === 'number' && Number.isFinite(s.seq) ? s.seq : 0,
          buffs: parseBuffMap(s.buffs),
        }))
        .filter((s) => s.charId.length > 0)
    : [];
  return { total: parseBuffMap(raw.total), bySupport };
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
    const fallbackTeamMembers = parseTeamCharacterSpecs(raw.teamCharacterIds);
    const teamMembers = parseTeamMembers(raw.teamMembers);
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
          reignSince: typeof w.reignSince === 'string' ? w.reignSince : '',
        };
      });
    result.push({
      id: typeof raw._id === 'string' ? raw._id : (typeof raw.id === 'string' ? raw.id : ''),
      trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
      trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
      totalEntries: toFiniteNumber(raw.totalEntries),
      weapons,
      weaponIds: weapons.map((w) => w.weaponId).filter(Boolean),
      teamCharacterIds: fallbackTeamMembers.map((member) => member.charId),
      teamMembers: teamMembers.length > 0 ? teamMembers : fallbackTeamMembers,
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
    } catch (error) {
      console.warn('[LB] dropped malformed leaderboard row', {
        buildId: isRecord(raw) ? raw._id : undefined,
        error: error instanceof Error ? error.message : String(error),
        raw,
      });
    }
  }

  let ghostBuild: LBLeaderboardEntry | null = null;
  if (isRecord(payload.ghostBuild)) {
    try {
      ghostBuild = parseLeaderboardEntry(payload.ghostBuild);
    } catch {
      // Ghost build was malformed, ignore silently.
    }
  }

  return {
    builds,
    ghostBuild,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, pageSize),
    weaponIds: Array.isArray(payload.weaponIds) ? (payload.weaponIds as unknown[]).filter((v): v is string => typeof v === 'string') : [],
    tracks: parseTracks(payload.tracks),
    teamCharacterIds: Array.isArray(payload.teamCharacterIds) ? payload.teamCharacterIds.filter((v): v is string => typeof v === 'string') : [],
    teamMembers: parseTeamMembers(payload.teamMembers),
    teamBuffs: parseTeamBuffs(payload.teamBuffs),
    activeWeaponId: typeof payload.activeWeaponId === 'string' ? payload.activeWeaponId : '',
    activeTrack: typeof payload.activeTrack === 'string' ? payload.activeTrack : '',
    erTarget: toFiniteNumber(payload.erTarget, 0),
    displayStats: parseLeaderboardDisplayStats(payload.displayStats),
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
  if (query.buildId) params.set('buildId', query.buildId);
  if (query.scoring === 'raw') params.set('scoring', 'raw');
  appendStringParams(params, 'region', query.regionPrefixes);
  const leaderboardEchoSets = serializeEchoSetFilters(query.echoSets);
  if (leaderboardEchoSets) params.set('echoSets', leaderboardEchoSets);
  const leaderboardEchoMains = serializeEchoMainFilters(query.echoMains);
  if (leaderboardEchoMains) params.set('echoMains', leaderboardEchoMains);
  appendBuildFilterParams(params, query);
  return params;
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

  const payload = await response.json() as {
    weaponId?: unknown;
    track?: unknown;
    baseDamage?: unknown;
    currentRank?: unknown;
    currentRankVisible?: unknown;
    tiers?: unknown;
  };
  const parsed = parseUpgradeTierSet(payload.tiers);
  if (parsed) {
    parsed.baseDamage = toFiniteNumber(payload.baseDamage, 0);
    parsed.currentRank = toFiniteNumber(payload.currentRank, 0);
    parsed.currentRankVisible = Boolean(payload.currentRankVisible);
  }

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
  teamMembers: LBTeamMemberConfig[];
  damage: number;
}

// Parses the common standings fields for the per-build standings endpoint.
// (Profile standings have their own lean shape — see LBProfileStandingEntry.)
function parseStandingBase(raw: Record<string, unknown>): LBStandingEntry {
  const teamMembers = parseTeamMembers(raw.teamMembers);
  const fallbackTeamMembers = parseTeamCharacterSpecs(raw.teamCharacterIds);
  return {
    key: typeof raw.key === 'string' ? raw.key : '',
    weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
    trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
    rank: toFiniteNumber(raw.rank, 0),
    total: toFiniteNumber(raw.total, 0),
    trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
    teamCharacterIds: fallbackTeamMembers.map((member) => member.charId),
    teamMembers: teamMembers.length > 0 ? teamMembers : fallbackTeamMembers,
    damage: toFiniteNumber(raw.damage, 0),
  };
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
    result.push(parseStandingBase(raw));
  }
  return result;
}

// One board in a simulate response: where a transient (never-submitted) build
// would rank on that weapon × track. Carries the sequence breakpoint + precomputed
// topPercent so the editor's RankModule can render it directly.
export interface LBSimulateBoard {
  key: string;
  weaponId: string;
  trackKey: string;
  sequence: number;
  trackLabel: string;
  rank: number;
  total: number;
  topPercent: number;
  damage: number;
  teamCharacterIds: string[];
  teamMembers: LBTeamMemberConfig[];
}

// fetchSimulateRanks posts an editor build to POST /leaderboard/{characterId}/simulate
// and returns where it would rank across every board of that character. Read-only:
// the build is never submitted. Server normalizes to a fair ceiling (max level +
// forte), so weapon/level/forte/sequence in buildState do not affect the result —
// only characterId, roverElement, and echoPanels do.
export async function fetchSimulateRanks(
  characterId: string,
  buildState: SavedState,
  signal?: AbortSignal,
): Promise<LBSimulateBoard[]> {
  const requestUrl = `${resolveLBBaseUrl()}/leaderboard/${encodeURIComponent(characterId)}/simulate`;
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buildState }),
    signal,
  });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to simulate ranks (${response.status})`);
  }

  const payload = await response.json() as { boards?: unknown };
  if (!Array.isArray(payload.boards)) return [];

  const result: LBSimulateBoard[] = [];
  for (const raw of payload.boards) {
    if (!isRecord(raw)) continue;
    const teamMembers = parseTeamMembers(raw.teamMembers);
    const fallbackTeamMembers = parseTeamCharacterSpecs(raw.teamCharacterIds);
    result.push({
      key: typeof raw.key === 'string' ? raw.key : '',
      weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
      trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
      sequence: toFiniteNumber(raw.sequence, 0),
      trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
      rank: toFiniteNumber(raw.rank, 0),
      total: toFiniteNumber(raw.total, 0),
      topPercent: toFiniteNumber(raw.topPercent, 0),
      damage: toFiniteNumber(raw.damage, 0),
      teamCharacterIds: fallbackTeamMembers.map((member) => member.charId),
      teamMembers: teamMembers.length > 0 ? teamMembers : fallbackTeamMembers,
    });
  }
  return result;
}

// Profile showcase: a UID's best competitive placement per character. Deliberately NOT LBStandingEntry 
export interface LBProfileStandingEntry {
  characterId: string;
  weaponId: string;
  trackKey: string;
  trackLabel: string;
  sequence: number;
  rank: number;
  total: number;
  buildId: string;
}

const profileStandingsCache = new Map<string, Promise<LBProfileStandingEntry[]>>();

// The in-flight promise is shared by every caller for that uid, so the fetch
// deliberately takes no AbortSignal: binding one caller's signal would let its
// unmount reject the promise for everyone else (the profiles -> profile nav
// mounts the showcase effect twice, and the second run was inheriting the
// first run's aborted fetch). Callers gate their own setState on unmount.
export async function getProfileStandings(uid: string): Promise<LBProfileStandingEntry[]> {
  const cacheKey = uid.trim();
  if (!cacheKey) return [];

  let promise = profileStandingsCache.get(cacheKey);
  if (!promise) {
    promise = (async () => {
      try {
        const requestUrl = `${resolveLBBaseUrl()}/profile/${encodeURIComponent(uid)}/standings`;
        const response = await fetch(requestUrl, { method: 'GET' });

        if (response.status === 404) return [];
        if (!response.ok) {
          throw new Error(`Failed to fetch profile standings (${response.status})`);
        }

        const payload = await response.json() as { standings?: unknown };
        console.log('[LB] /profile/{uid}/standings payload', { requestUrl, uid, payload });
        if (!Array.isArray(payload.standings)) return [];

        const result: LBProfileStandingEntry[] = [];
        for (const raw of payload.standings) {
          if (!isRecord(raw)) continue;
          result.push({
            characterId: typeof raw.characterId === 'string' ? raw.characterId : '',
            weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
            trackKey: typeof raw.trackKey === 'string' ? raw.trackKey : '',
            trackLabel: typeof raw.trackLabel === 'string' ? raw.trackLabel : '',
            sequence: toFiniteNumber(raw.sequence, 0),
            rank: toFiniteNumber(raw.rank, 0),
            total: toFiniteNumber(raw.total, 0),
            buildId: typeof raw.buildId === 'string' ? raw.buildId : '',
          });
        }
        return result;
      } finally {
        profileStandingsCache.delete(cacheKey);
      }
    })();
    profileStandingsCache.set(cacheKey, promise);
  }
  return promise;
}

// Board optimality types

export interface LBOptimalityReference {
  tier: string;
  damage: number;
  layout: string;
  setPattern: string[];
  mainStats: string[];
  substats: string[];
  echoIds: string[];
  topLevelStats: Record<string, number>;
  echoPanels: EchoPanelState[];
}

export interface LBBoardOptimality {
  characterId: string;
  weaponId: string;
  sequence: string;
  /** Track ER target the reference is generated at (0 = no requirement). */
  erTarget: number;
  configVersion: string;
  characterLevel: number;
  weaponLevel: number;
  forte: ForteState;
  ceilingDamage: number;
  standardizedDamage: number;
  lowRollDamage: number;
  currentDamage?: number;
  currentVsCeiling?: number;
  currentVsStandardized?: number;
  ceiling: LBOptimalityReference;
  standardized: LBOptimalityReference;
  lowRoll: LBOptimalityReference;
  generatedAt: string;
}

function parseOptimalityEchoPanel(raw: unknown): EchoPanelState | null {
  if (!isRecord(raw)) return null;
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const mainStat = isRecord(stats.mainStat) ? stats.mainStat : {};
  const subStats = Array.isArray(stats.subStats) ? stats.subStats : [];
  return {
    id: typeof raw.id === 'string' ? raw.id : null,
    level: typeof raw.level === 'number' ? raw.level : 25,
    resolvedSetId: typeof raw.resolvedSetId === 'number' ? raw.resolvedSetId : null,
    phantom: typeof raw.phantom === 'boolean' ? raw.phantom : false,
    stats: {
      mainStat: {
        type: typeof mainStat.type === 'string' && mainStat.type !== '' ? mainStat.type : null,
        value: typeof mainStat.value === 'number' ? mainStat.value : null,
      },
      subStats: subStats.map((s: unknown) => {
        const sub = isRecord(s) ? s : {};
        return {
          type: typeof sub.type === 'string' && sub.type !== '' ? sub.type : null,
          value: typeof sub.value === 'number' ? sub.value : null,
        };
      }),
    },
  };
}

function parseOptimalityReference(raw: unknown): LBOptimalityReference {
  if (!isRecord(raw)) {
    return { tier: '', damage: 0, layout: '', setPattern: [], mainStats: [], substats: [], echoIds: [], topLevelStats: {}, echoPanels: [] };
  }
  return {
    tier: typeof raw.tier === 'string' ? raw.tier : '',
    damage: toFiniteNumber(raw.damage),
    layout: typeof raw.layout === 'string' ? raw.layout : '',
    setPattern: Array.isArray(raw.setPattern) ? raw.setPattern.filter((v): v is string => typeof v === 'string') : [],
    mainStats: Array.isArray(raw.mainStats) ? raw.mainStats.filter((v): v is string => typeof v === 'string') : [],
    substats: Array.isArray(raw.substats) ? raw.substats.filter((v): v is string => typeof v === 'string') : [],
    echoIds: Array.isArray(raw.echoIds) ? raw.echoIds.filter((v): v is string => typeof v === 'string') : [],
    topLevelStats: isRecord(raw.topLevelStats) ? Object.fromEntries(
      Object.entries(raw.topLevelStats).map(([k, v]) => [k, toFiniteNumber(v)])
    ) : {},
    echoPanels: Array.isArray(raw.echoPanels)
      ? raw.echoPanels.map(parseOptimalityEchoPanel).filter((p): p is EchoPanelState => p !== null)
      : [],
  };
}

function parseOptimalityForte(raw: unknown): ForteState {
  if (!Array.isArray(raw) || raw.length !== 5) {
    return DEFAULT_FORTE.map((entry) => [...entry]) as ForteState;
  }

  const parsed = raw.map((entry, index) => {
    if (Array.isArray(entry)) {
      return [
        toFiniteNumber(entry[0], DEFAULT_FORTE[index][0]),
        Boolean(entry[1]),
        Boolean(entry[2]),
      ] as const;
    }

    if (isRecord(entry)) {
      return [
        toFiniteNumber(entry.Level ?? entry.level, DEFAULT_FORTE[index][0]),
        Boolean(entry.Top ?? entry.top),
        Boolean(entry.Middle ?? entry.middle),
      ] as const;
    }

    return [...DEFAULT_FORTE[index]] as const;
  });

  return parsed as ForteState;
}

export async function getBoardOptimality(
  characterId: string,
  weaponId: string,
  sequence: string,
  buildId?: string,
  signal?: AbortSignal,
): Promise<LBBoardOptimality | null> {
  const params = new URLSearchParams();
  if (buildId) params.set('buildId', buildId);
  const query = params.toString();
  const base = `${resolveLBBaseUrl()}/leaderboard/${encodeURIComponent(characterId)}/optimality/${encodeURIComponent(weaponId)}/${encodeURIComponent(sequence)}`;
  const url = query ? `${base}?${query}` : base;
  const response = await fetch(url, { method: 'GET', signal });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch board optimality (${response.status})`);
  }
  const raw = await response.json() as Record<string, unknown>;
  return {
    characterId: typeof raw.characterId === 'string' ? raw.characterId : '',
    weaponId: typeof raw.weaponId === 'string' ? raw.weaponId : '',
    sequence: typeof raw.sequence === 'string' ? raw.sequence : '',
    erTarget: toFiniteNumber(raw.erTarget, 0),
    configVersion: typeof raw.configVersion === 'string' ? raw.configVersion : '',
    characterLevel: toFiniteNumber(raw.characterLevel, 90),
    weaponLevel: toFiniteNumber(raw.weaponLevel, 90),
    forte: parseOptimalityForte(raw.forte),
    ceilingDamage: toFiniteNumber(raw.ceilingDamage),
    standardizedDamage: toFiniteNumber(raw.standardizedDamage),
    lowRollDamage: toFiniteNumber(raw.lowRollDamage),
    currentDamage: typeof raw.currentDamage === 'number' ? raw.currentDamage : undefined,
    currentVsCeiling: typeof raw.currentVsCeiling === 'number' ? raw.currentVsCeiling : undefined,
    currentVsStandardized: typeof raw.currentVsStandardized === 'number' ? raw.currentVsStandardized : undefined,
    ceiling: parseOptimalityReference(raw.ceiling),
    standardized: parseOptimalityReference(raw.standardized),
    lowRoll: parseOptimalityReference(raw.lowRoll),
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
  };
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
  options: { sourceImageKey?: string | null } = {},
  signal?: AbortSignal,
): Promise<LBSubmitBuildResult> {
  const sourceImageKey = options.sourceImageKey?.trim();
  const response = await fetch(`${resolveLBBaseUrl()}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      buildState,
      ...(sourceImageKey ? { sourceImageKey } : {}),
    }),
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

export interface LBLinkBuildImageResult {
  linked: boolean;
  buildId?: string;
  method?: string;
  reason?: string;
}

// Fire-and-forget after a scan: asks the LB service to attach the screenshot's
// R2 key to the existing build row with that exact echo content. Fill-only and
// idempotent server-side; no build is ever created.
export async function linkBuildImage(
  buildState: SavedState,
  sourceImageKey: string,
  signal?: AbortSignal,
): Promise<LBLinkBuildImageResult> {
  const response = await fetch(`${resolveLBBaseUrl()}/build/link-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sourceImageKey, buildState }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to link build image (${response.status})`);
  }

  const raw = await response.json() as Record<string, unknown>;
  return {
    linked: Boolean(raw.linked),
    buildId: typeof raw.buildId === 'string' ? raw.buildId : undefined,
    method: typeof raw.method === 'string' ? raw.method : undefined,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
  };
}
