# WuWaBuilds Frontend

Next.js App Router frontend for [wuwa.build](https://wuwa.build), a Wuthering Waves build creator and leaderboard.

**Stack**: Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Motion (`motion` on npm)

For full technical context, see [AGENTS.md](./AGENTS.md).

---

## Status Snapshot (June 7, 2026)

- Core routes: `/`, `/edit`, `/import`, `/saves`, `/builds`, `/leaderboards`, `/leaderboards/[characterId]`, `/profile/[uid]`, `/characters/[id]`, `/weapons/[id]`, `/changelog`, `/tos`, `/privacy`.
- **Home (`/`)** uses ISR (`revalidate = 300`) and server-prefetched LB stats. **`/builds`** is `force-static` with a server-prefetched default build page, then client-side query changes/revalidation go through `/api/lb/*`. **`/leaderboards/[characterId]`** is `force-dynamic`: it server-prefetches the first board payload, canonicalizes the incoming query string against the returned weapon/track config and `redirect()`s to it, then keeps URL state in sync on the client. **`/leaderboards`** prefetches overview data server-side and also keeps an overview cache on the client.
- `/import` OCR flow is live with leaderboard upload and screenshot-backed scan issue reports.
- Build expansion shows move breakdown, substat upgrade tiers, and leaderboard standings across all weapon × track boards. `/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]` share row expansion/detail-loading primitives, while the character leaderboard keeps its own damage-board, dedupe, and ghost-build semantics.
- Root layout includes Vercel Analytics, Google Analytics in production, and PostHog initialization via `instrumentation-client.ts`.
- Leaderboard API is the Go service documented in [`../lb/AGENTS.md`](../lb/AGENTS.md).

---

## Features

- **Build Editor** (`/edit`) — Full character build creator with real-time stat calculations, drag-to-reposition splash art, weapon rank passives, forte node bonuses, echo set summaries, CV tiers, and downloadable build card export.
- **OCR Import** (`/import`) — Upload a 1920×1080 screenshot; frontend crops into regions and sends each in parallel to the OCR backend. Supports character, weapon, echoes, forte, sequences, watermark extraction, and inline OCR issue reporting with screenshot-backed diagnostics.
- **Build Browser** (`/builds`) — Paginated build listing with filters (character, weapon, echo sets, echo mains, UID/username search) and sort by CV, damage, timestamp, or individual stats.
- **Profiles** (`/profile/[uid]`) — Player-centric history view for all public leaderboard builds under one UID, backed by `/profile/{uid}` metadata and `/profile/{uid}/builds` rows from the LB service.
- **Local Saves** (`/saves`) — Save builds to localStorage with auto-migration from legacy save formats.
- **Multi-Language** — 10 languages: English, Japanese, Korean, Chinese (Simplified/Traditional), German, Spanish, French, Thai, Ukrainian.

---

## Architecture

### State Management

Context-based with a lightweight root layout plus a shared game-data layout:

```
RootProviders (`app/layout.tsx`)
└── LanguageProvider

ToolProviders (`app/(game)/layout.tsx`)
└── GameDataProvider       ← fetches and caches 8 JSON files client-side for tool routes only
    └── ToastProvider

EditorProviders (nested on `/edit`, `/characters/[id]`, `/weapons/[id]`)
└── BuildProvider          ← current build state (character, weapon, echoes, forte, watermark)
    └── StatsProvider      ← derived stats + CV (memoized from build + game data)
```

- `GameDataContext` — Fetches and caches the 8 game-data JSON files (Characters, Echoes, Weapons, EchoStats, Stats, Fetters, CharacterCurve, LevelCurve) on first tool-route mount, then reuses a module-level cache across the session.
- `BuildContext` — Reducer-based state for the active build. Auto-saves draft to localStorage.
- `StatsContext` — Derives all calculated stats (HP, ATK, DEF, DMG boosts, CV) from build + game data.
- `LanguageContext` — i18n language selection persisted to localStorage.
- `ToastContext` — Queue-based transient feedback (success/error/warning/info).

### API Integration

- **Leaderboard**: client code calls the generic Next `/api/lb/*` proxy, which forwards any LB child path to the Go LB with `X-Internal-Key`.
- **Leaderboard SSR prefetch**: server components use `lib/lbServer.ts` to call `LB_URL` directly with `X-Internal-Key` and `next: { revalidate: 300 }`; client components must not import `lbServer.ts`.
- **OCR**: `/api/ocr` proxies to `API_URL` (production typically points at `https://ocr.wuwabuilds.moe`) with `X-OCR-Region`, plus `X-Internal-Key` and forwarded client IP when configured.
- **Build submission**: `POST /build` is wired — `/import` sends canonical `buildState` when the `Upload to Leaderboard` toggle is enabled.
- **Training image upload**: `/import` can upload the full screenshot to R2 through `POST /api/upload-training`.
- **OCR issue reporting**: `/import` can submit screenshot-linked JSON reports to R2 via `POST /api/report-ocr-issue` for manual review.
- **Production console stripping**: `next.config.ts` removes `console.log` and similar calls in production, while preserving `console.error` and `console.warn`.

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

Runs ESLint and `tsc --noEmit`. `npm run build` runs the same `lint` step before `next build`. There is no `npm test` script in this package yet.

---

## Environment Variables

Use `.env.example` as a template for local `.env` (not committed).

| Variable | Required | Description |
|----------|----------|-------------|
| `LB_URL` | Yes | Server-side Go leaderboard backend URL used by the `/api/lb/*` proxy |
| `API_URL` | Yes | Server-side OCR backend base URL (dev default in code is `http://localhost:5000`) |
| `INTERNAL_API_KEY` | Yes | Shared secret used by the `/api/ocr` and `/api/lb/*` proxies |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog analytics key |
| `CLOUDFLARE_ACCOUNT_ID` | No | R2 config for import screenshot storage and OCR issue reports |
| `R2_ACCESS_KEY_ID` | No | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | No | R2 credentials |
| `R2_BUCKET_NAME` | No | R2 bucket name |

---

## OCR Import Flow

1. Frontend receives a 1920×1080 screenshot from the user.
2. Crops into independent regions (character, weapon, forte, sequences, watermark, echo1–echo5) using fixed coordinates in `lib/import/regions.ts`.
3. Posts each region in parallel to `/api/ocr` with `X-OCR-Region` header.
4. The Next proxy forwards the request to the OCR backend and, when `INTERNAL_API_KEY` is set, includes the shared key plus the original client IP for backend rate limiting.
5. Backend returns ID-enriched OCR payloads.
6. Frontend converts analysis to `SavedState` and loads into the editor.
7. Optional: fire-and-forget full screenshot upload to R2 through `/api/upload-training`, storing a hash-deduped root-level `<hash>.jpg` object.
8. Users can report scan problems from `/import`; report JSON is stored in the same bucket under `reports/YYYY/MM/DD/<reportId>.json` and linked back to the uploaded screenshot key.

---

## Project Structure

```
wuwabuilds/
├── app/                     # Next.js App Router entrypoints and layouts
│   ├── page.tsx             # Home (/)
│   ├── layout.tsx           # Root layout (Navigation + RootProviders)
│   ├── changelog/           # Public changelog (/changelog)
│   ├── tos/                 # Terms of service
│   ├── privacy/             # Privacy policy
│   ├── (game)/              # Route group for pages that need game-data providers
│   │   ├── layout.tsx       # Shared GameDataProvider/ToastProvider boundary
│   │   ├── builds/          # Build browser (/builds)
│   │   ├── edit/            # Build editor (/edit)
│   │   ├── import/          # OCR import (/import)
│   │   ├── saves/           # Local saves (/saves)
│   │   ├── profile/         # Player profile (/profile/[uid])
│   │   ├── leaderboards/    # Leaderboards (/leaderboards, /leaderboards/[characterId])
│   │   ├── characters/      # Character-seeded editor routes (/characters/[id])
│   │   └── weapons/         # Weapon-seeded editor routes (/weapons/[id])
│   └── api/                 # API routes (lb proxy, ocr proxy, upload-training, report-ocr-issue)
├── contexts/                # React Context providers
├── components/              # Components by feature area
│   ├── leaderboards/        # All leaderboard + build browser components
│   │   ├── board/           # /builds global board (filters, results, rows)
│   │   ├── character/       # /leaderboards/[characterId] per-character page
│   │   ├── overview/        # /leaderboards overview page
│   │   └── (shared)         # BuildExpanded, BuildFiltersPanel, BuildPagination, etc.
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
├── hooks/                   # useOcrImport, useSelectedCharacter, useResolvedLeaderboardLink
├── lib/                     # Utilities and data layer
│   ├── calculations/        # Stats/CV, echo stats, weapon passives, set summaries, roll values, substat tiers, rank tier
│   ├── constants/           # Stat mappings, set bonuses, CDN URLs, skill branches, stat hover/bonuses, disabled entries
│   ├── data/                # Legacy ID mappings for migration (legacyEchoes/legacyWeapons JSON)
│   ├── import/              # OCR → SavedState conversion, crop regions, echo matching, issue reports
│   ├── server/              # Server-only helpers (R2 storage, OG image data)
│   └── text/                # Localized game text rendering
├── public/Data/             # Game data JSON (Characters, Weapons, Echoes, Stats, Curves, Fetters)
└── scripts/                 # Python data sync scripts
```

---

## Data Sync Scripts

Run from `wuwabuilds/scripts/`:

```bash
py sync_all.py                                # Full pipeline: frontend Data + backend Data + LB calc data
py sync_all.py --encore                       # Same pipeline using the experimental Encore API source
py sync_lb.py --weapons-only                  # Regenerate LB weapon bases only
py download_echo_icons.py --clean --force     # Refresh backend echo template PNGs by CDN ID
```

`sync_all.py` (default Wuthery path) runs `sync_characters`, `sync_weapons`, `sync_echoes`, `sync_fetters`,
`stat_translations`, `sync_backend`, and `sync_lb` in sequence. With `--encore` it runs `sync_encore.py`
in place of the four per-entity scripts, then the same `stat_translations` / `sync_backend` / `sync_lb`.
See [`scripts/CDN_SYNC.md`](./scripts/CDN_SYNC.md) for per-script flags and outputs and
[`docs/sync-sources.md`](./docs/sync-sources.md) for the source-comparison rationale.
