# LB Migration Status

Snapshot date: 2026-03-03  
Purpose: Persistent cross-session source of truth for `/builds` + `/rank` integration and backend migration state.  
Recommended path: **Go LB primary, Node fallback**.

## Verified Current State

### Frontend rewrite (`/wuwabuilds`)

- `/builds` route is live and wired to LB `GET /build` with filtering/sort/pagination UI.
  - `app/builds/page.tsx`
  - `components/builds/BuildsPageClient.tsx`
- `/leaderboards` route is still placeholder.
  - `app/leaderboards/page.tsx`
- `/import` has an `Upload to Leaderboard` toggle in UI, but no submit wiring is connected.
  - `components/import/ImportPageClient.tsx`
- `BuildEditor` has disabled `View Ranking` button with TODO.
  - `components/build/BuildEditor.tsx`

### Latest verification run (March 3, 2026)

- Legacy data import into Go/PostgreSQL completed successfully.
- Local API validation confirmed with:
  - `GET /` -> `totalBuilds: 11302`
  - `GET /build?uid=901955607&characterId=1603`
- Response includes expected migrated fields (`buildState`, `stats`, `calculations`, `echoSummary`) with UUID `_id` values.
- Legacy compressed rows were normalized with `make normalize` (`cmd/migrate --normalize-only`) and now report `Legacy builds to normalize: 0` on rerun.
- Canonical echo-ID repair pass was added for already-`v2` rows and executed successfully:
  - `Canonical ID repair complete. Scanned: 11302 | Updated: 4736 | Errors: 0`
  - Legacy/icon-form echo IDs (`YZ_33018`, `315`, `305`, `145`) are now mapped to canonical CDN IDs.
  - Known hard alias in migrator: `YZ_33018`/`33018` -> `60000905`.
  - Migrator now supports deriving extra echo aliases from root `echoBases.ts` (`name + cost + elements` signature match) for remaining minor legacy IDs.
- Database spot checks after normalization:
  - `build_state ? 'c'` legacy rows: `0`
  - `build_state.version = 'v2'` rows: `11302 / 11302`
  - `echo_main_stats` empty rows: `8418`
  - `echo_sets = {}` rows: `8413`
- Query behavior after normalization:
  - legacy numeric character IDs (example `29`) no longer match
  - CDN IDs (example `1603`) should be used for API filters
- LB calc base-data sync now emits:
  - `lb/internal/calc/data/weapon_bases.json` with `params_r1` and `params_r5`
  - `lb/internal/calc/data/echo_bases.json` with echo `fetter_ids` and English `effect_en`
  - `lb/internal/calc/data/fetter_bases.json` with set piece effects (2/5 or 3)
- Railway deploy healthcheck is stabilized:
  - `GET /health` added in `lb/internal/api/routes.go` (no DB dependency).
  - `lb/railway.toml` now uses `healthcheckPath = "/health"`.
  - App can stay healthy during schema/import windows while `GET /` remains DB-backed stats.
- Frontend request behavior observed in local logs:
  - username/uid filters currently trigger one request per keystroke.
  - URL sync (`router.replace`) plus query-state effects cause repeated fetches in dev.
  - Debounce + committed-search state is required before production rollout.
- Redis decision (current scale):
  - Redis was evaluated, but deferred.
  - With ~12k builds and low data size, PostgreSQL-only path is currently acceptable.
  - Revisit Redis/materialized caching only if traffic/latency profile requires it.

### Active Node API (`/mongo`)

- Endpoints used by legacy frontend shape are available:
  - `GET /build`
  - `POST /build`
  - `GET /leaderboard`
  - `GET /leaderboard/:characterId`
  - `GET /profile/:uid`
  - `GET /build/:buildId/moves/:weaponIndex/:sequence`
  - `GET /build/:buildId/substat-upgrades`
- Source of truth for current route behavior:
  - `mongo/src/routes.ts`
  - `mongo/src/utils/queryGuard.ts`

### Go API (`/lb`) (live locally, still parity-checking)

- Go service skeleton and deploy files exist and are functional:
  - `cmd/server/main.go`
  - `cmd/migrate/main.go`
  - `internal/api/routes.go`
  - `internal/api/handlers.go`
  - `internal/db/store.go`
  - `internal/db/schema.sql`
  - `Dockerfile`
  - `railway.toml`
