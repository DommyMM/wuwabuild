import { SavedBuild, SavedState, ForteState, ForteEntry, createDefaultSavedState } from '@/lib/build';
import { ELEMENT_SETS, ElementType } from '@/lib/echo';

const LEGACY_SAVED_BUILDS_STORAGE_KEY = 'saved_builds';

export interface LegacyIdMaps {
  characterIds: Map<string, string>;
  weaponIds: Map<string, string>;
  echoIds: Map<string, string>;
}

interface LegacyBuildParseResult {
  builds: SavedBuild[];
  sourceCount: number;
  skippedCount: number;
}

interface LegacySavesSummary {
  found: boolean;
  buildCount: number;
  parseError: boolean;
}

interface LegacyCharacterRef {
  id: string;
  legacyId?: string;
}

interface LegacyWeaponRef {
  id: string;
  name?: string;
  legacyId?: string;
  iconUrl?: string;
}

interface LegacyEchoRef {
  id: string;
  name?: string;
  legacyId?: string;
  iconUrl?: string;
  phantomIconUrl?: string;
}

interface LegacyEchoCatalogEntry {
  id: string;
  name: string;
}

interface LegacyWeaponCatalogEntry {
  id: string;
  name: string;
}

const LEGACY_ELEMENT_KEYS = Object.keys(ELEMENT_SETS) as ElementType[];
const STAT_CODE_MAP: Record<string, string> = {
  H: 'HP',
  'H%': 'HP%',
  A: 'ATK',
  'A%': 'ATK%',
  D: 'DEF',
  'D%': 'DEF%',
  CR: 'Crit Rate',
  CD: 'Crit DMG',
  AD: 'Aero DMG',
  GD: 'Glacio DMG',
  FD: 'Fusion DMG',
  ED: 'Electro DMG',
  HD: 'Havoc DMG',
  SD: 'Spectro DMG',
  BA: 'Basic Attack DMG Bonus',
  HA: 'Heavy Attack DMG Bonus',
  RS: 'Resonance Skill DMG Bonus',
  RL: 'Resonance Liberation DMG Bonus',
  ER: 'Energy Regen',
  HB: 'Healing Bonus',
};
const STAT_ALIAS_MAP: Record<string, string> = {
  'Basic Attack': 'Basic Attack DMG Bonus',
  'Heavy Attack': 'Heavy Attack DMG Bonus',
  Skill: 'Resonance Skill DMG Bonus',
  Liberation: 'Resonance Liberation DMG Bonus',
};

// Derive possible legacy echo IDs from CDN icon file names.
// Supports patterns like:
// - T_IconMonsterHead_34010_1_UI.png  -> "34010"
// - T_IconMonsterHead_31083_UI.png    -> "31083"
// - T_IconMonsterGoods_061_UI.png     -> "061" and "61"
function extractLegacyEchoIdsFromUrl(url: string | undefined): string[] {
  if (!url) return [];
  const filename = url.split('/').pop() ?? '';
  const numericParts = filename.match(/\d+/g) ?? [];
  if (numericParts.length === 0) return [];

  const primaryParts = numericParts.filter((part) => part.length >= 3);
  const firstNumeric = numericParts[0];
  if (!firstNumeric) return [];
  const seeds = primaryParts.length > 0 ? primaryParts : [firstNumeric];
  const ids = new Set<string>();

  for (const seed of seeds) {
    ids.add(seed);
    const normalized = String(Number.parseInt(seed, 10));
    if (normalized && normalized !== 'NaN') {
      ids.add(normalized);
    }
  }

  return [...ids];
}

