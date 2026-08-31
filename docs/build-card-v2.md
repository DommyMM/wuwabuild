# Build Card — Current Spec

The shareable card rendered on `/edit` (editor card) and on profile build rows (profile card). One skeleton, two variants. The profile variant's rank module is the product differentiator: competitor cards (wuwaflex) are pure aesthetics with no verified rank.

Last full revision: 2026-06-10. Earlier phased plans ("Build Card v2") are superseded; surviving backlog items are listed at the bottom.

## Skeleton

`components/edit/BuildCard.tsx` is the single card frame. Both surfaces render it; the only structural difference is the `forteSection` slot:

| Surface | Orchestrator | `forteSection` slot |
|---|---|---|
| Editor (`/edit`) | `components/edit/BuildEditor.tsx` | default `<ForteCardSection/>` (full node grid, hover-reactive) |
| Profile build row | `components/profile/ProfileCard.tsx` | `<ProfileRankSection/>` = `<TalentPills/>` + `<RankModule/>`; falls back to default `<ForteCardSection/>` when the build has no competitive rank |

Layout inside the frame (aspect 2.4/1 upper card, echo strip below):

```
+---------------+--+---------------------------+---------------+
|               |  |  char header (NameGroup)  |               |
|   character   |se|  weapon (WeaponGroup)     |   stat list   |
|   art panel   |q.|  forteSection slot        |  (StatsTable) |
|               |  |  CV + sonata (ActiveSets) |               |
+---------------+--+---------------------------+---------------+
|  echo row, 5-up (EchoSection)                                |
+---------------------------------------------------------------+
```

Module map:

| Module | Code |
|---|---|
| Art panel | [components/card/CharacterPanel.tsx](../components/card/CharacterPanel.tsx) |
| Sequence rail | [components/card/SequenceStrip.tsx](../components/card/SequenceStrip.tsx) |
| Char header | [components/card/NameGroup.tsx](../components/card/NameGroup.tsx) |
| Weapon block | [components/card/WeaponGroup.tsx](../components/card/WeaponGroup.tsx) |
| Forte grid (editor) | [components/card/ForteCardSection.tsx](../components/card/ForteCardSection.tsx) |
| Talent pills (profile) | [components/card/TalentPills.tsx](../components/card/TalentPills.tsx) |
| Rank module (profile) | [components/card/RankModule.tsx](../components/card/RankModule.tsx) |
| CV + sonata | [components/card/ActiveSetsSection.tsx](../components/card/ActiveSetsSection.tsx) |
| Stat list | [components/card/StatsTableSection.tsx](../components/card/StatsTableSection.tsx) |
| Echo cards | [components/card/EchoSection.tsx](../components/card/EchoSection.tsx) |

## Stat cross-link (hover)

One `activeHoverStat: StatHoverKey` lives in `BuildCard` and is shared by every module. Hovering a stat row (or any linked chip) lights every source feeding that stat and dims the rest of the card; stat names normalize through `lib/constants/statHover.ts`.