- Current behavior:
  - Implements core routes (`/build`, `/leaderboard`, `/profile`, `/moves`, `/substat-upgrades`).
  - Stores full payloads in PostgreSQL JSONB plus scalar stat columns.
  - Uses dynamic SQL builder in `store.go` (raw pgx), not sqlc.
  - Legacy Mongo export imports are confirmed working via `cmd/migrate` and live query checks.

### Query Layer Note (raw pgx vs sqlc)

- Current choice is raw pgx for leaderboard paths because filter construction is dynamic (variable OR/IN sets) and ranking uses `DISTINCT ON` + custom ordering.
- `sqlc` remains a future option for static CRUD-heavy paths if/when those increase.

## Plan-vs-Implementation Gap Matrix

Comparison baseline: `mongo/MIGRATION.md` target architecture vs current `lb` implementation.

| Area | `mongo/MIGRATION.md` target | Current `lb` code (verified) | Impact | Status / Next action |
|---|---|---|---|---|
| Ranking semantics | Global + filtered rank from SQL window functions (`RANK()`) over per-player best rows (`DISTINCT ON uid`) | `GetLeaderboard` computes `filteredRank` after `DISTINCT ON uid`, but `globalRank` uses `CountDamageAbove` over all builds (approximate, not per-player best and not tie-aware). Also only filled for `sort=damage` when damage > 0. | Rank numbers can diverge from intended semantics and from MIGRATION expectations. | Backend fix required before Go LB is canonical rank source. |
| Payload compatibility | Preserve frontend-compatible shape while migration proceeds | Route shapes are close (`_id`, `buildState`, `stats`, `echoSummary`, ranking fields), but `SubmitBuild` expects compressed stat keys in `stats.v` (`CR`, `CD`, etc.) and does not normalize rewrite-native payloads. | Rewrite frontend cannot post directly without adapter/compression layer. | Frontend adapter required immediately; backend normalization optional improvement. |
| Calculations on submit | `POST /build` validates and runs calc engine in backend | `SubmitBuild` stores provided `calculations` raw; no backend recalculation is executed in current path. Missing calculations default to `[]`. | Damage/rank can be zero or stale if client does not send computed calculations. | Backend decision: integrate calc engine in submit path or enforce precomputed client contract. |
| Echo summary consistency | Canonical `echoSummary` with stable filtering behavior | If client omits `echoSummary`, fallback generation in `SubmitBuild` creates `mainStats` entries with `statType` only (no `cost`). | Echo main-stat filters may be incomplete/inaccurate in Go path unless client supplies full summary. | Backend fix needed for reliable filter parity. |
| Echo filter contract parity | Frontend and backend use equivalent echo filter representations | Frontend currently sends echo set IDs/counts and short stat codes; backend normalized data/query behavior relies on element-keyed sets and full stat labels. | Filters can appear "working" syntactically but return partial/incorrect matches. | Add explicit frontend->backend transform for `echoSets`/`echoMains` or align backend parser to numeric/code inputs. |
| Dedupe behavior | Upsert/dedupe by player+character+echo fingerprint (migration plan intent) | `UpsertBuild` conflict key is `mongo_id` partial unique index; normal frontend submissions use empty `mongo_id`, so dedupe is effectively not applied for those writes. | Duplicate build rows likely under regular traffic. | Backend fix required (new uniqueness strategy and upsert rule). |
| Sequence / weapon-index handling | Support sequence-aware leaderboard semantics and migration-compatible query behavior | `parseSequence` accepts only `s0..s6` (no style suffix), `parseWeaponIndex` clamps `0..9`. Damage sort expression reads `calculations->idx->seq->damage`. | Style-specific sequence keys and extended sequence variants are currently unsupported. | Decide whether style suffix support is needed before rewrite rank UI ships. |

## API Compatibility Notes

Canonical frontend needs for rewrite `/builds` and `/rank`:

### Required endpoints

- `GET /build` with paging/sorting/filtering (`characterId`, `weaponId`, `echoSets`, `echoMains`, `region`, `uid`, `username`).
- `GET /leaderboard` overview for character list.
- `GET /leaderboard/:characterId` with `weaponIndex`, `sequence`, filtering, and pagination.
- `GET /build/:buildId/moves/:weaponIndex/:sequence`.
- `GET /build/:buildId/substat-upgrades`.
- `POST /build` for import/editor upload path.
- `GET /profile/:uid` for profile compatibility.

