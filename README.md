# WuWaBuilds Frontend

Next.js App Router frontend for `wuwabuilds.moe`.

For full technical context, see:
- [`CLAUDE.md`](./CLAUDE.md)
- [`docs/LB_MIGRATION_STATUS.md`](./docs/LB_MIGRATION_STATUS.md)

## Status Snapshot (March 3, 2026)

- `/edit`, `/import`, and `/saves` are active in the rewrite.
- `/builds` and `/leaderboards` are still placeholder routes in the rewrite.
- Go leaderboard backend (`/lb`) is up locally with migrated legacy data verified via `curl`.
- Go LB normalization pass is complete (`make normalize`), and backend filters now expect CDN IDs.
- Node backend (`/mongo`) remains the fallback path until remaining Go parity items are closed.

## Next Two Workstreams

1. Go LB migration strategy:
   - versioned PostgreSQL schema migrations (forward-only SQL files),
   - request payload normalization in Go submit flow for legacy/variant build shapes (similar intent to frontend `legacyMigration.ts`),
   - explicit backfill/reprocess command for rule changes.
2. Rewrite `/builds` + `/leaderboards` integration:
   - LB client + typed API wrappers,
   - payload adapter and leaderboard upload wiring from `/import`,
   - `BuildEditor` "View Ranking" navigation and route data wiring.

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
python sync_all.py                    # Sync frontend Data + backend Data transforms
python download_echo_icons.py --clean --force
```

`sync_all.py` also runs `sync_backend.py`, which writes backend-friendly JSON into `../backend/Data`.
