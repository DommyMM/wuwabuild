# WuWaBuilds Frontend

Next.js App Router build editor and damage leaderboard at [wuwa.build](https://wuwa.build).

**Stack**: Next.js 16 · React 19 · TypeScript 6 · Tailwind v4 · Motion (`motion` on npm)

For leaderboard service details see the **wuwa-lb** repo `AGENTS.md`.

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

## Changelog

`lib/changelog.ts` is the source of truth for the public changelog at `/changelog`.

When you ship something a **player would notice**, add it — extend the latest entry or add a new dated one at the top of the array. Group related commits into one line; this is a changelog, not a commit log.

- **Include**: new features, visible fixes, OCR/import accuracy, new character/weapon/echo data, noticeable performance gains.
- **Skip**: refactors, dependency bumps, internal tooling, SEO/analytics, and anything not yet wired into a live page.

User-facing changes from the `wuwa-lb` and `backend` repos belong here too — the changelog is per-product, not per-repo.

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
| Edit leaderboard constants / shared helpers   | `components/leaderboards/constants.ts`, `queryHelpers.ts`, `useBuildDetails.ts`, `useExpandedRows.ts`, `scrollToElementBelowNav.ts` |
| Understand SSR prefetch / silent revalidation | `lib/lbServer.ts`                                         |
| Edit LB API fetch functions                   | `lib/lb.ts`                                               |
| Edit stat calculations / game data loading    | `lib/calculations/`, `contexts/GameDataContext.tsx`       |
| Add or edit API proxy routes                  | `app/api/`                                                |
| Change CDN data sync output                   | `scripts/sync_lb.py`, `scripts/sync_characters.py`, etc.  |
| Add a public changelog entry                  | `lib/changelog.ts` (rendered at `/changelog`)             |

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
| `/profiles`                    | `app/profiles/page.tsx`                            | `components/profile/ProfilesLanding.tsx`       |
| `/tos`                         | `app/tos/page.tsx`                                 | `components/legal/*`                           |
| `/privacy`                     | `app/privacy/page.tsx`                             | `components/legal/*`                           |
| `/changelog`                   | `app/changelog/page.tsx`                           | `components/changelog/*`                       |

`app/(game)` is a route group — does not affect public URLs. Opts game-data pages into a shared `GameDataProvider + ToastProvider` boundary.

---

## Provider Hierarchy

```
RootProviders (app/layout.tsx)
└── LanguageProvider

ToolProviders (app/(game)/layout.tsx)
└── GameDataProvider       ← 8 JSON files, client-cached after first load
    └── ToastProvider      ← wraps GameDataLoadingGate (always renders children for SSR/SEO; only swaps in an error banner on load failure — never a loading state)

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
- Treat `globalRank > 0` as a competitive rank to display, `0` as "do not show rank". `globalRank` is measured against the deduped canonical board (character + weapon + track), so filters and non-damage sorts never renumber it — only ghost rows and builds with no damage on the board are `0`.
- Ghost build behavior, dedup rules, and standings expansion are all in `docs/leaderboards.md`.

---

## Environment Variables

Set variables in a local `.env` for development (never commit secrets). See `docs/data-pipeline.md` for the full list and notes.

All API traffic (browser and SSR) goes through the Cloudflare Worker gateway (private sibling
`gateway/` repo, not part of this codebase) riding `api.wuwa.build` / `ocr.wuwa.build`. The Worker holds
`X-Internal-Key`; no secret lives on Vercel. Defaults target localhost for dev;
production sets the gateway hostnames explicitly.

```
NEXT_PUBLIC_LB_URL         # prod: https://api.wuwa.build (browser + SSR); defaults to http://localhost:8080
NEXT_PUBLIC_OCR_URL        # prod: https://ocr.wuwa.build (browser); defaults to http://localhost:5000
NEXT_PUBLIC_POSTHOG_KEY    # optional
```

---

## Related Services

| Service         | Repo              | Tech                           |
| --------------- | ----------------- | ------------------------------ |
| OCR Backend     | sibling `backend` | FastAPI + RapidOCR             |
| Leaderboard API | sibling `wuwa-lb` | Go (Chi + pgx + PostgreSQL 18) |

Domain migration (`wuwabuilds.moe` → `wuwa.build`) is wired in `next.config.ts`.