### Required response fields (rewrite UI contract)

- Build list and leaderboard rows need:
  - `_id`
  - `buildState` (`c`, `w`, `e`, `m`)
  - `stats` (selected row stats map)
  - `cv`, `cvPenalty`, `finalCV`
  - `timestamp`
  - `echoSummary`
- Leaderboard row additionally needs:
  - `damage`
  - `filteredRank`
  - `globalRank`

### `POST /build` compatibility expectation

- Current Go path expects a payload compatible with legacy compressed structure:
  - `buildState` compressed shape
  - `stats.v` compressed stat keys (`CR`, `CD`, `A`, etc.)
  - `cv`, `cvPenalty`, `finalCV`
  - `calculations` strongly recommended (otherwise damage-based ranking is not meaningful)
- Rewrite frontend currently stores a flat `SavedState`; adapter layer is required to serialize into LB payload format.

## Public APIs / Interfaces / Types (Documentation Changes)

1. Runtime API/type changes in this phase: **none** (documentation-only snapshot).
2. Canonical rewrite integration contract is documented in this file:
   - required endpoints for `/builds` and `/leaderboards`
   - required row/request fields, including leaderboard ranking fields
   - `POST /build` compatibility expectations for payload shape
3. Contract deltas are explicitly tracked against:
   - intended migration target (`mongo/MIGRATION.md`)
   - currently implemented Go behavior (`lb/internal/...`)

## Decision Gates

### Gate A: "Frontend can target Go LB now"

All criteria should be met:

1. `globalRank` semantics aligned with per-player best + tie-aware ranking.
2. Dedupe/upsert logic defined for normal frontend submissions (not only `mongo_id` imports).
3. `POST /build` contract finalized:
   - backend calculates damage, or
   - frontend must provide calculations and validation is explicit.
4. Echo filters parity confirmed (`echo_sets` + `echo_main_stats` behavior).
5. Sequence/weapon-index behavior confirmed for intended rank UI.

### Gate B: "Use Node fallback temporarily"

Use `/mongo` as serving backend if any of the following is true:

1. Go rank semantics are still approximate for `globalRank`.
2. Go dedupe path is unresolved for normal submissions.
3. Go `POST /build` cannot guarantee reliable `damage` population.
4. Critical frontend filters or row fields are missing/incompatible.

## Next Implementation Tracks

### Track 1: Go LB migration policy

1. Adopt versioned forward-only SQL migrations for schema evolution (keep `schema.sql` as bootstrap baseline).
2. Add payload normalization in submit flow for legacy/variant shapes (same migration intent as frontend `legacyMigration.ts` pattern).
3. Add a backfill/reprocess command for existing rows when normalization or calculation rules change.

### Track 2: Rewrite `/builds` + `/leaderboards` setup

1. Build LB client module and typed endpoint contracts in rewrite frontend.
2. Add payload adapter from rewrite state to LB submit shape.
3. Wire import leaderboard toggle to actual submit behavior.
4. Enable `BuildEditor` "View Ranking" navigation logic.
5. Implement `/builds` and `/leaderboards` fetch/filter/pagination UI data flows.

## Execution Backlog (Next Step)

### Backend tasks (Go path)

1. Implement exact global/filtered rank query semantics from migration spec.
2. Replace `mongo_id`-only conflict rule with runtime dedupe key strategy.
3. Finalize `POST /build` calculation source of truth (server-side vs enforced client-side).
4. Normalize/compute `echo_main_stats` with cost when missing.
5. Finalize echo-filter input contract (`echoSets`/`echoMains`) so frontend params map exactly to DB query semantics.
6. Confirm sequence parsing policy (`s0..s6` only vs style suffix support).
7. Validate parity against Node endpoints for top rows and move/substat detail.

### Frontend tasks (required regardless of backend choice)

