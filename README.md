# WuWaBuilds Frontend

Next.js App Router frontend for [wuwa.build](https://wuwa.build), a Wuthering Waves build creator and leaderboard.

Stack: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Motion (`motion` on npm).

Routes live under `app/`. The `(game)` route group wraps every page that needs game-data providers.
Ten languages ship: English, Japanese, Korean, Chinese (Simplified and Traditional), German, Spanish,
French, Thai, Ukrainian.

## Where to look

[AGENTS.md](./AGENTS.md) routes by area. [docs/README.md](./docs/README.md) routes by topic.

| Question | Doc |
| --- | --- |
| How a route fetches, caches and renders leaderboard data | [docs/leaderboards.md](./docs/leaderboards.md) |
| Provider boundaries and editor state flow | [docs/editor-and-state.md](./docs/editor-and-state.md) |
| OCR import flow, sync scripts, image mirror | [docs/data-pipeline.md](./docs/data-pipeline.md) |
| Why Wuthery is the default data source | [docs/sync-sources.md](./docs/sync-sources.md) |
| Per-script sync flags and outputs | [scripts/CDN_SYNC.md](./scripts/CDN_SYNC.md) |
| Palette, type and hover-card anatomy | [docs/design-brief.md](./docs/design-brief.md) |
| Leaderboard API | [`../lb/AGENTS.md`](../lb/AGENTS.md) |

## Commands

```bash
npm install
npm run dev
npm run build      # runs lint first
npm run start
npm run lint       # eslint plus tsc --noEmit
npm run knip       # unused files, exports and dependencies
```

There is no test script in this package.

## Environment

Set these in a local `.env`, which is not committed. Both URLs point at the Cloudflare Worker
gateway in production, which holds `X-Internal-Key` and forwards to Railway. Defaults target
localhost so a dev machine needs neither.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_LB_URL` | in prod | Leaderboard reads and writes, `https://api.wuwa.build`, default `http://localhost:8080` |
| `NEXT_PUBLIC_OCR_URL` | in prod | OCR import and issue reports, `https://ocr.wuwa.build`, default `http://localhost:5000` |
| `NEXT_PUBLIC_POSTHOG_KEY` | no | PostHog analytics, see [docs/posthog.md](./docs/posthog.md) |

The frontend holds no internal key and no R2 credentials. Every API call goes through the gateway.

## Constraints worth knowing before editing

- `lib/lbServer.ts` is server-only, never import it from a client component
- `next.config.ts` strips `console.log` in production builds but keeps `console.error` and `console.warn`
- `/assets/` gets a 1-day edge TTL against 1 year for `/Data/*.json`, because Cloudflare edge-caches
  images and a Vercel deploy does not purge Cloudflare
- `lib/changelog.ts` is the public changelog, and user-facing changes from `lb/` and `backend/` belong in it
