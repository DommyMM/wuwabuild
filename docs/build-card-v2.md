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

## Layout (2400×1080 canvas)

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

## Rank module

Surface: `linear-gradient(180deg, rgba(166,150,98,.10) 0%, rgba(255,255,255,.02) 34%, rgba(0,0,0,.30) 100%)`, 1px `rgba(166,150,98,.45)` border, 20×22 padding, 20px gap between columns.

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──┐  [● Frostburn] [S0] [Quickswap] [ER ≥ 120%]  [DMG ▾]      │
│  │ S│                                                            │
│  │  │  TOP 2.96%   #125 / 4,220                       1,532,212  │
│  └──┘                                                 ─────────  │
│                                                       COMPUTED   │
│                                                        DAMAGE    │
└─────────────────────────────────────────────────────────────────┘
```

Anatomy:

| Element | Spec |
|---|---|
| Tier letter | 88×88 cell, `font-display 700 64px`, `--gold-hi`, `text-shadow 0 0 24px rgba(166,150,98,.5)` |
| Tier mapping | S ≤ 1%, A ≤ 10%, B ≤ 25%, C ≤ 50%, D otherwise (by `topPercent` on active board) |
| Tier colors | S `--gold-hi` · A silver `#C4C7CB` · B bronze `#B7895C` · C `--text-2` · D `--text-3` |
| Scope chips | 11px Ropa, 0.08em tracking, all-caps, 1px border; active chip = gold tint |
| TOP % | `font-number 700 28px`, `--gold`; kicker "TOP" 11px 0.22em `--text-3` |
| Rank num | `font-number 15px` for `#125`, " / 4,220" at `--text-3` |
| Right column | 32px `font-number 700` value, 10px 0.18em label ("COMPUTED DAMAGE" or "RV TOTAL") |
| Mode picker | Compact dropdown, top-right. `DMG ▾` opens menu with `By damage` (default) / `By RV` |
| Board picker | Click scope chip group to open a popover listing all boards this build qualifies for; selecting changes which rank is shown. Default is **best of all eligible boards** |

### Two ranking modes

| Mode | What it ranks | Right-column value | Source |
|---|---|---|---|
| **Damage** *(default)* | Per-board competitive rank, weapon × sequence × track × ER bracket | Computed damage (large, tabular) | `LBLeaderboardEntry.damage`, `globalRank` |
| **RV** | Population-wide rank by preferred-substat roll value for this character | `RV%` (large, tabular) | Phase 3 backend column; Phase 1 derives client-side via `calculateOverallRV` and shows "—" rank |

The two modes share the tier/TOP %/#-of-total chrome — only the right-column score swaps.

## Echo cards

Unchanged. Existing tier-color underline + CV badge tested well in v1 and aren't worth swapping for the akasha pip translation — too much visual noise inside the new card's already-busy lower half. `getSubstatTierIndex` is kept in [lib/calculations/substatTiers.ts](../lib/calculations/substatTiers.ts) as a small helper for any future indicator, but no consumer wires it today.

## RV aggregate bar — kept under the card, not inside it

The substat summary already renders below the card in [ProfileBuildExpanded.tsx:213-260](../components/profile/ProfileBuildExpanded.tsx#L213-L260) (`LB_SUMMARY_ROW`) and is interactive — pills filter the RV calc. Lifting it into the card frame just stacks the same readout twice. Decision: one or the other, not both. The existing row stays in `ProfileBuildExpanded`.

If we ever want a static read-only twin inside the card, the deleted `RVBar.tsx` from commit `8510498` is the starting point — but only re-introduce when there's a clear use case (e.g. shareable static export of the card image).

## Talent pill row

Replaces the old 5×3 forte node grid on the *card only*. The full forte tree stays in `/edit`.

```
[NA Normal 10] [SK Skill 8] [FC Circuit 10] [LB Lib. 10] [IN Intro 6]
```

- Pill: 26px tall, 4/8/4/6 padding, 1px border.
- Glyph badge: 16×16, 1px border, mono 9px `--text-3`.
- Label: Ropa 400 11px `--text-2`.
- Level: Gowun 13px `--text` (max state → `--gold-hi`, border → `rgba(166,150,98,.30)`).
- Row gap: 6px.

## Data flow

### Phase 1 — frontend only (this PR)

Per-row rank fetched **lazily on row expand** via the existing `/leaderboard/{characterId}/build/{buildId}/standings` endpoint ([lib/lb.ts:936](../lib/lb.ts#L936)). Rank module renders a skeleton until standings resolve, then picks `bestRank = min(rank for rank in standings)`. The dropdown lets the user switch to any other standing.

RV mode in Phase 1 shows: tier from local CV → tier mapping, TOP % blank, rank "—", right-column RV% computed from `calculateOverallRV`. Honest about being un-ranked until the backend provides RV ranking.

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
