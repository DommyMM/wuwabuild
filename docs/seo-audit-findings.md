# WuWaBuilds SEO Audit Findings

Audit date: 2026-05-08

Scope: local review of the Next.js app under `wuwabuilds/`, focused on crawlability, indexation, metadata, structured data, internal linking, and content quality. This pass did not use Google Search Console, live PageSpeed data, or a rendered production crawl.

Implementation status: the core code fixes from this audit were implemented on 2026-05-08. Remaining items are production-only verification tasks: confirm domain/trailing-slash redirects, validate rendered JSON-LD, review Search Console coverage, and run live Core Web Vitals/PageSpeed checks.

## Executive Summary

Overall health: moderate to good. The site already has the important SEO basics in place: a canonical production domain, robots.txt, sitemap generation, route-level metadata for key pages, self-referencing canonicals on the strongest indexable routes, structured data on the homepage and entity pages, and crawlable internal links to the main discovery areas.

The biggest opportunity is turning the existing game data into cleaner, more durable search surfaces. Character, weapon, and leaderboard pages are indexable and have useful copy, but much of the rich page content is tucked inside closed `<details>` blocks, profile pages are indexable despite being user-generated and potentially thin, and `/builds` is marked `force-static` while it has no server-prefetched initial data. The language switcher is client-side only, so the app should not be considered an international SEO implementation yet.

Top priorities from the audit:

1. Decide whether `/profile/[uid]` should be indexed. If not, add `noindex`; if yes, add stronger server-rendered profile summaries and sitemap inclusion rules for worthwhile profiles only.
2. Add explicit canonicals to `/import` and `/edit`; consider `noindex` for `/saves` already handled and any low-search utility surfaces that should not rank.
3. Replace `new Date()` sitemap timestamps with stable data/deploy timestamps so every URL does not appear modified on every sitemap request.
4. Improve indexable content on character and weapon pages by making the primary explanatory content visible by default, not hidden in closed `<details>`.
5. Treat the language selector as UX only unless locale URLs, hreflang, localized metadata, and translated server-rendered content are added.

## What Is Working

- Root metadata uses `metadataBase: https://wuwa.build`, site-wide titles, descriptions, Open Graph, Twitter metadata, robots defaults, icons, and manifest.
- `robots.txt` allows the public site, disallows `/api/`, and references `https://wuwa.build/sitemap.xml`.
- Sitemap generation covers homepage, `/builds`, `/leaderboards`, character pages, character leaderboard pages, and weapon pages. Current data implies roughly 226 sitemap URLs: 3 static routes, 53 characters x 2, and 117 weapons.
- Homepage has strong metadata, canonical `/`, ISR, WebSite JSON-LD, and SoftwareApplication JSON-LD.
- Character, weapon, and character leaderboard routes generate route-specific metadata and self-referencing canonical URLs.
- Character and weapon pages include breadcrumb structured data and additional entity structured data.
- `/saves` and `/bulk-import` are correctly marked `noindex, nofollow`.
- Main navigation links to the primary indexable areas: `/builds`, `/leaderboards`, `/import`, and `/edit`.

## Technical SEO Findings

### 1. Sitemap `lastModified` changes on every request

Status: Fixed. `app/sitemap.ts` now uses stable file mtimes from the local game-data JSON files instead of `new Date()` per request.

Impact: Medium

Evidence: `app/sitemap.ts` uses `lastModified: new Date()` for static, character, leaderboard, and weapon routes.

Why it matters: Search engines can treat constantly changing sitemap timestamps as low-confidence freshness signals. It also makes it harder to distinguish real data changes from routine sitemap generation.

Fix: Use a stable deploy timestamp, source data mtime, or per-content updated date. For static routes, use a stable release date. For generated game-data pages, use the mtime of the relevant JSON data file or a build-time constant.

Priority: High

### 2. `/profile/[uid]` is indexable by default

Status: Fixed. Profile pages now emit `noindex, follow`.

Impact: Medium to High