export function buildLegacyIdMaps(
  characters: LegacyCharacterRef[],
  weapons: LegacyWeaponRef[],
  echoes: LegacyEchoRef[],
  legacyEchoCatalog: LegacyEchoCatalogEntry[] = [],
  legacyWeaponCatalog: LegacyWeaponCatalogEntry[] = [],
): LegacyIdMaps {
  const characterIds = new Map<string, string>();
  for (const character of characters) {
    characterIds.set(character.id, character.id);
    if (character.legacyId) characterIds.set(character.legacyId, character.id);
  }

  const weaponIds = new Map<string, string>();
  const weaponsByNormalizedName = new Map<string, string>();
  for (const weapon of weapons) {
    weaponIds.set(weapon.id, weapon.id);
    if (weapon.legacyId) weaponIds.set(weapon.legacyId, weapon.id);
    if (weapon.name) {
      const normalizedName = normalizeCatalogName(weapon.name);
      if (normalizedName && !weaponsByNormalizedName.has(normalizedName)) {
        weaponsByNormalizedName.set(normalizedName, weapon.id);
      }
    }
    for (const derived of extractLegacyWeaponIdsFromUrl(weapon.iconUrl)) {
      if (!weaponIds.has(derived)) weaponIds.set(derived, weapon.id);
    }
  }

  for (const legacyWeapon of legacyWeaponCatalog) {
    const normalizedName = normalizeCatalogName(legacyWeapon.name);
    if (!normalizedName) continue;
    const mappedWeaponId = weaponsByNormalizedName.get(normalizedName);
    if (!mappedWeaponId) continue;

    if (!weaponIds.has(legacyWeapon.id)) {
      weaponIds.set(legacyWeapon.id, mappedWeaponId);
    }
    const normalizedLegacyId = String(Number.parseInt(legacyWeapon.id, 10));
    if (normalizedLegacyId && normalizedLegacyId !== 'NaN' && !weaponIds.has(normalizedLegacyId)) {
      weaponIds.set(normalizedLegacyId, mappedWeaponId);
    }
  }

  const echoIds = new Map<string, string>();
  const echoesByNormalizedName = new Map<string, string>();
  for (const echo of echoes) {
    echoIds.set(echo.id, echo.id);
    if (echo.legacyId) echoIds.set(echo.legacyId, echo.id);
    if (echo.name) {
      const normalizedName = normalizeCatalogName(echo.name);
      if (normalizedName && !echoesByNormalizedName.has(normalizedName)) {
        echoesByNormalizedName.set(normalizedName, echo.id);
      }
    }

    for (const derived of extractLegacyEchoIdsFromUrl(echo.iconUrl)) {
      if (!echoIds.has(derived)) echoIds.set(derived, echo.id);
    }
    for (const derived of extractLegacyEchoIdsFromUrl(echo.phantomIconUrl)) {
      if (!echoIds.has(derived)) echoIds.set(derived, echo.id);
    }
  }

  for (const legacyEcho of legacyEchoCatalog) {
    const normalizedName = normalizeCatalogName(legacyEcho.name);
    if (!normalizedName) continue;
    const mappedEchoId = echoesByNormalizedName.get(normalizedName);
    if (!mappedEchoId) continue;

    if (!echoIds.has(legacyEcho.id)) {
      echoIds.set(legacyEcho.id, mappedEchoId);
    }
    const normalizedLegacyId = String(Number.parseInt(legacyEcho.id, 10));
    if (normalizedLegacyId && normalizedLegacyId !== 'NaN' && !echoIds.has(normalizedLegacyId)) {
      echoIds.set(normalizedLegacyId, mappedEchoId);
    }
  }

  return { characterIds, weaponIds, echoIds };
}

