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

- **`/`** — an hourly ISR snapshot. The server prefetches overview, global build stats, and the first hero move profile through `lbServer.ts`. These editorial/stat panels do not refetch after hydration; hourly freshness is intentional because a request per landing-page visit would add origin work without meaningful UX value.
- **`/builds`** — `force-static`, with one canonical default snapshot regenerated hourly. The server never reads `searchParams`. The client uses the snapshot only for the empty/default query, then performs a non-blocking gateway refresh. Scoped initial URLs and query changes fetch `api.wuwa.build` directly, with a small localStorage cache keyed by the serialized query.
- **`/leaderboards`** — an hourly ISR overview snapshot followed by one non-blocking gateway refresh after mount. `leaderboardOverviewCache.ts` supplies fast cross-mount seed data and request deduplication, but does not suppress that refresh. Cloudflare's 10-minute overview cache therefore controls visible freshness. Server and client use the same parser; `weaponIds` is the configured board list (including a weapon with no rank-1 row yet), while `weapons` contains available rank-1 summaries.
- **`/leaderboards/[characterId]`** — `force-static`, hourly ISR, and one canonical server payload per character (the default weapon/track). `generateStaticParams()` enumerates known characters during the production build; it does not run during ISR. The server validates the character but deliberately does not read the query string. The client reads `weaponId`, `track`, filters, pagination, and `buildId`, then fetches the exact board through the gateway. The server snapshot stays visible during a default-board refresh; a non-default URL with no matching rows shows the initial loading state.
- **`/profile/[uid]`** — server component fetches profile metadata through `fetchProfileSummary()`. Build rows are fetched client-side from `/profile/{uid}/builds`, which returns the same compact row shape as `/build` but is scoped by route UID in the LB service.
- Server prefetches always call LB through the configured gateway. Interactive ISR pages pass their page `revalidate` value into `lbServer.ts`; otherwise a shorter nested `fetch(..., { next: { revalidate } })` would lower the whole route's ISR cadence and recreate the ISR-write cost this layout is meant to avoid.
- Browser refreshes do not rebuild these pages. A request receives the current static/ISR artifact; after its one-hour window, the first eligible request triggers regeneration. Interactive clients independently fetch the exact API resource, which Cloudflare serves according to LB's `s-maxage` (`cacheList` = 120s and `cacheOverview` = 600s).
- Same-query client refreshes keep existing rows interactive and announce a compact `Updating…` status. When the requested query differs from the query that produced the visible rows, those mismatched rows are hidden behind the loading skeleton until the gateway response arrives. Signature checks cover the complete normalized payload so unchanged data does not rerender.

### Cache Layers

| Layer | What it caches | What a user visit does |
| --- | --- | --- |
| Vercel static/ISR page | Canonical HTML/RSC payload | Serves the existing artifact; only an expired artifact can cause regeneration. Query-only selections do not request another RSC payload. |
| Cloudflare gateway | LB GET responses using origin `s-maxage` | Usually serves the cached API response; one miss per POP/window reaches Railway. |
| Browser/local client cache | Recently viewed build-list/overview payloads | Seeds the UI immediately, then the interactive pages revalidate through Cloudflare. |
| Railway/LB | Source of current leaderboard data and computation | Runs only when Cloudflare misses/bypasses cache or for uncached/on-demand endpoints. |

## Query State Model

- On `/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]`, the URL is the source of truth for shareable table state.
- Character boards seed from `useSearchParams()` and write query-only changes with the native History API. Weapon, track, and pagination selections use `pushState` so Back/Forward restores the prior board; rapid filters, sorting, and canonical cleanup use `replaceState` so they do not flood browser history.
- Do not use `router.push`/`router.replace` for character-board query state. The server artifact is identical for every query variant, so a Next navigation only adds an Edge/RSC request alongside the API request the client actually needs. Native history keeps the URL shareable without requesting that duplicate payload.
- `/builds` uses `replaceState` for its filter-heavy query surface and fetches only its gateway data when state changes.
- Structured build filters share the search dropdown: `seq=0,4,6` is a discrete selected sequence set, and `stats=energy_regen:gte:130.crit_rate:gte:70` is a dot-joined list of stat thresholds.
- On character boards, Browser Back/Forward, same-route deep links, and manual query edits resync visible controls from the URL.
- Character leaderboards preserve deep-link support for `buildId`, but only show the auto-expanded build while the matching weapon + track are active. Deep-linked rows use `scrollToElementBelowNav()` so the target lands below the sticky navigation and respects reduced-motion preferences.

