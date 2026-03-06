# WuWaBuilds Frontend

Next.js App Router frontend for `wuwabuilds.moe`.

For full technical context, see:
- [`CLAUDE.md`](./CLAUDE.md)
- [`docs/LB_MIGRATION_STATUS.md`](./docs/LB_MIGRATION_STATUS.md)

## Status Snapshot (March 6, 2026)

- Frontend routes implemented: `/`, `/edit`, `/import`, `/saves`, `/builds`.
- Placeholder route: `/leaderboards` only.
- `/builds` is live and wired to LB `GET /build` (compact rows) and `GET /build/{id}` (detail expansion) with filters/sort/pagination + local query caching.
- `/import` OCR flow is live; `Upload to Leaderboard` toggle is present but submission wiring is still pending.
- `/edit` has a disabled `View Ranking` button pending leaderboard route integration.
- Go leaderboard backend (`/lb`) runs single-pass canonical ingest from dump (`make import DUMP=...`) with parallel workers.
- Import now does post-pass exact duplicate cleanup and duplicate reporting automatically.
- Backend filters expect canonical CDN IDs.
- Node backend (`/mongo`) remains the fallback path until remaining Go parity items are closed.

For route-by-route component and function inventory, see `CLAUDE.md` -> `Frontend Routes (Canonical, 2026-03-05)` and `Page-By-Page Function Inventory`.

## Next Workstreams

1. Go LB rollout:
   - production cutover from legacy Mongo service to `/lb`,
   - keep `--normalize-only` / `--backfill-echo` as maintenance tooling,
   - finalize leaderboard/profile ranking behavior and validation dashboards.
2. Leaderboard surface integration:
   - `/leaderboards` page implementation,
   - `/import` leaderboard submission wiring to `POST /build`,
   - `/edit` `View Ranking` action wiring.

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Environment

```env
NEXT_PUBLIC_LB_URL=https://lb.wuwabuilds.moe
NEXT_PUBLIC_API_URL=https://ocr.wuwabuilds.moe
```

## OCR Import Flow (Current)

- Frontend splits a 1920x1080 screenshot into independent regions.
- Sends each region to `/api/ocr` in parallel.
- Uses `X-OCR-Region` header for region identification.
- Backend returns ID-enriched OCR payloads (character/weapon/echo IDs).

## Data Sync Scripts

Run from `wuwabuilds/scripts/`:

```bash
python sync_all.py                                # Full pipeline: frontend Data + backend Data + LB calc data
python sync_lb.py --weapons-only                 # Regenerate LB weapon bases only
python download_echo_icons.py --clean --force    # Refresh backend echo template PNGs by CDN ID
```

`sync_all.py` runs `sync_characters`, `sync_weapons`, `sync_echoes`, `sync_fetters`,
`stat_translations`, `sync_backend`, and `sync_lb` in sequence.  
See [`scripts/CDN_SYNC.md`](./scripts/CDN_SYNC.md) for per-script flags and outputs.

`sync_lb.py` notes:
- LB base data now uses strict single `legacyId` fields (no `legacyIds` arrays).
- Legacy ID resolution is strict and name-based against `lib/data/legacyWeapons.json` and `lib/data/legacyEchoes.json`.
- Unresolved or ambiguous legacy matches fail the run with explicit errors (no fallback remapping).
