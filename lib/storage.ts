import { SavedBuild, SavedBuilds, SavedState, ForteState, ForteEntry, createDefaultSavedState } from '@/lib/build';
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem, setLocalStorageJSON } from '@/lib/clientStorage';
import { convertLegacyBuilds, LegacyIdMaps } from '@/lib/legacyMigration';

const SAVED_BUILDS_STORAGE_KEY = 'wuwabuilds_saves';
export const DRAFT_BUILD_STORAGE_KEY = 'wuwa_draft_build';
const DRAFT_BASELINE_HASH_KEY = 'wuwa_draft_baseline_hash';
const CURRENT_VERSION = '2.0.0';
const IDENTITY_LEGACY_MAPS: LegacyIdMaps = {
  characterIds: new Map(),
  weaponIds: new Map(),
  echoIds: new Map(),
};

/** Folds the legacy nodeStates and forteLevels maps into one ForteState */
function migrateForte(raw: Record<string, unknown>): ForteState {
  if (Array.isArray(raw.forte) && raw.forte.length === 5) return raw.forte as ForteState;

  const ns = (raw.nodeStates ?? {}) as Record<string, Record<string, boolean>>;
  const fl = (raw.forteLevels ?? {}) as Record<string, number>;
  const keys = ['normal-attack', 'skill', 'circuit', 'liberation', 'intro'];
  const trees = ['tree1', 'tree2', 'tree3', 'tree4', 'tree5'];

  return keys.map((key, i) => [
    fl[key] ?? 1,
    ns[trees[i]]?.top ?? false,
    ns[trees[i]]?.middle ?? false,
  ] as ForteEntry) as ForteState;
}

/** Takes the compressed backup, the nested or the current flat shape and returns the current one */
function migrateSavedState(raw: Record<string, unknown>): SavedState {
  const defaults = createDefaultSavedState();

  // Legacy compressed backup shape (state.c/w/e/q/n/f/m)
  if ('c' in raw && 'w' in raw && 'e' in raw) {
    const converted = convertLegacyBuilds({
      builds: [{ id: 'legacy-state', name: 'legacy-state', date: new Date().toISOString(), state: raw }]
    }, IDENTITY_LEGACY_MAPS);
    return converted.builds[0]?.state ?? defaults;
  }

  // Already flat
  if ('characterId' in raw) {
    return { ...defaults, ...raw, forte: migrateForte(raw) } as SavedState;
  }

  // Legacy nested shape
  const cs = (raw.characterState as Record<string, unknown>) ?? {};
  const ws = (raw.weaponState as Record<string, unknown>) ?? {};

  return {
    ...defaults,
    characterId: (cs.id as string) ?? null,
    characterLevel: parseInt(String(cs.level)) || 1,
    roverElement: cs.element as string | undefined,
    sequence: (raw.currentSequence as number) ?? 0,
    weaponId: (ws.id as string) ?? null,
    weaponLevel: (ws.level as number) ?? 1,
    weaponRank: (ws.rank as number) ?? 1,
    forte: migrateForte(raw),
    echoPanels: (raw.echoPanels as SavedState['echoPanels']) ?? defaults.echoPanels,
    watermark: { ...defaults.watermark, ...(raw.watermark as object ?? {}) },
    verified: raw.verified as boolean | undefined,
  };
}


/** Legacy saves are URI-encoded JSON in base64, still read but never written since that encoding hit the quota sooner */
function decompress(data: string): string {
  try {
    // Plain JSON always has braces and quotes, neither in the base64 alphabet, so a full match means the legacy shape
    if (/^[A-Za-z0-9+/=]+$/.test(data)) {
      return decodeURIComponent(atob(data));
    }
    return data;
  } catch {
    // A decode failure means it was plain JSON all along
    return data;
  }
}

