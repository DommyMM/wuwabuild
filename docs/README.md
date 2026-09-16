# Frontend Docs

The layer between `AGENTS.md` and the code. `AGENTS.md` says where a thing lives, these say how it behaves
and why. Code stays the final source of truth.

| Doc | Covers |
| --- | --- |
| `leaderboards.md` | Fetch, cache, query state, rank and dedup, the profile surface |
| `build-expansion.md` | The panel under a build row: move breakdown, benchmark, stat comparison |
| `build-card.md` | The build card and its rank module |
| `editor-and-state.md` | Provider boundaries and editor state flow |
| `data-pipeline.md` | OCR import flow, sync scripts, image mirror |
| `sync-sources.md` | Why Wuthery is the default source and what Encore is for |
| `domain-glossary.md` | Terms shared with the leaderboard service |
| `design-brief.md` | Visual identity and the rules a change holds to |
| `design-debt.md` | Defects still in the code |
| `seo.md` | What the site optimizes for and what is open |
| `posthog.md` | Analytics conventions and dashboard intent |

Per-script sync flags live in `../scripts/CDN_SYNC.md`.

Start with `leaderboards.md` and `editor-and-state.md`, which cover the two surfaces most work touches.
