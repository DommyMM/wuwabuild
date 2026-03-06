# WuWaBuilds Frontend

Next.js App Router frontend for `wuwabuilds.moe`.

For full technical context, see:
- [`CLAUDE.md`](./CLAUDE.md)
- [`docs/LB_MIGRATION_STATUS.md`](./docs/LB_MIGRATION_STATUS.md)

## Status Snapshot (March 5, 2026)

- Frontend routes implemented: `/`, `/edit`, `/import`, `/saves`, `/builds`.
- Placeholder route: `/leaderboards` only.
- `/builds` is live and wired to LB `GET /build` with filters/sort/pagination + local query caching.
- `/import` OCR flow is live; `Upload to Leaderboard` toggle is present but submission wiring is still pending.
- `/edit` has a disabled `View Ranking` button pending leaderboard route integration.
- Go leaderboard backend (`/lb`) is up locally with migrated legacy data verified via `curl`.
- Go LB normalization pass is complete (`make normalize`), and backend filters now expect CDN IDs.
- Node backend (`/mongo`) remains the fallback path until remaining Go parity items are closed.

For route-by-route component and function inventory, see `CLAUDE.md` -> `Frontend Routes (Canonical, 2026-03-05)` and `Page-By-Page Function Inventory`.

## Next Workstreams

1. Go LB migration strategy:
   - versioned PostgreSQL schema migrations (forward-only SQL files),
   - request payload normalization in Go submit flow for legacy/variant build shapes (similar intent to frontend `legacyMigration.ts`),
   - explicit backfill/reprocess command for rule changes.
2. Leaderboard surface integration:
   - `/leaderboards` page implementation,
   - `/import` leaderboard submission wiring,
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
python sync_lb.py --weapons-only                 # Regenerate LB weapon bases + weapon ID maps only
python download_echo_icons.py --clean --force    # Refresh backend echo template PNGs by CDN ID
```

`sync_all.py` runs `sync_characters`, `sync_weapons`, `sync_echoes`, `sync_fetters`,
`stat_translations`, `sync_backend`, and `sync_lb` in sequence.  
See [`scripts/CDN_SYNC.md`](./scripts/CDN_SYNC.md) for per-script flags and outputs.