## Important Invariants

- `lbServer.ts` is server-only. Never import in client components.
- `lb.ts` owns both the transport (`lbFetch` / `lbGetJSON`, which prefix the gateway base URL and throw a labeled error on non-OK) and the payload parsers. `lbServer.ts` supplies only the SSR transport (`next: { revalidate }`, `null` on failure) and reuses the exported `parseBuildListResponsePayload` / `parseLeaderboardResponsePayload`. Do not re-implement row or response parsing there: the server and client must map a payload identically, and only the transport should differ.
- `weaponId` selects which `damage_map` key to read. It does not filter eligible builds.
- Row identity for leaderboard entries is `entry.id + ":" + entry.trackKey`.
- In frontend rendering, treat `globalRank > 0` as a showable competitive rank and `globalRank === 0` as "do not show rank". `globalRank` is now a property of the build on its board (character + weapon + track), always measured against the deduped canonical board, so filters and non-damage sorts no longer renumber it — only a ghost row (a deep-linked build the current view does not contain) or a build with no damage on this board lands at `0`.

## Score / ER Target

- `entry.damage` is the board Score: rotation damage × `min(1, ER / track.erTarget)`. There is no separate "unfiltered" vs "bracketed" board anymore — one ranked list per weapon/track, ER-scaled in place. The old ER bracket tabs (`?erMin=`) are gone.
- `LBTrack.erTarget` (0/absent = no ER requirement) drives the ER stat cell tint in `LeaderboardRow` (green at/above target, red below). Character boards expose two metric lenses: `Score` is the default ER-adjusted value, while `Damage` is the raw pre-ER-scaling lens. Raw damage is derived from Score and the row's ER value; it is not stored separately.
- Raw mode is shareable as `?scoring=raw`; default Score mode omits `scoring` from the URL. `entry.damage` follows the active lens on character-board rows.
- Build standings (`/leaderboard/{characterId}/build/{buildId}/standings`), substat upgrade projections, and benchmark comparisons remain canonical Score rankings/calculations. When shown from a raw Damage page, the UI keeps `Score` labels or context notes instead of implying raw cross-board ranks.
- Reigns and dedup are no longer conditioned on an `erMin` state; `showReignHold` in `LeaderboardRow` only checks rank/ghost.

## Rank, Dedup, and the View

Three concepts are kept separate. Fusing them is what used to make "rank" mean
different things depending on how you reached the page (a set filter renumbered
from 1; a stat sort did not).

- **Board identity** is character + weapon + track. Nothing else selects the
  ranked list — this is exactly what the canonical URL encodes.
- **Rank** (`globalRank`) is a property of a build on that board, always measured
  against the deduped canonical board with no view filter applied. A filtered
  view shows each matching build at its true board position (e.g. the top
  Midnight Veil build reads its real rank, not `#1`), never a fresh 1..N.
- **The view** (filters, sort, dedup) chooses which rows appear and in what
  order, and nothing else. Filters still constrain the candidate pool *before*
  dedup, so "Midnight Veil" shows each player's best Midnight Veil build.

Dedup is its own axis, no longer inferred from the sort key. The board shows one
representative row per player by default under any sort. `?dedup=0` shows every
submitted build (each still carries its true board rank). A `uid`/`username`
search defaults to `dedup=0`, because the point of that query is to see that
player's builds; an explicit `?dedup=1` overrides.

`total` is the count of rows the current view pages through, so it always agrees
with the pagination shown ("X–Y of Z").

## Ghost Build Behavior

- If a deep-linked `buildId` is not in the current view (deduped out, or excluded
  by a filter):
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

The move breakdown (`BuildMoveBreakdown.tsx`) renders a score equation (rows flagged `modifier: true` are global adjustments like ER scaling and set bonuses — never rotation moves), a damage profile aggregated by move type, and per-move rows with type-colored bars. Move-type colors are a fixed identity map inside the component. Per-hit `moveTypes` (lb per-type sub-hit fold) split mixed-type rows and make the profile lossless; hits without types fall back to the move's primary type. API row order is rotation order — the component preserves the first-occurrence index for its rotation-order sort; `lb/docs/move-breakdown-ui.md` is canonical for the response shape.

The reference benchmark (`BuildOptimalityPanel.tsx`) treats ceiling, median, and
minimum rolls as independent optimized loadouts. Selecting a tier changes its
layout, main stats, sets, final statline, active `scoreModifiers`, and full Echo
blueprint together. `scoreModifiers` are already included in the reference
score; the UI lists them as an explanation, never adds them client-side.

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
