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
- **`/builds`** — `force-static`. Server component prefetches the default build query through `lbServer.ts`; the client uses that payload only when the URL has no search params. Query changes, non-default initial URLs, and revalidation fetch the gateway (`api.wuwa.build`) directly, with a small localStorage cache keyed by serialized query.
- **`/leaderboards`** — server component prefetches overview data through `lbServer.ts`; the client overview cache (`leaderboardOverviewCache.ts`) avoids redundant fetches across mounts. Server and client use the same overview parser, and `weaponIds` is the configured board list (including a weapon with no rank-1 row yet), while `weapons` contains the available rank-1 summaries. Overview/reign surfaces intentionally use a longer 10-minute cache window than character boards.
- **`/leaderboards/[characterId]`** — `force-dynamic`. The route validates the character before contacting LB and returns the real not-found page for unknown IDs. For valid characters, the server prefetches the first board payload via `lbServer.ts`, canonicalizes the incoming query string against the returned weapon/track config, and `redirect()`s when the URL doesn't match. The payload is passed to the client as `initialData`.
- **`/profile/[uid]`** — server component fetches profile metadata through `fetchProfileSummary()`. Build rows are fetched client-side from `/profile/{uid}/builds`, which returns the same compact row shape as `/build` but is scoped by route UID in the LB service.
- Prefetch always calls LB through the configured LB gateway. Character-board/build/profile prefetches are cached via `next: { revalidate: 120 }` (2 minutes), while overview/reign prefetches use `next: { revalidate: 600 }` (10 minutes). See `PREFETCH_TTL_S` and `OVERVIEW_PREFETCH_TTL_S` in `lbServer.ts`.
- Those windows are not chosen here. They mirror the `s-maxage` the LB service emits for the same resource (`cachePolicy` in lb `internal/api/helpers.go`: `cacheList` = 120s, `cacheOverview` = 600s). lb owns the number; every other layer follows it. See "Cache windows" below.
- Where revalidation exists, client fetches after mount; signature checks cover the complete normalized row payload so owner, stat, equipment, reign, and configuration changes are not discarded as unchanged.

## Query State Model

- On `/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]`, the URL is the source of truth for shareable table state.
- Client components seed from `useSearchParams()`, then push canonical state back with `window.history.replaceState(...)`. `router.replace` is avoided because it no-ops on `force-static` routes when the page was first loaded with non-empty search params.
- Structured build filters share the search dropdown: `seq=0,4,6` is a discrete selected sequence set, and `stats=energy_regen:gte:130.crit_rate:gte:70` is a dot-joined list of stat thresholds.
- Browser back/forward, same-route deep links, and manual query edits resync visible controls from the URL.
- Character leaderboards preserve deep-link support for `buildId`, but only show the auto-expanded build while the matching weapon + track are active. Deep-linked rows use `scrollToElementBelowNav()` so the target lands below the sticky navigation and respects reduced-motion preferences.

## Important Invariants

- `lbServer.ts` is server-only. Never import in client components.
- `lb.ts` owns both the transport (`lbFetch` / `lbGetJSON`, which prefix the gateway base URL and throw a labeled error on non-OK) and the payload parsers. `lbServer.ts` supplies only the SSR transport (`next: { revalidate }`, `null` on failure) and reuses the exported `parseBuildListResponsePayload` / `parseLeaderboardResponsePayload`. Do not re-implement row or response parsing there: the server and client must map a payload identically, and only the transport should differ.
- `weaponId` selects which `damage_map` key to read. It does not filter eligible builds.
- Row identity for leaderboard entries is `entry.id + ":" + entry.trackKey`.
- In frontend rendering, treat `globalRank > 0` as a showable competitive rank and `globalRank === 0` as "do not show rank" (ghost rows and browse-only rows both land here).

## Score / ER Target

- `entry.damage` is the board Score: rotation damage × `min(1, ER / track.erTarget)`. There is no separate "unfiltered" vs "bracketed" board anymore — one ranked list per weapon/track, ER-scaled in place. The old ER bracket tabs (`?erMin=`) are gone.
- `LBTrack.erTarget` (0/absent = no ER requirement) drives the ER stat cell tint in `LeaderboardRow` (green at/above target, red below). Character boards expose two metric lenses: `Score` is the default ER-adjusted value, while `Damage` is the raw pre-ER-scaling lens. Raw damage is derived from Score and the row's ER value; it is not stored separately.
- Raw mode is shareable as `?scoring=raw`; default Score mode omits `scoring` from the URL. `entry.damage` follows the active lens on character-board rows.
- Build standings (`/leaderboard/{characterId}/build/{buildId}/standings`), substat upgrade projections, and benchmark comparisons remain canonical Score rankings/calculations. When shown from a raw Damage page, the UI keeps `Score` labels or context notes instead of implying raw cross-board ranks.
- Reigns and dedup are no longer conditioned on an `erMin` state; `showReignHold` in `LeaderboardRow` only checks rank/ghost.

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
- Profile deep links can also inject a build outside its natural filtered/sorted page. That row is display-only: it does not increment real-row ranks, page ranges, or totals.

## Build Expansion

`/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]` share:

- `useExpandedRows()` for expanded row ids and pure toggle behavior
- `useBuildDetails()` for detail fetches, request aborts, retry state, and per-build detail caching. It also normalizes Rover identity: the row's `character.id` is authoritative, so `buildState.characterId`/`roverElement` are re-derived from character data (`roverElementName`) before the detail is cached — historical build JSON may carry a stale element.

On row expansion, frontend may fetch:
- move breakdown
- substat upgrades
- standings across all weapon x track boards

The simulation section requires parent row context such as:
- `weaponId`
- `track`
- `damage`

Expansion fetches are intentionally on-demand. The list view does not eagerly hydrate build details.
Failed expansion requests remain in an error state until the user chooses **Retry**; they must not automatically loop while a panel stays open.

Opening a discovered build in `/edit` writes it to the draft key. If a different editor draft already exists, the expansion panel confirms replacement before writing it.

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
