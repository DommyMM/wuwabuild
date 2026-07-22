# WuWaBuilds Frontend

Next.js App Router frontend for [wuwa.build](https://wuwa.build), a Wuthering Waves build creator and leaderboard.

**Stack**: Next.js 16 · React 19 · TypeScript 6 · Tailwind CSS 4 · Motion (`motion` on npm)

For repository routing, see [AGENTS.md](./AGENTS.md). For technical context,
start with [docs/README.md](./docs/README.md).

---

## Status Snapshot (July 21, 2026)

- Core routes: `/`, `/edit`, `/import`, `/bulk-import`, `/saves`, `/builds`, `/leaderboards`, `/leaderboards/[characterId]`, `/profile/[uid]`, `/profiles`, `/characters/[id]`, `/weapons/[id]`, `/changelog`, `/tos`, `/privacy`.
- **Home (`/`)** uses ISR (`revalidate = 300`) and server-prefetched LB stats. **`/builds`** is `force-static` with a server-prefetched default build page, then client-side query changes/revalidation go through the LB gateway. **`/leaderboards/[characterId]`** is `force-dynamic`: it server-prefetches the first board payload, canonicalizes the incoming query string against the returned weapon/track config and `redirect()`s to it, then keeps URL state in sync on the client. **`/leaderboards`** prefetches overview data server-side and also keeps an overview cache on the client.
- `/import` OCR flow is live with leaderboard upload and screenshot-backed scan issue reports.
- Build expansion shows move breakdown, substat upgrade tiers, and leaderboard standings across all weapon × track boards. `/builds`, `/profile/[uid]`, and `/leaderboards/[characterId]` share row expansion/detail-loading primitives, while the character leaderboard keeps its own damage-board, dedupe, and ghost-build semantics.
- Root layout includes Vercel Analytics, Google Analytics in production, and PostHog initialization via `instrumentation-client.ts`.
- Leaderboard API is the Go service documented in [`../lb/AGENTS.md`](../lb/AGENTS.md).

---

## Features

- **Build Editor** (`/edit`) — Full character build creator with real-time stat calculations, drag-to-reposition splash art, weapon rank passives, forte node bonuses, echo set summaries, CV tiers, and downloadable build card export.
- **OCR Import** (`/import`) — Upload a 1920×1080 screenshot; the frontend posts the original image to the OCR backend and streams per-region results back as they finish. Supports character, weapon, echoes, forte, sequences, watermark extraction, and inline OCR issue reporting with screenshot-backed diagnostics.
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

- **Leaderboard**: browser and SSR calls use `NEXT_PUBLIC_LB_URL`, which points at the Cloudflare gateway (`api.wuwa.build` in production). The Worker injects `X-Internal-Key` before forwarding to Railway.
- **Leaderboard SSR prefetch**: server components use `lib/lbServer.ts` with `next: { revalidate: 300 }`; client components must not import `lbServer.ts`.
- **OCR**: browser code posts the original image to `NEXT_PUBLIC_OCR_URL/api/ocr` (`ocr.wuwa.build` in production). The endpoint always streams `application/x-ndjson`; `/import` uses region events for live progress, while `/bulk-import` reads the final `done` payload.
- **Build submission**: `POST /build` is wired — `/import` sends canonical `buildState` when the `Upload to Leaderboard` toggle is enabled.
- **OCR image persistence**: the OCR backend stores the original screenshot once and returns its confirmed content-addressed key.
- **OCR issue reporting**: `/import` sends bounded multipart reports through the gateway to backend-owned `POST /api/report-ocr-issue`; the original file is attached only when OCR storage failed.
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

Set these in a local `.env` (not committed).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_LB_URL` | Yes in prod | Cloudflare gateway origin for leaderboard reads/writes; local default is `http://localhost:8080` |
| `NEXT_PUBLIC_OCR_URL` | Yes in prod | Cloudflare gateway origin for OCR; local default is `http://localhost:5000` |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog analytics key |

---

## OCR Import Flow

1. Frontend receives a 1920×1080 screenshot from the user.
2. Posts the original file as `multipart/form-data` to `NEXT_PUBLIC_OCR_URL/api/ocr`.
3. The backend streams `meta`, per-`region`, and final `done` events keyed by `character`, `watermark`, `forte`, `sequences`, `weapon`, and `echo1`–`echo5`.
4. The Cloudflare Worker injects the internal key, forwards client IP, and passes the streaming body through from Railway.
5. Backend decodes once, crops server-side, fans recognition out through its worker pool, and returns ID-enriched OCR payloads.
6. Frontend updates the results UI as each region event arrives, then converts the final analysis to `SavedState` and loads into the editor.
7. Backend-owned R2 persistence stores the exact screenshot bytes once under a hash-deduped root-level key and confirms that key only in the final event.
8. Users can report scan problems from `/import`; the gateway forwards bounded multipart metadata and, only when needed, the original screenshot fallback to the backend. Report JSON is stored under `reports/YYYY/MM/DD/<reportId>.json` and linked to the confirmed image key.

Blank weapon panels are a known export issue for some newer characters. The OCR
backend should report those as an empty weapon, and `lib/import/convert.ts`
fills the signature weapon fallback only for those explicit character IDs
(Lucilla, Rebecca, Lucy). This fallback is part of the import contract; a wrong
non-empty OCR weapon should not be overwritten.

---

## Project Structure

```
wuwabuilds/
├── app/                     # Next.js App Router entrypoints and layouts
│   ├── page.tsx             # Home (/)
│   ├── layout.tsx           # Root layout (Navigation + RootProviders)
│   ├── changelog/           # Public changelog (/changelog)
│   ├── profiles/            # Profile search/history landing (/profiles)
│   ├── tos/                 # Terms of service
│   ├── privacy/             # Privacy policy
│   ├── (game)/              # Route group for pages that need game-data providers
│   │   ├── layout.tsx       # Shared GameDataProvider/ToastProvider boundary
│   │   ├── builds/          # Build browser (/builds)
│   │   ├── edit/            # Build editor (/edit)
│   │   ├── import/          # OCR import (/import)
│   │   ├── bulk-import/     # Batch OCR import (/bulk-import)
│   │   ├── saves/           # Local saves (/saves)
│   │   ├── profile/         # Player profile (/profile/[uid])
│   │   ├── leaderboards/    # Leaderboards (/leaderboards, /leaderboards/[characterId])
│   │   ├── characters/      # Character-seeded editor routes (/characters/[id])
│   │   └── weapons/         # Weapon-seeded editor routes (/weapons/[id])
│   └── api/                 # App-local Open Graph image routes
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
│   ├── import/              # OCR → SavedState conversion, result keys, echo matching, issue reports
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
py sync_all.py --encore                       # Faster early-patch merge from Encore
py sync_lb.py --weapons-only                  # Regenerate LB weapon bases only
py sync_backend.py --force-echo-icons         # Refresh backend echo SIFT templates by CDN ID
```

`sync_all.py` defaults to the Wuthery per-entity scripts (`sync_characters`, `sync_weapons`,
`sync_echoes`, `sync_fetters`), then runs the same `stat_translations` / `sync_backend` / `sync_lb`
tail. Use `--encore` when Wuthery is lagging a new patch and we need Encore's faster `/new` feed.
`sync_backend` is the single source of truth for `backend/Data`: the OCR JSON schema plus every SIFT
template (elements/characters/weapons/echoes) as id-keyed WebP, gated by `--skip-*-icons` / `--force-*-icons`.
See [`scripts/CDN_SYNC.md`](./scripts/CDN_SYNC.md) for per-script flags and outputs and
[`docs/sync-sources.md`](./docs/sync-sources.md) for the source-comparison rationale.
