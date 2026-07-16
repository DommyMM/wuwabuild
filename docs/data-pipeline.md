# Frontend Data Pipeline and Ops

This doc consolidates OCR flow, sync scripts, env vars, and day-to-day commands for `wuwabuilds/`.

## OCR Import Flow

After a successful submission, the import confirmation resolves the character against the cached leaderboard overview. Characters with a board open the submitted leaderboard row; characters without one open the owner's profile with `buildId` so the exact uploaded build is expanded. The destination action waits for overview resolution rather than offering a known-empty leaderboard route.

1. The browser validates the selected JPEG/PNG size (5 MiB maximum) and dimensions, then sends the original `File` once as the existing multipart OCR request.
2. The Cloudflare gateway injects the internal key and streams that request to the OCR backend.
3. The backend detects the media type from magic bytes, hashes the exact bytes into the canonical root R2 key `<64 lowercase SHA-256 hex>.<jpg|png>`, and runs the fixed upload-time card-layout integrity guard. High-confidence wrong-layout or manipulated inputs are rejected before R2 storage and OCR.
4. For accepted cards, R2 persistence starts concurrently with region recognition, while NDJSON region progress continues streaming to the browser.
5. `meta.sourceImageKey` and `done.sourceImageKey` carry the deterministic SHA-256 object name immediately. If OCR finishes before R2, `done.storage.result` is `pending` and the retained backend upload continues without holding the UI open. `trainingImageKey` remains non-null only when R2 already confirmed the object.
6. OCR analysis is converted into saved build state. The optimistic source key and canonical `scanId` are sent fire-and-forget to `POST /build/link-image` for fill-only historical matching. A later re-upload of identical bytes heals the same content-addressed key. Expected misses are silent. See lb `docs/image-linking.md`.
7. Optional leaderboard submission sends the canonical build payload, optimistic `sourceImageKey`, and `scanId` together.
8. OCR issue reports go through the same gateway to backend-owned `POST /api/report-ocr-issue`. They deliberately use only the confirmed `trainingImageKey`; while storage is pending or failed, the original `File` is sent so the report cannot reference a missing object.

The frontend has no R2 credentials or storage routes. Accepted OCR images and the explicit report fallback both preserve the original JPEG/PNG bytes and use the same root-level 64-hex key contract; no path uses canvas recompression or Base64.

The operational bulk-import page uses the same endpoint and automatically
paces all local workers to the public 10-starts-per-minute/IP budget. A 429
honors `Retry-After` and retries with a fresh admission slot instead of losing
the queue item.

## Data Sync Scripts

Run from `scripts/`:

```bash
py sync_all.py                                # Default Wuthery pipeline
py sync_all.py --encore                       # Faster early-patch merge from Encore
py sync_lb.py --weapons-only
py sync_backend.py --force-echo-icons              # Refresh backend echo SIFT templates by CDN ID
py sync_characters_encore.py --id 1608 --compare   # One-character diff prototype
py mirror_images_to_public.py --apply              # Mirror image URLs into public/assets/, rewrite JSON to /assets/...
```

Primary outputs include:
- `public/Data/*.json`
- `public/assets/**` — self-hosted WebP mirror of every image the data files (and a few hardcoded UI-chrome refs) point at
- backend data outputs: `sync_backend.py` is the single source of truth for `backend/Data` — the OCR JSON schema plus every SIFT template (elements/characters/weapons/echoes) as id-keyed WebP (`--skip-*-icons` / `--force-*-icons` per set)
- leaderboard calc data outputs

## Image Mirror (public/assets)

`mirror_images_to_public.py` runs as a step in `sync_all.py` right after the
primary data sync and before `sync_backend.py`, so both `public/Data/*.json`
and the backend's echo-template fetch (which reads icon refs out of the
already-synced JSON) end up pointing at site-relative `/assets/...` paths
instead of Wuthery/Encore. Images are committed to git and deploy with the
site — at runtime the browser never touches an upstream CDN, so a Wuthery or
Encore outage can only break a fresh sync, never the live site.

Key properties (details in the script docstring):
- Everything is stored as WebP: Encore sources pass through byte-for-byte,
  Wuthery PNGs are converted locally at quality 90 (measured equal-or-better
  than Encore's own encodes, and smaller), with an Encore-mapped URL as
  automatic fallback when Wuthery won't serve a file.
- No manifest: a file present under `public/assets/` *is* "already mirrored";
  re-runs only fetch what's missing.
- The JSON rewrite is all-or-nothing — it only happens once every reference
  resolves to a file on disk, so partial/`--limit` runs can never publish
  JSONs pointing at missing files.
- UI-chrome images hardcoded in code (`app/globals.css`,
  `components/forte/*`, `lib/paths.ts`) are mirrored via the script's
  `EXTRA_ASSETS` list; keep those code refs and the list in sync.
- `/assets/` gets a deliberately short edge TTL in `next.config.ts` (1 day +
  SWR, vs 1 year for `/Data/*.json`) because Cloudflare edge-caches images
  and a Vercel deploy does not purge Cloudflare.

OG-image routes (`lib/server/og.tsx` `fetchArt`) read `/assets/...` art from
disk in dev and fall back to fetching `https://wuwa.build/assets/...` on
Vercel, where function bundles don't include `public/`.

See `scripts/CDN_SYNC.md` for script-level flags and details. For the trade-offs between Wuthery's CDN and the alternative `encore.moe` API (and the dual-source catch-up strategy), see `sync-sources.md`.

## Environment Variables

All API traffic goes through the Cloudflare Worker gateway (private sibling `gateway/` repo), which
holds `X-Internal-Key`. Defaults target localhost for dev; production sets the
gateway hostnames:

- `NEXT_PUBLIC_LB_URL` — browser and SSR LB calls; prod `https://api.wuwa.build`, defaults to `http://localhost:8080`
- `NEXT_PUBLIC_OCR_URL` — browser OCR calls; prod `https://ocr.wuwa.build`, defaults to `http://localhost:5000`
- `NEXT_PUBLIC_POSTHOG_KEY`

## Frontend Commands

Run from `wuwabuilds/`:

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## Safety Notes

- Keep server-only env usage inside server boundaries and API routes.
- Do not import server-only LB helpers into client components.
- Backend-owned OCR issue reporting fails closed when storage is unavailable; the import flow itself remains usable.