Evidence: `app/(game)/profile/[uid]/page.tsx` is `force-dynamic`, generates metadata and canonicals, but does not set robots controls.

Why it matters: User profile pages can become thin, duplicate, stale, or low-trust at scale. If many profile pages are indexable without strong public content and internal linking rules, they can dilute crawl quality.

Fix: If profiles are not a target SEO surface, add `robots: { index: false, follow: true }`. If they are a target, index only profiles with enough public builds, add server-rendered summary stats, include only qualified profiles in a sitemap, and make sure empty/private profiles return noindex or 404.

Priority: High

### 3. Utility pages lack explicit canonical or indexation decisions

Status: Fixed. `/import` and `/edit` now have explicit canonical metadata.

Impact: Medium

Evidence: `/import` and `/edit` define title and description but no `alternates.canonical`. `/saves` has noindex, which is good.

Why it matters: `/import` and `/edit` may be valuable branded/product-intent pages, but they should have explicit canonical URLs. If they are primarily app workflows rather than organic landing pages, their ranking role should be intentional.

Fix: Add `alternates: { canonical: '/import' }` and `alternates: { canonical: '/edit' }`. Keep them indexable only if they are useful landing pages; otherwise add noindex with follow.

Priority: Medium

### 4. Mixed domain redirect coverage is narrow

Impact: Medium

Evidence: `next.config.ts` redirects `www.wuwabuilds.moe` to `https://wuwa.build`, but the reviewed config does not show redirects for other likely variants such as `wuwabuilds.moe`, `www.wuwa.build`, or HTTP variants.

Why it matters: Incomplete host redirects can create duplicate URLs, split link equity, and confuse canonicalization. Platform-level redirects may already cover this, but it is not visible in the app config.

Fix: Confirm Vercel/domain settings enforce HTTP to HTTPS and all non-canonical hosts to `https://wuwa.build`. If not, add host redirects for every owned domain variant.

Priority: Medium

### 5. Trailing slash normalization is intentionally disabled

Impact: Low to Medium

Evidence: `next.config.ts` sets `skipTrailingSlashRedirect: true`.

Why it matters: If both `/builds` and `/builds/` resolve without redirects, they can become duplicate URLs. Canonicals reduce risk, but redirects are cleaner.

Fix: Verify production behavior for trailing slash variants. If both variants resolve, restore canonical redirects or add explicit redirect rules.

Priority: Medium

## On-Page SEO Findings

### 6. Character and weapon pages hide most SEO copy in closed `<details>`

Status: Fixed. Character and weapon routes now render visible H1 summary sections and related links before the interactive calculator, while dense detail content remains collapsible.

Impact: Medium

Evidence: `app/(game)/characters/[id]/page.tsx` and `app/(game)/weapons/[id]/page.tsx` render the long descriptive sections inside `<details>` blocks. The primary headings inside those sections are also inside the closed disclosure.

Why it matters: Google can parse hidden content, but content hidden by default is typically a weaker user-facing signal than visible page copy. These pages are major long-tail SEO assets, so their strongest explanatory content should be visible.

Fix: Move a concise, visible intro summary above the interactive calculator. Keep detailed skill/passive tables collapsible if needed, but show the primary H1, page description, internal links, and top related links by default.

Priority: High

### 7. `/builds` has metadata but no server-prefetched initial data

Status: Fixed. `/builds` now server-prefetches default build data and passes it into the existing client component with ISR.

Impact: Medium

Evidence: `/builds` is `force-static` and renders `GlobalBoardPageClient` without passing `initialData`. The client component supports `initialData`, but this route does not use it.

Why it matters: The page has crawlable shell content, but the actual build list is loaded on the client. Search engines can render JavaScript, but server-rendered initial rows would make the page stronger, faster, and more reliable for long-tail discovery.

Fix: Server-prefetch the default builds list, pass it into `GlobalBoardPageClient`, and keep client hydration for filtering. Consider static or ISR rendering if the backend data supports it.

Priority: High

### 8. `/leaderboards` overview also relies on client fetching

