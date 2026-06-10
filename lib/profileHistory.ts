// Client-side profile visit history + "this is me" pin, the job Akasha's
// profile tabs do, surfaced through search recents and /profiles instead of
// persistent chrome. localStorage only; nothing here touches the backend.

export interface RecentProfile {
  uid: string;
  username: string;
  /** Featured character portrait at visit time, for the recents list. */
  head?: string | null;
  visitedAt: number;
}

const RECENTS_KEY = 'wuwabuilds_recent_profiles';
const MY_UID_KEY = 'wuwabuilds_my_uid';
const MAX_RECENTS = 8;

const hasStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

export function getRecentProfiles(): RecentProfile[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentProfile => (
        Boolean(entry) && typeof entry === 'object' &&
        typeof (entry as RecentProfile).uid === 'string' && (entry as RecentProfile).uid.length > 0 &&
        typeof (entry as RecentProfile).username === 'string'
      ))
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function recordProfileVisit(profile: { uid: string; username: string; head?: string | null }): void {
  if (!hasStorage() || !profile.uid) return;
  try {
    const next: RecentProfile[] = [
      { uid: profile.uid, username: profile.username, head: profile.head ?? null, visitedAt: Date.now() },
      ...getRecentProfiles().filter((entry) => entry.uid !== profile.uid),
    ].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Quota or privacy mode; history is best-effort.
  }
}

export function clearRecentProfiles(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    // best-effort
  }
}

// "This is me" pin, exposed as an external store so components re-render on
// toggle without setState-in-effect hydration dances.
const myUidListeners = new Set<() => void>();

export function subscribeMyUid(listener: () => void): () => void {
  myUidListeners.add(listener);
  return () => myUidListeners.delete(listener);
}

export function getMyUid(): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(MY_UID_KEY);
  } catch {
    return null;
  }
}

export const getMyUidServerSnapshot = (): string | null => null;

export function setMyUid(uid: string | null): void {
  if (!hasStorage()) return;
  try {
    if (uid) {
      window.localStorage.setItem(MY_UID_KEY, uid);
    } else {
      window.localStorage.removeItem(MY_UID_KEY);
    }
  } catch {
    // best-effort
  }
  myUidListeners.forEach((listener) => listener());
}
