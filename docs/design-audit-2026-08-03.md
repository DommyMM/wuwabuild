# Design Audit, 2026-08-03

> **Status (2026-08-03, same day):** cleanup batch 1 shipped. Fixed: F1 (gate
> repositioned + dismiss button), F3 (HoverTooltip tap-to-open), F4 (Modal
> focus trap + scroll-lock bug), F5 (all phantom classes + dead scrollbar
> plumbing), F9 (pagination stack + 40px targets), F10 (import header wrap),
> F12 partial (global :focus-visible + bare outline-none strips removed), the
> em dashes / headline period / w-96 divider / standings scroll wrapper /
> ProfileEchoes aria-expanded from F6/F14, and from the hygiene table: rows
> 2, 4 (radius aliases), 5 partially (text-2xs/3xs tokens minted and applied),
> 6 (gap-4.5), 7 (border-white/10 on reference pages), 8 (ErrorBanner), 9
> (.panel-glass, .glass-card deleted), 10 (dead scrollbar classes), plus the
> S0-S6 ramp deduped to one source and the stat-group min-widths unified
> (4px header/row drift fixed). Mobile board tables also gained a right-edge
> scroll fade. Still open: amber -> accent retint (row 1), opacity-ladder
> collapse (row 3), eyebrow component, F2's small-screen row card, F8 button
> stack, F13 combobox ARIA, transition-all cleanup, header prose rewrite.

Scope: the seven highest-traffic routes (78K visitors / 3 months), judged desktop
1920x1080 first, mobile 390x844 second, per the traffic split (72% / 28%).
Evidence: live-site captures of every route at both viewports (31 PNGs, capture
script adapted from `.design-sync/.cache/live-capture.mjs`; regenerate any time
against production), plus a full source sweep of `app/`, `components/`, `lib/`,
and `app/globals.css`. Screenshot names below (`desk-builds.png`,
`mob-builds-gate.png`, ...) refer to that capture set.

Each finding is labeled **Defect** (something is wrong) or **Proposal**
(something could be better), with severity weighted by traffic x impact.

---

## 1. Verdict

The desktop product is genuinely good: the home page lands the Enka/Akasha
"show, don't tell" brief, the dark-gold identity is distinctive, the data-dense
tables are legible at 1920px, and the motion system (hero scan-line, settle,
static-gradient discipline for lists) is thoughtful and reduced-motion aware.
The weakest surface by far is mobile, where the two board tables show only
identity columns (score and stats sit ~1000px off-screen behind an invisible
2px scrollbar), the `/builds` first-visit gate renders entirely outside the
viewport, and every hover-delivered explanation (roll bars, team buffs, CV) is
unreachable by touch. The second weakness is token discipline: the semantic
palette exists but is bypassed constantly, with two competing golds
(`amber-*` vs `accent`), 28 distinct `text-text-primary/NN` opacity steps where
three are sanctioned, 156 arbitrary font sizes, and five phantom utility
classes that silently render nothing today. Third, the site's own copy rules
(voice contained in the news log, no em dashes, no terminal punctuation on
headlines) are broken on `/builds`, `/leaderboards`, `/import`, and
`/profiles`. Everything in the first two categories is fixable without visual
redesign; the mobile table story is the only piece that needs actual design
work.

---

## 2. Findings, ranked

### F1. The `/builds` first-visit gate is invisible on mobile

- **Route:** `/builds` (28K visitors, ~7.8K mobile) | **Defect | Critical**
- **Screenshot:** `mob-builds-gate.png` (blurred table, no message anywhere in
  the viewport) vs `desk-builds-gate.png` (working as intended)
- **Where:** [GlobalBoardResultsPanel.tsx:399-411](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L399-L411)

The gate overlay is `absolute inset-0` inside the rows container, which lives
inside the `w-max min-w-full` scroll content
([:219-220](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L219-L220)).
The overlay therefore sizes itself to the 1360px table, not the viewport, and
its `max-w-3xl` card centers at x = 296px. A 390px phone at `scrollLeft: 0`
sees a blurred table (`blur-[5px]`,
[:316](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L316)) with
zero explanation and no visible way out. The dismissal instruction ("Click
anywhere around this message",
[:433](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L433)) is
off-screen. The gate re-arms daily
([:16-18](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L16-L18)),
so this is not a one-time cost; a returning mobile visitor hits a broken-looking
page every day.

**Fix:** render the overlay as a sibling of the scroll wrapper (inside the
`relative` at `:218`) so `inset-0` resolves against the viewport-width box, or
give the inner card `sticky left-0 max-w-[calc(100vw-2rem)]`. While in there:
give the card a real dismiss button (the click-anywhere affordance is
invisible as an affordance; a button also fixes the screen-reader story), and
consider re-arming weekly instead of daily.

### F2. Board tables at 390px hide the one thing the page exists to show

- **Routes:** `/builds` (28K), `/leaderboards/1108` (8.7K, pattern repeats on
  all 68 boards), `/profile/[uid]` | **Defect | Critical**
