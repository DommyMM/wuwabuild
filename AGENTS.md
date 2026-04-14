# WuWaBuilds Frontend

Next.js App Router build editor and damage leaderboard at [wuwa.build](https://wuwa.build).

**Stack**: Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · Motion (`motion` on npm)

For leaderboard service details see **[lb/AGENTS.md](../lb/AGENTS.md)**.

This file is a thin orchestration layer: where things live and what each part does. Behavior depth lives in `docs/`; the source is the source of truth.

---

## Docs

- `docs/README.md` — read order and scope
- `docs/leaderboards.md` — fetch model, caches, ghost/dedup behavior, query state
- `docs/editor-and-state.md` — provider boundaries and editor flow
- `docs/data-pipeline.md` — OCR flow, sync scripts, env vars, dev commands
- `docs/posthog.md` — event catalog and tracking rules
- `docs/domain-glossary.md` — shared terms and rank semantics

When behavior changes, update the corresponding file in `docs/`.

---

## Where to find things

| If you want to…                               | Go to                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Add or edit a game tool route                 | `app/(game)/` (also `app/tos`, `app/privacy` at repo root) |
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
| `/characters/[id]`             | `app/(game)/characters/[id]/page.tsx`              | `components/edit/*`, `components/card/*`       |
| `/weapons/[id]`                | `app/(game)/weapons/[id]/page.tsx`                 | same as character-seeded editor                |
| `/profile/[uid]`               | `app/(game)/profile/[uid]/page.tsx`                | `components/profile/*`                         |
| `/tos`                         | `app/tos/page.tsx`                                 | `components/legal/*`                           |
| `/privacy`                     | `app/privacy/page.tsx`                             | `components/legal/*`                           |

`app/(game)` is a route group — does not affect public URLs. Opts game-data pages into a shared `GameDataProvider + ToastProvider` boundary.

---

## Provider Hierarchy

```
RootProviders (app/layout.tsx)
└── LanguageProvider

ToolProviders (app/(game)/layout.tsx)
└── GameDataProvider       ← 9 JSON files, client-cached after first load
    └── ToastProvider

EditorProviders (nested on /edit, /characters/[id], /weapons/[id])
└── BuildProvider          ← active build via useReducer + localStorage debounce
    └── StatsProvider      ← derived stats/CV (pure, recalcs on build/data change)
```

See `docs/editor-and-state.md` for responsibilities, route shapes, and editor flow.

---

## Key invariants

These are the easy-to-violate rules. Behavior context lives in the docs.

- `lib/lbServer.ts` is **server-only** — never import from a client component. See `docs/leaderboards.md` for the prefetch/revalidate model.
- `weaponId` selects the `damage_map` key — it does **not** filter eligible builds.
- Leaderboard row identity is `` `${entry.id}:${entry.trackKey}` ``.
- Treat `globalRank > 0` as a competitive rank to display, `0` as "do not show rank" (browse mode + ghost rows).
- Ghost build behavior, dedup rules, and standings expansion are all in `docs/leaderboards.md`.

---

## Environment Variables

Copy `.env.example` to `.env` for local development (never commit secrets). See `docs/data-pipeline.md` for the full list and notes.

```
LB_URL                     # server-only, used by /api/lb/* proxy
API_URL                    # server-only, used by /api/ocr proxy (defaults to localhost in dev)
INTERNAL_API_KEY           # shared secret for LB + OCR proxies
NEXT_PUBLIC_POSTHOG_KEY    # optional
CLOUDFLARE_ACCOUNT_ID      # optional, R2 screenshot/report storage
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

---

## Domain Migration (wuwabuilds.moe → wuwa.build)

Implemented in code, dormant until `wuwa.build` is wired in Vercel. `next.config.ts` redirects `www.wuwabuilds.moe/*` → `https://wuwa.build/*` with `permanent: true`, excluding `/saves` via the path matcher. `SavesPageClient.tsx` shows a hostname-conditional migration banner. Activate by adding `wuwa.build` to the Vercel project.

---

## Related Services

| Service         | Location    | Tech                           | URL                        |
| --------------- | ----------- | ------------------------------ | -------------------------- |
| OCR Backend     | `/backend/` | FastAPI + RapidOCR             | https://ocr.wuwabuilds.moe |
| Leaderboard API | `/lb/`      | Go (Chi + pgx + PostgreSQL 18) | https://db.wuwabuilds.moe  |
