# Build Expansion

The panel that opens under a build row on `/builds`, `/profile/[uid]` and `/leaderboards/[characterId]`.
Data flow and row state are in `leaderboards.md`.

## Simulation row

`BuildSimulationSection` renders one horizontal row of equal-width controls under the card, capped to
`--scrollport` so it centres on screen inside a wide row. The surface's action comes first, then the
bench disclosures: move breakdown, substat upgrades, leaderboard rank, stat comparison, theoretical
bench. Any number can be open, panels stack below the row in button order, and an open button holds the
accent border.

Keep it a horizontal row. A centred vertical stack put roughly 290px of buttons into a 1440px-wide
surface in the profile's featured region.

The first control is the surface's action: leaderboards render `View in Profile`
(`/profile/{uid}?buildId=&board=`), the profile renders `Open in Editor`. Same slot, same style, no icon,
because in the card action bar an icon sat between icon buttons and the board picker and matched neither.
Only a build with no profile to reach (redacted UID) opens in the editor from a leaderboard.

The section needs parent row context: `weaponId`, `track` and `damage`.

## Substat summary row

`getSummaryRowClasses(pillCount, host)` in `constants.ts`, rendered by `BuildExpanded`,
`SubstatSummaryRow` and the blueprint in `BuildOptimalityPanel`.

One line, never wrapped. It sits inside the profile card's capture area, and a wrapped RV pill reads as a
second row of stats. It is centred and nowrap so a row slightly wider than its frame spills evenly into
the side padding, and it tightens (compact: `px-2 gap-1.5`, same text size) only where even the spill
would not do.

Measured with the Ropa Sans metrics the row inherits from the body, calibrated to a production card
within 2%: stat pills 75-95px, RV pill about 120px. The profile `card` (1,440px frame) never tightens
since 14 pills is 1,411px at worst. The leaderboard `expansion` (shell content 1,224px, box 1,320px)
holds 12 pills, lets 13 spill into the 48px padding, and goes compact only at 14, where normal would run
past the narrowest table at 1,288px. The blueprint row uses the expansion ladder under both hosts, since
the bench does not know its host and the narrower rule is safe in both.

Never measure this row in Plus Jakarta. Only `BuildSimulationSection` sets that face, and the pill rows
sit outside it.

## Move breakdown

`BuildMoveBreakdown.tsx` with parts in `components/leaderboards/moveBreakdown/`. One surface: header
line, rotation, a "Considered as" legend and the abilities table. `parseMovesPayload` in `lib/lb.ts`
normalizes the payload for both the client fetch and the home prefetch, so a missing array renders as
nothing instead of throwing. `lb/docs/move-breakdown-ui.md` is canonical for the response shape.

### Header

One line: at the left the eyebrow of what follows ("Rotation" or "Healing"), at the right "Damage" in
Gowun 30px. The build row above already carries the score, so this is a figure beside the rotation rather
than a banner over it.

It says Damage because it is. The engine sends an Energy Regen term only when a build is below its ER
target, 3 of the 72 top builds, so everywhere else damage and Score are the same number. Rows flagged
`modifier: true` turn it into "Damage × … = Score" in payload order, the result keeping "Score" because
that is the number in the board's column. The backend applies modifiers in sequence against the running
score: Energy Regen is a `×` term labelled from `modifierInfo` and never parsed from the name, set, echo
and bonus modifiers are additive terms, and a factor following an additive term wraps what precedes it in
parentheses.

### Rotation

`RotationStrip.tsx` shows the rotation as a guide writes it, over the rotation as damage.

`buildRotation` in `moveBreakdown/model.ts` sorts every row's `casts` by `index`. Back-to-back casts of
one row under one `shortName` share a slot with a ×n badge, and status rows (`skillTab: status`) sit after
a dashed divider, one slot each. A slot is the character's skill-tab icon on a dark disc (`skillIcons`,
where `inherent` uses `inherent-1` and `tune-break` is the weapon-type Tune Break icon) with the scored
type as a short arc on its underside and a Ropa caption. A status slot is the element icon in a dashed
ring with the same arc, while echo, set, weapon and mixed get neutral glyphs.

Under the captions runs one 12px ribbon in the same order, one segment per cast sized by its damage
(`buildRibbon` and `layoutRibbon`: 2px gaps, a 2px floor so no cast disappears, edges snapped to whole
pixels so every segment renders the same height), then status damage, then score bonuses, with penalties
hatched over the end.

The strip and the ribbon are two axes on purpose: equal columns keep every cast legible, proportional
segments keep the weights honest, and the hover link joins them.

### Hover link