- **Screenshots:** `mob-builds.png`, `crop-mob-character-table.png` (rows clip
  mid-name; no scroll affordance visible)
- **Where:** grids at [constants.ts:147-149](../components/leaderboards/constants.ts#L147-L149)
  and [:169-170](../components/leaderboards/constants.ts#L169-L170), consumed by
  [GlobalBoardRow.tsx:160](../components/leaderboards/board/GlobalBoardRow.tsx#L160)
  (+ `min-w-[652px]` at [:236](../components/leaderboards/board/GlobalBoardRow.tsx#L236))
  and [LeaderboardRow.tsx:225](../components/leaderboards/character/LeaderboardRow.tsx#L225)
  (+ `min-w-[796px]` at [:298](../components/leaderboards/character/LeaderboardRow.tsx#L298))

The math: fixed columns + `gap-4.5` + the stat group put the minimum row width
at **1360px** on both tables. The mobile scroll viewport is 334-358px, so ~26%
of the row is visible and the CV, stats, and **score** columns sit up to
~1000px of horizontal scroll away. The only affordance is a 2px-high scrollbar
(`[--scrollbar-height:2px]`,
[GlobalBoardResultsPanel.tsx:219](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L219))
that touch browsers only draw mid-scroll. None of the four row/panel files
contains a single responsive class, and
[LeaderboardRow.tsx:109](../components/leaderboards/character/LeaderboardRow.tsx#L109)
carries a comment referencing a "small-screen card" that was never built.

**Fix, cheap tier (ship first):** (a) reorder columns on the character board so
Score renders adjacent to Name (identity + verdict in the first 390px), (b) add
a right-edge fade or chevron on the scroll wrapper so the existence of more
columns is visible, (c) make `#`/Owner/Name sticky-left so scrolling keeps
context. **Fix, real tier:** build the promised small-screen card row below
`md:` (rank, name, seq pill, score, CV on two lines) and drop the grid there.
This is the single largest mobile win available; two of the three
highest-traffic routes are tables.

### F3. Every hover-delivered explanation is unreachable on touch

- **Routes:** all leaderboard expansions, character headers, profiles (touch =
  28% of traffic) | **Defect | High**
- **Where:** [HoverTooltip.tsx:203-217](../components/ui/HoverTooltip.tsx#L203-L217)

`handlePointerDownCapture` closes the tooltip on any tap, by design, and there
is no tap-to-open path at all. Everything routed through `HoverCard` /
`HoverTooltip` is therefore desktop-only: substat roll bars
([BuildExpandedEchoPanels.tsx:290](../components/leaderboards/BuildExpandedEchoPanels.tsx#L290)),
main-stat ranges ([:221](../components/leaderboards/BuildExpandedEchoPanels.tsx#L221)),
echo CV ([:198](../components/leaderboards/BuildExpandedEchoPanels.tsx#L198)),
the Roll Value definition
([BuildExpanded.tsx:401](../components/leaderboards/BuildExpanded.tsx#L401)),
and the team-buff totals that explain a board's headline
([LeaderboardCharacterHeader.tsx:173-192](../components/leaderboards/character/LeaderboardCharacterHeader.tsx#L173-L192)).
Related: [SortHeaderMenu.tsx:109-111](../components/leaderboards/SortHeaderMenu.tsx#L109-L111)
has a tap path, but the same tap also fires `onHeaderSort()`, so a touch user
cannot open the column picker without re-sorting the table as a side effect.

**Fix:** in `HoverTooltip`, on coarse pointers make the first tap open and a
second/outside tap close (drop the pointer-down suppression when
`matchMedia('(pointer: coarse)')`). One component; unlocks the whole mobile
detail story. For `SortHeaderMenu`, separate the sort tap-target from the menu
tap-target on coarse pointers.

### F4. `Modal` promises containment it does not deliver

- **Routes:** import flow, editor selectors, confirm dialogs (site-wide) |
  **Defect | High**
- **Where:** [Modal.tsx:59-97](../components/ui/Modal.tsx#L59-L97)

`role="dialog" aria-modal="true"` is set, but there is no focus trap, no
initial focus, no focus restore on close, and no `inert`/`aria-hidden` on the
background. `ConfirmDialog` compounds it with `showCloseButton={false}`
([ConfirmDialog.tsx:48](../components/ui/ConfirmDialog.tsx#L48)), so a keyboard
user tabs blindly through the page behind the dialog. Bonus bug at
[Modal.tsx:44-55](../components/ui/Modal.tsx#L44-L55): when `closeOnEscape` is
false the scroll lock is never applied, but cleanup still resets
`body.overflow` unconditionally.

**Fix:** [Navigation.tsx:91-159](../components/Navigation.tsx#L91-L159) already
implements the full correct pattern (inert siblings, Tab cycling, Escape,
focus restore) for the mobile drawer. Lift it into `Modal` so every consumer
inherits it.

### F5. Five phantom classes are silently rendering nothing, today

- **Routes:** navigation (every page), `/edit`, bulk import | **Defect | High**
  (mechanical fix)
- **Where and what:**
  - `text-text-secondary` (21 uses; no `--color-text-secondary` exists in
    [globals.css:5-26](../app/globals.css#L5-L26)):
    [Navigation.tsx:391](../components/Navigation.tsx#L391),
    [:419](../components/Navigation.tsx#L419) (the drawer's "Community" /
    "Language" section labels render full-brightness instead of muted, visible
    in `mob-nav-menu.png`), plus
    [LanguageSwitcher.tsx:50,81](../components/LanguageSwitcher.tsx#L50) and 17
    uses in `BulkImportPageClient.tsx`. Intended value: `text-text-primary/60`.
  - `bg-surface` / `bg-surface-hover` (24 uses, all
    [BulkImportPageClient.tsx](../components/import/BulkImportPageClient.tsx#L435)):
    panels render transparent. Intended: `bg-background-secondary`.
  - `text-primary` (2 uses):
    [GlobalBoardRow.tsx:228](../components/leaderboards/board/GlobalBoardRow.tsx#L228),
    [LeaderboardRow.tsx:289](../components/leaderboards/character/LeaderboardRow.tsx#L289)
    (set-piece counts). Intended: `text-text-primary`.
  - `hover:shadow-[0_0_16px_rgba(var(--color-accent),0.4)]` at
    [BuildEditor.tsx:648](../components/edit/BuildEditor.tsx#L648):
    `--color-accent` is a hex, so the `rgba()` is invalid and the Generate
    button's hover glow never renders. Use
    `color-mix(in srgb, var(--color-accent) 40%, transparent)` or a literal.
  - `scrollbar-thin` (18 uses) + `[--scrollbar-*]` custom properties (12 uses):
    nothing consumes them;
    [globals.css:162-176](../app/globals.css#L162-L176) hardcodes the
    scrollbar. Dead code; delete or wire up.

### F6. The site breaks its own copy rules on four routes

- **Routes:** `/builds` (28K), `/leaderboards` (29K), `/import` (24K),
  `/profiles` (10K) | **Defect | Medium** (defect against the design brief's
  explicit rules, not taste)
- **Screenshots:** `desk-builds.png`, `desk-leaderboards.png`

The design brief: personality lives in the news log; no em dashes anywhere in
site copy; headlines omit ending punctuation.

- [GlobalBoardHeader.tsx:12-16](../components/leaderboards/board/GlobalBoardHeader.tsx#L12-L16):
  five `<br/>`-joined lines of first-person prose ("I believe that crit is the
  best stat scaling there is...") above the fold of the #3 route. The gate adds
  "with the highest ATK idk lol"
  ([GlobalBoardResultsPanel.tsx:98](../components/leaderboards/board/GlobalBoardResultsPanel.tsx#L98)).
- [LeaderboardOverviewHeader.tsx:11-26](../components/leaderboards/overview/LeaderboardOverviewHeader.tsx#L11-L26):
  same pattern, five lines, inconsistent line-end punctuation (lines 1/3/4
  bare, line 2 with a period).
- Em dashes in rendered copy:
  [ImportPageClient.tsx:598](../components/import/ImportPageClient.tsx#L598)
  ("from wuwa-bot — get yours...") and
  [BuildStandingsTable.tsx:168](../components/leaderboards/BuildStandingsTable.tsx#L168)
  (`{characterName} — {trackLabel}`).
- [ProfilesLanding.tsx:59](../components/profile/ProfilesLanding.tsx#L59):
  headline "Find a player." with terminal period.

**Fix:** rewrite both table headers as one short sentence plus a "How scoring
works" disclosure (the CV formula chip already exists as the pattern to keep);
move the personality into the news log where the brief says it lives. Swap the
two em dashes for periods or hyphens; drop the headline period. On mobile these
headers currently consume the entire first viewport before any data
(`mob-builds.png`), so tightening them is also a mobile content-priority win.

### F7. Two competing golds: `amber-*` impersonates the brand accent ~75 times

- **Routes:** every leaderboard surface, build card, profiles | **Defect |
  Medium** (mechanical fix, high visibility)
- **Screenshots:** `desk-character.png` (active weapon tab and Score pill render
  Tailwind amber against the `#a69662` gold of the header and CV column)

The system defines `accent` `#a69662` / `accent-hover` `#bfad7d`, yet active
states, focus rings, and gold chrome use raw `amber-50/100/200/300/400/500`
throughout: [LeaderboardTabs.tsx:12-31](../components/leaderboards/character/LeaderboardTabs.tsx#L12-L31)
(active cards, focus rings), [SortHeaderMenu.tsx:170-171](../components/leaderboards/SortHeaderMenu.tsx#L170-L171),
[LeaderboardRow.tsx:244-248](../components/leaderboards/character/LeaderboardRow.tsx#L244-L248),
[BuildExpanded.tsx:383-424](../components/leaderboards/BuildExpanded.tsx#L383-L424),
[constants.ts:177](../components/leaderboards/constants.ts#L177)
(`hover:border-amber-200/65`), the card chrome
([EchoSection.tsx:41](../components/card/EchoSection.tsx#L41),
[RankModule.tsx:138](../components/card/RankModule.tsx#L138)), and ~40 more (full
list in the hygiene table). `amber-300` `#fcd34d` is visibly yellower and more
saturated than the muted brand gold; the two sit side by side on the character
board today. **Fix:** batch-replace with `accent`/`accent-hover` + opacity
steps. If a deliberately brighter "active gold" is wanted, mint one token
(e.g. `--color-accent-bright`) instead of six amber shades.

### F8. The expanded build row buries its actions in a five-button stack

- **Routes:** `/leaderboards/[id]` (8.7K on 1108 alone), `/profile` |
  **Proposal | Medium**
- **Screenshot:** `desk-character-expanded-full.png`
- **Where:** [BuildSimulationSection.tsx:502-620](../components/leaderboards/BuildSimulationSection.tsx#L502-L620)

"View in Editor", "Show move breakdown", "Show substat upgrades", "Show
leaderboard rank", "Show theoretical bench": five identical `w-48` buttons
stacked vertically, all the same size, weight, and color. Nothing signals that
four are disclosures and one is navigation, and the stack costs ~230px of
vertical space in every expanded row. **Fix:** one horizontal row of disclosure
chips (the four "Show X" items, chevron each, wrapping on mobile) with "View in
Editor" styled as the single outline action beside them. Same information, one
visual level, ~70% less height.

### F9. Pagination: 30px touch targets and a one-word-per-line caption

- **Routes:** all three table surfaces | **Defect | Medium**
- **Screenshot:** `crop-mob-character-table.png` ("Rankings / show / each /
  player's / best / build." rendered one word per line)
- **Where:** [BuildPagination.tsx:17-19](../components/leaderboards/BuildPagination.tsx#L17-L19),
  [constants.ts:152](../components/leaderboards/constants.ts#L152)

`grid-cols-[1fr_auto_1fr]` with a fixed ~258px center leaves 66px per side at
390px, into which
[LeaderboardResultsPanel.tsx:359](../components/leaderboards/character/LeaderboardResultsPanel.tsx#L359)
injects a full sentence. The buttons themselves are `h-7.5 w-7.5` = 30px,
under the 44px touch minimum, and the status text ("1-12 of 1,886") wraps.
**Fix:** below `md:`, stack the layout (controls row, then caption full-width)
and bump buttons to `h-10 w-10`; keep the desktop grid as is.

### F10. `/import`: header collapses on mobile; example image tone (desktop)

- **Route:** `/import` (24K, the conversion funnel) | **Defect | Medium**
  (mobile), **Proposal | Low** (tone)
- **Screenshots:** `mob-import.png`, `desk-import.png`
- **Where:** [ImportPageClient.tsx:594-611](../components/import/ImportPageClient.tsx#L594-L611)

The header is `flex items-start justify-between` with a `shrink-0` right
cluster; at 390px the title+description column is squeezed to ~92px. (In the
capture the right cluster was not rendered pre-upload, but the layout has no
`flex-wrap` or `max-md:` fallback for when it is.) Fix: `flex-wrap` or stack
below `md:`. Separately (proposal): the example image's hand-drawn red
scribble annotations read as a rough draft against an otherwise polished page;
re-annotating with clean strokes/numbered callouts in the site's gold would
cost an hour and lift the most first-time-visitor-facing surface. The
left-aligned page title over a centered dropzone column is also slightly
misaligned; pick one axis.

### F11. Contrast and micro-type stack the same text below both floors

- **Routes:** profiles, expanded rows, move breakdown | **Defect | Medium**
- **Where (worst combinations):**
  [AdjustRankingButton.tsx:202-218](../components/profile/AdjustRankingButton.tsx#L202-L218)
  (`text-[8px]` + `/40`, ~3.2:1 at 8px),
  [ProfileShowcase.tsx:224](../components/profile/ProfileShowcase.tsx#L224),
  [RankModule.tsx:154](../components/card/RankModule.tsx#L154),
  [LeaderboardOverviewClient.tsx:257-338](../components/leaderboards/overview/LeaderboardOverviewClient.tsx#L257)
  (`text-[10px]` + `/30`-`/35`)

139 occurrences of `text-text-primary/45` or lower sit below WCAG AA 4.5:1
(`/45` = ~3.7:1 on `#121212`); several stack that with 8-9px type. The floor
should be: nothing below `/45`, and nothing below 10px carries sub-`/55`
opacity. Also: the hero body copy sits over rotating splash art with a scrim
that is nearly transparent in the text band
([Hero.tsx:161](../components/home/Hero.tsx#L161), `via-background/15`;
[:150-156](../components/home/Hero.tsx#L150-L156) mobile art at `opacity-35`).
With a light splash (see `mob-home.png`, Luuk slide) the `/70` paragraph gets
close to its floor; deepen the `via-` stop on mobile or raise the paragraph to
solid.

### F12. No global focus-visible style; several controls strip focus entirely

- **Site-wide | Defect | Medium**
- **Where:** absent from [globals.css](../app/globals.css); outline removed with
  no replacement at [SkillBranch.tsx:178](../components/forte/SkillBranch.tsx#L178),
  [CharacterPanel.tsx:208](../components/card/CharacterPanel.tsx#L208),
  [LevelSlider.tsx:111](../components/ui/LevelSlider.tsx#L111),
  [BuildFiltersPanel.tsx:707](../components/leaderboards/BuildFiltersPanel.tsx#L707),
  [:947](../components/leaderboards/BuildFiltersPanel.tsx#L947),
  [ProfileEchoes.tsx:646](../components/profile/ProfileEchoes.tsx#L646),
  [SavesPageClient.tsx:570](../components/save/SavesPageClient.tsx#L570)

Rows and gate do it right (`focus-visible:ring-...` on
[GlobalBoardRow.tsx:164](../components/leaderboards/board/GlobalBoardRow.tsx#L164));
the rest is inconsistent. **Fix:** one global rule in `globals.css`
(`:focus-visible { outline: 2px solid color-mix(in srgb, var(--color-accent) 75%, transparent); outline-offset: 2px }`)
then delete the bare `outline-none`s.

### F13. The primary filter combobox is unlabeled and un-ARIA'd

- **Routes:** `/builds`, `/leaderboards/[id]`, `/profile/[uid]` | **Defect |
  Medium**
- **Where:** [BuildFiltersPanel.tsx:898-953](../components/leaderboards/BuildFiltersPanel.tsx#L898-L953)

Full arrow-key listbox behavior with no `aria-label`, `role="combobox"`,
`aria-expanded`, `aria-activedescendant`, or `role="listbox"/"option"`.
Duplicated at [ProfileEchoes.tsx:646](../components/profile/ProfileEchoes.tsx#L646)
and `SavesPageClient.tsx:441,560`. Also
[BuildCardOptions.tsx:56-71](../components/edit/BuildCardOptions.tsx#L56-L71):
`<label>` elements that are siblings with no `htmlFor`. Mechanical ARIA work.

### F14. Assorted smaller defects

- **Header/row width drift, character board** (Defect, Low):
  header group `min-w-200` (800px)
  ([LeaderboardResultsPanel.tsx:182](../components/leaderboards/character/LeaderboardResultsPanel.tsx#L182))
  vs row `min-w-[796px]`
  ([LeaderboardRow.tsx:298](../components/leaderboards/character/LeaderboardRow.tsx#L298)):
  4px misalignment between header labels and cells at the min width every
  phone sees. The `/builds` pair is consistent (`min-w-163` = 652).
- **BuildStandingsTable has no scroll wrapper** (Defect, Low-Med): a ~720px
  6-column `<table>` ([BuildStandingsTable.tsx:83-100](../components/leaderboards/BuildStandingsTable.tsx#L83-L100))
  clips on mobile; every sibling table got an `overflow-x-auto` wrapper, this
  one was missed.
- **Move breakdown expander is keyboard-invisible** (Defect, Med for a11y):
  `<div onClick>` with no role/tabIndex/keydown/aria-expanded
  ([BuildMoveBreakdown.tsx:408-410](../components/leaderboards/BuildMoveBreakdown.tsx#L408-L410));
  the rows right above it ([GlobalBoardRow.tsx:156-173](../components/leaderboards/board/GlobalBoardRow.tsx#L156-L173))
  show the correct pattern. Similarly `aria-expanded` missing at
  [ProfileEchoes.tsx:392-397](../components/profile/ProfileEchoes.tsx#L392-L397);
  `aria-controls` missing on both board rows.
- **`w-96` decorative divider overflows 358px** (Defect, Low):
  [GlobalBoardHeader.tsx:10](../components/leaderboards/board/GlobalBoardHeader.tsx#L10);
  masked only by the `body { overflow-x: hidden }` band-aid
  ([globals.css:46](../app/globals.css#L46)). Use `w-full max-w-sm` like its
  sibling at [LeaderboardOverviewHeader.tsx:10](../components/leaderboards/overview/LeaderboardOverviewHeader.tsx#L10).
  Also: the two sibling headers disagree on secondary-text opacity (`/75` vs
  `/65`).
- **Mobile drawer absent from SSR** (Defect, Low): `isMobile` starts `false`
  and corrects post-mount ([Navigation.tsx:19,46-55](../components/Navigation.tsx#L19)),
  so the burger's target does not exist until hydration.

### F15. Proposals worth considering (taste, not defects)

- **Search placeholder can read as mojibake** (`mob-home.png`): the
  placeholder cites the live record holder by design
  ([ProfileSearch.tsx:71-75](../components/home/ProfileSearch.tsx#L71-L75),
  fed from [Hero.tsx:192-196](../components/home/Hero.tsx#L192-L196)), which is
  a great idea until the holder is named `(U «+ U)`; then "e.g. (U «+ U) or
  701776400" looks like an encoding bug to the 34K first-time Google arrivals.
  Add a "reads as a name" heuristic (mostly letters/digits) and fall back to
  the UID-only form otherwise.
- **Character-board mobile header costs ~2.5 screens before data**
  (`mob-character.png`): three ~230px team portraits wrapping 2+1, then four
  full-width weapon tab cards stacked
  ([LeaderboardTabs.tsx:156-170](../components/leaderboards/character/LeaderboardTabs.tsx#L156-L170)).
  Halve portrait size below `md:` and let weapon tabs render two-up (icon +
  truncated name already handles narrow widths).
- **Duplicate-looking overview rows** (`desk-leaderboards.png`): base and S6
  boards for the same character render as near-identical adjacent rows
  (same portrait, team, entry count); the small S6 pill is the only
  differentiator. Consider grouping variants into one row with a
  playstyle-pill cluster, or visually subordinating the variant row.
- **Editor empty state** (`desk-edit.png`): before a resonator is picked, the
  page presents ~25 inert dropdowns and a detached Save/Reset island. The
  brief says the editor is not a redesign target, so noting only: gating the
  echo panels behind character selection would make the first screen read as
  one decision instead of thirty.
- **`/edit` and profile cards on mobile are a 1440px horizontal scroll with no
  affordance**: the `<768px` branch correctly refuses to transform-scale
  (12px design text would render at 3px) and scrolls at full size instead
  ([BuildEditor.tsx:656-658](../components/edit/BuildEditor.tsx#L656-L658),
  [ProfileCard.tsx:387-401](../components/profile/ProfileCard.tsx#L387-L401))
  but with only a 2px scrollbar as the hint. An edge fade would make the
  scroll discoverable. (The scaling architecture itself, `CardScaler` with
  transform + pinned 1440px width, is correct per `build-card-v2.md`; no host
  lets the card overflow.)

---

## 3. Mobile (below 768px), the whole story

28% of traffic, and the split is: chrome surfaces are genuinely good, data
surfaces are desktop-only.

**What works.** Home stacks cleanly at 390px with the art moving behind a
dimmed overlay (`mob-home-full.png`); the nav drawer is the best-engineered
component in the repo (focus trap, inert background, scroll lock,
`mob-nav-menu.png`); `/profiles` and `/import` (below the header) are fluid;
the editor stacks echo panels one-per-row and moves Save/Reset into the nav
bar (`mob-edit.png`); `BuildCard` hosts handle the 1440px artifact correctly.
`viewport` meta is right, pinch-zoom is not disabled, `color-scheme: dark` is
set.

**What fails, in severity order.**

1. The `/builds` gate renders off-viewport (F1). First-visit mobile = blurred
   table, no explanation, re-armed daily.
2. Both board tables are 1360px grids in a 334-358px window with a 2px
   scrollbar as the only hint; score and stats are effectively invisible (F2).
   None of the four table component files contains a responsive class.
3. All hover-gated explanations are unreachable (F3); the expanded row's five
   echo panels also never collapse
   ([BuildExpandedEchoPanels.tsx:104](../components/leaderboards/BuildExpandedEchoPanels.tsx#L104)
   `grid-cols-5`) and the substat pill row is `flex-nowrap` inside
   `overflow-hidden`
   ([constants.ts:175](../components/leaderboards/constants.ts#L175),
   [BuildExpanded.tsx:365](../components/leaderboards/BuildExpanded.tsx#L365)),
   so it clips rather than scrolls (`mob-builds-expanded.png`).
4. Pagination caption/targets (F9); `/import` header (F10); character-board
   header cost (F15); overview table reduces to name-only with the ordering
   figure (entries) off-screen (`mob-leaderboards.png`).
5. Structural tell: the codebase has 14 high-traffic components with zero
   responsive variants (8 fully unmitigated: `GlobalBoardRow`,
   `LeaderboardRow`, `LeaderboardResultsPanel`, `BuildExpanded`,
   `BuildExpandedEchoPanels`, `BuildStandingsTable`, `BuildFiltersPanel`,
   `ImportPageClient`), and two `overflow-x` band-aids in
   [globals.css:32,46](../app/globals.css#L32) hiding whatever escapes.
   Responsive intent exists where someone thought about it (Hero: 18 variants;
   BuildEditor: 33) and is absent everywhere data is shown. The components do
   not encode a mobile opinion; the wrappers just add scrollbars.

**Recommended sequence:** F1 (one component), F3 (one component), F9 (one
component), then the F2 cheap tier, then the small-screen row card as the one
piece of real design work.

---

## 4. Token and pattern hygiene (batch-fixable)

Source sweep of `app/`, `components/`, `lib/`. Full inventory below is
mechanical work; none of it requires design decisions beyond picking the
canonical value.

| # | Inconsistency | Scale | Canonical fix | Key locations |
|---|---|---|---|---|
| 1 | `amber-*`/`yellow-*` used as gold where `accent` exists | ~75 uses | Map to `accent`/`accent-hover` (+ new `accent-bright` token if the hotter active gold is intentional) | `LeaderboardTabs.tsx:12-31`, `SortHeaderMenu.tsx:170-171`, `BuildExpanded.tsx:383-424`, `card/EchoSection.tsx:41`, `card/RankModule.tsx:138`, `constants.ts:69,125,164,177,194`, `SubstatSummaryRow.tsx:117-144` |
| 2 | Phantom classes rendering nothing | 51 uses | `bg-surface`→`bg-background-secondary` (24), `text-text-secondary`→`text-text-primary/60` (23), `text-primary`→`text-text-primary` (2), fix `rgba(var(--color-accent),…)` (1), delete `scrollbar-thin`+`[--scrollbar-*]` (30) | `BulkImportPageClient.tsx`, `Navigation.tsx:391,419`, `LanguageSwitcher.tsx:50,81`, `GlobalBoardRow.tsx:228`, `LeaderboardRow.tsx:289`, `BuildEditor.tsx:648` |
| 3 | `text-text-primary/NN`: 28 distinct steps, 476 uses, only 28% on the sanctioned 60/55/45 ladder; `/70` alone has 84 uses | 343 off-ladder | Extend the ladder to 4 steps (add `/70` or `/75` as the sanctioned "strong secondary"), then sed the other 24 steps onto it; kill the 15 singleton steps (`/20 /25 /32 /38 /42 /52 /58 /62 /68 /72 /78 /82 /86 /88 /95`) first | Worst: `components/leaderboards` (21 steps), `components/profile` (17), `app/(game)/**` (11) |
| 4 | Radius aliasing: `rounded` (178) + `rounded-sm` (28) + `rounded-[4px]` (2) are all 0.25rem in v4; `rounded-[2px]/[3px]/[5px]`, `2xl`, `3xl` are off-ladder singletons | 208 + 12 | Unify spelling to bare `rounded`; retire the arbitraries (`StatTierBars.tsx:67,106`, `BuildMoveBreakdown.tsx:281,330,466,519`, `BuildCardOptions.tsx:91,103`) | codebase-wide, zero visual change for 208 sites |
| 5 | Micro-label eyebrow pattern: 6 font sizes x 13 arbitrary trackings x 12 opacities for one design intent | 20+ sites, 67 arbitrary trackings total | One `<Eyebrow>` component (or `.label-micro` utility): `text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/55` | `Hero.tsx:167`, `LeaderboardTabs.tsx:29,38`, `ProfilesLanding.tsx:55,71,86`, `AdjustRankingButton.tsx` (6 in one file), `app/(game)/**` |
| 6 | `gap-4.5` vs `gap-4` for the same row-cell role | 13 sites | Pick one (visual delta is 2px); it is the row gap on both top tables | `GlobalBoardResultsPanel.tsx:223,323`, `GlobalBoardRow.tsx:160`, `LeaderboardResultsPanel.tsx:176,295`, `LeaderboardRow.tsx:225`, `LeaderboardOverviewClient.tsx:111,125,182,333`, `ProfileEchoes.tsx:230,332,397` |
| 7 | `border-white/10` as panel hairline where `border-border` exists | 19 uses (of 76 `border-white/*` across 13 steps) | `border-border` / `border-border/60` | `app/(game)/characters/[id]/*` and `app/(game)/weapons/[id]/*` (the four near-clone reference files) |
| 8 | Error banner + retry button duplicated byte-identical | 13 sites | One `<ErrorBanner onRetry>`; natural home for the missing `--color-danger` token (currently 8 red/rose shades) | `BuildExpanded.tsx:333`, `BuildMoveBreakdown.tsx:164`, `BuildOptimalityPanel.tsx:232`, `BuildSubstatUpgrades.tsx:185`, `GlobalBoardResultsPanel.tsx:206`, `LeaderboardResultsPanel.tsx:159`, `LeaderboardOverviewClient.tsx:102`, `ProfileBuildExpanded.tsx:63` |
| 9 | Gold glass panel frame duplicated (~200-char class string) x4 exact + 3 near-variants; meanwhile `.glass-card` in globals.css:574-607 has **zero** users | 7 sites | One `.panel-glass` component class; delete or adopt `.glass-card` | `card/EchoSection.tsx:41`, `card/RankModule.tsx:138`, `BuildExpandedEchoPanels.tsx:143,153`, near: `BuildExpanded.tsx:61`, `EchoInventoryDetail.tsx:173` |
| 10 | S0-S6 sequence color ramp defined four times, different opacities each | 4 definitions | One source (constants.ts) consumed everywhere; delete `.seq-badge.s1-s6` | `globals.css:624-629`, `constants.ts:119-127`, `:158-166`, `:188-196` (the last two near-identical); cousin: rank-tier map at `ProfileShowcase.tsx:23-28` |
| 11 | Arbitrary font sizes: 156 uses, 13 distinct px values; `text-[11px]` (55) + `text-[10px]` (51) are the app's real micro scale with no token; true one-offs `9.5px`, `10.5px` (x4, one file), `14px` (= `text-sm`), `25px`, `26px`, `40px` | 156 | Mint `--text-2xs` (11px) and `--text-3xs` (10px) theme tokens; sed; delete the one-offs (`Hero.tsx:386`, `BuildMoveBreakdown.tsx:199,227,267,333`, `RankModule.tsx:172`) | Full list in sweep; `RankModule.tsx` alone has 7 distinct arbitrary sizes |
| 12 | Token values spelled as literals | ~20 | `SequenceSelector.tsx:72-73` (`#333`, `#1e1e1e`, `rgba(224,224,224,x)`, `rgba(166,150,98,x)` are `border`, `background-secondary`, `text-primary/x`, `accent/x`), `WeaponSelector.tsx:146`, near-token hexes `#0d1017/#131313/#191919/#3a3a3a` (`RankModule.tsx:80`, `BuildMoveBreakdown.tsx:541`, `BuildSubstatUpgrades.tsx:76`, `EchoPanel.tsx:154`); `lib/elementVisuals.ts:37-42` duplicates the six element hex tokens; chart palette duplicated `BuildMoveBreakdown.tsx:11-13` = `BuildOptimalityPanel.tsx:14-15` | |
| 13 | `transition-all` (Emil rule: never; list properties) | 51 uses / 28 files | `transition-[the-actual-properties]`; the codebase already does this correctly in `LeaderboardTabs.tsx:12` | `BuildEditor.tsx:648`, `CardActionBar.tsx:60`, `card/*`, selectors |
| 14 | Three page-shell max-widths in one directory | 3 | Pick one | `EchoInventoryDetail.tsx:171` (1320px), `ProfileBuildExpanded.tsx:54` (1472px), `ProfilePageClient.tsx:32` (1620px) |
| 15 | Font-role drift | ~15 | gowun (numbers) used as display: `Footer.tsx:27`, `PrivacyPage.tsx:6`, `TosPage.tsx:6`, and on the whole nav container (`Navigation.tsx:186`); jakarta applied to body-text containers then un-done with 18 `font-ropa` resets (`AdjustRankingButton.tsx:176` has three faces fighting); mono used for eyebrows (`Hero.tsx:167,300`, `ProfileSearch.tsx:213`), which reads as intentional "patch-notes register" and may be fine; codify it if so | |

Also catalogued (lower priority): 292 `white/NN`+`black/NN` uses across ~55
steps (`CharacterPanel.tsx:168-256` alone uses 9); `text-white/NN` (47 uses,
18 steps) as a shadow copy of `text-text-primary` inside the card, defensible
as card-artifact styling but worth one decision; `bg-accent/4` through `/12`
as six near-identical washes wanting a `bg-accent-subtle`; skeleton-row markup
duplicated x31 across 4 files; legal pages with 22 repeated heading strings
and no prose component; 40 inline arbitrary grids of which only the 4 in
`constants.ts` are systematized.

---

## 5. What I would do first

Ranked by effort:impact, cheapest honest wins first. Items 1-4 are a day or
two combined; item 5 is the one real design task.

1. **Reposition the `/builds` gate overlay + give it a dismiss button**
   (F1, ~1 hour). One component, fixes the worst first impression on a
   28K-visitor route for every mobile viewer, every day.
2. **Add tap-to-open to `HoverTooltip` on coarse pointers** (F3, ~2 hours).
   One primitive unlocks roll bars, team buffs, CV/RV explanations, and echo
   identity for 28% of traffic across every board and profile.
3. **Phantom-class cleanup batch** (F5 + hygiene rows 2, ~2 hours, zero
   design risk). Fixes visibly broken UI today: nav drawer labels, bulk-import
   panels, Generate-button glow, set-count color, plus deleting 30 dead
   scrollbar classes.
4. **The two-sed color pass: `amber-*` to `accent`, and collapse the
   `text-text-primary` opacity ladder to 4 steps** (F7 + hygiene rows 1/3,
   ~half a day with screenshots before/after). This is the highest-visibility
   brand fix available: one gold everywhere, one secondary-text system, and it
   touches every high-traffic surface without changing any layout.
5. **Mobile board-table pass** (F2 + F9, the real work). Cheap tier first:
   Score adjacent to identity columns, sticky `#`/Owner/Name, right-edge fade
   on the scroll wrappers, stacked pagination with 40px targets. Then the
   deliberate piece: the small-screen row card that
   `LeaderboardRow.tsx:109`'s comment already promises, replacing the 1360px
   grid below `md:`. That converts the two highest-traffic data surfaces from
   "desktop table you can pan" to something designed for the 22K mobile
   visitors they currently underserve.

No changelog entry is needed for this audit itself; individual fixes that ship
from it should be grouped into `lib/changelog.ts` lines per AGENTS.md.
