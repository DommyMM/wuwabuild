# Design Debt

Defects still present in the code. The rules they come from are in `design-brief.md`. Delete an entry when
it is fixed rather than marking it done.

## Data tables have no mobile opinion

The biggest open item. Board tables are fixed-width grids around 1360px wide rendered at 390px, so the page
hides the one thing it exists to show.

- `constants.ts` `TABLE_GRID`, `SORTABLE_GROUP_GRID` and `LB_TABLE_GRID` are fixed px tracks, with
  `min-w-163` and `min-w-199` alongside
- No `sticky left-0` identity column anywhere in the four table files
- Score sits last in header order, so the headline figure is off-screen on first paint
- `GlobalBoardRow.tsx` and `LeaderboardRow.tsx` carry zero responsive variants, and neither do
  `BuildExpanded`, `BuildExpandedEchoPanels`, `BuildStandingsTable`, `BuildFiltersPanel` or
  `ImportPageClient`
- `BuildExpandedEchoPanels.tsx` is `grid grid-cols-5` with no responsive variant
- `app/globals.css` still carries the `overflow-x: hidden` band-aid

Both results panels carry a right-edge fade, which makes the scroll discoverable but does not make the table
readable. `LeaderboardRow.tsx` still comments a promise of a small-screen card that does not exist.

## Two competing golds

87 `amber-*` occurrences across 20 files, plus 24 `yellow-*`, against a brand accent that is neither. No
`--color-accent-bright` token exists. Worst concentrations are `leaderboards/character/LeaderboardTabs.tsx`,
`constants.ts`, `card/EchoSection.tsx`, `card/RankModule.tsx`, `profile/SubstatSummaryRow.tsx`,
`ui/HoverCard.tsx` and `lib/text/gameText.tsx`.

## Opacity ladder has no ladder

25 distinct `text-text-primary/NN` steps across 514 uses, with only about a third on any consistent ramp and
`/70` alone accounting for 104. Pick the ladder, put it in `design-brief.md`, then collapse the singletons.

91 uses sit at `/44` or below, under the legibility floor. `profile/AdjustRankingButton.tsx` combines
`text-[8px]` with `/40` twice. `home/Hero.tsx` has `via-background/15` and mobile art at `opacity-35`.
`text-[8px]` appears 7 times and `text-[9px]` 14 times.

## Accessibility gaps

- The primary filter combobox in `BuildFiltersPanel.tsx` implements ArrowUp, ArrowDown, Enter and Escape
  listbox navigation with no `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-controls` or
  `aria-label`. Its dropdown has no `role="listbox"` and its options are plain buttons with no `role="option"`
  or `aria-selected`. The same shape repeats in `profile/ProfileEchoes.tsx` and `save/SavesPageClient.tsx`.
- `edit/BuildCardOptions.tsx` has `<label>` siblings with no `htmlFor`
- 8 bare `outline-none` with no replacement remain: `home/ProfileSearch.tsx` (3),
  `import/ImportResults.tsx`, `import/ReportIssueModal.tsx`, `leaderboards/BuildStatDistribution.tsx`,
  `save/SavesPageClient.tsx`. The `tabIndex={-1}` panel in `ui/Modal.tsx` is legitimate.
- Board rows in `board/GlobalBoardRow.tsx` and `character/LeaderboardRow.tsx` have `role="button"`,
  `tabIndex` and `aria-expanded` but no `aria-controls`
- `Modal` traps focus and restores it, but sets no `inert` or `aria-hidden` on background siblings
- `SortHeaderMenu.tsx` fires `setIsMenuOpen(true)` and `onHeaderSort()` from the same click, so a touch user
  cannot open the menu without also sorting

## Mobile drawer is absent from SSR

`Navigation.tsx` initialises its media-query state to `false` and gates the drawer behind `isMobile`, while
the burger renders unconditionally with `aria-controls="mobile-navigation-drawer"`. SSR therefore ships a
button pointing at an element that does not exist until hydration.

## Copy rule violations

`board/GlobalBoardHeader.tsx` is five `<br/>`-joined first-person lines including "I believe that crit is the
best stat scaling there is". `board/GlobalBoardResultsPanel.tsx` says "with the highest ATK idk lol".
Personality belongs in the changelog, not a page header.

## Token hygiene

- `SEQUENCE_BADGE_STYLES` and `LB_SEQ_BADGE_COLORS` both live in `constants.ts`, and `.seq-badge.s1` through
  `.s6` sit in `globals.css` with zero consumers
- `character/SequenceSelector.tsx` still writes `border-[#333]`, `bg-[#1e1e1e]` and
  `text-[rgba(224,224,224,0.35)]` as literals
- `lib/elementVisuals.ts` duplicates the six element hexes the palette already defines
- `transition-all` remains in 28 places
- 55 arbitrary px font sizes remain, including one-offs at 40, 30, 26, 25, 18 and 12px
- `border-white/10` remains in 9 places
- 8 non-standard border radii remain
- No `<Eyebrow>` component and no `.label-micro` class, so that pattern is still hand-rolled per site