Hovering a slot, a segment or a table row puts the same 1px white ring on the disc and on every segment of
every run of that ability, gives the row the ring too (inset on a closed row, the frame of an open card)
and shows a readout in the hover card's shell: Damage, Share, Per move, Moves {range} of {n}. A move is
one button press in the rotation, and status damage has no move number.

One hairline leader per run drops from just under its caption, each caption measured since one runs a
single line and another two, along a rail above the ribbon onto the centre of each of its segments, so a
×3 slot shows three teeth and two "Iai" slots each point at their own casts. `layoutLeaders` fixes the
stems on segment centres and moves only the drops: onto a stem within 10px, and away from any other
leader's vertical closer than 8px, because a few pixels of jog read as a kink or as the wrong link. All
leaders sit in one SVG group with the opacity on the group, so shared rails never paint twice.

Clicking a slot opens its row, and the fold if the row lives there, then scrolls the minimum distance to
show the card under the sticky nav, nothing if it is already in view. Open only, never toggle, so a double
click cannot close a row the reader cannot see. The strip is never pinned.

### Density

Captions hide below 56px per column, and discs shrink below 44px and 32px. Below 56px, back-to-back casts
under 1% each merge into one "{n} moves" slot. With 12 or more abilities, two or more sub-1% abilities fold
into "{n} smaller abilities, {x}% combined" (`foldedKeys`, which the strip's click uses to open the fold).

### Considered as

The legend: one chip per scored move type from `typeTotals`, the same aggregation the home record card
draws, with its share. The wording is the game's own ("considered as Resonance Skill DMG").

Each chip carries the type's glyph in white as the game draws it:

- the DMG Bonus stat icon for Basic Attack, Heavy Attack, Resonance Skill and Resonance Liberation, which
  is the icon the build row's pills use, so a share and the stat it lives on read as one thing
- the kit button for Intro, Outro, Forte Circuit and Tune Break
- the element icon for a negative status
- a swatch for echo and coordinated damage, which have no glyph

The type colour tints the chip's frame, never the glyph or the text.

Hovering a chip previews a type and clicking pins it. A row matches when it declares or scores as that type.

### Abilities

Sorted by damage: tab disc with the type arc, name with a secondary line, moves, bar on a faint track,
share, damage. Section eyebrows carry no counts, since the badges and position lines already say them where
they mean something. The bar lane flexes and the name column caps near 22rem, so the move count sits beside
the name and extra width goes to the bars.

The secondary line is "{Tab} → {Type}" only when a scored type is not native to the tab, for example Normal
Attack natively deals Basic and Heavy Attack and a Resonance Skill deals Resonance Skill, otherwise the type
alone with its legend label. A negative status reads as one line, "Negative Status · No Crit or DMG Bonus",
since a status is always both. Other rows get the tag as a pill in the game's title case: "No Crit or DMG
Bonus", "No Crit" or "No DMG Bonus" from `noCrit` and `bypassDmgBonus`, on Tune Break, a Tune Rupture
(which reads as its type rather than a negative status and may still crit) and conversions such as Lucy's
Data Crash.

The whole row is the `aria-expanded` toggle. Open, a row lifts out as a card and its bar splits by hit
instead of by type. The hit rows beneath carry name ×count, per-event MV, share and damage and no bar of
their own, and a hit row and its piece light together. A row without children shows "{MV} MV". "Scales with
{stat}" appears only when it differs from the stat carrying most of the damage. The last line is "Moves
9-10, 14-16 of 18" beside a full-width miniature of the ribbon with this row's moves lit, or "Position in
the rotation" for status rows, which have no move numbers.

### Emphasis, motion and layout

Emphasis has two channels. Hovering or focusing marks the linked pieces without dimming anything else,
because hover happens dozens of times per visit and whole-panel dimming flickered as the pointer walked the
table. Previewing or pinning a type dims everything that does not score as it.

Every share in the panel has one denominator, move damage before score modifiers, stated in a note only when
modifiers exist, since without them it equals the share of score. Table bars scale to the largest ability
and the Share column beside each bar prints the figure. Never use a true-scale lane in the table, which
compressed every row below the top two into slivers.

Healing boards have no cast order. The header reads "Healing", under it a profile of the window's sources in
the heal colour, then a "Heal sources" table with each source's per-event formula and count, and no chips.

Narrow layout is a container query on the panel's own width, under 40rem, not a viewport breakpoint. The
rotation drops and "Abilities | Rotation" toggles swap the table for a vertical cast list. Every current
host renders the expansion at table or card design width, so a phone scrolls to the full panel like the rest
of the expansion and the narrow layout applies wherever the panel box itself is narrow.

On first open the icons rise in cast order, then the ribbon and the table bars grow together, under a second
in all. The `mb-rise`, `mb-grow` and `mb-fade` classes in `globals.css` come off when the sequence ends so a
resize never replays it. Rows open in 180ms and close in 140ms, and reduced motion removes all of it.

Type colours live in `lib/moveBreakdown.ts` and are shared with the home hero's profile bar. The kit types
sit in one OKLCH lightness band so no ribbon segment reads heavier than its neighbours, checked with the
dataviz palette validator, and Tune Break and Resonance Skill were lifted into it after their segments read
thinner beside Liberation. The band still sits below the validator's normal-vision floor and owes a palette
pass: Heavy Attack beside Intro, Liberation beside Tune Break, Echo beside Resonance Skill, and Intro
against Liberation under deuteranopia.

## Reference benchmark

`BuildOptimalityPanel.tsx` shows three independent optimized loadouts: Standard (`low_roll`, 16 of 25 usable
lines at median rolls, about the live median DPS build), Optimal (`standardized`, every usable line at median
rolls, a top 0.3% build) and Ceiling (every line at max rolls). Each card prints the reference's
`usefulLines`, because a healer can use only 15 lines and its Standard spends 10, and references stored
before the field fall back to 25/25/16. Standard is selected by default so the headline ratio reads against a
typical build.

Selecting a tier changes its layout, main stats, sets, final statline, active `scoreModifiers` and full echo
blueprint together. `scoreModifiers` are already included in the reference score, so the UI lists them as an
explanation and never adds them client-side.

Standard's unused lines hold filler stats the board cannot score, DEF% first, so every echo shows five lines,
because empty slots read as a bug to players. The reference's `substats` names only the useful stats, which
is the highlight set, so filler renders dimmed and stays out of the tally row. There is no note explaining
it, since dimmed DEF% lines read as unused on sight.

The tally carries an RV pill computed exactly like the build row's: the character's preferred substats
present in the reference, rolls × mean roll quality. Non-selected pills dim as they do in the row. It does
not restate the tier, because RV is lines × roll quality, the two axes that separate the tiers, so a build's
RV reads directly against Standard, Optimal and Ceiling. The loadout's shape sits on one unboxed line above
the stat sheet: layout, ER target, score modifiers, set chips at the far end. ER is red below target where
scaling costs score, green at or above where surplus costs nothing.

Measurement is one track, not three. `BenchmarkTrack` runs 0 to `max(build, ceiling)`, the fill is the build,
and each tier is a tick on that same ruler. Every tick overhangs the track so all three read over the fill and
the empty track, and the selected one is longer and gold. The tier cards below are a selector in ascending
order so card N sits under tick N.

Never give each tier its own meter. Dividing by each tier's own damage and clamping at 100% drew two identical
full bars for a build that cleared the two lower tiers, so the graphic carried less the better the build got.
The ratio is text instead: each card prints the build's share of that tier beside the tier's score, so all
three read at once and each sits next to the number it divides by. Scores print in full rather than compact,
because tiers and builds sit within a few percent of each other.

Three colour channels stay separate: gold is the selected tier (card chrome and its tick), white is the build
(fill and score), teal marks a ratio at or above 100%. Falling short of a reference is neutral, never
`STATUS_NEGATIVE_COLOR`, since every build is under the ceiling by definition.

## Stat comparison

`BuildStatDistribution.tsx` is an interactive radar showing where a build sits against its board on eight
axes. It is the whole section, with no numeric table beside it, because a polygon cannot be read back to a
value and the interaction carries the figures instead.

- It keys on the board, not the build. The endpoint takes no build id, so every row of a board shares one
  payload and one edge-cache entry, and the build's own percentile is interpolated client-side from the
  quantile ladder (`interpolatePercentile` in `lib/lb.ts`). The `useKeyedResource` key is therefore
  `character:weapon:track`, unlike the other three sections.
- Radius is percentile, not value. Centre is p1 and rim is p99, so all eight axes are comparable and the
  median lands on the 50% ring by construction. Flat stats vary about ±10% across a board, so a raw or
  ratio-to-mean radius would render every build as a circle.
- The chart carries one series, not two. Brand accent `#a69662` and its hover step `#bfad7d` measure ΔE 7.7
  for normal vision, under the 15 floor, so no two members of the brand palette can read as two
  distinguishable polygons. The cohort is the field instead (percentile rings, a shaded middle half, a dashed
  median) and the build is the only coloured shape on it.
- API order is the winding order, and that is the point. `calc.DeriveBoardRadarStats` emits axes by their
  role on this board: crit pair, the flat the board actually scales on, its element, the bonus it scales
  with, ER, then the flats it does not care about. Clock positions carry fixed meaning even though the stats
  at them change per board, so 3 o'clock is always the stat the build is built around, the upper left is
  always the dead weight, and a reader who opens many boards learns the geography once. The expected
  silhouette follows: five strong axes running 12 o'clock round to 6, ER stepping down at 7:30, and a notch
  at 9 and 10:30. One lobe, one dent, so a dent at 3 o'clock is instantly diagnosable as under-built on the
  board's own scaling stat.
- A no-spread axis sits on the median ring, not at the centre. With zero variance every build carries the
  same value, so this one is the median. Pinning it at radius 0 draws "no data" as bottom-1%, a different
  claim. The vertex and label take the neutral tone and the readout says so outright.

Never sort axes by stat key or by the build's own values. `AXIS_ORDER` looked like it bought stability, but on
an HP-scaling board it pushed the scaling stat down beside DEF and pulled the unused ATK up between the crits
and the element, turning one clean lobe into a sawtooth. The API order is already deterministic per board,
derived from the board's stored display columns, so two builds on the same board always wind identically,
which is the only comparison this section makes. Sorting by the build's own values turns every build into the
same monotone spiral and deletes the silhouette's information entirely.

The grid is a web, not concentric circles. On a percentile radius both are equally correct, but the web shares
its geometry with the data polygon, so a vertex reads against the ring segment beside it rather than against a
curve the shape never follows. The middle-half band is a real even-odd annulus (outer ring 0.75, inner ring
0.25, `fillRule="evenodd"`), never a 0.75 disc with a surface-coloured 0.25 disc punched out of it, which
breaks on any background that is not `--color-background-secondary`.

### Labels

Standing is never printed as a raw percentile. `formatStanding` says `top 4%` or `bottom 15%`, not `96th` or
`15th`. An ordinal percentile asks the reader to know what a percentile is and then invert it before it means
anything, and mid-range values like "52nd" communicate nothing. The pivot is the median, counting down from
the top above it and up from the bottom below it, and both readings are literally true at every value, so the
phrasing only picks the more useful half. It also matches the words the cohort selector already uses.

`getLBStatLabel` is the join key for everything. It is the canonical label and the key `Stats.json` is indexed
by, so one call resolves the tooltip's translated name (`statTranslations`) and its icon (`statIcons`).

Rim labels are derived from that localized name, never tabulated. `axisShortLabel` runs a ladder and stops at
the first step that fits, 8 Latin glyphs or 5 CJK since CJK is full-width, and the steps are documented at the
function. Never add a per-language label table: over the shipped `Stats.json` all 170 cells land within budget
with none blank, and a new language is covered the day its translations land.

The rim deliberately carries no stat icons. It is the one element already constrained by crowding, and an
icon-only rim trades a readable word for eight glyphs a reader has to recall. The tooltip shows one icon,
where there is room and where it reinforces rather than competes.

### Interaction

Hovering or tapping any wedge, not just the vertex dot, makes that axis active. One opaque chip anchored to
the live vertex carries all three figures (value, standing, and the cohort value being measured against),
clamped inside the box so it never overflows the row. Its two swatches are the chart's own marks: filled dot
for the vertex, dashed rule for the median ring. There is deliberately no standing caption under the chart,
since it could only repeat what the chip already says.

Sweeping between spokes slides rather than teleports. The chip lives inside a full-size `absolute inset-0`
mover, so a percentage `translate` resolves against the chart's own box, which keeps positioning on
`transform` (compositor-only, no layout) and works at any responsive width without measuring anything.
Movement is ease-in-out at 200ms, enter and exit are opacity plus `scale(0.95)` on ease-out, 150ms in and
100ms out, all under `motion-reduce:transition-none`.

`axisState` is a single `{ index, open }` rather than an active index plus a mirror of its last value. The
chip must outlive `open` by one exit animation, and carrying both in one state makes that the same fact
instead of derived state an effect has to chase, which the `react-hooks/set-state-in-effect` rule rejects.

The chip is `aria-hidden` and its content lags the live axis by that exit, and a live region must already
exist in the tree to announce into, so a permanently mounted `sr-only` paragraph carries the current axis. The
chart has exactly one focus stop, where arrow keys step axes and resume from where the reader left off, Home
and End jump, and Escape clears, rather than one tab stop per wedge.

### Cohorts

Labels are parallel by design (`All builds`, `Top 10%`, `Top 1%`) so the control reads as one series of
narrowing fields. The component renders whatever cohorts the payload carries and never assumes a count, which
is what lets the backend add one without a coordinated release. `top1` only clears the backend's 25-row
publish floor on boards of 2,500 or more deduped builds, so most boards show two options and `COHORT_LABELS`
has one unused entry.

Boards below the publish floor return no cohorts at all, and the section says so instead of drawing a shape
from a handful of builds.
