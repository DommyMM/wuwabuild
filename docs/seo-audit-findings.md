# WuWaBuilds SEO Audit & Search Performance Analysis

Audit Date: 2026-05-24 (Updated through 2026-05-29 implementation pass)

---

## Executive Summary

A cross-analysis between **Google Search Console (GSC)** and **Vercel Web Analytics** reveals a significant search visibility opportunity:
1. **The Tool Traffic Gap:** Pages like `/import` (4.7K actual visitors) and `/edit` (3.9K actual visitors) are core product offerings used heavily by the community, yet they receive almost zero traffic from organic search (13 and 6 clicks respectively).
2. **Competitor Conquesting ("wuwaflex") — rejected:** `wuwaflex`/`wuwa flex` carry ~3,500 impressions at sub-1% CTR, but this is **not a target**. WuWaBuilds should keep its own identity around scanner, build editor, calculator, dossiers, and leaderboards rather than chase a competitor brand term.
3. **Regional Search Demands:** While the United States remains the top referrer (16%), East and Southeast Asian markets—specifically Vietnam (14%) and Japan (12%)—represent a major portion of your active player base, raising the priority of localized SEO.

To address these findings, we have updated and deployed targeted metadata configurations across all core routes to capture high-intent search queries.

---

## Performance Data Insights

### 1. Page Performance Breakdown (Vercel vs. GSC Clicks)

