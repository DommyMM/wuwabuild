# Frontend Leaderboards

This doc explains how leaderboard data is fetched, cached, query-synced, and rendered in `wuwabuilds/`.

## Main Entry Points

- Server prefetch helpers: `lib/lbServer.ts`
- Client fetch layer: `lib/lb.ts`
- Global board cache: `components/leaderboards/board/globalBoardCache.ts`
- Shared expansion panel: `components/leaderboards/BuildExpanded.tsx`
- Character query helpers: `components/leaderboards/character/leaderboardCharacterQuery.ts`
- Global board query helpers: `components/leaderboards/board/globalBoardQuery.ts`

## Fetch Model

- **`/`** — server component prefetches overview + global build stats via `lbServer.ts` (ISR on the page).
- **`/leaderboards/[characterId]`** — server prefetches the first board payload via `lbServer.ts`, canonicalizes the incoming query string against the returned weapon/track config, and passes the payload as `initialData`.
- **`/builds`** and **`/leaderboards`** — list data is fetched on the client through `/api/lb/*`.
- Prefetch always calls LB directly with `LB_URL` and `X-Internal-Key` (never through the Next proxy).
- Where revalidation exists, client fetches after mount; signature checks can skip `setState` when nothing effectively changed.
- `/builds` keeps a small localStorage cache by serialized query for smoother revisits.

## Query State Model

- On both `/builds` and `/leaderboards/[characterId]`, the URL is the source of truth for shareable state.
- Client components seed from `useSearchParams()`, then push canonical state back with `router.replace(..., { scroll: false })`.
- Browser back/forward, same-route deep links, and manual query edits resync visible controls from the URL.
- Character leaderboards preserve deep-link support for `buildId`, but only show the auto-expanded build while the matching weapon + track are active.

## Important Invariants

- `lbServer.ts` is server-only. Never import in client components.
- `weaponId` selects which `damage_map` key to read. It does not filter eligible builds.
- Row identity for leaderboard entries is `entry.id + ":" + entry.trackKey`.
- In frontend rendering, treat `globalRank > 0` as a showable competitive rank and `globalRank === 0` as "do not show rank" (ghost rows and browse-only rows both land here).

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
  - No competitive rank is shown for that row (`globalRank === 0`).

## Build Expansion

On row expansion, frontend may fetch:
- move breakdown
- substat upgrades
- standings across all weapon x track boards

The simulation section requires parent row context such as:
- `weaponId`
- `track`
- `damage`

Expansion fetches are intentionally on-demand. The list view does not eagerly hydrate build details.

## Where to Change What

- Overview page behavior: `components/leaderboards/overview/`
- Character leaderboard page behavior: `components/leaderboards/character/`
- Global board behavior: `components/leaderboards/board/`
- Shared expansion and details: `components/leaderboards/BuildExpanded.tsx`
- Profile leaderboard rendering: `components/profile/`