1. Add LB client module in rewrite (base URL, typed request/response wrappers).
2. Add payload adapter from rewrite `SavedState` + computed stats to LB compressed payload.
3. Wire import toggle (`Upload to Leaderboard`) to actual conditional submit flow.
4. Wire `BuildEditor` `View Ranking` button to character/weapon/sequence rank route.
5. Implement `/builds` page data flow (filters, sort, pagination).
6. Implement `/leaderboards` overview + character detail page data flow.
7. Add debounce (250-400ms) and "committed search" behavior for username/uid before issuing LB fetches.
8. Reduce duplicate fetches by separating URL sync from fetch trigger or skipping no-op `router.replace`.
9. Add backend-mode flag/fallback strategy (`Go primary`, `Node fallback`) for rollout safety.

## Operational Commands

### Prerequisite

Run schema before using Go API:

```bash
psql "$DATABASE_URL" -f lb/internal/db/schema.sql
```

### Migrate Mongo export to Postgres

```bash
cd lb
DATABASE_URL="postgres://..." go run ./cmd/migrate ../../mongo/WuwaBuilds.builds.json
```

Or with built binary:

```bash
cd lb
go build -o migrate ./cmd/migrate
DATABASE_URL="postgres://..." ./migrate ../mongo/WuwaBuilds.builds.json
```

### Run Go API locally

```bash
cd lb
DATABASE_URL="postgres://..." PORT=8080 go run ./cmd/server
```

Or with built binary:

```bash
cd lb
go build -o lb ./cmd/server
DATABASE_URL="postgres://..." PORT=8080 ./lb
```

Required env:

- `DATABASE_URL` (required)
- `PORT` (optional, defaults to `8080`)

## Validation and Review Scenarios

1. New engineer opens `wuwabuilds/CLAUDE.md`.
   - Expected: sees current LB reality immediately and link to this doc.
2. Engineer planning rewrite `/builds` implementation opens this file.
   - Expected: can choose backend path and implementation tasks without replaying session history.
3. Backend engineer checks cutover readiness.
   - Expected: gap matrix identifies blockers vs ready items.
4. Cross-session continuity check.
   - Expected: major findings and backend status remain durable and date-pinned.

## Assumptions and Defaults

1. Default doc strategy: `CLAUDE.md` + dedicated status doc.
2. Default technical direction: **Go LB primary, Node fallback**.
3. Gap reporting is explicit and mandatory before cutover.
4. Snapshot is point-in-time and pinned to **March 3, 2026**.
5. Redis is intentionally deferred at current dataset/traffic scale.
6. Echo ID canonicalization can be derived from legacy/icon identifiers and patched during migration normalization.

## Risks

1. Incorrect `globalRank` semantics can mislead users and invalidate ranking trust.
2. Missing/empty `calculations` on submit can silently produce zero/invalid damage ordering.
3. Current dedupe path can accumulate duplicates under normal frontend usage.
4. Partial fallback echo summary can degrade echo main-stat filtering accuracy (current snapshot: `8418/11302` rows have empty `echo_main_stats`).
5. Sequence-style mismatch can block or distort advanced leaderboard tabs/filters.
6. Contract mismatch between rewrite state and LB payload can cause failed submissions or bad stored rows.
7. Per-keystroke filter fetches (username/uid) can create avoidable load and noisy user experience without debounce.

## Change Log

- 2026-03-03: Initial snapshot created. Captures rewrite frontend gaps, active Node API contract, current Go LB implementation, migration gap matrix, and rollout gates.
- 2026-03-03: Added verified local import/runtime note (`/build` curl success), plus explicit two-track plan for Go migration policy and rewrite `/builds` + `/leaderboards` integration.
- 2026-03-03: Added normalize-stage verification (`make normalize` idempotent, `11302` total rows, `0` legacy rows) and post-normalization filter caveat (CDN IDs required; many empty echo summary fields pending cleanup).
- 2026-03-03: Added echo/fetter base-data sync status (`fetter_bases.json`, echo skill descriptions, and weapon R1/R5 params in generated LB data).
- 2026-03-03: Added Railway healthcheck stabilization note (`/health` endpoint + `healthcheckPath=/health`) and deployment behavior rationale.
- 2026-03-03: Added canonical echo-ID repair result (`11302` scanned, `4736` updated, `0` errors), including legacy/icon ID alias handling.
- 2026-03-03: Added frontend request-churn finding (username/uid per-keystroke fetches) and explicit debounce/URL-sync backlog items.
- 2026-03-03: Added Redis decision note: deferred for current ~12k-build scale, revisit only if traffic/latency demands.
