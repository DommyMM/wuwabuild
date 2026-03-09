# WuWaBuilds Frontend

Next.js App Router frontend for [wuwabuilds.moe](https://wuwabuilds.moe) — a Wuthering Waves build creator and leaderboard.

**Stack**: Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Framer Motion

For full technical context, see:
- [`CLAUDE.md`](./CLAUDE.md)
- [`docs/LB_MIGRATION_STATUS.md`](./docs/LB_MIGRATION_STATUS.md)

---

## Status Snapshot (March 9, 2026)

- All core routes implemented: `/`, `/edit`, `/import`, `/saves`, `/builds`, `/leaderboards`, `/leaderboards/[characterId]`.
- `/builds` is live and wired to LB `GET /build` with filters/sort/pagination + local query caching + SSR prefetch (2-min ISR, silent revalidation on mount).
- `/leaderboards` overview and `/leaderboards/[characterId]` per-character pages are live, also SSR-prefetched.
- `/import` OCR flow is live; `Upload to Leaderboard` toggle submits canonical `buildState` via `POST /api/lb/build`.
- `/edit` `View Ranking` button routes to the selected character leaderboard page.
- Go leaderboard backend (`/lb`) runs single-pass canonical ingest with 9 registered character damage configs.
- Node backend (`/mongo`) remains the fallback path until remaining Go parity items are closed.
- DB index suite fixed: sort indexes now use `NULLS LAST`; dead GIN indexes removed; stat sort indexes added.

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

Context-based with a lightweight root layout plus a shared tools layout:

```
RootProviders (`app/layout.tsx`)
└── LanguageProvider

ToolProviders (`app/(tools)/layout.tsx`)
└── GameDataProvider       ← fetches and caches 9 JSON files client-side for tool routes only
    └── ToastProvider

EditorProviders (nested on `/edit`, `/characters/[id]`, `/weapons/[id]`)
└── BuildProvider          ← current build state (character, weapon, echoes, forte, watermark)
    └── StatsProvider      ← derived stats + CV (memoized from build + game data)
```

- `GameDataContext` — Fetches and caches Characters, Weapons, Echoes, Stats, Fetters, Curves on first tool-route mount, then reuses a module-level cache across the session.
- `BuildContext` — Reducer-based state for the active build. Auto-saves draft to localStorage.
- `StatsContext` — Derives all calculated stats (HP, ATK, DEF, DMG boosts, CV) from build + game data.
- `LanguageContext` — i18n language selection persisted to localStorage.
- `ToastContext` — Queue-based transient feedback (success/error/warning/info).

### API Integration

- **Leaderboard**: client code calls the generic Next `/api/lb/*` proxy, which forwards any LB child path to the Go LB with `X-Internal-Key`.
- **OCR**: `/api/ocr` proxies to `https://ocr.wuwabuilds.moe/api/ocr` with `X-OCR-Region`, plus `X-Internal-Key` and forwarded client IP when configured.
- **Build submission**: `POST /build` is wired — `/import` sends canonical `buildState` when the `Upload to Leaderboard` toggle is enabled.

---

## Next Workstreams

1. Go LB rollout:
   - Production cutover from legacy Mongo service to `/lb`.
   - Apply pending DB migrations to Railway (dedupe constraint, globalRank CTE, echo backfill).
2. Fine-tune `/builds` and leaderboard UX polish.

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
| `LB_URL` | Yes | Server-side Go leaderboard backend URL used by the `/api/lb/*` proxy |
| `API_URL` | Yes | Server-side OCR proxy URL |
| `INTERNAL_API_KEY` | Yes | Shared secret used by the `/api/ocr` and `/api/lb/*` proxies |
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
4. The Next proxy forwards the request to the OCR backend and, when `INTERNAL_API_KEY` is set, includes the shared key plus the original client IP for backend rate limiting.
5. Backend returns ID-enriched OCR payloads.
6. Frontend converts analysis to `SavedState` and loads into the editor.
7. Optional: fire-and-forget full screenshot upload to R2 for training data (hash-deduped).

## Leaderboard Fetch Flow

1. Client components request LB data through `/api/lb/*`.
2. The catch-all Next proxy forwards the remaining child path to the Go LB service.
3. When `INTERNAL_API_KEY` is set, the proxy includes `X-Internal-Key` so the LB service can stay private.
4. Browser code never sees the shared key or calls the LB origin directly.

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
│   ├── leaderboards/        # Leaderboard overview + per-character pages (/leaderboards, /leaderboards/[characterId])
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
