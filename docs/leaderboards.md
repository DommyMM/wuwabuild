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
- **`/profile/[uid]`** — server component fetches profile metadata through `fetchProfileSummary()`. Build rows are fetched client-side from `/profile/{uid}/builds`, which returns the same compact row shape as `/build` but is scoped by route UID in the LB service. Its ranking shelf uses `/profile/{uid}/standings`, which returns one representative per character constrained to an uploaded weapon and the closest configured sequence board at or below that upload. The shelf is intentionally not the build's numerically best hypothetical weapon/sequence result.
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

- `entry.damage` is the board Score. Damage tracks use rotation damage, while `heal_` tracks use their full healing window plus declared utility modifiers; both apply `min(1, ER / track.erTarget)`. There is no separate "unfiltered" vs "bracketed" board anymore: one ranked list per weapon/track, ER-scaled in place. The old ER bracket tabs (`?erMin=`) are gone.
- `LBTrack.erTarget` (0/absent = no ER requirement) drives the ER stat cell tint in `LeaderboardRow` (green at/above target, red below). Damage tracks expose two metric lenses: `Score` is the default ER-adjusted value, while `Damage` is the raw pre-ER-scaling lens. Raw damage is derived from Score and the row's ER value; it is not stored separately.
- Raw mode is shareable as `?scoring=raw`; default Score mode omits `scoring` from the URL. `entry.damage` follows the active lens on character-board rows. Tracks whose key starts with `heal_` stay in canonical Score mode and hide the raw selector because reversing only the ER factor would produce a pre-ER score that still includes utility, not literal damage or raw healing.
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
- the board stat distribution

The profile card defaults those standings to the uploaded weapon and the closest
eligible sequence board. The comparison selector and standings table still show
all standardized weapon/sequence scenarios, including future sequences, and
label that distinction rather than presenting them as uploaded equipment.

The move breakdown (`BuildMoveBreakdown.tsx`) renders a score equation (rows flagged `modifier: true` are global adjustments like ER scaling and set bonuses — never rotation moves), a damage profile aggregated by move type, and per-move rows with type-colored bars. Move-type colors are a fixed identity map inside the component. Per-hit `moveTypes` (lb per-type sub-hit fold) split mixed-type rows and make the profile lossless; hits without types fall back to the move's primary type. Heal tracks hide the damage profile and flatten the backend's full-window source children into numbered peer rows; each source shows its per-event flat + scaling formula, repeat count, share, and total healing, and supports the same value/rotation sorting as damage moves. API row order is rotation order — the component preserves the first-occurrence index for its rotation-order sort; `lb/docs/move-breakdown-ui.md` is canonical for the response shape.

Every bar lane in that panel shares one denominator: share of raw damage. The move row's track is the whole score, its fill is `move.percentage` (the same figure the Share column prints), hit bars use `hit.percentage` against the same track, and the damage profile is that same 100% at the same scale. Do not rescale rows to the largest move: it made a row reading 14.8% in the Share column render a bar filling 35% of its lane. The profile bar carries no text — the legend chips beneath it are the labels, and they always render — because an in-segment label gated on a data threshold gets cropped by the segment's own overflow at narrow widths, and no single ink colour clears contrast on all fourteen type fills.

The reference benchmark (`BuildOptimalityPanel.tsx`) treats ceiling, median, and
minimum rolls as independent optimized loadouts. Selecting a tier changes its
layout, main stats, sets, final statline, active `scoreModifiers`, and full Echo
blueprint together. `scoreModifiers` are already included in the reference
score; the UI lists them as an explanation, never adds them client-side.

The stat comparison (`BuildStatDistribution.tsx`) is an interactive radar showing
where a build sits against its board on eight axes. It is the whole section:
there is no numeric table beside it, because a polygon cannot be read back to a
value and the interaction carries the figures instead. Five things are
deliberate:

- **It keys on the board, not the build.** The endpoint takes no build id, so
  every row of a board shares one payload and one edge-cache entry; the build's
  own percentile is interpolated client-side from the quantile ladder
  (`interpolatePercentile` in `lib/lb.ts`). The `useKeyedResource` key is
  therefore `character:weapon:track`, unlike the other three sections.