| Route Path | Vercel Monthly Visitors | GSC Clicks | GSC Impressions | GSC CTR | Avg. Position |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` (Homepage) | 5,400 | 1,861 | 20,542 | 9.06% | 6.74 |
| `/leaderboards` | 5,100 | 2,087 | 6,089 | 34.27% | 6.14 |
| `/builds` | 4,800 | 188 | 3,678 | 5.11% | 8.47 |
| `/import` (OCR Scanner) | 4,700 | 13 | 596 | 2.18% | 6.83 |
| `/edit` (Build Maker) | 3,900 | 6 | 659 | 0.91% | 8.10 |

> [!NOTE]
> `/leaderboards` performs exceptionally well in search results (34% CTR) due to strong keyword alignments like `wuwa leaderboards` (69.59% CTR, #1.37 avg position). The core challenge is replicating this success for the builds catalog and interactive tools.

### 2. Query Analysis & Keyword Capture
* **High-Intent Targets (Broad Searches):** Queries like `wuwa builds` (2,531 impressions) and `wuwa build` (3,451 impressions) have low average ranking positions (~6.0). 
* **Rejected competitor queries:** Search volume for `wuwaflex` (1,505 impressions, 0.07% CTR) and `wuwa flex` (2,064 impressions, 1.02% CTR) is real, but intentionally not pursued. The site should rank on its own category terms: `wuwa builds`, `wuwa build editor`, `wuwa leaderboards`, `wuthering waves builds`, and character-specific build queries.
* **Long-Tail Tools:** Queries like `wuwa build checker` (379 impressions, position 6.28) and `wuwa build maker` (31 impressions, position 6.77) represent targeted users looking for the calculator.

---

## Key Metadata Realignment (Implemented 2026-05-24)

> All seven metadata blocks below are live in the current codebase. Verify via `app/page.tsx`, `app/(game)/edit/layout.tsx`, `app/(game)/import/page.tsx`, `app/(game)/builds/page.tsx`, `app/(game)/leaderboards/page.tsx`, `app/(game)/leaderboards/[characterId]/page.tsx`, and the `keywords` array in `app/layout.tsx`.

To capture missing impressions and raise rankings for low-CTR terms, the following routes were updated:

### 1. Homepage (`app/page.tsx`)
* **Old Title:** `WuWa Builds | Wuthering Waves Build Creator & Leaderboards`
* **New Title:** `WuWa Builds — Wuthering Waves Build Maker & Leaderboards`
* **Old Description:** `Create, share, and discover top-tier Wuthering Waves character builds. Flex your builds with automatic OCR scanner, stat calculations, and global damage rankings.`
* **New Description:** `Create, showcase, and compare Wuthering Waves builds. The ultimate build maker, automatic OCR screenshot scanner, damage calculator, and global leaderboards.`

### 2. Build Maker / Calculator (`app/(game)/edit/layout.tsx`)
* **Old Title:** `WuWa Build Maker & Showcase Card Generator`
* **New Title:** `WuWa Build Maker, Showcase Card Generator & Calculator`
* **Old Description:** `Create and generate beautiful Wuthering Waves character build cards. Flex your best builds with our automatic OCR scanner and live damage leaderboards.`
* **New Description:** `The ultimate Wuthering Waves build maker. Create, calculate, and generate beautiful character showcase cards. Flex your echo stats with our real-time calculator.`

### 3. OCR Screenshot Scanner (`app/(game)/import/page.tsx`)
* **Old Title:** `Import Build via OCR Screenshot`
* **New Title:** `WuWa OCR Screenshot Scanner — Import Character Builds`
* **Old Description:** `Automatically import your Wuthering Waves character builds using our OCR screenshot scanner. Quickly load your echo stats and forte levels into the build editor.`
* **New Description:** `Scan and import your Wuthering Waves character builds automatically from screenshots. Quickly load your echoes, stats, and forte levels into the editor.`

### 4. Builds Index Directory (`app/(game)/builds/page.tsx`)
* **Old Title:** `Browse Builds`
* **New Title:** `Wuthering Waves Character Builds & Echo Database`
* **Old Description:** `Explore and filter community-created Wuthering Waves builds. Find the best echo combinations, main stats, and substat priorities for every character.`
* **New Description:** `Explore the best Wuthering Waves character builds. Filter by resonator, weapon, and echoes to find optimal substats, main stats, and community guides.`

### 5. Global Leaderboard (`app/(game)/leaderboards/page.tsx`)
* **Old Title:** `Character Leaderboards`
* **New Title:** `WuWa Leaderboards — Wuthering Waves Damage & CV Rankings`
* **Old Description:** `Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.`
* **New Description:** `Global Wuthering Waves leaderboards. Compare the best character builds, see top-tier simulated damage rotations, Crit Value (CV) rankings, and echo stats.`

### 6. Character-Specific Leaderboard (`app/(game)/leaderboards/[characterId]/page.tsx`)
* **Old Title:** `${characterName} Leaderboard - WuWaBuilds`
* **New Title:** `${characterName} Build Rankings & Leaderboard | WuWa Builds`
* **Old Description:** `Global damage rankings for ${characterName} in Wuthering Waves. Compare top builds, weapons, tracks, echo sets, and benchmark setups on WuWaBuilds.`
* **New Description:** `See the best Wuthering Waves ${characterName} builds ranked by simulated damage. Compare top player echo sets, weapon stats, and CV leaderboards.`

### 7. Keyword Lists (`app/layout.tsx`)
* Expanded the global layout keywords list to explicitly capture queries driving impressions:
  * `wuwaflex`, `showcase card`, `screenshot scanner`, `damage calculator`, `wuwa build maker`, `wuwa leaderboards`.

---

## Current Recommendations

> Status legend: **shipped** — verified in current code. **pending** — not yet implemented at audit re-review time. **operational** — external action outside the repo.

### 1. Multi-Locale SEO Target (Vietnam & Japan) — **pending**
* **Action:** Since Vietnam (14%) and Japan (12%) make up over a quarter of your actual active traffic, translating route metadata and game data values server-side represents the highest visibility scaling opportunity.
* **Next Steps:** Prioritize Japanese and Vietnamese localization directories using a routing middleware like `next-intl` to allow search engines to crawl and index `/ja/characters/[id]` and `/vi/characters/[id]`.
* **Status:** `next-intl` is not installed; no `/ja`, `/vi`, or other locale-prefixed app routes exist. Client-side `LanguageProvider` still drives in-page i18n only.

### 2. Public API / leaderboard caching — **pending**
* **Action:** Profile public read-only endpoints and add CDN cache headers where responses are not user-specific.
* **Why:** Recent Vercel billing shows the main cost driver is function duration, not static bandwidth. Caching public leaderboard/data responses is more likely to reduce cost than image/CDN tuning.
* **Guardrail:** Do not cache `/edit`, `/import`, `/saves`, private profiles, auth-sensitive APIs, or POST/PUT/PATCH responses.

### 3. Character and weapon crawl paths — **partially shipped**
* **Shipped:** `/characters/[id]` and `/weapons/[id]` are in the sitemap, have server-rendered dossier content, and cross-link through compatible weapons/resonators. Character leaderboard pages also link back to their character dossier.
* **Decision:** Do **not** add random footer links to individual dynamic pages. There is no `/characters` or `/weapons` index route today, so footer links would either be dead-end placeholders or arbitrary picks.
* **Next best step:** If more de-orphaning is needed, add real `/characters` and `/weapons` index pages or strengthen the `/leaderboards` overview links. Footer can link those index pages once they exist.

### 4. Google Search Console Sitemap Refresh — **operational**
* **Action:** After deploying these metadata changes, log into GSC and request a re-crawl of `sitemap.xml`.
* **Verification:** Monitor the **Pages** indexing report to ensure that `/edit`, `/import`, `/changelog`, `/privacy`, and `/tos` shift from "Discovered - currently not indexed" to "Indexed".
* **Status:** `app/sitemap.ts` and `app/robots.ts` are in place; the re-crawl request itself happens in GSC and isn't observable from the codebase.

---

## 2026-05-29 Update — SSR Fix, Architecture & Roadmap

### Latest traffic (Vercel, trailing 30 days)

13,414 visitors (**+166%**), 86,428 page views, 37% bounce.

| Page | Visitors | Notes |
| :--- | :--- | :--- |
| `/` | 6.3K | |
| `/leaderboards` | 6.0K | strongest organic CTR (see above) |
| `/builds` | 5.4K | |
| `/import` | 5.3K | almost all non-organic (in-app/direct) |
| `/edit` | 4.4K | almost all non-organic |
| `/saves` | 2.3K | |
| `/leaderboards/1108` | 1.9K | **single character board — validates per-character SEO pages** |

- **Referrers:** Google 4.6K (organic is the #1 acquisition channel) · Reddit 1.2K · Bing 553 · Brave 380 · DuckDuckGo 269 · `wuwabuilds.moe` 258 (old domain still redirecting traffic in).
- **Geo:** US 16% · Vietnam 11% · Japan 8% · Germany 5% · Philippines 4% → **~25%+ non-English demand.**
- **Devices:** Desktop 67% / Mobile 32% (search-acquired dossier traffic skews more mobile → mobile CWV matters).

### CRITICAL FIX SHIPPED — SSR content was hidden behind a client loading gate

- **Problem:** every `(game)` route (including `/characters/[id]` and `/weapons/[id]`) was wrapped in `GameDataLoadingGate`, which rendered "Loading game data…" until a client-side fetch of ~7.7 MB of JSON finished. The **initial HTML served to crawlers was the placeholder, not the page** — silently undercutting every per-character/weapon SEO page despite their server-rendered content, H1s, breadcrumbs, and JSON-LD.
- **Fix** (`contexts/GameDataContext.tsx`): the gate no longer blocks on `isLoading`; it always renders `children` and only shows a non-blocking error banner on failure. Server-rendered dossier content is now in the initial HTML.
- **Also shipped:** `/edit` gained an `sr-only` H1 ("WuWa Build Maker"); character-leaderboard `<title>`s de-duplicated (root layout's `title.template` already appends `| WuWa Builds`, so they were doubling).
- **Verify:** `npm run build`, then view-source (JS disabled) on a `/characters/[id]` page — the H1, stat table, and JSON-LD must be present in raw HTML.

### Architecture finding — client data payload hurts CWV on ranking pages

- `Characters.json` alone is **6.5 MB** (of ~7.7 MB across 8 JSON files), fetched + parsed **client-side** via the global `GameDataProvider` on *every* `(game)` route.
- **Legitimate consumers:** `/edit` and `/leaderboards` genuinely need the full dataset (hover tooltips, live recalculation). Leave these as-is.
- **Waste:** `/characters/[id]` and `/weapons/[id]` are server-rendered and don't need the client fetch, yet trigger the full 6.5 MB parse on the main thread — on exactly the pages we want to rank. Hurts mobile INP/LCP; Core Web Vitals is a ranking signal.
- **Recommendation:** scope the fetch to routes that need it (lazy provider / per-route), and medium-term split `Characters.json` into a lean client *index* (id, name, element, weaponType, icon, base stats) plus on-demand per-character detail. The editor edits one character at a time and never needs all ~70 full records upfront.

### Roadmap (phased, latest state)

- **Phase 0 — SSR gate fix:** shipped. Server-rendered `(game)` route content is no longer hidden behind the client loading gate.
- **Phase 0.5 — low-risk performance cleanup:** shipped. Added a modern Browserslist target, moved GA/GTM to `lazyOnload`, trimmed unused PostHog features, removed the unused `@next/third-parties` package, and cleaned up Knip findings.
- **Phase 1 — Stop SEO pages triggering the 6.5 MB game-data fetch:** shipped. Character and weapon dossier routes no longer mount the editor/game-data provider stack.
- **Phase 2a — Internal links:** shipped. Character leaderboard pages link back to their character dossier. Weapon/character dossier pages cross-link compatible entities.
- **Phase 2b — Homepage resonator directory grid:** reverted by product decision. It helped crawl paths, but was too obtrusive and low-value on the landing page.
- **Phase 3 — Schema + hero H1:** shipped. Homepage structured data and clearer keyword copy are in place.
- **Phase 4 — Leaderboard-driven prose on character pages:** shipped with ISR and a low-data fallback. This is the strongest content moat because it summarizes real top-build data competitors cannot manually mirror.
- **Current polish — Changelog and site links:** shipped/active. `/changelog` is linked from the footer and sitemap; avoid claiming newly created character/weapon reference pages as major public features until real index pages exist.
- **Later — Split `Characters.json`:** pending. Medium-term data-layer work: lean client index plus on-demand detail. Also evaluate `/ja` and `/vi` only when the site can support real localized content, metadata, and hreflang.

### Product-direction corrections

- **"wuwaflex" conquesting is rejected.** wuwaflex is a competitor we don't want to emulate; the build-card export those searchers want is only a fraction of the use case. Do not add "alternative" copy.
- **Brand/category language:** current direction is `WuWa Builds`, `Wuthering Waves Builds`, `Build Editor`, `Leaderboards`, `Scanner`, and `Calculator`. This matches the site identity better than generic "flex" language.
- **Footer linking:** footer already links core product routes plus `/changelog`, `/privacy`, and `/tos`. Do not add `/characters/[id]` or `/weapons/[id]` footer links one-by-one. If broader dossier discovery becomes a priority, ship real `/characters` and `/weapons` index pages first.

---

## 2026-05-29 Closeout — What Changed From Zero To Now

### Shipped

- Raw server-rendered content is visible to crawlers on `(game)` pages instead of being replaced by a client loading placeholder.
- Homepage, edit, import, builds, global leaderboard, and character leaderboard metadata were tightened around category terms.
- Homepage structured data was expanded with FAQ / Organization / WebSite-style signals.
- Character leaderboard metadata now preserves weapon, sequence, and playstyle context for titles and previews.
- Character dossier pages include server-side, leaderboard-driven insight prose with a daily ISR refresh and a low-data fallback.
- Character and weapon dossier pages load less client-side game data.
- Build editor and navigation copy now consistently use "Build Editor" instead of the vaguer "Edit".
- Changelog is linked from the footer and sitemap, with a concise 2026-05-29 entry for user-visible changes.
- Cloudflare Email Address Obfuscation should be disabled; Continuous Script Monitoring can stay on unless PageSpeed shows it injecting measurable client JS.

### Deferred

- Public API / leaderboard response caching for Vercel function-duration cost reduction.
- Real `/characters` and `/weapons` index pages if crawl paths need more strength.
- Locale routes for Japanese and Vietnamese.
- Splitting large game-data JSON into a lean client index and on-demand details.
