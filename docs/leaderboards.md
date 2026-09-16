# Leaderboards

How leaderboard data is fetched, cached, query-synced and ranked. Term definitions are in
`domain-glossary.md`. The expansion panel under a row is in `build-expansion.md`.

## Entry points

| Concern | File |
| --- | --- |
| Server prefetch | `lib/lbServer.ts` |
| Client fetch and parsers | `lib/lb.ts` |
| Global board cache | `components/leaderboards/board/globalBoardCache.ts` |
| Overview cache | `lib/leaderboardOverviewCache.ts` |
| Character query helpers | `components/leaderboards/character/leaderboardCharacterQuery.ts` |
| Global board query helpers | `components/leaderboards/board/globalBoardQuery.ts` |

## Fetch model

- `/` is an hourly ISR snapshot. The server prefetches overview, global build stats and the first hero
  move profile through `lbServer.ts`. These panels never refetch after hydration, because a request per
  landing-page visit would add origin work for no visible gain.
- `/builds` is `force-static` with one canonical default snapshot regenerated hourly, and the server
  never reads `searchParams`. The client uses that snapshot only for the empty query, then refreshes
  non-blocking. Scoped initial URLs and query changes fetch the gateway directly, with a small
  localStorage cache keyed by the serialized query.
- `/leaderboards` is an hourly ISR overview snapshot followed by one non-blocking refresh after mount.
  `leaderboardOverviewCache.ts` supplies cross-mount seed data and request deduplication but does not
  suppress that refresh, so Cloudflare's 10-minute overview cache controls visible freshness. Server and
  client share one parser. `weaponIds` is the configured board list, including a weapon with no rank-1
  row yet, while `weapons` carries the available rank-1 summaries.
- `/leaderboards/[characterId]` is `force-static` on hourly ISR with one canonical server payload per
  character, its default weapon and track. `generateStaticParams()` enumerates known characters during
  the production build and does not run during ISR. The server validates the character but deliberately
  ignores the query string, so the client reads `weaponId`, `track`, filters, pagination and `buildId`
  and fetches the exact board. The server snapshot stays visible during a default-board refresh, while a
  non-default URL with no matching rows shows the loading state.
- `/profile/[uid]` fetches profile metadata server-side through `fetchProfileSummary()`. Build rows come
  from `/profile/{uid}/builds` client-side, the same compact row shape as `/build` scoped by route UID.
  The ranking shelf uses `/profile/{uid}/standings`, one representative per character constrained to an
  uploaded weapon and the closest configured sequence board at or below that upload, so it is not the
  build's best hypothetical weapon and sequence result.

Interactive ISR pages pass their page `revalidate` into `lbServer.ts`, because a shorter nested
`fetch(..., { next: { revalidate } })` would lower the whole route's ISR cadence and recreate the
ISR-write cost this layout avoids.

A browser refresh does not rebuild these pages. The request gets the current artifact, and after its
one-hour window the first eligible request triggers regeneration. Interactive clients fetch the exact
API resource themselves, which Cloudflare serves per LB's `s-maxage` (`cacheList` 120s,
`cacheOverview` 600s).

Same-query refreshes keep existing rows interactive under a compact `Updating…` status. When the
requested query differs from the one that produced the visible rows, those rows hide behind the loading
skeleton until the response arrives. Signature checks cover the complete normalized payload so unchanged
data does not rerender.

### Cache layers

| Layer | Caches | What a visit does |
| --- | --- | --- |
| Vercel static/ISR page | Canonical HTML and RSC payload | Serves the existing artifact, and only an expired one regenerates. Query-only selections request no new RSC payload. |
| Cloudflare gateway | LB GET responses on origin `s-maxage` | Usually serves cached, one miss per POP per window reaches Railway |
| Browser localStorage | Recently viewed build-list and overview payloads | Seeds the UI immediately, then revalidates through Cloudflare |
| Railway LB service | Source of current data and computation | Runs only on a Cloudflare miss or bypass, or for uncached endpoints |

## Query state

The URL is the source of truth for shareable table state on `/builds`, `/profile/[uid]` and
`/leaderboards/[characterId]`.

