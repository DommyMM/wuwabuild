const NEXT_EDITOR_SOURCE_KEY = 'wb_next_editor_source';

export type EditorStartSource =
  | 'direct'
  | 'import'
  | 'saves'
  | 'leaderboard'
  | 'home_cta';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function setNextEditorSource(source: EditorStartSource): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(NEXT_EDITOR_SOURCE_KEY, source);
  } catch {
    // Ignore storage errors in privacy-restricted browsers.
  }
}

export function consumeNextEditorSource(): EditorStartSource {
  if (!canUseSessionStorage()) return 'direct';
  try {
    const raw = window.sessionStorage.getItem(NEXT_EDITOR_SOURCE_KEY);
    window.sessionStorage.removeItem(NEXT_EDITOR_SOURCE_KEY);
    if (raw === 'import' || raw === 'saves' || raw === 'leaderboard' || raw === 'home_cta') {
      return raw;
    }
  } catch {
    // Ignore storage errors in privacy-restricted browsers.
  }
  return 'direct';
}
