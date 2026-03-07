# WuWaBuilds Frontend

Next.js App Router frontend for [wuwabuilds.moe](https://wuwabuilds.moe) — a Wuthering Waves build creator and leaderboard.

**Stack**: Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Framer Motion

For full technical context, see:
- [`CLAUDE.md`](./CLAUDE.md)
- [`docs/LB_MIGRATION_STATUS.md`](./docs/LB_MIGRATION_STATUS.md)

---

## Status Snapshot (March 7, 2026)

- All core routes implemented: `/`, `/edit`, `/import`, `/saves`, `/builds`.
- `/builds` is live and wired to LB `GET /build` (compact rows) and `GET /build/{id}` (detail expansion) with filters/sort/pagination + local query caching.
- `/import` OCR flow is live; `Upload to Leaderboard` toggle is present but submission wiring is still pending.
- `/edit` has a disabled `View Ranking` button pending leaderboard route integration.
- `/leaderboards` placeholder route exists.
- Go leaderboard backend (`/lb`) runs single-pass canonical ingest with 8 registered character damage configs.
- Node backend (`/mongo`) remains the fallback path until remaining Go parity items are closed.

---

## Features

- **Build Editor** (`/edit`) — Full character build creator with real-time stat calculations, drag-to-reposition splash art, weapon rank passives, forte node bonuses, echo set summaries, CV tiers, and downloadable build card export.
- **OCR Import** (`/import`) — Upload a 1920×1080 screenshot; frontend crops into regions and sends each in parallel to the OCR backend. Supports character, weapon, echoes, forte, sequences, and watermark extraction.
- **Build Browser** (`/builds`) — Paginated build listing with filters (character, weapon, echo sets, echo mains, UID/username search) and sort by CV, damage, timestamp, or individual stats.
- **Local Saves** (`/saves`) — Save builds to localStorage with auto-migration from legacy save formats.
- **Multi-Language** — 10 languages: English, Japanese, Korean, Chinese (Simplified/Traditional), German, Spanish, French, Thai, Ukrainian.

---

## Architecture

### State Management

Context-based with provider hierarchy in `app/layout.tsx`:

```
AppProviders
└── LanguageProvider
    └── GameDataProvider       ← loads 9 JSON files from /Data/ at startup
        └── BuildProvider      ← current build state (character, weapon, echoes, forte, watermark)
            └── StatsProvider  ← derived stats + CV (memoized from build + game data)
                └── ToastProvider
```

- `GameDataContext` — Fetches and caches Characters, Weapons, Echoes, Stats, Fetters, Curves on mount.
- `BuildContext` — Reducer-based state for the active build. Auto-saves draft to localStorage.
- `StatsContext` — Derives all calculated stats (HP, ATK, DEF, DMG boosts, CV) from build + game data.
- `LanguageContext` — i18n language selection persisted to localStorage.
- `ToastContext` — Queue-based transient feedback (success/error/warning/info).

### API Integration

- **Leaderboard**: `/builds` queries `GET https://lb.wuwabuilds.moe/build` with filters. Response normalization in `lib/lb.ts`.
- **OCR**: `/api/ocr` proxies to `https://ocr.wuwabuilds.moe/api/ocr` with `X-OCR-Region` header.
- **Build submission**: `POST /build` wiring pending.

---

## Next Workstreams

1. Go LB rollout:
   - Production cutover from legacy Mongo service to `/lb`.
   - Finalize leaderboard/profile ranking behavior.
2. Leaderboard surface integration:
   - `/leaderboards` page implementation.
   - `/import` leaderboard submission wiring to `POST /build`.
   - `/edit` `View Ranking` action wiring.

---

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

## Lint

```bash
npm run lint
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_LB_URL` | Yes | Go leaderboard backend URL |
| `NEXT_PUBLIC_API_URL` | Yes | OCR backend URL |
| `API_URL` | Yes | Server-side OCR proxy URL |
| `NEXT_PUBLIC_GA_TRACKING_ID` | No | Google Analytics tracking ID |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog analytics key |
| `CLOUDFLARE_ACCOUNT_ID` | No | R2 config for training image upload |
| `R2_ACCESS_KEY_ID` | No | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | No | R2 credentials |
| `R2_BUCKET_NAME` | No | R2 bucket name |

---

## OCR Import Flow

1. Frontend receives a 1920×1080 screenshot from the user.
2. Crops into independent regions (character, weapon, echoes, forte, watermark) using fixed coordinates.
3. Posts each region in parallel to `/api/ocr` with `X-OCR-Region` header.
4. Backend returns ID-enriched OCR payloads.
5. Frontend converts analysis to `SavedState` and loads into the editor.
6. Optional: fire-and-forget full screenshot upload to R2 for training data (hash-deduped).

---

## Project Structure

```
wuwabuilds/
├── app/                     # Next.js App Router pages
│   ├── page.tsx             # Home (/)
│   ├── builds/              # Build browser (/builds)
│   ├── edit/                # Build editor (/edit)
│   ├── import/              # OCR import (/import)
│   ├── saves/               # Local saves (/saves)
│   ├── leaderboards/        # Placeholder (/leaderboards)
│   └── api/                 # API routes (ocr proxy, upload-bucket)
├── contexts/                # React Context providers
├── components/              # Components by feature area
│   ├── build/               # /builds page (filters, results, rows)
│   ├── edit/                # /edit page (editor, action bar, card options)
│   ├── card/                # Build card display sections
│   ├── character/           # Character selector
│   ├── weapon/              # Weapon selector
│   ├── echo/                # Echo grid and panels
│   ├── forte/               # Forte skill tree
│   ├── import/              # OCR import flow
│   ├── save/                # Local saves management
│   ├── home/                # Homepage components
│   └── ui/                  # Reusable UI (Modal, Tooltip, LevelSlider, etc.)
├── hooks/                   # useOcrImport, useSelectedCharacter
├── lib/                     # Utilities and data layer
│   ├── calculations/        # CV, stat scaling, echo stats, weapon passives, set summaries
│   ├── constants/           # Stat mappings, set bonuses, CDN URLs, skill branches
│   ├── data/                # Legacy ID mappings for migration
│   ├── import/              # OCR → SavedState conversion, crop regions
│   └── text/                # Localized game text rendering
├── public/Data/             # Game data JSON (Characters, Weapons, Echoes, Stats, Curves, Fetters)
└── scripts/                 # Python data sync scripts
```

---

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
