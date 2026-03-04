import { DEFAULT_FORTE, SavedState } from '@/lib/build';

const DEFAULT_LB_URL = 'http://localhost:8080';

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

const DISPLAY_STAT_TO_CODE: Record<string, LBStatCode> = {
  HP: 'H',
  'HP%': 'H%',
  ATK: 'A',
  'ATK%': 'A%',
  DEF: 'D',
  'DEF%': 'D%',
  'Crit Rate': 'CR',
  'Crit DMG': 'CD',
  'Aero DMG': 'AD',
  'Glacio DMG': 'GD',
  'Fusion DMG': 'FD',
  'Electro DMG': 'ED',
  'Havoc DMG': 'HD',
  'Spectro DMG': 'SD',
  'Basic Attack': 'BA',
  'Basic Attack DMG Bonus': 'BA',
  'Heavy Attack': 'HA',
  'Heavy Attack DMG Bonus': 'HA',
  Skill: 'RS',
  'Resonance Skill DMG Bonus': 'RS',
  Liberation: 'RL',
  'Resonance Liberation DMG Bonus': 'RL',
  'Energy Regen': 'ER',
  'Healing Bonus': 'HB',
};

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

interface LBListBuildsResponseRaw {
  builds?: LBBuildEntryRaw[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface LBBuildEntryRaw {
  _id: string;
  buildState: unknown;
  stats: unknown;
  cv: number;
  cvPenalty: number;
  finalCV: number;
  timestamp: string;
}

export interface LBBuildEntry {
  id: string;
  state: SavedState;
  stats: Record<LBStatCode, number>;
  cv: number;
  cvPenalty: number;
  finalCV: number;
  timestamp: string;
}

export interface LBListBuildsResponse {
  builds: LBBuildEntry[];
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

function emptyStats(): Record<LBStatCode, number> {
  return LB_STAT_CODES.reduce((acc, code) => {
    acc[code] = 0;
    return acc;
  }, {} as Record<LBStatCode, number>);
}

function toStatCode(rawKey: string): LBStatCode | null {
  if ((LB_STAT_CODES as readonly string[]).includes(rawKey)) {
    return rawKey as LBStatCode;
  }
  return DISPLAY_STAT_TO_CODE[rawKey] ?? null;
}

function normalizeStats(rawStats: unknown): Record<LBStatCode, number> {
  const stats = emptyStats();
  const parsed = parseMaybeJSON(rawStats);
  if (!isRecord(parsed)) return stats;

  const source = isRecord(parsed.v) ? parsed.v : parsed;
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const code = toStatCode(rawKey);
    if (!code) continue;
    stats[code] = toFiniteNumber(rawValue, 0);
  }

  return stats;
}

function normalizeBuildState(rawBuildState: unknown): SavedState {
  const candidate = parseMaybeJSON(rawBuildState);
  if (!isCanonicalSavedState(candidate)) {
    throw new Error('LB buildState is not in canonical SavedState format.');
  }
  const forte = Array.isArray(candidate.forte)
    ? candidate.forte
    : (DEFAULT_FORTE.map((entry) => [...entry]) as SavedState['forte']);
  return {
    ...candidate,
    forte,
  };
}

function normalizeBuildEntry(raw: LBBuildEntryRaw): LBBuildEntry {
  return {
    id: raw._id,
    state: normalizeBuildState(raw.buildState),
    stats: normalizeStats(raw.stats),
    cv: toFiniteNumber(raw.cv),
    cvPenalty: toFiniteNumber(raw.cvPenalty),
    finalCV: toFiniteNumber(raw.finalCV),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
  };
}

function resolveLBBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_LB_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_LB_URL;
  return base.replace(/\/+$/, '');
}

function shouldLogLBPayload(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_LB_DEBUG === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

export async function listBuilds(
  query: LBListBuildsQuery = {},
  signal?: AbortSignal,
): Promise<LBListBuildsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 10));
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
  const normalizedBuilds: LBBuildEntry[] = [];
  for (const raw of rawBuilds) {
    try {
      normalizedBuilds.push(normalizeBuildEntry(raw));
    } catch (error) {
      if (shouldLogLBPayload()) {
        console.warn('[LB] dropped malformed build row', {
          buildId: raw?._id,
          error: error instanceof Error ? error.message : String(error),
          raw,
        });
      }
    }
  }

  if (shouldLogLBPayload()) {
    // Debug visibility for backend/frontend shape mismatches during LB migration.
    console.log('[LB] /build response', {
      requestUrl,
      query,
      payload,
      rawBuildCount: rawBuilds.length
    });
  }

  return {
    builds: normalizedBuilds,
    total: toFiniteNumber(payload.total, 0),
    page: toFiniteNumber(payload.page, query.page ?? 1),
    pageSize: toFiniteNumber(payload.pageSize, query.pageSize ?? 10),
  };
}
