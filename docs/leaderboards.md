# Frontend Leaderboards

This doc explains how leaderboard data is fetched, cached, and rendered in `wuwabuilds/`.

## Main Entry Points

- Server prefetch helpers: `lib/lbServer.ts`
- Client fetch layer: `lib/lb.ts`
- Global board cache: `components/leaderboards/board/globalBoardCache.ts`
- Shared expansion panel: `components/leaderboards/BuildExpanded.tsx`

## Fetch Model

- **`/`** — server component prefetches overview + global build stats via `lbServer.ts` (ISR on the page).
- **`/leaderboards/[characterId]`** — server prefetches the first board payload via `lbServer.ts` and passes it as `initialData`.
- **`/builds`** and **`/leaderboards`** — list data is fetched on the client through `/api/lb/*` (no server `initialData` on those routes).
- Prefetch always calls LB directly with `LB_URL` and `X-Internal-Key` (never through the Next proxy).
- Where revalidation exists, client fetches after mount; signature checks can skip `setState` when nothing effectively changed.

## Important Invariants

- `lbServer.ts` is server-only. Never import in client components.
- `weaponId` selects which `damage_map` key to read. It does not filter eligible builds.
- Row identity for leaderboard entries is `entry.id + ":" + entry.trackKey`.
- `globalRank` is meaningful only in competitive mode.

## Competitive vs Browse Behavior

- Competitive mode:
  - Backend applies per-player dedup.
  - `globalRank` reflects deduped standings.
- Browse mode (non-damage sort or player filters):
  - Dedup is disabled.
  - `globalRank` is `0`.

## Ghost Build Behavior

- If a deep-linked `buildId` is deduped out in competitive mode:
  - Backend returns a `ghostBuild`.
  - Frontend inserts it at its computed damage position.
  - No competitive rank is shown for that row.

## Build Expansion

On row expansion, frontend may fetch:
- move breakdown
- substat upgrades
- standings across all weapon x track boards

The simulation section requires parent row context such as:
- `weaponId`
- `track`
- `damage`

## Where to Change What

- Overview page behavior: `components/leaderboards/overview/`
- Character leaderboard page behavior: `components/leaderboards/character/`
- Global board behavior: `components/leaderboards/board/`
- Shared expansion and details: `components/leaderboards/BuildExpanded.tsx`
