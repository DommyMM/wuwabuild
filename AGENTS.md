# WuWaBuilds Frontend

Next.js App Router application for the build editor, profiles, and leaderboards
at [wuwa.build](https://wuwa.build).

## Start Here

`docs/README.md` routes to the behavior and architecture documentation. Read the
relevant document before changing that surface; code remains the final source
of truth.

| Area | Location |
| --- | --- |
| Routes and layouts | `app/` |
| Build editor and cards | `components/edit/`, `components/card/`, `contexts/` |
| Leaderboards | `components/leaderboards/`, `lib/lb.ts`, `lib/lbServer.ts` |
| Shared calculations and data | `lib/calculations/`, `contexts/GameDataContext.tsx` |
| OCR/import flow | `components/import/`, `hooks/useOcrImport.ts`, `app/api/` |
| Data sync tooling | `scripts/` |
| Durable behavior notes | `docs/` |

## Guardrails

- Update the corresponding file in `docs/` when behavior or an invariant changes.
- `lib/lbServer.ts` is server-only; never import it from a client component.
- `lib/changelog.ts` is the public changelog. Add player-visible features,
  fixes, OCR/import accuracy changes, new game data, and noticeable performance
  improvements. Skip refactors, dependency updates, internal tooling,
  SEO/analytics, and anything not yet live.
- Group related work into one changelog line rather than mirroring commits.
  User-facing changes from `lb/` and `backend/` belong here too.

## Verification

- Routine checks: `npm run lint`
- Production-facing changes: `npm run build`