Linked sources, mirroring `StatsContext` exactly: weapon ATK/main-stat chips and unconditional weapon passives, forte stat nodes (trees 1/2/4/5), inherent-skill bonuses (`character.inherentBonuses`, attributed to the circuit node whose EN description names the stat), unlocked sequence nodes with an unconditional chain bonus (`getChainSequenceBonuses`), sonata set chips (two-way), echo main stats and substats, and the slot-1 echo passive. Deliberately unlinked: per-echo default flat HP/ATK (would light all five artworks on every HP/ATK hover) and the per-panel set icons (the sonata chip is the set's single source of emphasis; lighting all pieces of a 5p set is noise).

Highlight language: chips/rows/nodes use the white ring + dim treatment; passive sources with cutout art (weapon icon, slot-1 echo) are emphasized directly — slight scale-up, brightness lift, and a silhouette glow in the adaptive `--card-element` accent with a slow breathe (`.card-stat-source-art` / `.card-seq-source` in `globals.css`). The animated filter must live on an unmasked wrapper, never on the mask-faded echo img itself (Chromium filter+mask bug blanks the art). The old hard cyan box was retired 2026-07-15; cyan remains tooltip text emphasis only.

## Art panel

The panel art defaults to the character's **splash** (the full illustration, like the reference bot cards). `getBundledSplashCardArt` in [lib/splashArt.ts](../lib/splashArt.ts) synchronously maps known bundled files in `/images/splash/` to their per-character `SPLASH_ART_TRANSFORMS` framing offset. The browser does not probe image candidates before choosing the art, so a profile card's first render already points at its splash instead of painting the banner and replacing it. Characters without a bundled splash fall back to the banner cutout. **Both the editor and profile cards share the bundled descriptor**; the editor additionally lets the user toggle splash off (`splashDisabledIds`), switch normal/skin variants for characters with skins, upload custom art, and drag/zoom it (`CardArtTransform`, persisted per character while editing).

Normal splash files use the character id stem as WebP, e.g. `1107.webp`. Skin splash files use the same stem with `-skin`, e.g. `1107-skin.webp`. Rover uses the shared `Rover.webp` and optional `Rover-skin.webp`. If a skin splash is missing, the resolver falls back to the normal splash before falling back to the banner cutout.

Rover splash candidates try legacy-id and gendered filenames first; see `getSplashUrlCandidates`.

Profile expansion is deliberately staged. The page widens over 150ms while only a lightweight loading indicator is mounted. Once that layout is stable and build details are available, `ProfileCard` mounts at its final width but remains invisible until `useAdaptiveCardColors` has sampled the initial art. The prepared card then reveals downward using only `clip-path`, opacity, and transform over 220ms. Do not reintroduce a simultaneous `height: 0` to `height: auto` animation around the 1440px card: it makes `CardScaler`, the table scrollport observer, and the expansion animation chase one another's layout measurements.

## Rank module (profile cards)

A 90px strip, three groups separated by spacing (no divider lines), reading grade then board then conditions:

```
TOP              [wpn]  HYPERCARRY      [head]  [head]
2.18%                   [S6] 110% ER     S2      S0
#35 / 1.6k                              [icons] [icons]
```

| Group | Contents | Spec |
|---|---|---|
| Grade | `TOP` kicker, percentile, `#rank / total` | Percentile `font-gowun 700 25px` in tier color with glow, the only quality signal on the card. Total abbreviates at five digits (`formatTotal`: "1.6k", "95.7k") so the line survives boards growing 100x. Percentile stays the hero at every rank (a podium "#1 hero" variant was tried 2026-06-10 and reverted by owner preference). |
| Board | Weapon icon (hover card on web), track label, sequence pill + ER bracket underneath | Track label Ropa 13px / 0.08em / `text-primary/90`, the second-strongest text in the module, on its own row because future track labels have unknown length. `S{n}` pill below it (`LB_SEQ_BADGE_COLORS`), always shown since S0 vs S2 vs S6 changes what the rank means; `{n}% ER` joins that row when the board is ER-bracketed. A soft cluster backdrop behind the board group was also tried and reverted; keep the board zone chrome-free. |
| Conditions | Support avatars (lead omitted), corner S badges, up to 3 loadout icons each | Badges and gear sit ON the portrait: the S badge is inset at the top-right with a solid dark backing ring (translucent tier tints dissolve into bright character art otherwise), and the 16px loadout icons overlap the portrait's bottom edge. Gear hangs off the avatar, not off the module, keeping the stack compact and clear of the container border. Legibility survives export (2.67x upsample). |

Tier colors (`lib/calculations/rankTier.ts`): S = gold w/ glow at top 1%, A = silver at 10%, B = bronze at 25%, then neutral steps. Revisit the S threshold if boards reach six figures.

Profile cards wrap the rank strip with `TalentPills` above it: `26px` talent pills + `8px` gap + `90px` `RankModule` = `124px` layout height. The default `ForteCardSection` is also `124px` by layout math (`28 + 2 + 28 + 6 + 52 + 8`), with the rotated skill diamond visually overflowing a few more pixels.

Deliberately absent: **damage**. Cross-board damage is incomparable (a 9M S6 hypercarry next to a 1.6M S0 run reads as an error, not a flex); the tier-colored percentile is the normalized score. Akasha's card reaches the same conclusion. `RankBoard.damage` stays in the type for non-card consumers.

### Canonical board

The card defaults to the **uploaded weapon** and the highest configured sequence breakpoint at or below the uploaded character sequence, choosing the best matching playstyle only when more than one track shares that breakpoint. It falls back to the uploaded weapon's best board, then the first ranked standing, only when no eligible board exists. Without this anchor, standings sorted by rank ascending surface hypothetical future-sequence or alternate-weapon boards, because `damage_map` carries values for every weapon and sequence variant the LB tracks. `AdjustRankingButton` groups the uploaded-loadout default ahead of other standardized boards; the RV substat summary row renders below the card in `ProfileBuildExpanded`, not inside the frame (one readout, not two).

## Export

`downloadBuildCard` in `lib/buildCardExport.ts` uses `snapdom` (swapped in for `html-to-image` on 2026-07-15) to capture a canvas at `width = BUILD_CARD_EXPORT_WIDTH` (3840, i.e. 1440 × 2.67). It encodes high-quality WebP at the full export resolution and verifies the returned MIME type, falling back to PNG when the browser cannot encode WebP. The profile download wraps the card and the substat row in one capture; the substat pills render bare over the image's transparent band (a backdrop strip was tried 2026-06-10 and reverted by owner preference). Implication for design: anything legible at the 1440 preview is more than legible in the file; optimize hierarchy for the Discord-embed first glance, not for export pixel size.

**Invariant: the captured node must already be laid out at 1440.** The card is a design-space artifact, not a responsive layout — the art (`w-3/10`), stats table (`flex-1`) and echo row scale with width while the `w-120` column and every font, icon and padding stay fixed px, so a narrower host does not shrink the card, it crushes the echo panels and the stats table. `snapdom` serializes computed styles off the live DOM, so unlike `html-to-image`'s `style` override there is no way to force a design-space re-layout at capture time; whatever is on screen is what ships. Every host pins 1440 itself: `CardScaler` (editor and `ProfileCard` above `md`) shrinks with a CSS transform, which never affects layout, and `outerTransforms: false` strips that transform from the capture; the phone paths put the same 1440 layout in a horizontal scroller, since scaling it to phone width would be unreadable. Regression 2026-07-27: `ProfileCard` pinned 1440 only below `md`, so any viewport under ~1512 CSS px (laptops, 150% Windows scaling, browser zoom) rendered and exported a re-laid-out card — visible as the per-echo CV badge wrapping onto two lines, it being the only wrappable text in a panel.

**Invariant: no text in the frame may wrap.** `snapdom` copies every element's *used* width off the live DOM onto the clone (`width` is not on its excluded-property list, except on the inline tags described below), then rasterizes through an SVG `<img>`, which cannot see document fonts. The export is therefore a grid of boxes hard-pinned to whatever the text measured on screen, with zero width tolerance — if `embedFonts` misses a face the SVG falls back to a wider system font and every box overflows. Geometry stays perfect while the text deforms, which is the tell that separates this from a host-width bug. Every string in the card must be `whitespace-nowrap` (or `truncate`) so the failure mode is a few px of overflow rather than a line break inside a fixed-height row. `tabular-nums` on the numerics keeps digit-width drift out of the shrink-to-fit boxes. Regression 2026-08-02: an Android profile download shipped with all eight multi-word stat labels, the flat-stat `base +bonus` sub-line and the big CV badge each split across two lines, and the `truncate`d board label ellipsized to "HYPERCAR…" — the three unguarded wrappable strings in the frame, while the per-echo CV badge (hardened after the 2026-07-27 regression above) came through clean. `downloadBuildCard` now awaits `document.fonts.ready` and runs `preCache(node)` before capture, since next/font loads every family with `display: swap` and snapdom awaits fonts only inside `preCache`, never on the `toCanvas` path.

**Corollary: a fixed-size box in the frame must be a `<div>`, never a `<span>`.** snapdom's width copying has one carve-out: for a tag in its inline set (`span`, `small`, `em`, `strong`, `b`, `i`, `u`, `s`, `code`, `cite`, `mark`, `sub`, `sup`) that carries text or an element child, it *drops* `width`, `max-width`, `inline-size` and `max-inline-size` from the clone — a deliberate escape hatch so a font-fallback mismatch overflows the box instead of clipping the text. It re-adds `min-width: <used width>` to hold the size, but only when the element is **not** a flex or grid child; for a flex child it assumes flex sizing will restore the width, which is true on the main axis and false on the cross axis. A fixed-width `<span>` in a `flex-col` therefore exports shrink-wrapped to its content (`dist/snapdom.mjs`: `Qt`/`xt`, sets `ro`/`so`/`ao`; verified against a standalone capture 2026-08-20). Regression 2026-08-20: every forte level badge (`flex h-5 w-8`, a span in a `flex-col`) exported as a 17px blob around the digits instead of a 32px pill — geometry correct everywhere else, so it looked like a forte-specific bug. `RankModule`'s weapon frame and its `max-w-40 truncate` track label had the same latent defect. An explicit non-`auto` `min-width` is preserved and would also work, but a `<div>` sidesteps the whole branch; these boxes are already `display: flex`/`grid`, so nothing about the on-screen layout changes.

**Corollary: a `truncate` box inside a `w-fit` container has zero tolerance.** `w-fit` sizes every child to max-content, so the box width *equals* its text width — measured 2026-08-04 on `RankModule`'s track label as `width: 32.2188px` against `scrollWidth: 32`. The screen renderer tolerates that sub-pixel equality; the capture's isolated SVG document (its own embedded copy of the font, its own rasterization scale) is a different renderer by construction and does not, so `truncate` fires and costs *two* glyphs because the ellipsis needs room of its own — "NUKE" exported as "NU…". Padding cannot fix it: anything added to the span or its column also grows the `w-fit` parent, so the slack cancels. The floor has to be a keyword that survives the capture and re-fits against the *rendered* text — `min-w-fit` on the column — with the length cap moved onto the span (`max-w-40`) so the safety net for unknown-length track labels stays. Note `box-sizing` is a red herring here: `getComputedStyle().width` reports the border-box value, verified in-browser, so snapdom's baked widths are self-consistent.

The site mark ("wuwa.build") is bare shadowed text pinned bottom-left of the splash panel (`CharacterPanel`), stacked under the optional art-credit input in the editor. Shared cards are the distribution loop; keep the mark legible at embed size.

## Data flow

- Profile standings fetch on row expand via `/leaderboard/{characterId}/build/{buildId}/standings` (one request, all boards). `ProfileCard` owns the fetch so the action bar can switch boards without remounting the card. It reports the picked board upward (`onActiveBoardChange`), and `ProfileBuildExpanded` feeds that board (weapon, track, damage, rank) into the shared `BuildSimulationSection`, so the full leaderboard bench (move breakdown, substat upgrades, standings table, theoretical bench) renders under the card. When "Original forte" hides the rank module, the bench still defaults to the equipped weapon's best board, falling back to the best board overall.
- The editor's "where would this rank" lives **under** the card (`SimulateRankPanel`, on-demand `POST /leaderboard/{characterId}/simulate`), keeping the editor export clean of unverified ranks.

## Backlog (carried over)

- **Rank on row payload**: extend `/profile/{uid}/builds` rows with `bestRank` / `allRanks` so profile grids can rank-sort without N standings calls.
- **RV ranking**: `preferred_rv` column + index, `rvRank` row field; the card stays damage-rank only until then.
- Open call: whether the editor card should ever show the *simulated* rank module on its export. Today it does not, by design (verified ranks only on shareable cards).