Status: Fixed. `/leaderboards` now server-prefetches overview data and passes it into the existing client component with ISR.

Impact: Medium

Evidence: `LeaderboardOverviewClient` supports `initialData`, but `app/(game)/leaderboards/page.tsx` does not pass it.

Why it matters: The overview table is a useful internal linking hub to character leaderboards. Server-rendering initial rows improves crawlability and link discovery.

Fix: Prefetch the leaderboard overview on the server, pass it into `LeaderboardOverviewClient`, and consider ISR if data freshness requirements allow it.

Priority: Medium

### 9. Homepage copy has a visible typo

Status: Fixed. The typo now reads "rank your build against others."

Impact: Low

Evidence: `components/home/HeroSection.tsx` says "rank you build against others."

Why it matters: This is minor, but visible grammar errors can reduce trust and click-through quality.

Fix: Change to "rank your build against others."

Priority: Low

## International SEO Findings

### 10. Language support is client-side UX, not international SEO

Impact: Medium

Evidence: `contexts/LanguageContext.tsx` stores language in localStorage and defaults to English on the server. The root `<html lang>` is always `en`, and there are no locale URL paths or hreflang alternates in the reviewed metadata/sitemap.

Why it matters: Google needs unique locale URLs and server-rendered localized metadata/content to rank language variants. A client-side language switcher alone generally will not create indexable localized pages.

Fix: If international SEO is a goal, add locale routes such as `/ja/...`, `/ko/...`, `/zh-hans/...`, self-canonical each locale, emit hreflang including `x-default`, localize title/description/H1/body content server-side, and include locale URLs in the sitemap. If not, document the language switcher as a user preference only.

Priority: Medium

## Structured Data Findings

### 11. Structured data exists, but should be validated in a rendered browser

Impact: Low to Medium

Evidence: Homepage includes WebSite and SoftwareApplication JSON-LD. Character, weapon, and leaderboard pages include BreadcrumbList and entity/page schemas.

Why it matters: The code appears directionally good, but schema validation should be done with a rendered page. Static source review can miss script injection, runtime escaping, or production-only differences.

Fix: Validate homepage, one character page, one weapon page, and one leaderboard page with Google Rich Results Test. Consider adding FAQPage schema only if the FAQ content remains visible and complies with current rich result eligibility.

Priority: Medium

## Content And Authority Findings

### 12. Long-tail entity pages are present but could target clearer queries

Impact: Medium

Evidence: Character and weapon pages have route-specific titles and descriptions, but visible above-the-fold content is dominated by the interactive calculator UI, while explanatory copy is hidden.

Why it matters: Search demand likely includes terms such as "[character] build", "[character] echoes", "[weapon] best character", and "Wuthering Waves leaderboard". The site has the data to answer those queries, but each entity page should make its target intent obvious in visible content.

Fix: For each character page, add visible sections for best weapons, echo sets, stat priorities, and leaderboard links. For each weapon page, add visible sections for best matching characters and passive scaling. Keep copy factual and generated from game data where possible.

Priority: High

## Prioritized Action Plan

1. Completed: make `/profile/[uid]` noindex/follow.
2. Completed: replace sitemap `new Date()` values with stable freshness values.
3. Completed: add explicit canonicals for `/import` and `/edit`.
4. Completed: server-prefetch default data for `/builds` and `/leaderboards`.
5. Completed: move primary character and weapon SEO copy into visible page content.
6. Completed: fix minor homepage copy typo.
7. Production verification: confirm canonical host redirects and trailing slash behavior.
8. Product decision: decide whether international SEO is in scope; if yes, build locale URLs and hreflang, not just localStorage language switching.
9. Production verification: validate JSON-LD with Rich Results Test on rendered production pages.

## Notes And Unknowns

- No Search Console data was available, so this audit cannot confirm indexed URL counts, crawl errors, query performance, duplicate canonical selections, or Core Web Vitals.
- No live production crawl was run, so redirects, response codes, rendered HTML, and JavaScript-loaded schema should be verified against production.
- No PageSpeed or Lighthouse run was included in this pass.
