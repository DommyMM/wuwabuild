# Domain Glossary

Common terms used by the frontend and leaderboard backend.

## Core Terms

- **Build**: Character setup with weapon, echoes, forte, and metadata.
- **Track**: Leaderboard scenario variant such as `s0` or `s1`.
- **Sequence**: Character sequence stage used in damage computation.
- **Weapon ID**: Canonical CDN weapon ID used by both services.
- **UID**: Player identifier used for competitive dedup.

## Leaderboard Terms

- **`damage_map`**: Flat backend map `<weaponId>_<sequenceKey>` -> total damage.
- **`calculations`**: Per-weapon detailed output (`stats`, `moves`, `upgrades`).
- **`globalRank`** (for `/leaderboard/{characterId}` rows):
  - Always returned in responses.
  - Competitive mode (`sort=damage` with no UID/username filter): deduped competitive rank.
  - Browse mode (stat/CV/timestamp sorts or UID/username filters): UID-best rows keep their competitive rank, non-best duplicate rows are `0`.
  - Ghost build sidecar: always `0`.
- **Ghost build**: Deep-linked build returned even if deduped out.
- **Standings**: Rank/damage of one build across all weapon x track boards.

## Key Conventions

- `stats` keys are snake_case.
- `upgrades` keys are PascalCase.
- Echo panel constraints: max total cost 12, max two 4-cost, max three 3-cost.
- `ForteState` order: normal attack, skill, circuit, liberation, intro.

