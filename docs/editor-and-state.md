# Frontend Editor and State

This doc explains provider boundaries and editor state flow in `wuwabuilds/`.

## Provider Topology

- Root providers (`app/layout.tsx`):
  - `LanguageProvider`
- Tool route providers (`app/(game)/layout.tsx`):
  - `GameDataProvider`
  - `ToastProvider`
- Editor-level providers (editor-like routes):
  - `BuildProvider`
  - `StatsProvider`

## Responsibilities

- `GameDataProvider`:
  - Loads core JSON datasets.
  - Caches and reuses data across tool-route session usage.
- `BuildProvider`:
  - Holds active build state through reducer logic.
  - Persists draft changes to local storage with debounce.
- `StatsProvider`:
  - Computes derived stats and CV from build + game data.

## Editor Flow

1. User edits character/weapon/echo/forte data.
2. Build reducer updates canonical client build state.
3. Stats provider recalculates derived outputs.
4. UI sections consume derived and raw state.
5. Draft is persisted locally for recovery.

## Non-Obvious Constraints

- `ForteState` uses 5 ordered branches:
  - normal attack
  - skill
  - circuit
  - liberation
  - intro
- Echo constraints must remain valid for backend acceptance:
  - max total cost 12
  - max two 4-cost echoes
  - max three 3-cost echoes

## Implementation Hotspots

- Build context: `contexts/BuildContext.tsx`
- Stats context: `contexts/StatsContext.tsx`
- Game data context: `contexts/GameDataContext.tsx`
- Editor components: `components/edit/`