- **Radius is percentile, not value.** Centre is p1 and rim is p99, so all eight
  axes are comparable and the median lands on the 50% ring by construction. Flat
  stats vary about ±10% across a board, so a raw or ratio-to-mean radius would
  render every build as a circle.
- **The chart carries one series, not two.** Brand accent (`#a69662`) and its
  hover step (`#bfad7d`) measure ΔE 7.7 for normal vision, under the 15 floor, so
  no two members of the brand palette can read as two distinguishable polygons.
  The cohort is the field instead — percentile rings, a shaded middle half, a
  dashed median — and the build is the only coloured shape on it.
- **API order is the winding order, and that is the point.**
  `calc.DeriveBoardRadarStats` emits axes by their role on *this* board: crit
  pair, the flat the board actually scales on, its element, the bonus it scales
  with, ER, then the flats it does not care about. So clock positions carry fixed
  meaning even though the stats at them change per board — 3 o'clock is always
  the stat the build is built around, the upper left is always the dead weight,
  and a reader who opens many boards learns the geography once.

  The expected silhouette follows directly: five strong axes running 12 o'clock
  round to 6, ER stepping down at 7:30, and a notch at 9 and 10:30. One lobe, one
  dent. A build with a dent at 3 o'clock is instantly diagnosable as under-built
  on its own scaling stat, which is the whole job.

  A frontend re-sort by stat key (`AXIS_ORDER`) was tried and removed. It looked
  like it was buying stability, but on an HP-scaling board it pushed the scaling
  stat down beside DEF and pulled the unused ATK up between the crits and the
  element, turning one clean lobe into a sawtooth. The API order is already
  deterministic per board — it is derived from the board's stored display
  columns — so two builds on the same board always wind identically, which is
  the only comparison this section makes. Never sort axes by the build's own
  values: that turns every build into the same monotone spiral and deletes the
  silhouette's information entirely.
- **A no-spread axis sits on the median ring, not at the centre.** With zero
  variance every build carries the same value, so this one *is* the median.
  Pinning it at radius 0 (the old behaviour) drew "no data" as bottom-1%, which
  is a different claim. The vertex and label take the neutral tone and the
  readout says so outright.

The grid is a **web, not concentric circles**. On a percentile radius both are
equally correct, but the web shares its geometry with the data polygon, so a
vertex is read against the ring segment beside it rather than against a curve the
shape never follows. The middle-half band is a real even-odd annulus (outer ring
at 0.75, inner ring at 0.25, `fillRule="evenodd"`) — not a 0.75 disc with a
surface-coloured 0.25 disc punched out of it, which is what an earlier version did
and which breaks on any background that is not `--color-background-secondary`.

**Standing is never printed as a raw percentile.** `formatStanding` says
`top 4%` / `bottom 15%`, not `96th` / `15th`. An ordinal percentile asks the
reader to know what a percentile is *and* to invert it before it means anything,
and mid-range values ("52nd") communicate nothing at all. The pivot is the
median — above it count down from the top, below it count up from the bottom —
and both readings are literally true at every value, so the phrasing only picks
the more useful half. It also matches the words the cohort selector already uses.

**Labels come in two lengths, both localized.** `getLBStatLabel` is the join key
for everything: it is the canonical label *and* the key `Stats.json` is indexed
by, so the same call resolves the tooltip's translated name (`statTranslations`)
and its icon (`statIcons`). One source, three uses, nothing to keep in sync.

Rim labels are **derived from that localized name, not tabulated**. There is no
per-language label table to maintain; `axisShortLabel` runs a four-step ladder
and stops at the first step that fits (8 Latin glyphs or 5 CJK, since CJK is
full-width):

1. **Verbatim** if the localized name is already short (`ATK`, `暴击`, `ОЗ`,
   `VTD`).
