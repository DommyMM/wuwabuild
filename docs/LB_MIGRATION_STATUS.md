# LB Migration Status

Snapshot date: 2026-03-10  
Purpose: current-state reference for the active `wuwabuilds` frontend and Go `lb` backend.

## Current Reality

- Go `lb` is the active leaderboard backend contract for `wuwabuilds`.
- `/builds` uses `GET /build` for compact list rows and `GET /build/{id}` for expanded detail.
- `/leaderboards` uses `GET /leaderboard` overview data with per-character `weapons[]`, `tracks[]`, and `teamCharacterIds[]`.
- `/leaderboards/[characterId]` uses `GET /leaderboard/{characterId}` with canonical `weaponId + track`.
- Character leaderboard rows are compact. They include leaderboard-only fields like `damage` and `globalRank`, but not `buildState`.
- Expanding a leaderboard row fetches `GET /build/{id}` for `buildState`.
- `GET /build/{id}/moves/{weaponId}/{sequence}` and `GET /build/{id}/substat-upgrades/{weaponId}/{sequence}` remain separate on-demand detail endpoints.
- The character page uses the already-loaded leaderboard row `damage` as the base result for the selected board and derives projected upgrade results client-side from the `tiers` gain payload.
- The expanded substat-upgrades table shows only non-zero stat columns for the selected min / median / max tier and keeps a canonical stat order rather than sorting by gain.

## Canonical Contracts

### `/build`

- Compact list rows only.
- No `damage`.
- No `globalRank`.
- No `filteredRank`.
- No `buildState`.

### `/build/{id}`

- Compact row fields plus `buildState`.
- No leaderboard-only fields.

### `/leaderboard`

- Overview only.
- Returns registered characters with:
  - `weapons[]`
  - `tracks[]`
  - `teamCharacterIds[]`
  - `totalEntries`

### `/leaderboard/{characterId}`

- Board identity is `characterId + weaponId + track`.
- Returns:
  - compact leaderboard rows
  - `damage`
  - `globalRank`
  - `weaponIds`
  - `tracks`
  - `teamCharacterIds`
  - `activeWeaponId`
  - `activeTrack`
- Does not return `buildState`.

## Rank Semantics

- `globalRank` is the absolute board rank for the selected `weaponId + track`.
- Best damage on that board is always `#1`.
- `globalRank` is computed in Postgres from canonical damage ordering and is not affected by the current display sort.
- Changing the page sort to `damage asc`, `cv desc`, or a stat sort changes row order only. It does not redefine `globalRank`.

## URL Semantics

Canonical leaderboard route:

`/leaderboards/[characterId]?weaponId=<id>&track=<key>&page=&pageSize=&sort=&direction=&uid=&username=&regions=&sets=&mains=`

Rules:
- `weaponId` is the canonical weapon selector.
- `track` is the canonical playstyle selector.
- Both `weaponId` and `track` are always present in the canonical URL, including the default board.
- Legacy `weaponIndex` is accepted as input only and rewritten away.

## Frontend State

- SSR prefetch seeds the exact current URL for:
  - `/builds`
  - `/leaderboards`
  - `/leaderboards/[characterId]`
- Client revalidation is diff-based and skips state updates when the response signature is unchanged.
- Leaderboard expansion fetches detail on demand instead of paying for full `buildState` in the base list query.
- Move breakdown and substat-upgrades are then fetched independently from inside the expanded row, only when the user opens those sections.
- Substat-upgrades currently project damage only. They do not return or infer hypothetical `globalRank`.

## Current Open Work

- If projected leaderboard rank is desired for substat upgrades, add a backend endpoint that accepts one or more hypothetical board damage values and returns absolute rank on the current `weaponId + track` board.
- Keep docs aligned as the expanded leaderboard UI grows.

## No Longer Accurate From Older Notes

These older assumptions are obsolete:
- `weaponIndex` as the canonical leaderboard route key
- leaderboard rows always including `buildState`
- `globalRank` being tied to current display sort
- `/build` rows carrying leaderboard-only fields
