# SEO

What the site optimizes for, the decisions behind it, and what is still open.

## The shape of the traffic

Organic search is the top acquisition channel, ahead of Reddit and the other engines. Roughly a quarter of
traffic is non-English, with Vietnam and Japan the two largest such audiences. About a third of visits are
mobile, and search-acquired dossier traffic skews more mobile than the tool routes do, so mobile Core Web
Vitals is a ranking input rather than a nicety.

`/leaderboards` has the strongest organic CTR. Individual character boards pull real traffic on their own,
which is what validates per-character pages as an SEO surface. `/import` and `/edit` are almost entirely
direct or in-app, so they are not organic surfaces and should not be tuned as though they were.

## Crawlability

Server-rendered content has to reach crawlers. Every `(game)` route was once wrapped in a gate that rendered
a loading placeholder until a client-side fetch of the whole game-data payload finished, so the initial HTML served
to crawlers was the placeholder rather than the page, silently undercutting every per-character and
per-weapon page despite their server-rendered content, H1s, breadcrumbs and JSON-LD.

`GameDataLoadingGate` therefore always renders children and only shows a non-blocking error banner on
failure. See `editor-and-state.md` for the provider consequences. Verify with `npm run build`, then
view-source with JS disabled on a `/characters/[id]` page: the H1, stat table and JSON-LD must be in the raw
HTML.

`app/sitemap.ts` emits `/characters/{id}`, `/leaderboards/{id}` and `/weapons/{id}` alongside the core routes
and `/changelog`. `app/robots.ts` sits beside it.

## Client data payload

`Characters.json` is 9.2 MB of the 12 MB across the game-data JSON files, and the global
provider fetches and parses it client-side.

`/edit` and `/leaderboards` genuinely need the full dataset for hover tooltips and live recalculation, so
leave them alone. Dossier routes do not: `/characters/[id]` and `/weapons/[id]` are server-rendered, and
`contexts/index.tsx` short-circuits them out of the provider stack so they no longer trigger the parse on the
main thread, on exactly the pages meant to rank.

## Metadata direction

Titles and descriptions on `/`, `/edit`, `/import`, `/builds`, `/leaderboards` and
`/leaderboards/[characterId]` are tuned around category terms rather than brand-only phrasing, and the
`keywords` array in `app/layout.tsx` captures the queries that actually drive impressions (build maker,
showcase card, screenshot scanner, damage calculator, leaderboards).

The root layout's `title.template` appends `| WuWa Builds`, so a route title must not append it again.

Category language is `WuWa Builds`, `Wuthering Waves Builds`, `Build Editor`, `Leaderboards`, `Scanner` and
`Calculator`. Character leaderboard metadata preserves weapon, sequence and playstyle context for titles and
previews. Character dossiers carry server-side, leaderboard-driven prose on a daily ISR refresh with a
low-data fallback, which is the strongest content moat because it summarizes real top-build data a
competitor cannot mirror by hand.

## Decisions

- Do not conquest "wuwaflex". It is a competitor worth not emulating, and the build-card export those
  searchers want is a fraction of the use case, so no "alternative to" copy.
- Do not add `/characters/[id]` or `/weapons/[id]` links to the footer one by one. There is no `/characters`
  or `/weapons` index route, so those links would be dead-end placeholders or arbitrary picks. Ship real
  index pages first, then link those.
- The homepage resonator directory grid is rejected. It helped crawl paths but was too obtrusive and too
  low-value on the landing page.
- Do not cache `/edit`, `/import`, `/saves`, private profiles, auth-sensitive endpoints, or any
  POST/PUT/PATCH response.

## Open

- Locale routes for Japanese and Vietnamese. A quarter of traffic is non-English and `LanguageProvider` is
  client-only, so search engines cannot crawl a localized page. This needs routing middleware plus real
  localized metadata and hreflang, so it waits until the site can support genuine localized content rather
  than machine-swapped strings.
- Split `Characters.json` into a lean client index (id, name, element, weapon type, icon, base stats) plus
  on-demand per-character detail. The editor edits one character at a time and never needs all the full
  records upfront.
- Real `/characters` and `/weapons` index pages, if crawl paths need more strength.
- Public read-only response caching to cut Vercel function duration, which bills higher than static
  bandwidth. The leaderboard API now sits behind the Cloudflare gateway rather than this repo's `app/api`,
  so scope this to whatever routes still run as functions.