2. **Minus its family wrapper.** The boilerplate in a stat name is itself
   derivable: every member of a family carries the same wrapper, so whatever the
   family's names *share* is the wrapper and whatever *differs* is the part
   worth showing. `sharedAffixes` computes that common prefix and suffix, which
   is why one routine handles `" DMG Bonus"` (en, suffix), `"Bonus : Dégâts "`
   (fr, prefix), `"-SCH-Bonus"` (de) and `"伤害加成"` (zh) without knowing which
   shape any language uses. `AXIS_FAMILIES` lists elements and move types;
   healing has no siblings of its own so it falls through to the wider
   bonus-shaped group, which is how it reaches `治疗效果` and `Soin`.
3. **Initials of the significant words**, Latin scripts only. This is what turns
   `Resonance Liberation` into `RL` and `Liberación de resonancia` into `LR` —
   the right answer in each language rather than the English one twice.
   Cyrillic and Thai are excluded because an initialism there is not a
   convention anyone reads.
4. **`axisCode`**, which reuses `getLBStatCode` rather than keeping a parallel
   list that could drift. `FLAT_CODE_LABELS` overrides its one failure: it
   renders ATK/HP/DEF as `A`/`H`/`D`, and a lone "A" on a spoke is not ATK to
   anybody.

Measured over the shipped `Stats.json`, 118 of 170 cells come out of pure
extraction (steps 1–2), 26 are initialisms and 26 fall to the code; all 170 are
within budget and none are blank. A new language is covered the day its
translations land. Two affordances exist only because real data needed them: the
common-affix scan snaps back to a separator on space- and hyphen-delimited
scripts (a raw longest-common-prefix stops mid-word — German's four move names
share `"SCH-Bonus de"`, and trimming that leaves `"s Standardangriffs"`), and a
derived stem gets its first letter capitalised (Spanish yields `curación`, which
beside `ATQ` reads as a typo).

The outcome lands where Akasha does — initialisms in Latin-script languages,
whole words in CJK — but as a consequence of the budget rather than a style
choice: CJK is simply short enough that step 1 or 2 already fits.

The rim deliberately does *not* carry stat icons: it is the one element already
constrained by crowding, and an icon-only rim would trade a readable word for
eight glyphs a reader has to recall. The tooltip shows one icon, where there is
room and where it reinforces rather than competes.

Interaction: hovering or tapping any wedge, not just the vertex dot, makes that
axis active. One opaque chip anchored to the live vertex carries all three
figures — value, standing, and the cohort value being measured against — clamped
inside the box so it never overflows the row. Its two swatches are the chart's
own marks (filled dot = the vertex, dashed rule = the median ring). There is
deliberately **no standing caption** under the chart: it could only repeat what
the chip already says.

Motion: sweeping between spokes slides rather than teleports. The chip lives
inside a full-size `absolute inset-0` mover, so a percentage `translate`
resolves against the chart's own box — which keeps positioning on `transform`
(compositor-only, no layout) and works at any responsive width without measuring
anything. Movement uses an ease-in-out curve at 200ms; enter/exit is
opacity + `scale(0.95)` on an ease-out curve, 150ms in and 100ms out. All of it
is `motion-reduce:transition-none`.

`axisState` is a single `{ index, open }` rather than an active index plus a
mirror of its last value: the chip must outlive `open` by one exit animation, and
carrying both in one state makes that the same fact instead of derived state an
effect has to chase (which the `react-hooks/set-state-in-effect` rule rejects).

The chip is `aria-hidden` and its content lags the live axis by that exit, and a
live region must already exist in the tree to announce into, so a
permanently-mounted `sr-only` paragraph carries the current axis. The chart has
exactly one focus stop (arrow keys step axes and resume from where the reader
left off, Home/End jump, Escape clears) rather than one tab stop per wedge.

Cohort labels are parallel by design — `All builds` / `Top 10%` / `Top 1%` — so
the control reads as one series of narrowing fields. The component renders
whatever cohorts the payload carries and never assumes a count, which is what
lets the backend add one without a coordinated release. `top1` only clears the
backend's 25-row publish floor on boards of 2,500+ deduped builds, so on most
boards the selector shows two options and `COHORT_LABELS` has one unused entry.

Boards below the backend's publish floor return no cohorts at all, and the
section says so instead of drawing a shape from a handful of builds.

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
- Stat comparison chart: `components/leaderboards/BuildStatDistribution.tsx`
- Profile leaderboard rendering: `components/profile/`
