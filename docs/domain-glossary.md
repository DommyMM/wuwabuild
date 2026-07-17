# Domain Glossary

Common terms used by the frontend and leaderboard backend.

## Core Terms

- **Build**: Character setup with weapon, echoes, forte, and metadata.
- **Track**: Leaderboard scenario variant such as `s0` or `s1`.
- **Sequence**: Character sequence stage used in damage computation.
- **Weapon ID**: Canonical CDN weapon ID used by both services.
- **UID**: Player identifier used for competitive dedup.

## Leaderboard Terms

- **`damage_map`**: Flat backend map `<weaponId>_<sequenceKey>` -> Score.
- **Score**: The ranked board value — rotation damage × `min(1, ER / erTarget)`. Equals raw damage on boards without an `erTarget` or once ER meets it.
- **`erTarget`**: Per-track minimum Energy Regen the board expects (`LBTrack.erTarget`). Absent/0 = no ER requirement. Replaces the old ER bracket tabs — there is no longer a separate filtered view, the score itself scales.
- **`calculations`**: Per-weapon detailed output (`stats`, `moves`, `upgrades`).
- **`globalRank`** (for `/leaderboard/{characterId}` rows):
  - Always returned in responses.
  - A property of the build on its board (character + weapon + track), always measured against the deduped canonical board. Filters and non-damage sorts reorder/hide rows but never renumber rank.
  - `> 0` means frontend can show a competitive rank badge.
  - `0` means frontend should treat the row as unranked: a ghost row, or a build with no damage on this board.
- **Ghost build**: Deep-linked build returned even when the current view does not contain it (deduped out or excluded by a filter).
- **Standings**: Rank/damage of one build across all weapon x track boards.
- **Dedup**: One representative row per player, on by default under any sort. `?dedup=0` shows every submitted build (each still with its true board rank); a `uid`/`username` search defaults to `dedup=0`. Dedup selects which rows appear; it never changes rank.

## Key Conventions

- `stats` keys are snake_case.
- `upgrades` keys are snake_case.
- Echo panel constraints: max total cost 12, max two 4-cost, max three 3-cost.
- `ForteState` order: normal attack, skill, circuit, liberation, intro.
