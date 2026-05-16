# Build Card v2 — Rank-Surfacing Profile Card

**Status:** spec locked, implementation pending — Phase 1 (frontend only).
**Owner:** frontend.
**Related:** [docs/https://api.anthropic.com/v1/design/h/2A-ed4D_T0v6zDeLzlqt4A?open_file=Build+Card+v2+-+Rank+Plan.html](https://api.anthropic.com/v1/design/h/2A-ed4D_T0v6zDeLzlqt4A?open_file=Build+Card+v2+-+Rank+Plan.html) (visual reference), [docs/leaderboards.md](leaderboards.md), [lb/docs/api-behaviors.md](../../lb/docs/api-behaviors.md).

## Problem

The current build card ([components/edit/BuildCard.tsx](../components/edit/BuildCard.tsx)) is the same artifact in `/edit`, `/characters/[id]`, `/weapons/[id]`, and inside every expanded row on `/profile/[uid]` (via [components/profile/LeaderboardCard.tsx](../components/profile/LeaderboardCard.tsx)). It is editorial — splash, sequence rail, forte node grid, stat list, echoes — but it never surfaces the one number that decides whether a build is good: **its rank on a leaderboard**. The forte node grid, by contrast, is canonical but rarely the reason anyone shares the card.

Build Card v2 swaps those priorities for the *profile* surface only — the editor card is untouched.

## Decision summary

Drop the forte node grid on profile cards. Replace it with a **Rank module** (tier letter, scope chips, TOP %, #/total, computed-damage or RV score). Collapse forte to a 5-pill talent row above the weapon block. Add **roll-quartile pips** to every echo substat. Add a full-width **RV aggregate bar** below the five echoes.

Splash, sequence rail, weapon block, right-rail stat list, CV/sonata pill, and echo-card chrome all stay. The editor's `BuildCard` is unchanged — `/edit` keeps the full forte input.

All visual decisions, including the triptych audit of WaveMate / current / akasha references, the module-by-module decision matrix, the annotated wireframe at 1280×720 (real canvas 2400×1080), and four module mocks (rank, talent pills, echo + dots, RV bar), live in [https://api.anthropic.com/v1/design/h/2A-ed4D_T0v6zDeLzlqt4A?open_file=Build+Card+v2+-+Rank+Plan.html](https://api.anthropic.com/v1/design/h/2A-ed4D_T0v6zDeLzlqt4A?open_file=Build+Card+v2+-+Rank+Plan.html). Read it open in a browser before editing components — measurements there are authoritative.

## Layout

The card splits into **two siblings** stacked vertically inside `build-card-frame`:

1. **Upper card** — `aspect-[2.4/1]`, contains splash + sequence rail + mid column (name/weapon/talents/rank/sonata) + stats column. Top corners rounded. Same width-to-height ratio as the editor's `BuildCard`.
2. **Echo strip** — sibling below the upper card. Bottom corners rounded. Auto height (~240px). Reuses the same `BgCg/T_Bg1_UI.png` backdrop + the same tint/bloom/gradient overlays as the upper card so the seam reads as one continuous surface.

Lifting echoes out of the aspect-lock buys the upper card ~35% more vertical room (since echoes are no longer eating into the 2.4/1 height). That's what makes room for the rank module's team strip + loadout icons without crushing anything above.

```
┌───────────────┬──┬───────────────────────────┬───────────────┐
│               │  │  03  char header          │               │
│               │  │  04  weapon               │               │
│   01 splash   │02│  05  talent pills [NEW]   │  08 stat list │
│   (880×1080)  │seq│  06  RANK MODULE [NEW]   │   (528×755)   │
│               │  │  07  CV + sonata pill     │               │
│               │  │                            │               │
├───────────────┴──┴────────────────────────────┴───────────────┤
│  09 echo row (5-up, 1410×240) — substats gain roll pips        │
│  10 RV aggregate bar (1410×65) [NEW]                          │
└────────────────────────────────────────────────────────────────┘
```

Center column slots `04`+`05`+`06`+`07` exactly replace the old `WeaponGroup` + `ForteCardSection` + `ActiveSetsSection` stack. Talent pills + rank module = the swap.

## Module map → files

| # | Module | Status | Code |
|---|---|---|---|
| 01 | Splash | keep | [components/card/CharacterPanel.tsx](../components/card/CharacterPanel.tsx) |
| 02 | Sequence rail | keep | [components/card/SequenceStrip.tsx](../components/card/SequenceStrip.tsx) |
| 03 | Char header | keep | [components/card/NameGroup.tsx](../components/card/NameGroup.tsx) |
| 04 | Weapon block | keep — minor: R chip inline with Lv | [components/card/WeaponGroup.tsx](../components/card/WeaponGroup.tsx) |
| 05 | Talent pill row | **new** | `components/card/TalentPills.tsx` |
| 06 | Rank module | **new** | `components/card/RankModule.tsx` |
| 07 | CV + sonata pill | keep — compress to one row | [components/card/ActiveSetsSection.tsx](../components/card/ActiveSetsSection.tsx) |
| 08 | Stat list | keep | [components/card/StatsTableSection.tsx](../components/card/StatsTableSection.tsx) |
| 09 | Echo cards | keep as-is | [components/card/EchoSection.tsx](../components/card/EchoSection.tsx) |
| 10 | RV aggregate bar | not in card | lives under the card in [ProfileBuildExpanded.tsx](../components/profile/ProfileBuildExpanded.tsx) — duplicating it inside the frame just stacks the same data twice |

Assembly: `components/profile/ProfileBuildCard.tsx` orchestrates the variant, replaces the current `LeaderboardCard` shim.

## Talent pill row

Replaces the old 5×3 forte node grid on the *card only*. The full forte tree stays in `/edit`.

```
[NA-icon 10] [SK-icon 10] [FC-icon 10] [LB-icon 10] [IN-icon 10]
```

- Pill: 26px tall (`h-6.5`), `pr-1.5 pl-0.5`, 1px border (max-level pills tint `border-accent/35`).
- Skill icon: 20×20 (`h-5 w-5`), pulled from `character.skillIcons[skillKey]` with the same key map ForteCardSection uses (`normal-attack`, `skill`, `circuit`, `liberation`, `intro`). Falls back to `character.elementIcon` then to the 2-letter glyph if neither resolves.
- Level: Gowun 13px tabular `--text-primary` (max → `--accent-hover`).
- Background: `bg-black/35` so the colored icons read against the card's atmospheric backdrop.

## Rank module

Surface chrome matches the echo cards so the rank module reads as part of the same family: `linear-gradient(170deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 28%, rgba(0,0,0,0.44) 100%)` with inset hairline + bottom-shadow, 1px `border-amber-300/45`, `rounded-xl`, `px-4 py-3`.

```
┌────────────────────────────────────────────────────┐
│  HYPERCARRY                                        │
│                                                    │
│  #19  / 994                             1,233,878  │
└────────────────────────────────────────────────────┘
```

Anatomy:

| Element | Spec |
|---|---|
| Track kicker | Ropa 10px, 0.22em tracking, all-caps, `--text-primary/55` |
| Rank number | `font-gowun 700 30px` tabular, **colored by percentile tier**. Color is the only quality signal — no separate TOP % text. |
| Tier color map | TOP ≤ 1% `--gold-hi` (glow) · ≤ 10% silver `#C4C7CB` · ≤ 25% bronze `#B7895C` · ≤ 50% `--text-primary/65` · else `--text-primary/40` |
| Total | `font-gowun 14px` tabular `--text-primary/40` ("/ 994") |
| Damage value | `font-gowun 700 22px` tabular `--text-primary` — no kicker (number alone is unambiguous as damage) |

Dropped vs the original mock: the big tier letter, weapon chip, sequence chip, ER-bracket chip, in-card board picker, the `DMG ▾ / RV ▾` mode toggle, **and the TOP %% text**. Color alone now carries the percentile signal — `#19` in gold reads "top 1%" without spending screen real estate on the literal number.

Board switching belongs to a future bottom menu bar on the profile row.

### Single-row rank module

Everything sits on **one horizontal row**. No damage number (akasha doesn't show it either; the percentile + rank# pair already tells the story). Order: rank → percentile → [auto spacer] → team → track+weapon pill.

```
#19 / 994   TOP 1.91%                    [👤][👤][👤]  [⚔ HYPERCARRY]
```

- Module: `flex items-center gap-3 rounded-xl border border-amber-300/45 px-3 py-2`, same echo-card-style backdrop.
- **Rank number**: `font-gowun 700 22px`, color tinted by percentile tier (gold/silver/bronze/neutral) using `getRankTier`.
- **Total**: `/ 994` at `text-primary/40` 11px.
- **TOP %**: `font-gowun 14px text-accent` with a 9px `TOP` kicker.
- **Team avatars**: 36×36 (`h-9 w-9`), `rounded-lg`, pushed right with `ml-auto`. Lead gets `border-accent` + inset gold glow; supports `border-white/14`.
- **Sequence badge**: top-right when > 0, `text-[10px] font-bold px-1.5 py-px`, color from [LB_SEQ_BADGE_COLORS](../components/leaderboards/constants.ts).
- **Per-portrait loadout strip**: 3 tiny icons (12×12) bleeding off the bottom of each portrait (`-bottom-1 left-1/2 -translate-x-1/2`) when standings populates `weaponId/echoId/setId`. Absolute positioning keeps the module flat — single-row height stays 36px regardless of whether icons are present.
- **Track + weapon pill**: small bordered chip on the right, weapon icon + uppercase track label. Replaces both the in-card weapon chip and the kicker-style track label from earlier drafts.

Team built in `ProfileBuildCard.activeTeam` from `selected.character` (lead, `isLead: true`) + `canonicalStanding.teamMembers` (supports). Backend `TeamMemberConfig` ([lb/internal/calc/buffs.go:360](../../lb/internal/calc/buffs.go#L360)) supports gear fields, but populating them is a per-character `chars/*.go` concern — for characters whose config only specifies `charId` + `sequence`, the loadout strip is empty.

### Canonical board

The card always shows the rank for the **equipped weapon**: `standings.find(s => s.weaponId === state.weaponId)`, falling back to the first ranked standing if no match exists. Without this anchor, standings sorted by rank ascending will surface phantom boards — the build's `damage_map` carries values for every weapon variant the LB tracks, so the build "ranks" on weapons it never equipped.

## Echo cards

Unchanged. Existing tier-color underline + CV badge tested well in v1 and aren't worth swapping for the akasha pip translation — too much visual noise inside the new card's already-busy lower half. `getSubstatTierIndex` is kept in [lib/calculations/substatTiers.ts](../lib/calculations/substatTiers.ts) as a small helper for any future indicator, but no consumer wires it today.

## RV aggregate bar — kept under the card, not inside it

The substat summary already renders below the card in [ProfileBuildExpanded.tsx:213-260](../components/profile/ProfileBuildExpanded.tsx#L213-L260) (`LB_SUMMARY_ROW`) and is interactive — pills filter the RV calc. Lifting it into the card frame just stacks the same readout twice. Decision: one or the other, not both. The existing row stays in `ProfileBuildExpanded`.

If we ever want a static read-only twin inside the card, the deleted `RVBar.tsx` from commit `8510498` is the starting point — but only re-introduce when there's a clear use case (e.g. shareable static export of the card image).

## Data flow

### Phase 1 — frontend only (this PR)

Per-row rank fetched **lazily on row expand** via the existing `/leaderboard/{characterId}/build/{buildId}/standings` endpoint ([lib/lb.ts:936](../lib/lb.ts#L936)). Rank module renders a skeleton until standings resolve, then picks the standing matching the equipped weapon. No board switching inside the card — when needed, a future bottom menu bar on the profile row will let users browse alternate boards.

RV mode is parked. The `DMG ▾ / RV ▾` toggle, mode persistence, and `calculateOverallRV` wiring were all removed from the card surface — re-introduce only when the backend provides an RV-ranked index (Phase 3 below).

### Phase 2 — rank on row

Extend `/profile/{uid}/builds` row payload ([lb/internal/api/convert.go](../../lb/internal/api/convert.go)) with:

```jsonc
"bestRank": {
  "rank": 125, "total": 4220, "topPercent": 2.96, "tier": "A",
  "weaponId": "21050026", "sequence": 0,
  "trackKey": "dps", "trackLabel": "Quickswap",
  "erBracket": 120, "damage": 1532212
},
"allRanks": [ /* every board this build qualifies for, same shape */ ]
```

No new compute — same join the standings endpoint already runs, batched per profile page.

### Phase 3 — RV ranking

- New `preferred_rv` column on builds (per-character preferred-stat RV%), populated on submit.
- Index `(character_id, preferred_rv DESC)`.
- Row field `rvRank: { rank, total, topPercent, rv }`.

Toggle wires to this when in RV mode.

## Decisions

| # | Decision | Notes |
|---|---|---|
| Q1 | Default rank scope = **best of all eligible boards** | User can switch via the board picker dropdown |
| Q2 | Tier palette = **S gold / A silver / B bronze / C–D neutral** | One accent rule preserved; non-S tiers neutralize |
| Q3 | Radar chart = **skip in v2** | Right-rail stat list + breakdowns already do the job |
| Q4 | Forte tree on `/edit` = **keep full grid in editor, pills on card only** | Editor needs forte input for damage calc |
| Q5 | Priority stat source = **curated per character** (matches leaderboard scope) | `character.preferredStats`, fall back to `DEFAULT_PREFERRED_STATS` |
| Q6 | CV vs RV = **both** | CV pill stays in slot 07; RV total in the new bar |
| Q7 | Roll pip mechanic = **quartile** (not roll count) | Reuses `getSubstatTierColor`; 4 pips for visual parity with akasha |
| Q8 | No-rank empty state = **"Not ranked — submit to a board" CTA** in the same surface | Same gradient frame, dim tier-letter slot |
| Q9 | Rank-mode default = **Damage** | Dropdown persists per session in `localStorage` |
| Q10 | RV-mode empty state = **fall through to local RV display** | Until Phase 3, RV mode shows score only, no rank |

## Out of scope

- Editor card redesign (`/edit` and friends stay on v1).
- Team comp portraits (no team data on the profile pipeline yet).
- Radar/spider chart (parked — Q3).
- Mobile-specific layout (responsive collapse to be designed in Phase 1.5 once the desktop frame lands).
- New backend ranking endpoints — covered by Phase 2/3 plans, not blocking v2 launch.

## Implementation order (Phase 1)

1. `RankModule` shell + dropdown UX + skeleton state, wired to existing `getBuildStandings`.
2. `TalentPills` row.
3. `EchoSection` `rollIndicator='pips'` mode.
4. `RVBar` (lift logic from `ProfileBuildExpanded`).
5. `ProfileBuildCard` assembly, swapped in by `LeaderboardCard`.
6. Wire `character.preferredStats` curated list (define for current top characters; default for the rest).
7. Visual QA against `https://api.anthropic.com/v1/design/h/2A-ed4D_T0v6zDeLzlqt4A?open_file=Build+Card+v2+-+Rank+Plan.html` at 1× canvas.