function normalizeCatalogName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function extractLegacyWeaponIdsFromUrl(url: string | undefined): string[] {
  return extractLegacyEchoIdsFromUrl(url);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function toInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cloneDefaultState(): SavedState {
  return createDefaultSavedState();
}

function normalizeWatermark(rawWatermark: unknown): SavedState['watermark'] {
  const defaults = cloneDefaultState().watermark;
  const watermark = asRecord(rawWatermark);
  return {
    username: typeof watermark?.username === 'string' ? watermark.username : defaults.username,
    uid: typeof watermark?.uid === 'string' ? watermark.uid : defaults.uid,
    artSource: typeof watermark?.artSource === 'string' ? watermark.artSource : defaults.artSource,
  };
}

function decodeLegacyStat(rawType: unknown): string | null {
  if (typeof rawType !== 'string') return null;
  const key = rawType.trim();
  if (!key) return null;
  return STAT_CODE_MAP[key] ?? STAT_ALIAS_MAP[key] ?? key;
}

function decodeLegacyElement(rawElement: unknown): ElementType | null {
  if (typeof rawElement === 'string') {
    if (rawElement in ELEMENT_SETS) return rawElement as ElementType;
    const parsed = Number.parseInt(rawElement, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed < LEGACY_ELEMENT_KEYS.length) {
      return LEGACY_ELEMENT_KEYS[parsed];
    }
    return null;
  }
  if (typeof rawElement === 'number' && Number.isFinite(rawElement)) {
    const idx = Math.trunc(rawElement);
    if (idx >= 0 && idx < LEGACY_ELEMENT_KEYS.length) return LEGACY_ELEMENT_KEYS[idx];
  }
  return null;
}

function resolveMappedId(rawId: unknown, map: Map<string, string>): string | null {
  const id = toNullableString(rawId);
  if (!id) return null;

  for (const candidate of buildIdCandidates(id)) {
    if (map.has(candidate)) {
      return map.get(candidate) ?? null;
    }
  }

  return id;
}

function buildIdCandidates(rawId: string): string[] {
  const candidates = new Set<string>();
  const trimmed = rawId.trim();
  if (!trimmed) return [];

  const addCandidate = (value: string) => {
    const v = value.trim();
    if (!v) return;
    candidates.add(v);
    const normalized = String(Number.parseInt(v, 10));
    if (normalized && normalized !== 'NaN') candidates.add(normalized);
  };

  addCandidate(trimmed);

  if (trimmed.includes('_')) {
    const parts = trimmed.split('_').filter(Boolean);
    for (let i = parts.length - 1; i >= 1; i -= 1) {
      addCandidate(parts.slice(0, i).join('_'));
    }
    for (const part of parts) addCandidate(part);
  }

  const numericParts = trimmed.match(/\d+/g) ?? [];
  for (const numericPart of numericParts) addCandidate(numericPart);

  return [...candidates];
}

function toForteState(nodeStatesRaw: unknown, forteLevelsRaw: unknown): ForteState {
  const nodeStates = asRecord(nodeStatesRaw) ?? {};
  const forteLevels = asRecord(forteLevelsRaw) ?? {};
  const keys = ['normal-attack', 'skill', 'circuit', 'liberation', 'intro'];
  const trees = ['tree1', 'tree2', 'tree3', 'tree4', 'tree5'];

  return keys.map((key, index) => {
    const tree = asRecord(nodeStates[trees[index]]);
    return [
      toInteger(forteLevels[key], 1),
      tree?.top === true,
      tree?.middle === true,
    ] as ForteEntry;
  }) as ForteState;
}

function normalizePanelStats(rawPanel: Record<string, unknown>, compressed: boolean): SavedState['echoPanels'][number]['stats'] {
  const defaults = cloneDefaultState().echoPanels[0].stats;
  const stats = asRecord(compressed ? rawPanel.t : rawPanel.stats);
  const mainStat = asRecord(compressed ? stats?.m : stats?.mainStat);
  const subStats = Array.isArray(compressed ? stats?.s : stats?.subStats)
    ? (compressed ? stats?.s : stats?.subStats) as unknown[]
    : [];

  return {
    mainStat: {
      type: decodeLegacyStat(mainStat?.t ?? mainStat?.type),
      value: toNullableNumber(mainStat?.v ?? mainStat?.value),
    },
    subStats: defaults.subStats.map((baseSub, idx) => {
      const rawSub = asRecord(subStats[idx]);
      if (!rawSub) return baseSub;
      return {
        type: decodeLegacyStat(rawSub.t ?? rawSub.type),
        value: toNullableNumber(rawSub.v ?? rawSub.value),
      };
    }),
  };
}

function normalizeEchoPanels(rawPanels: unknown, maps: LegacyIdMaps, compressed: boolean): SavedState['echoPanels'] {
  const defaults = cloneDefaultState().echoPanels;
  if (!Array.isArray(rawPanels)) return defaults;

  return defaults.map((defaultPanel, index) => {
    const rawPanel = asRecord(rawPanels[index]);
    if (!rawPanel) return defaultPanel;

    const mappedId = resolveMappedId(compressed ? rawPanel.i : rawPanel.id, maps.echoIds);
    const sourceId = toNullableString(compressed ? rawPanel.i : rawPanel.id);
    return {
      ...defaultPanel,
      id: mappedId,
      level: toInteger(compressed ? rawPanel.l : rawPanel.level, defaultPanel.level),
      selectedElement: decodeLegacyElement(compressed ? rawPanel.s : rawPanel.selectedElement),
      stats: normalizePanelStats(rawPanel, compressed),
      phantom: (compressed ? rawPanel.p : rawPanel.phantom) === true || (sourceId?.includes('_') ?? false),
    };
  });
}

function convertLegacyState(stateRaw: Record<string, unknown>, maps: LegacyIdMaps): SavedState {
  const defaults = cloneDefaultState();

  // Legacy compressed backup shape: c/w/e/q/n/f/m
  if ('c' in stateRaw && 'w' in stateRaw && 'e' in stateRaw) {
    const c = asRecord(stateRaw.c) ?? {};
    const w = asRecord(stateRaw.w) ?? {};
    const f = asRecord(stateRaw.f) ?? {};
    return {
      ...defaults,
      characterId: resolveMappedId(c.i, maps.characterIds),
      characterLevel: toInteger(c.l, defaults.characterLevel),
      roverElement: toNullableString(c.e) ?? undefined,
      sequence: toInteger(stateRaw.q, defaults.sequence),
      weaponId: resolveMappedId(w.i, maps.weaponIds),
      weaponLevel: toInteger(w.l, defaults.weaponLevel),
      weaponRank: toInteger(w.r, defaults.weaponRank),
      forte: toForteState(stateRaw.n, {
        'normal-attack': f.na,
        skill: f.sk,
        circuit: f.ci,
        liberation: f.li,
        intro: f.in,
      }),
      echoPanels: normalizeEchoPanels(stateRaw.e, maps, true),
      watermark: normalizeWatermark(stateRaw.m),
      verified: typeof stateRaw.verified === 'boolean' ? stateRaw.verified : undefined,
    };
  }

  // Legacy nested runtime shape: characterState/weaponState/nodeStates/forteLevels
  if ('characterState' in stateRaw || 'weaponState' in stateRaw) {
    const character = asRecord(stateRaw.characterState) ?? {};
    const weapon = asRecord(stateRaw.weaponState) ?? {};
    return {
      ...defaults,
      characterId: resolveMappedId(character.id, maps.characterIds),
      characterLevel: toInteger(character.level, defaults.characterLevel),
      roverElement: toNullableString(character.element) ?? undefined,
      sequence: toInteger(stateRaw.currentSequence, defaults.sequence),
      weaponId: resolveMappedId(weapon.id, maps.weaponIds),
      weaponLevel: toInteger(weapon.level, defaults.weaponLevel),
      weaponRank: toInteger(weapon.rank, defaults.weaponRank),
      forte: toForteState(stateRaw.nodeStates, stateRaw.forteLevels),
      echoPanels: normalizeEchoPanels(stateRaw.echoPanels, maps, false),
      watermark: normalizeWatermark(stateRaw.watermark),
      verified: typeof stateRaw.verified === 'boolean' ? stateRaw.verified : undefined,
    };
  }

  // Flat shape fallback
  const flatForte = Array.isArray(stateRaw.forte) && stateRaw.forte.length === 5
    ? stateRaw.forte as ForteState
    : toForteState(stateRaw.nodeStates, stateRaw.forteLevels);

  return {
    ...defaults,
    characterId: resolveMappedId(stateRaw.characterId, maps.characterIds),
    characterLevel: toInteger(stateRaw.characterLevel, defaults.characterLevel),
    roverElement: toNullableString(stateRaw.roverElement) ?? undefined,
    sequence: toInteger(stateRaw.sequence, defaults.sequence),
    weaponId: resolveMappedId(stateRaw.weaponId, maps.weaponIds),
    weaponLevel: toInteger(stateRaw.weaponLevel, defaults.weaponLevel),
    weaponRank: toInteger(stateRaw.weaponRank, defaults.weaponRank),
    forte: flatForte,
    echoPanels: normalizeEchoPanels(stateRaw.echoPanels, maps, false),
    watermark: normalizeWatermark(stateRaw.watermark),
    verified: typeof stateRaw.verified === 'boolean' ? stateRaw.verified : undefined,
  };
}

function extractBuildArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  return Array.isArray(record?.builds) ? record.builds : [];
}

