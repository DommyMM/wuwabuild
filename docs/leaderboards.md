# Frontend Leaderboards

This doc explains how leaderboard data is fetched, cached, query-synced, and rendered in `wuwabuilds/`.

## Main Entry Points

- Server prefetch helpers: `lib/lbServer.ts`
- Client fetch layer: `lib/lb.ts`
- Global board cache: `components/leaderboards/board/globalBoardCache.ts`
- Overview cache: `lib/leaderboardOverviewCache.ts`
- Shared expansion panel: `components/leaderboards/BuildExpanded.tsx`
- Shared row state helpers: `components/leaderboards/useExpandedRows.ts`, `components/leaderboards/useBuildDetails.ts`
- Shared scroll helper: `components/leaderboards/scrollToElementBelowNav.ts`
- Character query helpers: `components/leaderboards/character/leaderboardCharacterQuery.ts`
- Global board query helpers: `components/leaderboards/board/globalBoardQuery.ts`

## Fetch Model

- **`/`** — server component prefetches overview + global build stats via `lbServer.ts` (ISR on the page).
- **`/builds`** — `force-static`. Server component prefetches the default build query through `lbServer.ts`; the client uses that payload only when the URL has no search params. Query changes, non-default initial URLs, and revalidation fetch through `/api/lb/*`, with a small localStorage cache keyed by serialized query.
- **`/leaderboards`** — server component prefetches overview data through `lbServer.ts`; the client overview cache (`leaderboardOverviewCache.ts`) avoids redundant fetches across mounts.
- **`/leaderboards/[characterId]`** — `force-dynamic`. Server prefetches the first board payload via `lbServer.ts`, canonicalizes the incoming query string against the returned weapon/track config, and `redirect()`s when the URL doesn't match. The payload is passed to the client as `initialData`.
- **`/profile/[uid]`** — server component fetches profile metadata through `fetchProfileSummary()`. Build rows are fetched client-side from `/profile/{uid}/builds`, which returns the same compact row shape as `/build` but is scoped by route UID in the LB service.
- Prefetch always calls LB directly with `LB_URL` and `X-Internal-Key` (never through the Next proxy). Prefetch responses are cached via `next: { revalidate: 300 }` (5 minutes, see `PREFETCH_TTL_S` in `lbServer.ts`).
- Where revalidation exists, client fetches after mount; signature checks can skip `setState` when nothing effectively changed.

## Query State Model

- On `/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]`, the URL is the source of truth for shareable table state.
- Client components seed from `useSearchParams()`, then push canonical state back with `window.history.replaceState(...)`. `router.replace` is avoided because it no-ops on `force-static` routes when the page was first loaded with non-empty search params.
- Browser back/forward, same-route deep links, and manual query edits resync visible controls from the URL.
- Character leaderboards preserve deep-link support for `buildId`, but only show the auto-expanded build while the matching weapon + track are active. Deep-linked rows use `scrollToElementBelowNav()` so the target lands below the sticky navigation and respects reduced-motion preferences.

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

`/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]` share:

- `useExpandedRows()` for expanded row ids and pure toggle behavior
- `useBuildDetails()` for detail fetches, request aborts, retry state, and per-build detail caching

On row expansion, frontend may fetch:
- move breakdown
- substat upgrades
- standings across all weapon x track boards

The simulation section requires parent row context such as:
- `weaponId`
- `track`
- `damage`

Expansion fetches are intentionally on-demand. The list view does not eagerly hydrate build details.

The shared hooks only cover generic row state. Domain semantics stay separate:

- `/builds` and profile tables render compact build rows from build-list style endpoints (`/build` and `/profile/{uid}/builds` respectively).
- `/leaderboards/[characterId]` renders leaderboard rows with damage-board context, competitive dedupe, `globalRank`, and optional `ghostBuild`.

## Where to Change What

- Overview page behavior: `components/leaderboards/overview/`
- Character leaderboard page behavior: `components/leaderboards/character/`
- Global board behavior: `components/leaderboards/board/`
- Shared row expansion/detail/scroll behavior: `components/leaderboards/useExpandedRows.ts`, `components/leaderboards/useBuildDetails.ts`, `components/leaderboards/scrollToElementBelowNav.ts`
- Shared expansion and details: `components/leaderboards/BuildExpanded.tsx`
- Profile leaderboard rendering: `components/profile/`
