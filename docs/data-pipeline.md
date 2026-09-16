# Data Pipeline

OCR import flow, the data sync scripts and the image mirror. Environment variables and commands
are in the repo `README.md`.

## OCR import flow

1. The browser validates the selected JPEG or PNG size (5 MiB maximum) and dimensions, then sends the
   original `File` once as a multipart OCR request.
2. The Cloudflare gateway injects the internal key and streams that request to the OCR backend.
3. The backend detects the media type from magic bytes, hashes the exact bytes into the canonical root
   R2 key `<64 lowercase SHA-256 hex>.<jpg|png>`, and runs the upload-time card-layout integrity guard.
   High-confidence wrong-layout or manipulated inputs are rejected before R2 storage and OCR.
4. For accepted cards, R2 persistence starts alongside region recognition while NDJSON region progress
   keeps streaming to the browser.
5. `meta.sourceImageKey` and `done.sourceImageKey` carry the deterministic object name immediately.
   If OCR finishes before R2, `done.storage.result` is `pending` and the backend upload continues
   without holding the UI open. `trainingImageKey` is non-null only once R2 confirms the object.
6. OCR analysis converts into saved build state. The optimistic source key and canonical `scanId` go
   fire-and-forget to `POST /build/link-image` for fill-only historical matching, so a later re-upload
   of identical bytes heals the same content-addressed key. Expected misses are silent. See lb
   `docs/image-linking.md`.
7. Optional leaderboard submission sends the canonical build payload, optimistic `sourceImageKey` and
   `scanId` together.
8. Issue reports go through the same gateway to backend-owned `POST /api/report-ocr-issue`. They use
   only the confirmed `trainingImageKey`, and while storage is pending or failed they send the original
   `File` instead, so a report can never reference a missing object.

The frontend holds no R2 credentials and has no storage routes. Accepted images and the report fallback
both preserve the original bytes under the same root-level 64-hex key contract. No path recompresses
through canvas or Base64.

After a successful submission the confirmation resolves the character against the cached leaderboard
overview. Characters with a board open the submitted leaderboard row, characters without one open the
owner's profile with `buildId` so the uploaded build is expanded. The destination waits for overview
resolution rather than offering a known-empty leaderboard route.

Blank weapon panels are a known export defect on some newer characters. The backend reports those as an
empty weapon and `lib/import/convert.ts` fills the signature weapon only for those explicit character IDs
(Lucilla, Rebecca, Lucy). This is part of the import contract: a wrong non-empty OCR weapon must not be
overwritten.

`/bulk-import` uses the same endpoint and paces all local workers to the public 10-starts-per-minute
per-IP budget. A 429 honors `Retry-After` and retries with a fresh admission slot rather than dropping
the queue item.

Issue reporting fails closed when storage is unavailable, while the import flow itself stays usable.

## Data sync scripts

Run from `scripts/`:

```bash
py sync_all.py                                     # default Wuthery pipeline
py sync_all.py --encore                            # faster early-patch merge from Encore
py sync_lb.py --weapons-only
py sync_backend.py --force-echo-icons              # refresh backend echo SIFT templates by CDN ID
py sync_characters_encore.py --id 1608 --compare   # one-character diff
py mirror_images_to_public.py --apply              # mirror image URLs into public/assets/, rewrite JSON
```

Outputs are `public/Data/*.json`, `public/assets/**`, the leaderboard calc data, and `backend/Data`.
`sync_backend.py` is the single source of truth for `backend/Data`: the OCR JSON schema plus every SIFT
template (elements, characters, weapons, echoes) as id-keyed WebP, gated per set by `--skip-*-icons`
and `--force-*-icons`.

Per-script flags and transforms are in `../scripts/CDN_SYNC.md`. The Wuthery and Encore trade-off is in
`sync-sources.md`.

## Image mirror

`mirror_images_to_public.py` runs inside `sync_all.py` right after the primary data sync and before
`sync_backend.py`, so both `public/Data/*.json` and the backend's echo-template fetch (which reads icon
refs out of the already-synced JSON) end up pointing at site-relative `/assets/...` paths instead of
Wuthery or Encore. Images are committed and deploy with the site, so the browser never touches an
upstream CDN at runtime and an outage can only break a fresh sync, never the live site.

- Everything is stored as WebP. Encore sources pass through byte for byte, Wuthery PNGs convert locally
  at quality 90, measured equal or better than Encore's own encodes and smaller, with an Encore-mapped
  URL as automatic fallback when Wuthery will not serve a file.
- No manifest. A file present under `public/assets/` is already mirrored, so re-runs fetch only what is
  missing.
- The JSON rewrite is all-or-nothing, happening only once every reference resolves to a file on disk, so
  a partial or `--limit` run can never publish JSON pointing at missing files.
- UI-chrome images hardcoded in `app/globals.css`, `components/forte/` and `lib/paths.ts` are mirrored
  through the script's `EXTRA_ASSETS` list. Keep those code refs and the list in sync.
- `/assets/` gets a deliberately short edge TTL in `next.config.ts` (1 day plus SWR, against 1 year for
  `/Data/*.json`) because Cloudflare edge-caches images and a Vercel deploy does not purge Cloudflare.

OG image routes (`fetchArt` in `lib/server/og.tsx`) read `/assets/...` art from disk in dev and fall back
to fetching `https://wuwa.build/assets/...` on Vercel, where function bundles exclude `public/`.