export function convertLegacyBuilds(payload: unknown, maps: LegacyIdMaps): LegacyBuildParseResult {
  const rawBuilds = extractBuildArray(payload);
  const converted: SavedBuild[] = [];
  let skippedCount = 0;

  for (const rawBuild of rawBuilds) {
    const record = asRecord(rawBuild);
    const stateRecord = asRecord(record?.state);
    if (!record || !stateRecord) {
      skippedCount += 1;
      continue;
    }

    const parsedDate = typeof record.date === 'string' && !Number.isNaN(Date.parse(record.date))
      ? record.date
      : new Date().toISOString();

    converted.push({
      id: toNullableString(record.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: toNullableString(record.name) ?? 'Migrated Build',
      date: parsedDate,
      state: convertLegacyState(stateRecord, maps),
    });
  }

  return {
    builds: converted,
    sourceCount: rawBuilds.length,
    skippedCount,
  };
}

export function getLegacySavesSummaryFromStorage(): LegacySavesSummary {
  if (typeof window === 'undefined') {
    return { found: false, buildCount: 0, parseError: false };
  }

  const raw = localStorage.getItem(LEGACY_SAVED_BUILDS_STORAGE_KEY);
  if (!raw) {
    return { found: false, buildCount: 0, parseError: false };
  }

  try {
    const parsed = JSON.parse(raw);
    const buildCount = extractBuildArray(parsed).length;
    return { found: buildCount > 0, buildCount, parseError: false };
  } catch {
    return { found: true, buildCount: 0, parseError: true };
  }
}

export function readLegacySavesPayload(): unknown | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LEGACY_SAVED_BUILDS_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function clearLegacySavesFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_SAVED_BUILDS_STORAGE_KEY);
}
