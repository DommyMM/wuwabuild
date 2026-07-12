# Frontend Data Pipeline and Ops

This doc consolidates OCR flow, sync scripts, env vars, and day-to-day commands for `wuwabuilds/`.

## OCR Import Flow

After a successful submission, the import confirmation resolves the character against the cached leaderboard overview. Characters with a board open the submitted leaderboard row; characters without one open the owner's profile with `buildId` so the exact uploaded build is expanded. The destination action waits for overview resolution rather than offering a known-empty leaderboard route.

1. The browser validates the selected JPEG/PNG size (5 MiB maximum) and dimensions, then sends the original `File` once as the existing multipart OCR request.
2. The Cloudflare gateway injects the internal key and streams that request to the OCR backend.
3. The backend detects the media type from magic bytes and hashes the exact bytes into the canonical root R2 key `<64 lowercase SHA-256 hex>.<jpg|png>`.
4. R2 persistence starts concurrently with region recognition, while NDJSON region progress continues streaming to the browser.
5. The final `done` event carries `scanId`, storage diagnostics, and `trainingImageKey` only when R2 confirmed the object was stored or already present. An R2 failure leaves the key null without failing usable OCR.
6. OCR analysis is converted into saved build state. A confirmed key and the same canonical `scanId` are also sent fire-and-forget to `POST /build/link-image` for fill-only historical matching. Expected misses are silent. See lb `docs/image-linking.md`.
7. Optional leaderboard submission sends the canonical build payload, confirmed `sourceImageKey`, and `scanId` together. There is no independent image promise for submit to race.
8. OCR issue reports go through the same gateway to backend-owned `POST /api/report-ocr-issue`. The browser sends bounded report JSON as one multipart field. It references the confirmed key without re-uploading the screenshot; if storage failed, the optional image field carries the original `File` bytes for the backend to identify, deduplicate, and store before writing the report.

The frontend has no R2 credentials or storage routes. Normal OCR and the explicit report fallback both preserve the original JPEG/PNG bytes and use the same root-level 64-hex key contract; no path uses canvas recompression or Base64.

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
```

Primary outputs include:
- `public/Data/*.json`
- backend data outputs: `sync_backend.py` is the single source of truth for `backend/Data` — the OCR JSON schema plus every SIFT template (elements/characters/weapons/echoes) as id-keyed WebP (`--skip-*-icons` / `--force-*-icons` per set)
- leaderboard calc data outputs

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
