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

Dedup shows one representative row per player, and the representative is that
player's best build **on the ranked metric** (Score, or CV with no weapon
selected). It therefore only means something while the ranked metric is what
orders the page:

| view | dedup |
| --- | --- |
| Score sort | on |
| Score sort + board filters (set, main, sequence, region, stat) | on, filters narrow the pool first |
| Score sort + `uid`/`username` | off |
| any other sort (ER, CV on a weapon board, crit, timestamp, ...) | off |
| explicit `?dedup=0` / `?dedup=1` | wins either way |

A stat sort is a browse view: every submitted build appears, each still carrying
its true board rank, so the same player can legitimately hold several adjacent
rows. Keeping dedup on there used to hide the actual answer — sorting Suisui's
`heal_s0` board by ER showed 306.6 at #1 while a 307.4 build was suppressed
behind its owner's higher-scoring 303.4 build.

`total` is the count of rows the current view pages through, so it always agrees
with the pagination shown ("X–Y of Z").

## Ghost Build Behavior

- If a deep-linked `buildId` is not in the current view (deduped out, or excluded
  by a filter):
  - Backend returns a `ghostBuild`.
  - Frontend inserts it at its computed damage position.
  - No competitive rank is shown for that row (`globalRank === 0`).
- The profile never injects rows. A build that arrives without a table row (a rankings tile, a `?buildId=` deep link, the echo inventory's "Equipped by" strip) opens in the featured-build region between the rankings shelf and the filters (`ProfileFeaturedBuild`), outside the build query, so the table's ranks, page ranges and totals are always the server's. `?board=weaponId:trackKey` seeds the card's board so a reader coming from a leaderboard sees the number they clicked. A rankings tile is one button (no secondary link, no hover lift); the way from any profile card to its board is the rank module, which links to the build's row there. Tile hover is the site's gold glow (`0 0 16px rgba(166,150,98,0.35)`) with the border tinting to `accent/40`, 150ms, no motion; the open tile holds the glow at `accent/60`. Decided 2026-09-06 after four animated versions (dash trace, Wuthery half-plane, masked ring + runner, line-growth frame): a strip of 27 tiles is crossed by the pointer constantly, so a hover animation there fires dozens of times a visit and reads as noise however well it is built. Do not add motion to tile hover; the tier line stays static.
- Profile header: no build-count slab. The name carries the region badge; beneath it one fact row (`UID`, builds, ranked characters, `Updated N days ago` from the profile row's `updatedAt`, relative via `Intl.RelativeTimeFormat` in the site language) and the pin star is the only control at the right. Each fact lives in one place: the rankings shelf's eyebrow no longer repeats the character count (the shelf reports its standings up through `onStandingsLoaded`). The "updated" fact is client-only (server snapshot null) so a day boundary between render and hydration cannot mismatch.
- Rankings strip scrollbar keeps its 6px of space but is transparent at rest and takes the site's gold thumb while the pointer is over the shelf or a tile has focus (`group/shelf`, `scrollbar-color` for Chrome/Firefox, the webkit thumb rule for Safari). The right-edge fade and the show-all chevron remain the rest-state overflow cues. Same behaviour as Akasha's calc strip (theirs is react-perfect-scrollbar); their "7 tiles" is not a chosen count, it is whatever fits beside their 390px user card.
- The tile's `S{n} BOARD` chip uses the sequence ramp at low alpha (bg /15, border /35-/45, text /85, no shadow). On a shelf where most tiles share one sequence the chip must not outshout the percentile or the tier edge; the table's `S6` chip keeps the full-strength ramp.

## Build Expansion

`/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]` share:

- `useExpandedRows()` for expanded row ids and pure toggle behavior. Rows stack freely on every surface, and on the profile the featured region stays open alongside them; a card closes only when the reader closes it (owner decision 2026-09-05, do not add a one-at-a-time rule).
- `BuildSimulationSection` renders one horizontal row of equal-width controls under the card (capped to `--scrollport` so it centres on screen inside a wide row): the surface's action first, then the bench disclosures (move breakdown, substat upgrades, leaderboard rank, stat comparison, theoretical bench). Any number can be open; panels stack below the row in button order, and an open button holds the accent border. It was a centred vertical stack until 2026-09-06; in the profile's featured region that was ~290px of buttons in a 1440px-wide surface.
- The substat summary pill row (`getSummaryRowClasses(pillCount, host)` in `constants.ts`, rendered by `BuildExpanded`, `SubstatSummaryRow` and the blueprint in `BuildOptimalityPanel`) is one line, never wrapped: it is inside the profile card's capture area, and a wrapped RV pill reads as a second row of stats. It is centred and nowrap, so a row slightly wider than its frame spills evenly into the side padding, and it tightens (compact: `px-2 gap-1.5`, same text size) only where even the spill would not do. Measured with the Ropa Sans metrics the row inherits from the body, 2026-09-06, calibrated to a production card within 2%: stat pills 75-95px, RV pill ~120px. The profile `card` (1,440px frame) never tightens, 14 pills is 1,411px at worst. The leaderboard `expansion` (shell content 1,224px, box 1,320px) holds 12 pills, lets 13 spill into the 48px padding, and goes compact only at 14, where normal would run past the narrowest table (1,288px). The blueprint row uses the expansion ladder under both hosts since the bench does not know its host and the narrower rule is safe in both. Do not measure this row in Plus Jakarta: only `BuildSimulationSection` sets that face, the pill rows sit outside it.
- The first control in that row is the surface's action: leaderboards render `View in Profile` (`/profile/{uid}?buildId=&board=`), the profile renders `Open in Editor`. Same slot, same style, no icon (tried in the card action bar 2026-09-06 with a wrench icon; owner: it sat between icon buttons and the board picker and matched neither). Only a build with no profile to go to (redacted uid) opens in the editor from a leaderboard.
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

The move breakdown (`BuildMoveBreakdown.tsx`, parts in `components/leaderboards/moveBreakdown/`) is one surface: a score header, the rotation, a "Counts as" profile and the abilities table. `parseMovesPayload` in `lib/lb.ts` normalizes the payload for both the client fetch and the home prefetch, so a missing array renders as nothing instead of throwing; `lb/docs/move-breakdown-ui.md` is canonical for the response shape.

- **Score header.** Without modifiers it reads `Score {score}` with `{n} abilities · {n} casts`; status casts are not counted because they are not button presses. Rows flagged `modifier: true` turn it into an equation in payload order, since the backend applies modifiers in sequence against the running score: Energy Regen is a `×` term labelled from `modifierInfo` (never parsed from the name), set, echo and bonus modifiers are additive terms, and a factor that follows an additive term wraps what precedes it in parentheses.
- **Rotation** is a beat chart (`RotationStrip.tsx`). `buildRotation` (`moveBreakdown/model.ts`) sorts every row's `casts` by `index`; back-to-back casts of one row under one `shortName` share a slot, and status rows (`skillTab: status`) sit after a dashed "No button" divider, one slot each. The character's skill-tab icons (`skillIcons`; `inherent` uses `inherent-1`) form the axis in cast order; tune break, echo, set, weapon and mixed get neutral glyphs, status gets the element icon in a dashed ring. Above each slot stands one bar per cast, its height that cast's damage against the biggest single cast, with a 2px floor, so a repeat reads as repeated beats and a small cast stays visible at any density. It replaced curved bands into a share-sized ribbon: order and share shared one x-axis, so every band spent its ink restating the slice below it, and small casts collapsed into hairlines.
- **Density.** Captions hide below 56px per column and discs shrink below 44px and 32px; below 56px, back-to-back casts under 1% each merge into one "{n} casts" slot. With 12 or more abilities, two or more sub-1% abilities fold into "{n} smaller abilities, {x}% combined".
- **Counts as** is a 6px part-to-whole bar by scored move type from `typeTotals` (the same aggregation the home record card draws) above chips carrying each type's share. Positive modifiers extend it in the bonus colour and penalties hatch the lost length at its end, captioned with the loss and "Shares are of move damage, before Energy Regen". Hovering a chip or segment previews a type and clicking a chip pins it; a row matches when it declares or scores as that type.
- **Abilities** sort by damage: tab disc, name with a secondary line, casts, bar, share, damage. The secondary line is "{Tab} → {Type}" only when a scored type is not native to the tab (Normal Attack natively deals Basic and Heavy Attack, a Resonance Skill deals Resonance Skill, and so on), otherwise the type alone with its legend label; status rows read "Negative status, no button". A "No crit or DMG bonus", "No crit" or "No DMG bonus" tag comes from `noCrit` and `bypassDmgBonus`. The whole row is the `aria-expanded` toggle. Its expansion lists children with the name sent by the backend (name ×count, per-event MV, bar, share, damage) and a facts line: "{damage} per cast" when every cast shares one key, "{MV} MV per cast" on a row without children, "Scales with {stat}" only when it differs from the stat carrying most of the damage, and "In the rotation: casts {ranges} of {n}".
- **Emphasis has two channels.** Hovering or focusing a slot or a row marks the linked slot and row and shows damage, share, per cast and cast position, without dimming anything else; hover happens dozens of times per visit, and whole-panel dimming flickered as the pointer walked the table. Previewing or pinning a type dims everything that does not score as it.
- **Healing boards** have no cast order. The section is a "Healing" profile of the window's sources in the heal colour above a "Heal sources" table with each source's per-event formula and count, and no chips.
- **Narrow layout** is a container query on the panel's own width (under 40rem), not a viewport breakpoint: the rotation drops, the profile stays, and "Abilities | Rotation" toggles swap the table for a vertical cast list. Every current host renders the expansion at table or card design width, so a phone scrolls to the full panel like the rest of the expansion; the narrow layout applies wherever the panel box itself is narrow.
- **Motion.** On first open the rotation plays once in cast order (icons rise, beats grow from the axis, about 600ms in all), then the profile and table bars grow. The `mb-rise`, `mb-beat` and `mb-grow` classes in `globals.css` come off when the sequence ends so a resize never replays it; reduced motion removes all of it.

Every share in the panel has one denominator, move damage before score modifiers. The profile draws type share at true scale, so table bars scale to the largest ability and the Share column beside each bar prints the figure; a true-scale lane in the table compressed every row below the top two into slivers.

The reference benchmark (`BuildOptimalityPanel.tsx`) shows three independent
optimized loadouts: Standard (`low_roll`, 16 useful lines at median rolls, about
the live median build), Optimal (`standardized`, all 25 lines at median rolls, a
top ~0.3% build) and Ceiling (all 25 at max rolls). Standard is selected by
default, so the headline ratio reads against a typical build. Selecting a tier
changes its layout, main stats, sets, final statline, active `scoreModifiers`,
and full Echo blueprint together. `scoreModifiers` are already included in the
reference score; the UI lists them as an explanation, never adds them
client-side.

Standard's unused lines hold filler stats the board cannot score (DEF% first),
so every echo shows five lines; empty slots read as a bug to players. The
reference's `substats` names only the useful stats, which is the highlight set:
filler renders dimmed and stays out of the tally row. There is no note
explaining it: dimmed DEF% lines read as unused on sight.

The tally carries an RV pill computed exactly like the build row's: the
character's preferred substats present in the reference, rolls × mean roll
quality. Non-selected pills dim as they do in the row. It does not restate the
tier: RV is lines × roll quality, the two axes that separate the tiers, so a
build's RV reads directly against Standard, Optimal and Ceiling. The loadout's
shape sits on one unboxed line above the stat sheet (layout, ER target, score
modifiers, set chips at the far end). ER is red below target, where scaling
costs score, and green at or above, where surplus costs nothing.

Its measurement is one track, not three. `BenchmarkTrack` runs 0 → `max(build,
ceiling)`, the fill is the build, and each tier is a tick on that same ruler;
every tick overhangs the track so all three read over the fill and the empty
track, and the selected one is longer and gold. The tier cards below are a
selector in ascending order so card N sits under tick N. Do not give each tier
its own meter again: the previous version divided by each tier's own damage and
clamped at 100%, so a build that cleared the two lower tiers drew two identical
full bars and the graphic carried less the better the build got. The ratio is
text instead: each card prints the build's share of that tier beside the tier's
score, so all three read at once and each sits next to the number it divides by.
Scores print in full, not compact, because tiers and builds sit within a few
percent of each other. Three colour channels stay separate — gold is the
selected tier (card chrome and its tick), white is the build (fill and score),
teal marks a ratio at or above 100%. Falling short of a reference is neutral, not
`STATUS_NEGATIVE_COLOR`: every build is under the ceiling by definition.

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
