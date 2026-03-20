# Frontend Data Pipeline and Ops

This doc consolidates OCR flow, sync scripts, env vars, and day-to-day commands for `wuwabuilds/`.

## OCR Import Flow

1. User uploads screenshot.
2. Frontend crops fixed OCR regions.
3. Crops are sent in parallel through `/api/ocr` with region headers.
4. Next proxy forwards to OCR backend.
5. OCR payloads are converted into saved build state.
6. Optional leaderboard upload submits canonical build payload.
7. Optional screenshot/report artifacts are stored in R2.

## Data Sync Scripts

Run from `scripts/`:

```bash
py sync_all.py
py sync_lb.py --weapons-only
py download_echo_icons.py --clean --force
```

Primary outputs include:
- `public/Data/*.json`
- backend data outputs
- leaderboard calc data outputs

See `scripts/CDN_SYNC.md` for script-level flags and details.

## Environment Variables

Required:
- `LB_URL`
- `API_URL`
- `INTERNAL_API_KEY`

Optional:
- `NEXT_PUBLIC_GA_TRACKING_ID` (production may use a fixed GA id in `app/layout.tsx` instead)
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
