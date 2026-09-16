# Domain Glossary

Terms shared by the frontend and the leaderboard service. Definitions live here, behavior lives in
`leaderboards.md`.

## Core

- **Build**: character setup with weapon, echoes, forte and metadata
- **Track**: leaderboard scenario variant such as `s0` or `s1`
- **Sequence**: character sequence stage used in damage computation
- **Weapon ID**: canonical CDN weapon ID, shared by both services
- **UID**: player identifier used for competitive dedup

## Leaderboard

- **Board identity**: character plus weapon plus track. Nothing else selects a ranked list, and this is
  what the canonical URL encodes.
- **Score**: the ranked board value, rotation damage × `min(1, ER / erTarget)`. Equals raw damage on a
  board with no `erTarget`, or once ER meets it.
- **`erTarget`**: per-track minimum Energy Regen the board expects (`LBTrack.erTarget`). Absent or 0
  means no ER requirement, and the score scales in place rather than splitting the board into brackets.
- **`damage_map`**: flat backend map of `<weaponId>_<sequenceKey>` to Score
- **`calculations`**: per-weapon detailed output (`stats`, `moves`, `upgrades`)
- **`globalRank`**: a build's position on its board, always measured against the deduped canonical board
  with no view filter applied. Always returned. `> 0` is a showable competitive rank, `0` means unranked:
  a ghost row, or a build with no damage on this board. Filters hide rows and sorts reorder them, so
  neither renumbers rank.
- **Ghost build**: a deep-linked build returned even though the current view does not contain it, because
  dedup removed it or a filter excluded it
- **Standings**: rank and damage of one build across every weapon × track board
- **Dedup**: one representative row per player, picked by the board's ranked metric (Score, or CV with no
  weapon selected). On for a Score sort, including with board filters applied, since filters narrow the
  candidate pool first. Off for any other sort and for a `uid` or `username` search, where every submitted
  build appears at its true board rank. `?dedup=0` and `?dedup=1` override either way. Dedup selects which
  rows appear, never what rank they carry.

## Conventions

- `stats` and `upgrades` keys are snake_case
- Echo panel limits: max total cost 12, max two 4-cost, max three 3-cost
- `ForteState` order: normal attack, skill, circuit, liberation, intro