- Character boards seed from `useSearchParams()` and write query-only changes with the native History
  API. Weapon, track and pagination use `pushState` so Back and Forward restore the prior board, while
  rapid filters, sorting and canonical cleanup use `replaceState` so they do not flood history.
- Never use `router.push` or `router.replace` for character-board query state. The server artifact is
  identical for every query variant, so a Next navigation only adds an Edge and RSC request alongside
  the API request the client actually needs.
- `/builds` uses `replaceState` throughout and fetches only its gateway data when state changes.
- Structured filters share the search dropdown: `seq=0,4,6` is a discrete sequence set, and
  `stats=energy_regen:gte:130.crit_rate:gte:70` is a dot-joined list of stat thresholds.
- Back, Forward, same-route deep links and manual query edits all resync visible controls from the URL.
- A `buildId` deep link auto-expands only while its matching weapon and track are active. Deep-linked
  rows use `scrollToElementBelowNav()` so the target lands below the sticky nav and respects reduced
  motion.

## Invariants

- `lbServer.ts` is server-only, never import it from a client component
- `lb.ts` owns both transport (`lbFetch`, `lbGetJSON`, which prefix the gateway base URL and throw a
  labeled error on non-OK) and the payload parsers. `lbServer.ts` supplies only the SSR transport
  (`next: { revalidate }`, `null` on failure) and reuses the exported
  `parseBuildListResponsePayload` and `parseLeaderboardResponsePayload`. Do not re-implement row or
  response parsing there, because server and client must map a payload identically and only the
  transport may differ.
- `weaponId` selects which `damage_map` key to read, it does not filter eligible builds
- Row identity is `entry.id + ":" + entry.trackKey`
- Treat `globalRank > 0` as a showable rank and `globalRank === 0` as "do not show rank"

## Score and ER target

`entry.damage` is the board Score. Damage tracks use rotation damage, `heal_` tracks use their full
healing window plus declared utility modifiers, and both apply `min(1, ER / track.erTarget)`. One
ranked list per weapon and track, ER-scaled in place.

`LBTrack.erTarget` drives the ER stat cell tint in `LeaderboardRow`, green at or above target and red
below. Damage tracks expose two lenses: `Score` is the default ER-adjusted value, `Damage` is the raw
pre-scaling lens derived from Score and the row's ER, never stored separately. Raw is shareable as
`?scoring=raw` and the default omits `scoring` from the URL.

`heal_` tracks stay in Score mode and hide the raw selector, because reversing only the ER factor would
produce a pre-ER score that still includes utility, so it is neither literal damage nor raw healing.

Standings, substat upgrade projections and benchmark comparisons stay canonical Score calculations. Shown
from a raw Damage page they keep `Score` labels rather than implying raw cross-board ranks.

## Rank, dedup and the view

Three concepts stay separate, because fusing them makes rank mean different things depending on how the
reader reached the page.

- Board identity is character plus weapon plus track, exactly what the canonical URL encodes
- Rank is a property of a build on that board, measured against the deduped canonical board with no view
  filter applied. A filtered view shows each build at its true board position, so the top Midnight Veil
  build reads its real rank rather than `#1`.
- The view (filters, sort, dedup) chooses which rows appear and in what order, nothing more. Filters
  constrain the candidate pool before dedup, so "Midnight Veil" shows each player's best Midnight Veil
  build.

Dedup shows one row per player, that player's best build on the ranked metric, so it only means something
while the ranked metric orders the page:

| view | dedup |
| --- | --- |
| Score sort | on |
| Score sort plus board filters (set, main, sequence, region, stat) | on, filters narrow the pool first |
| Score sort plus `uid` or `username` | off |
| any other sort (ER, CV on a weapon board, crit, timestamp) | off |
| explicit `?dedup=0` or `?dedup=1` | wins either way |

A stat sort is a browse view where every submitted build appears carrying its true board rank, so one
player can legitimately hold several adjacent rows. Dedup must stay off there or it hides the answer the
sort was asking for: sorting Suisui's `heal_s0` board by ER with dedup on showed 306.6 at #1 while a
307.4 build sat suppressed behind its owner's higher-scoring 303.4 build.

