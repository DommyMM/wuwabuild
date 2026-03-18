# WuWaBuilds Frontend

Next.js App Router build editor and damage leaderboard at [wuwa.build](https://wuwa.build).

**Stack**: Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · Framer Motion

For leaderboard service details see **[lb/AGENTS.md](../lb/AGENTS.md)**.

---

## Docs First

Use this file for high-level routing and invariants. Use `docs/` for longer behavior context before reading source.

- `docs/README.md` — read order and scope
- `docs/leaderboards.md` — leaderboard fetch, dedup, ghost behavior
- `docs/editor-and-state.md` — provider and state flow
- `docs/data-pipeline.md` — OCR/data sync/ops commands
- `docs/domain-glossary.md` — shared terms and rank semantics

When behavior changes, update the corresponding file in `docs/`.

---

## Where to find things

| If you want to…                               | Go to                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Add or edit a page route                      | `app/(game)/`                                             |
| Understand provider hierarchy                 | `app/layout.tsx`, `app/(game)/layout.tsx`                 |
| Edit the build editor                         | `components/edit/`, `contexts/BuildContext.tsx`           |
| Edit the global board (/builds)               | `components/leaderboards/board/`                          |
| Edit the leaderboard overview (/leaderboards) | `components/leaderboards/overview/`                       |
| Edit per-character leaderboard pages          | `components/leaderboards/character/`                      |
| Edit the shared expansion panel               | `components/leaderboards/BuildExpanded.tsx`               |
| Edit leaderboard constants / shared helpers   | `components/leaderboards/constants.ts`, `queryHelpers.ts` |
| Understand SSR prefetch / silent revalidation | `lib/lbServer.ts`                                         |
| Edit LB API fetch functions                   | `lib/lb.ts`                                               |
| Edit stat calculations / game data loading    | `lib/calculations/`, `contexts/GameDataContext.tsx`       |
| Add or edit API proxy routes                  | `app/api/`                                                |
| Change CDN data sync output                   | `scripts/sync_lb.py`, `scripts/sync_characters.py`, etc.  |

---

## Routes

| Route                          | Entry                                              | Client tree                                    |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| `/`                            | `app/page.tsx`                                     | `components/home/*`                            |
| `/edit`                        | `app/(game)/edit/page.tsx`                         | `components/edit/*`, `components/card/*`       |
| `/import`                      | `app/(game)/import/page.tsx`                       | `components/import/*`, `hooks/useOcrImport.ts` |
| `/saves`                       | `app/(game)/saves/page.tsx`                        | `components/save/*`                            |
| `/builds`                      | `app/(game)/builds/page.tsx`                       | `components/leaderboards/board/*`              |
| `/leaderboards`                | `app/(game)/leaderboards/page.tsx`                 | `components/leaderboards/overview/*`           |
| `/leaderboards/[characterId]`  | `app/(game)/leaderboards/[characterId]/page.tsx`   | `components/leaderboards/character/*`          |

`app/(game)` is a route group — does not affect public URLs. Opts game-data pages into a shared `GameDataProvider + ToastProvider` boundary.

---

## Provider Hierarchy

```
RootProviders (app/layout.tsx)
└── LanguageProvider

ToolProviders (app/(game)/layout.tsx)
└── GameDataProvider       ← 9 JSON files, client-cached after first load
    └── ToastProvider

EditorProviders (nested on /edit)
└── BuildProvider          ← active build via useReducer + localStorage debounce
    └── StatsProvider      ← derived stats/CV (pure, recalcs on build/data change)
```

---

## LB Integration

- **SSR prefetch** (`lib/lbServer.ts`): server-only, fetches directly from `LB_URL` with `X-Internal-Key`, bypasses `/api/lb` proxy. `PREFETCH_TTL_S = 120`. Three exports: `prefetchBuilds()`, `prefetchLeaderboardOverview()`, `prefetchLeaderboard(characterId, query?)`. Page server components pass `initialData` to clients.
- **Silent revalidation**: diff-based ref signatures (`buildListSigRef`, etc.) skip `setState` when revalidation data is unchanged.
- **Client cache** (`globalBoardCache.ts`): localStorage LRU for `/builds` list responses (2-min TTL, 30 entries max). Filtered/paginated queries always go through `/api/lb/*` with `no-store`.
- **Leaderboard**: one row per (character × track). Each entry has `trackKey`, `trackLabel`, `totalEntries`, `weapons[]`, `teamCharacterIds[]`. Row key: `` `${entry.id}:${entry.trackKey}` ``.
- **weaponId**: canonical CDN ID — selects which `damage_map` key to read, does **not** filter eligible builds.
- **globalRank** (`/leaderboard/{characterId}` rows): always returned. In competitive mode (damage sort, no UID/username filter) it is deduped competitive rank. In browse mode (non-damage sort or UID/username filters), UID-best rows keep their competitive rank and non-best duplicates are `0`. Ghost build sidecar is always `0`.
- **Ghost build**: when a deep-linked `buildId` is deduped out, the API returns it as `ghostBuild`. Frontend inserts it at the correct damage position with no rank shown and a subtle accent highlight.
- **Standings** (`GET /leaderboard/{charId}/build/{buildId}/standings`): fetched on row expand in `BuildExpanded.tsx`, renders rank/total/damage across every weapon × track board.

---

## Data Sync

Run from `wuwabuilds/scripts/`:

```bash
py sync_all.py                             # Full pipeline (frontend Data + backend Data + LB calc JSON)
py sync_lb.py --weapons-only               # Regenerate LB weapon bases only
py download_echo_icons.py --clean --force  # Refresh backend echo template PNGs by CDN ID
```

Outputs: `public/Data/*.json`, `backend/Data/`, `lb/internal/calc/data/*.json`. See `scripts/CDN_SYNC.md` for per-script flags.

---

## Environment Variables

```
LB_URL=...                     # server-only, used by /api/lb/* proxy
API_URL=...                    # server-only, used by /api/ocr proxy
INTERNAL_API_KEY=...           # shared secret for LB + OCR proxies
NEXT_PUBLIC_GA_TRACKING_ID=... # optional
NEXT_PUBLIC_POSTHOG_KEY=...    # optional
CLOUDFLARE_ACCOUNT_ID=...      # optional, R2 screenshot/report storage
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

---

## Useful Misc Information

- `lbServer.ts` is **server-only** — never import from client components. Fetches directly from `LB_URL` to avoid a server-to-self network round-trip through the API proxy.
- `BuildSimulationSection` (moves + substat upgrades) requires `weaponId`, `track`, and `damage` from the parent leaderboard row — it only renders on character leaderboard pages, not the global `/builds` board.
- Echo cost constraint: max total 12, max two 4-cost, max three 3-cost. Violations trigger purge in the LB import pipeline.
- `ForteState` is a 5-tuple: `[[level, topNode, middleNode], ...]`, column order: normal-attack(0), skill(1), circuit(2), liberation(3), intro(4).
- `upgrades` keys in `calculations` are **PascalCase** (`"ATK"`, `"CritRate"`) — intentionally different from snake_case stat keys everywhere else.

---

## Domain Migration (wuwabuilds.moe → wuwa.build)

Implemented in code, dormant until `wuwa.build` is wired in Vercel. `next.config.ts` redirects `www.wuwabuilds.moe/*` → `wuwa.build/*` except `/saves` (`permanent: false`). `SavesPageClient.tsx` shows a hostname-conditional migration banner. Activate by adding `wuwa.build` to the Vercel project.

---

## Related Services

| Service         | Location    | Tech                           | URL                        |
| --------------- | ----------- | ------------------------------ | -------------------------- |
| OCR Backend     | `/backend/` | FastAPI + RapidOCR             | https://ocr.wuwabuilds.moe |
| Leaderboard API | `/lb/`      | Go (Chi + pgx + PostgreSQL 18) | https://db.wuwabuilds.moe  |
