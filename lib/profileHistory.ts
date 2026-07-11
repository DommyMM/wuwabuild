// Client-side profile history: recently opened profiles plus starred pins.
// Powers the profile switcher strip, search recents, and the /profiles
// directory. localStorage only: nothing here is verified, sent to the
// backend, or visible to anyone else.

export interface StoredProfile {
  uid: string;
  username: string;
  /** Featured character portrait at save time. */
  head?: string | null;
  savedAt: number;
}

const RECENTS_KEY = 'wuwabuilds_recent_profiles';
const PINNED_KEY = 'wuwabuilds_pinned_profiles';
/** Cap for both pinned and recent lists. */
const MAX_PROFILES = 8;

const hasStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Subscribe to any profile-history change (recents or pins). */
export function subscribeProfileHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseProfiles(raw: string | null, cap: number): StoredProfile[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is StoredProfile => (
        Boolean(entry) && typeof entry === 'object' &&
        typeof (entry as StoredProfile).uid === 'string' && (entry as StoredProfile).uid.length > 0 &&
        typeof (entry as StoredProfile).username === 'string' &&
        typeof (entry as StoredProfile).savedAt === 'number' &&
        Number.isFinite((entry as StoredProfile).savedAt)
      ))
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, cap);
  } catch {
    return [];
  }
}

function readProfiles(key: string, cap: number): StoredProfile[] {
  if (!hasStorage()) return [];
  try {
    return parseProfiles(window.localStorage.getItem(key), cap);
  } catch {
    return [];
  }
}

function writeProfiles(key: string, profiles: StoredProfile[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(profiles));
  } catch {
    // Quota or privacy mode; history is best-effort.
  }
  emit();
}

// Cached snapshots for useSyncExternalStore (stable reference per raw value).
const EMPTY: StoredProfile[] = [];

function makeSnapshot(key: string, cap: number): () => StoredProfile[] {
  let cacheRaw: string | null = null;
  let cache: StoredProfile[] = EMPTY;
  return () => {
    if (!hasStorage()) return EMPTY;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return EMPTY;
    }
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = parseProfiles(raw, cap);
    }
    return cache;
  };
}

export const getRecentProfilesSnapshot = makeSnapshot(RECENTS_KEY, MAX_PROFILES);
export const getPinnedProfilesSnapshot = makeSnapshot(PINNED_KEY, MAX_PROFILES);
export const getProfilesServerSnapshot = (): StoredProfile[] => EMPTY;

export function getRecentProfiles(): StoredProfile[] {
  return readProfiles(RECENTS_KEY, MAX_PROFILES);
}

export function getPinnedProfiles(): StoredProfile[] {
  return readProfiles(PINNED_KEY, MAX_PROFILES);
}

export function recordProfileVisit(profile: { uid: string; username: string; head?: string | null }): void {
  if (!profile.uid) return;
  const recents = getRecentProfiles();
  const nextEntry = { uid: profile.uid, username: profile.username, head: profile.head ?? null, savedAt: Date.now() };
  writeProfiles(RECENTS_KEY, [
    nextEntry,
    ...recents.filter((entry) => entry.uid !== profile.uid),
  ].slice(0, MAX_PROFILES));
}

export function clearRecentProfiles(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    // best-effort
  }
  emit();
}

/** Remove one profile from recents. Pins are left alone. */
export function removeRecentProfile(uid: string): void {
  if (!uid) return;
  writeProfiles(RECENTS_KEY, getRecentProfiles().filter((entry) => entry.uid !== uid));
}

/** Pin or unpin a profile. Pins are device-local bookmarks, newest first. */
export function togglePinnedProfile(profile: { uid: string; username: string; head?: string | null }): void {
  if (!profile.uid) return;
  const pinned = getPinnedProfiles();
  const exists = pinned.some((entry) => entry.uid === profile.uid);
  writeProfiles(PINNED_KEY, exists
    ? pinned.filter((entry) => entry.uid !== profile.uid)
    : [
        { uid: profile.uid, username: profile.username, head: profile.head ?? null, savedAt: Date.now() },
        ...pinned,
      ].slice(0, MAX_PROFILES));
}
