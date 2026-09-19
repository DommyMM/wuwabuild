# SEO

What the site optimizes for, the decisions behind it, and what is still open. Live traffic figures are in
Vercel Analytics.

## The shape of the traffic

Organic search brings about half of all visitors, almost all of it Google, with Bing, Brave, DuckDuckGo and
Yandex far behind. Reddit is the largest non-search referrer, at roughly the size of Bing.

Traffic concentrates on the live surfaces. `/` and `/leaderboards/[characterId]` each draw about a sixth of
visitors, and `/leaderboards`, `/builds` and `/profile/[uid]` about an eighth each. Character boards also draw
the most page views of any route, several per visitor, since readers move between boards once they land. The
character and weapon dossiers draw about 1% combined despite a link from every board's header, so in practice
they are not an SEO surface.

`/leaderboards` has the strongest organic CTR. `/import` and `/edit` are almost entirely direct or in-app, so
they are not organic surfaces and should not be tuned as though they were.

Three quarters of visits are desktop and a quarter mobile, so mobile Core Web Vitals count toward ranking but
the typical reader is on desktop.

The US is the largest country at about a fifth of visitors. No other country passes about 6%: Singapore,
Vietnam, Germany and the Philippines lead the rest, and Singapore and the Philippines largely read English.

## Crawlability

Server-rendered content has to reach crawlers, so `GameDataLoadingGate` always renders children and only shows
a non-blocking error banner on failure. A gate that waited for the client-side game-data fetch would serve
crawlers the placeholder instead of the page, undercutting every server-rendered H1, breadcrumb and JSON-LD
block behind it. See `editor-and-state.md` for the provider consequences.

Verify with `npm run build`, then read a prerendered board directly, such as
`.next/server/app/leaderboards/<id>.html`: the rows and JSON-LD must be in the raw HTML.

`app/sitemap.ts` emits `/characters/{id}`, `/leaderboards/{id}` and `/weapons/{id}` alongside the core routes
and `/changelog`. `app/robots.ts` sits beside it.

## Client data payload

`Characters.json` is 9.2 MB of the 12 MB across the game-data JSON files, and the global provider fetches and
parses it client-side. `moves` and `chains` make up about 96% of it, and only the build card reads either, on
`/edit` and profile cards. The board routes pay for the whole file and read neither.

The dossiers need none of the client dataset, so `contexts/index.tsx` short-circuits `/characters/[id]` and
`/weapons/[id]` out of the provider stack entirely.

## Metadata direction

Titles and descriptions on `/`, `/edit`, `/import`, `/builds`, `/leaderboards` and
`/leaderboards/[characterId]` are tuned around category terms rather than brand-only phrasing, and the
`keywords` array in `app/layout.tsx` captures the queries that actually drive impressions (build maker,
showcase card, screenshot scanner, damage calculator, leaderboards).

The root layout's `title.template` appends `| WuWa Builds`, so a route title must not append it again.

Category language is `WuWa Builds`, `Wuthering Waves Builds`, `Build Editor`, `Leaderboards`, `Scanner` and
`Calculator`. Character leaderboard metadata preserves weapon, sequence and playstyle context for titles and
previews. Character dossiers carry server-side, leaderboard-driven prose refreshed daily with a low-data
fallback, summarizing real top-build data a competitor cannot mirror by hand, but the boards carry the
organic traffic.

## Decisions

- Do not conquest "wuwaflex". It is a competitor worth not emulating, and the build-card export those
  searchers want is a fraction of the use case, so no "alternative to" copy.
- Do not add `/characters/[id]` or `/weapons/[id]` links to the footer one by one. There is no `/characters`
  or `/weapons` index route, so those links would be dead-end placeholders or arbitrary picks.
- Dossiers are not prerendered. `generateStaticParams` returns an empty list, which keeps the routes
  ISR-registered so each id renders on its first request and caches for a day. Prerendering all 184 cost
  build time for about 1% of visitors.
- The homepage resonator directory grid is rejected. It helped crawl paths but was too obtrusive and too
  low-value on the landing page.
- Do not cache `/edit`, `/import`, `/saves`, private profiles, auth-sensitive endpoints, or any
  POST/PUT/PATCH response.

## Open

- Locale routes, only if language data supports them. `LanguageProvider` is client-only, so no localized page
  can be crawled, but no non-English country passes about 5% of visitors and the second-largest country reads
  English. Measure which languages readers actually select before building routing middleware, localized
  metadata and hreflang.
- Split `moves` and `chains` out of `Characters.json` into a sibling file the build card loads lazily, the way
  `lib/terms.ts` loads `Terms.json`. That takes the provider's fetch from 9.2 MB to under 0.4 MB without a
  per-character split.
- Character dossiers pass every language of `moves` and `chains` to `CharacterReferenceSections`, which renders
  only English, so a page carries about 112 KB of them on average against the 17 KB it shows. Map them to
  English on the server, as the weapon page does for its character list.
- Public read-only response caching to cut Vercel function duration, which bills higher than static bandwidth.
  The leaderboard API sits behind the Cloudflare gateway rather than this repo's `app/api`, so scope this to
  whatever routes still run as functions.
