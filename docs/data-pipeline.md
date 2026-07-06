# Frontend Data Pipeline and Ops

This doc consolidates OCR flow, sync scripts, env vars, and day-to-day commands for `wuwabuilds/`.

## OCR Import Flow

1. User uploads screenshot.
2. Frontend crops fixed OCR regions.
3. Crops are sent in parallel to the OCR gateway (`ocr.wuwa.build/api/ocr`) with region headers.
4. The Cloudflare Worker injects the internal key and forwards to the OCR backend.
5. OCR payloads are converted into saved build state.
6. Optional leaderboard upload submits canonical build payload.
7. Optional full-image upload goes through `/api/upload-training` and stores a hash-deduped JPG in R2.
8. Once OCR and the training upload both finish, the raw (pre-edit) scan state plus the R2 key are sent fire-and-forget to `POST /build/link-image` so the LB service can attach the screenshot to the existing build row with that exact echo content (fill-only; independent of whether the user imports or submits). See lb `docs/image-linking.md`.
9. OCR issue reports are written through `/api/report-ocr-issue` and can either reference an existing uploaded image or upload one inline first.

## Data Sync Scripts

Run from `scripts/`:

```bash
py sync_all.py                                # Default Wuthery pipeline
py sync_all.py --encore                       # Same pipeline, Encore API source via sync_encore.py
py sync_lb.py --weapons-only
py sync_backend.py --force-echo-icons              # Refresh backend echo SIFT templates by CDN ID
py sync_characters_encore.py --id 1608 --compare   # One-character diff prototype
```

Primary outputs include:
- `public/Data/*.json`
- backend data outputs: `sync_backend.py` is the single source of truth for `backend/Data` — the OCR JSON schema plus every SIFT template (elements/characters/weapons/echoes) as id-keyed WebP (`--skip-*-icons` / `--force-*-icons` per set)
- leaderboard calc data outputs

See `scripts/CDN_SYNC.md` for script-level flags and details. For the trade-offs between Wuthery's CDN and the alternative `encore.moe` API (and the dual-mode/fallback strategy), see `sync-sources.md`.

## Environment Variables

All API traffic goes through the Cloudflare Worker gateway (private sibling `gateway/` repo), which
holds `X-Internal-Key`. Defaults target localhost for dev; production sets the
gateway hostnames:

- `NEXT_PUBLIC_LB_URL` — browser and SSR LB calls; prod `https://api.wuwa.build`, defaults to `http://localhost:8080`
- `NEXT_PUBLIC_OCR_URL` — browser OCR calls; prod `https://ocr.wuwa.build`, defaults to `http://localhost:5000`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

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
- R2-backed OCR issue reporting should fail closed when storage is not configured; the import flow itself should still remain usable.