/** Reads the saves, decoding the legacy base64 shape and migrating to the current version on the way */
export function loadBuilds(): SavedBuilds {
  try {
    const stored = getLocalStorageItem(SAVED_BUILDS_STORAGE_KEY);
    if (!stored) {
      return { builds: [], version: CURRENT_VERSION };
    }

    let parsed: SavedBuilds;
    try {
      parsed = JSON.parse(decompress(stored));
    } catch {
      parsed = JSON.parse(stored);
    }

    if (!parsed.version || parsed.version !== CURRENT_VERSION) {
      parsed = migrateData(parsed);
    }

    return parsed;
  } catch (error) {
    console.error('Error loading builds from localStorage:', error);
    return { builds: [], version: CURRENT_VERSION };
  }
}

/**
 * Writes plain JSON, while decompress keeps the legacy base64 shape readable
 *
 * - A quota failure throws because SaveBuildModal surfaces it, and a dropped save must never look like a success
 * - A server-side call no-ops rather than throwing
 */
function saveBuilds(data: SavedBuilds): void {
  if (typeof window === 'undefined') return;

  if (!setLocalStorageJSON(SAVED_BUILDS_STORAGE_KEY, data)) {
    throw new Error('Failed to save build. Storage may be full.');
  }
}

export function loadDraftBuild(): SavedState | null {
  try {
    const raw = getLocalStorageItem(DRAFT_BUILD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return migrateSavedState(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Recursively sorted keys so a content hash is stable however the object was assembled */
function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

/** djb2 over the migrated, canonically serialized state */
function hashSavedState(state: SavedState): string {
  const json = stableStringify(migrateSavedState(state as unknown as Record<string, unknown>));
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function saveDraftBuild(state: SavedState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const migrated = migrateSavedState(state as unknown as Record<string, unknown>);
  // Callers gate navigation to /edit on this, so a quota failure throws rather than hand the editor a stale draft
  if (!setLocalStorageJSON(DRAFT_BUILD_STORAGE_KEY, migrated)) {
    throw new Error('Failed to save draft. Storage may be full.');
  }

  // Every programmatic draft load comes through here, while editing in /edit writes the draft key from BuildContext
  // So a draft whose hash has drifted from this baseline carries hand edits
  try {
    setLocalStorageItem(DRAFT_BASELINE_HASH_KEY, hashSavedState(migrated));
  } catch {
    // Guards hashSavedState since the write cannot throw, and a missing baseline just counts the draft as edited
  }
}

/**
 * True when the draft's content no longer matches the last programmatic load, so the user hand-edited it in /edit
 *
 * - A missing baseline counts as edited, so replacement flows err toward preserving the draft
 */
export function isDraftBuildEdited(draft: SavedState): boolean {
  // On the server this reports false, while in the browser a missing baseline means edited
  if (typeof window === 'undefined') return false;

  try {
    const baseline = getLocalStorageItem(DRAFT_BASELINE_HASH_KEY);
    if (!baseline) return true;
    return hashSavedState(draft) !== baseline;
  } catch {
    return false;
  }
}

/** Saves a displaced draft unless an identical build is already stored, returning null when skipped as a duplicate */
export function snapshotBuildToSaves(state: SavedState, name: string): SavedBuild | null {
  const contentHash = hashSavedState(state);
  const existing = loadBuilds();
  if (existing.builds.some((build) => hashSavedState(build.state) === contentHash)) {
    return null;
  }

  return saveBuild({ name, state });
}

/** Updates in place when the id already exists, otherwise appends under a fresh id */
export function saveBuild(build: Omit<SavedBuild, 'id' | 'date'> & { id?: string }): SavedBuild {
  const data = loadBuilds();

  const savedBuild: SavedBuild = {
    id: build.id || generateId(),
    name: build.name,
    date: new Date().toISOString(),
    state: migrateSavedState(build.state as unknown as Record<string, unknown>)
  };

  const existingIndex = data.builds.findIndex(b => b.id === savedBuild.id);
  if (existingIndex >= 0) {
    data.builds[existingIndex] = savedBuild;
  } else {
    data.builds.push(savedBuild);
  }

  saveBuilds(data);
  return savedBuild;
}

/** Appends builds keeping their name and state, regenerating any id that collides and stamping an unparseable date */
export function mergeBuilds(builds: SavedBuild[]): SavedBuild[] {
  if (!builds.length) return [];

  const data = loadBuilds();
  const existingIds = new Set(data.builds.map((build) => build.id));
  const merged: SavedBuild[] = [];

  for (const build of builds) {
    let nextId = typeof build.id === 'string' && build.id.trim() ? build.id.trim() : generateId();
    while (existingIds.has(nextId)) {
      nextId = generateId();
    }
    existingIds.add(nextId);

    const nextBuild: SavedBuild = {
      ...build,
      id: nextId,
      date: typeof build.date === 'string' && !Number.isNaN(Date.parse(build.date))
        ? build.date
        : new Date().toISOString(),
      state: migrateSavedState(build.state as unknown as Record<string, unknown>)
    };
    data.builds.push(nextBuild);
    merged.push(nextBuild);
  }

  if (merged.length > 0) {
    saveBuilds(data);
  }

  return merged;
}

/** False when no build carried that id */
export function deleteBuild(id: string): boolean {
  const data = loadBuilds();
  const initialLength = data.builds.length;
  data.builds = data.builds.filter(b => b.id !== id);

  if (data.builds.length < initialLength) {
    saveBuilds(data);
    return true;
  }
  return false;
}

/** Leaves date and state alone, returning null when the id is unknown */
export function renameBuild(id: string, newName: string): SavedBuild | null {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error('Please enter a build name');
  }

  if (trimmedName.length > 100) {
    throw new Error('Build name must be 100 characters or less');
  }

  const data = loadBuilds();
  const buildIndex = data.builds.findIndex((build) => build.id === id);
  if (buildIndex < 0) return null;

  const updatedBuild: SavedBuild = {
    ...data.builds[buildIndex],
    name: trimmedName
  };

  data.builds[buildIndex] = updatedBuild;
  saveBuilds(data);

  return updatedBuild;
}

export function clearAllBuilds(): void {
  removeLocalStorageItem(SAVED_BUILDS_STORAGE_KEY);
}

/** Downloads every build as JSON, stamped with the current version and an export date */
export function exportAllBuilds(): void {
  const data = loadBuilds();
  const exportData = {
    ...data,
    version: CURRENT_VERSION,
    exportDate: new Date().toISOString()
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `wuwabuilds_backup_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Takes either a single-build or a multi-build export, giving every build a fresh id and date */
export async function importBuild(file: File): Promise<SavedBuild[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);

        if (!imported || typeof imported !== 'object') {
          throw new Error('Invalid file format');
        }

        let builds: SavedBuild[] = [];

        if (imported.build) {
          if (validateBuild(imported.build)) {
            builds = [imported.build];
          } else {
            throw new Error('Invalid build data');
          }
        }
        else if (imported.builds && Array.isArray(imported.builds)) {
          builds = imported.builds.filter(validateBuild);
        }

        if (builds.length === 0) {
          throw new Error('No valid builds found in file');
        }

        const preparedBuilds = builds.map((build) => ({
          ...build,
          id: generateId(),
          date: new Date().toISOString(),
          state: migrateSavedState(build.state as unknown as Record<string, unknown>)
        }));

        const mergedBuilds = mergeBuilds(preparedBuilds);
        resolve(mergedBuilds);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to import file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function validateBuild(build: unknown): build is SavedBuild {
  if (!build || typeof build !== 'object') return false;

  const b = build as Partial<SavedBuild>;

  return (
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    typeof b.date === 'string' &&
    b.state !== undefined &&
    typeof b.state === 'object'
  );
}

/** Backfills a missing id and re-runs the state migration on every build */
function migrateData(data: SavedBuilds): SavedBuilds {
  const migratedBuilds = data.builds.map(build => ({
    ...build,
    id: build.id || generateId(),
    state: migrateSavedState(build.state as unknown as Record<string, unknown>)
  }));

  return {
    builds: migratedBuilds,
    savedEchoes: data.savedEchoes || [],
    version: CURRENT_VERSION
  };
}
