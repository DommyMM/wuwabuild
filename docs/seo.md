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
and `/changelog`. Only pages whose content carries a date get `lastModified` (changelog, privacy, terms),
because file mtimes on Vercel are the deploy time. A failed overview fetch throws instead of emitting a
sitemap without boards, so ISR keeps serving the last good copy. `app/robots.ts` sits beside it and allows
`/api/og/` inside the `/api/` disallow, since every preview image is served from there.

Internal links to a character's default board are the bare `/leaderboards/{id}`, matching its canonical
tag, see `leaderboards.md`.

## Layout stability

Field CLS (PostHog `$web_vitals`) is the one Core Web Vital that was poor, and only on `/profile/[uid]`,
`/edit` and `/import`. LCP and INP are good on every route, so payload work is bandwidth, not ranking.

Anything that appears after the click or the page load, outside the 500ms window layout shift forgives
after input, has to hold its space from the start:

- `/profile/[uid]` renders per request, so it has a `loading.tsx` (`ProfilePageSkeleton`). Without one a
  client navigation shows an empty page slot until the payload arrives, and the footer jumping up and back
  down scored 0.18 on its own. The skeleton reuses the shelf, table and featured region in their own
  loading states so their heights cannot drift from the page.
- The profile card stage reserves the card's footprint (an aspect box that tracks `CardScaler`) from the
  moment a row or tile opens, so the card fills it instead of pushing the page down when the detail lands
- Skeleton tables take `min(pageSize, buildCount)` rows when the count is known, so a two-build profile does
  not shrink by ten rows when the data arrives
- State that only exists in `localStorage` (the pinned-profile tray, the editor draft) is reserved by an
  inline script that runs at parse time, before the element it sizes is first painted, and released once the
  component has rendered. Rendering that state during hydration would mismatch the server HTML, and
  rendering it in an effect is the shift being avoided.

Measure with `scripts/layout_shift_probe.mjs` (headless Chrome, `PerformanceObserver` on `layout-shift`)
against prod and a local build, not Lighthouse alone, since the profile shifts only happen on client
navigation and the editor's only with a saved draft.

## Client data payload

`Characters.json` is 9.2 MB of the 12 MB across the game-data JSON files, and `ToolProviders` (every route
under `app/(game)/`) fetches and parses it client-side. `moves` and `chains` make up about 96% of it, and only
the build card reads either, on `/edit` and profile cards. The board routes pay for the whole file and read
neither. `/`, `/profiles`, `/changelog` and the legal pages sit outside the group and never fetch it.

The dossiers need none of the client dataset, so `contexts/index.tsx` short-circuits `/characters/[id]` and
`/weapons/[id]` out of the provider stack entirely.

## Metadata direction

Titles and descriptions on `/`, `/edit`, `/import`, `/builds`, `/leaderboards` and
`/leaderboards/[characterId]` are tuned around category terms rather than brand-only phrasing.

The root layout's `title.template` appends `| WuWaBuilds`, so a route title must not append it again. Every
page builds its `openGraph` and `twitter` blocks through `socialMetadata` in `lib/metadata.ts`, because Next
replaces a parent's `openGraph` object instead of merging it and a page-level block would otherwise drop
`og:site_name`, which Discord shows above the title.

Category language is `WuWaBuilds`, `Wuthering Waves Builds`, `Build Editor`, `Leaderboards`, `Scanner` and
`Calculator`. Character leaderboard metadata preserves weapon, sequence and playstyle context for titles and
previews. Character dossiers carry server-side, leaderboard-driven prose refreshed daily, and none below five
ranked builds, summarizing real top-build data a competitor cannot mirror by hand, but the boards carry the
organic traffic. Their skill and chain text reaches the client in English only, resolved in the page.

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
- Public read-only response caching to cut Vercel function duration, which bills higher than static bandwidth.
  The leaderboard API sits behind the Cloudflare gateway rather than this repo's `app/api`, so scope this to
  whatever routes still run as functions.
