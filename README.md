# WuWaBuilds Frontend

Next.js App Router frontend for `wuwabuilds.moe`.

For full internal architecture notes, see [`CLAUDE.md`](./CLAUDE.md).

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

## OCR Import Flow (Current)

- Frontend splits a 1920x1080 screenshot into independent regions
- Sends each region to `/api/ocr` in parallel
- Uses `X-OCR-Region` header for region identification
- Backend returns ID-enriched OCR payloads (character/weapon/echo IDs)

## Data Sync Scripts

Run from `wuwabuilds/scripts/`:

```bash
python sync_all.py                    # Sync frontend Data + backend Data transforms
python download_echo_icons.py --clean --force
```

`sync_all.py` also runs `sync_backend.py`, which writes backend-friendly JSON into `../backend/Data`.