`total` counts the rows the current view pages through, so it always agrees with the "X-Y of Z" pagination.

## Ghost builds

A deep-linked `buildId` the current view does not contain, whether deduped out or filtered away, comes
back from the backend as `ghostBuild`. The frontend inserts it at its computed damage position and shows
no competitive rank, since `globalRank` is `0`.

The profile never injects rows. A build arriving without a table row (a rankings tile, a `?buildId=` deep
link, the echo inventory's "Equipped by" strip) opens in the featured region between the rankings shelf
and the filters (`ProfileFeaturedBuild`), outside the build query, so the table's ranks, page ranges and
totals stay the server's. `?board=weaponId:trackKey` seeds the card's board so a reader coming from a
leaderboard sees the number they clicked.

## Profile surface

- A rankings tile is one button with no secondary link and no hover lift. The way from any profile card
  to its board is the rank module, which links to the build's row there.
- Tile hover is the site's gold glow (`0 0 16px rgba(166,150,98,0.35)`) with the border tinting to
  `accent/40` over 150ms, and the open tile holds the glow at `accent/60`. Never animate tile hover and
  keep the tier line static, because a strip of 27 tiles is crossed by the pointer constantly, so motion
  there fires dozens of times a visit and reads as noise however well it is built.
- The header carries no build-count slab. The name carries the region badge, and beneath it one fact row
  (UID, builds, ranked characters, `Updated N days ago` from `updatedAt` via `Intl.RelativeTimeFormat` in
  the site language) with the pin star as the only control at the right. Each fact lives in one place, so
  the rankings shelf's eyebrow does not repeat the character count, reporting its standings up through
  `onStandingsLoaded` instead. The "updated" fact is client-only, server snapshot null, so a day boundary
  between render and hydration cannot mismatch.
- The rankings strip scrollbar keeps its 6px of space but stays transparent at rest, taking the gold thumb
  while the pointer is over the shelf or a tile has focus (`group/shelf`, `scrollbar-color` for Chrome and
  Firefox, the webkit thumb rule for Safari). The right-edge fade and the show-all chevron are the
  rest-state overflow cues.
- The tile's `S{n} BOARD` chip uses the sequence ramp at low alpha (bg /15, border /35 to /45, text /85,
  no shadow), because on a shelf where most tiles share one sequence the chip must not outshout the
  percentile or the tier edge. The table's `S6` chip keeps the full-strength ramp.

## Shared row primitives

`/builds`, `/profile/[uid]` and `/leaderboards/[characterId]` share `useExpandedRows()` for expanded row
ids and pure toggle behavior, and `useBuildDetails()` for detail fetches, request aborts, retry state and
per-build detail caching.

Rows stack freely on every surface, and on the profile the featured region stays open alongside them. A
card closes only when the reader closes it, so do not add a one-at-a-time rule.

`useBuildDetails()` also normalizes Rover identity: the row's `character.id` is authoritative, so
`buildState.characterId` and `roverElement` are re-derived from character data (`roverElementName`) before
the detail is cached, because historical build JSON may carry a stale element.

Expansion fetches are on-demand and the list view never eagerly hydrates details. A failed expansion stays
in its error state until the reader chooses Retry, and must not loop while the panel stays open.

Opening a discovered build in `/edit` writes it to the draft key, and the expansion panel confirms
replacement first when a different draft exists.

The shared hooks cover generic row state only. Domain semantics stay separate: `/builds` and profile
tables render compact rows from build-list endpoints (`/build` and `/profile/{uid}/builds`), while
`/leaderboards/[characterId]` renders leaderboard rows with damage-board context, dedup, `globalRank` and
an optional `ghostBuild`.

## Where to change what

| Surface | Location |
| --- | --- |
| Overview page | `components/leaderboards/overview/` |
| Character leaderboard | `components/leaderboards/character/` |
| Global board | `components/leaderboards/board/` |
| Shared row state | `components/leaderboards/useExpandedRows.ts`, `useBuildDetails.ts`, `scrollToElementBelowNav.ts` |
| Expansion panel | `components/leaderboards/BuildExpanded.tsx` |
| Profile rendering | `components/profile/` |
