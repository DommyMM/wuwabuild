import { SavedBuild, SavedBuilds, SavedState, ForteState, ForteEntry, createDefaultSavedState } from '@/lib/build';

// Storage keys
export const SAVED_BUILDS_STORAGE_KEY = 'wuwabuilds_saves';
export const DRAFT_BUILD_STORAGE_KEY = 'wuwa_draft_build';
const CURRENT_VERSION = '2.0.0';

/** Convert old nodeStates+forteLevels into a ForteState array. */
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

/** Migrate a single SavedState from the old nested shape to the new flat shape. */
function migrateSavedState(raw: Record<string, unknown>): SavedState {
  const defaults = createDefaultSavedState();

  // Already new flat shape
  if ('characterId' in raw) {
    return { ...defaults, ...raw, forte: migrateForte(raw) } as SavedState;
  }

  // Legacy nested shape — flatten
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

/**
 * Simple compression using base64 encoding with run-length encoding.
 * For more advanced compression, consider using lz-string library.
 */
function compress(data: string): string {
  try {
    // Use built-in compression if available (modern browsers)
    return btoa(encodeURIComponent(data));
  } catch {
    return data;
  }
}

function decompress(data: string): string {
  try {
    // Check if data looks like base64
    if (/^[A-Za-z0-9+/=]+$/.test(data)) {
      return decodeURIComponent(atob(data));
    }
    return data;
  } catch {
    // If decompression fails, assume it's uncompressed JSON
    return data;
  }
}

/**
 * Load all saved builds from localStorage.
 */
export function loadBuilds(): SavedBuilds {
  if (typeof window === 'undefined') {
    return { builds: [], version: CURRENT_VERSION };
  }

  try {
    const stored = localStorage.getItem(SAVED_BUILDS_STORAGE_KEY);
    if (!stored) {
      return { builds: [], version: CURRENT_VERSION };
    }

    // Try to parse, handling both compressed and uncompressed data
    let parsed: SavedBuilds;
    try {
      parsed = JSON.parse(decompress(stored));
    } catch {
      parsed = JSON.parse(stored);
    }

    // Migrate old data format if needed
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
 * Save all builds to localStorage with compression.
 */
function saveBuilds(data: SavedBuilds): void {
  if (typeof window === 'undefined') return;

  try {
    const json = JSON.stringify(data);
    const compressed = compress(json);
    localStorage.setItem(SAVED_BUILDS_STORAGE_KEY, compressed);
  } catch (error) {
    console.error('Error saving builds to localStorage:', error);

    // If compression fails, try saving uncompressed
    try {
      localStorage.setItem(SAVED_BUILDS_STORAGE_KEY, JSON.stringify(data));
    } catch (innerError) {
      console.error('Error saving uncompressed data:', innerError);
      throw new Error('Failed to save build. Storage may be full.');
    }
  }
}

/**
 * Save a new build or update existing build.
 */
export function saveBuild(build: Omit<SavedBuild, 'id' | 'date'> & { id?: string }): SavedBuild {
  const data = loadBuilds();

  const savedBuild: SavedBuild = {
    id: build.id || generateId(),
    name: build.name,
    date: new Date().toISOString(),
    state: build.state
  };

  // Check if updating existing build
  const existingIndex = data.builds.findIndex(b => b.id === savedBuild.id);
  if (existingIndex >= 0) {
    data.builds[existingIndex] = savedBuild;
  } else {
    data.builds.push(savedBuild);
  }

  saveBuilds(data);
  return savedBuild;
}

/**
 * Load a specific build by ID.
 */
export function loadBuild(id: string): SavedBuild | null {
  const data = loadBuilds();
  return data.builds.find(b => b.id === id) || null;
}

/**
 * Delete a build by ID.
 */
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

/**
 * Duplicate an existing build with a new name.
 */
export function duplicateBuild(id: string, newName?: string): SavedBuild | null {
  const original = loadBuild(id);
  if (!original) return null;

  return saveBuild({
    name: newName || `${original.name} (Copy)`,
    state: JSON.parse(JSON.stringify(original.state)) // Deep clone
  });
}

/**
 * Clear all saved builds.
 */
export function clearAllBuilds(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SAVED_BUILDS_STORAGE_KEY);
}

/**
 * Export a single build to a downloadable JSON file.
 */
export function exportBuild(build: SavedBuild): void {
  const exportData = {
    version: CURRENT_VERSION,
    exportDate: new Date().toISOString(),
    build
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `wuwabuilds_${sanitizeFilename(build.name)}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all builds to a downloadable JSON file.
 */
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

/**
 * Import builds from a JSON file.
 * Returns the imported builds.
 */
export async function importBuild(file: File): Promise<SavedBuild[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);

        // Validate imported data
        if (!imported || typeof imported !== 'object') {
          throw new Error('Invalid file format');
        }

        let builds: SavedBuild[] = [];

        // Handle single build export
        if (imported.build) {
          if (validateBuild(imported.build)) {
            builds = [imported.build];
          } else {
            throw new Error('Invalid build data');
          }
        }
        // Handle multiple builds export
        else if (imported.builds && Array.isArray(imported.builds)) {
          builds = imported.builds.filter(validateBuild);
        }

        if (builds.length === 0) {
          throw new Error('No valid builds found in file');
        }

        // Add imported builds to storage
        const data = loadBuilds();
        for (const build of builds) {
          // Generate new IDs to avoid conflicts
          const newBuild: SavedBuild = {
            ...build,
            id: generateId(),
            date: new Date().toISOString()
          };
          data.builds.push(newBuild);
          builds[builds.indexOf(build)] = newBuild;
        }
        saveBuilds(data);

        resolve(builds);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to import file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate a unique ID for builds.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize a string for use in filenames.
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

/**
 * Validate that an object is a valid SavedBuild.
 */
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

/**
 * Migrate old data format to current version.
 */
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

/**
 * Get storage usage statistics.
 */
export function getStorageStats(): { used: number; total: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, total: 0, percentage: 0 };
  }

  try {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage[key].length * 2; // UTF-16 uses 2 bytes per character
      }
    }

    // Most browsers have a 5MB limit
    const maxSize = 5 * 1024 * 1024;

    return {
      used: total,
      total: maxSize,
      percentage: Math.round((total / maxSize) * 100)
    };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
}
