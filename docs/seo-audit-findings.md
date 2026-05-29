# WuWaBuilds SEO Audit & Search Performance Analysis

Audit Date: 2026-05-24 (Updated with Google Search Console & Vercel Web Analytics)

---

## Executive Summary

A cross-analysis between **Google Search Console (GSC)** and **Vercel Web Analytics** reveals a significant search visibility opportunity:
1. **The Tool Traffic Gap:** Pages like `/import` (4.7K actual visitors) and `/edit` (3.9K actual visitors) are core product offerings used heavily by the community, yet they receive almost zero traffic from organic search (13 and 6 clicks respectively).
2. **Competitor Conquesting ("wuwaflex") — REJECTED (see 2026-05-29 update):** `wuwaflex`/`wuwa flex` carry ~3,500 impressions at sub-1% CTR, but this is **not a target**. wuwaflex is a competitor; the build-card export those searchers want is a fraction of our use case (core = scanner + leaderboards + calculator). We do not chase the brand term.
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
* **Targeting "Flexing" Queries:** Search volume for `wuwaflex` (1,505 impressions, 0.07% CTR) and `wuwa flex` (2,064 impressions, 1.02% CTR) is massive but leaking. We must optimize layouts to position our showcase cards as the premier choice.
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

## Actionable Recommendations (Next Steps)

> Status legend: **shipped** — verified in current code. **pending** — not yet implemented at audit re-review time.

### 1. Leverage Competitor Search Volume ("wuwaflex") — **pending**
* **Action:** To capture searches for `wuwaflex`, insert a subtle FAQ or description block on the homepage or `/edit` page detailing our build card exporter as a "high-quality wuwaflex alternative for build showcases".
* **Impact:** This signals to search engine crawlers that the page is a highly relevant result for those search keywords.
* **Status:** Keywords list in `app/layout.tsx` already includes `wuwaflex`, but no on-page FAQ/description copy has been added to `/` or `/edit` to anchor the term.

### 2. Multi-Locale SEO Target (Vietnam & Japan) — **pending**
* **Action:** Since Vietnam (14%) and Japan (12%) make up over a quarter of your actual active traffic, translating route metadata and game data values server-side represents the highest visibility scaling opportunity.
* **Next Steps:** Prioritize Japanese and Vietnamese localization directories using a routing middleware like `next-intl` to allow search engines to crawl and index `/ja/characters/[id]` and `/vi/characters/[id]`.
* **Status:** `next-intl` is not installed; no `/ja`, `/vi`, or other locale-prefixed app routes exist. Client-side `LanguageProvider` still drives in-page i18n only.

### 3. Google Search Console Sitemap Refresh — **operational (out of repo)**
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

### Roadmap (phased)

- **Phase 0 — SSR gate fix:** ✅ **SHIPPED** (this update). Gates the value of everything below.
- **Phase 1 — Stop SEO pages triggering the 6.5 MB fetch.** CWV win on the ranking pages. Does not touch `/edit` or `/leaderboards`.
- **Phase 2 — Internal links.** Homepage resonator directory grid (editorial style, lazy portraits, two crawlable anchors/card → `/characters/[id]` + `/leaderboards/[id]`) + leaderboard→character breadcrumb loop. Fixes near-orphaned character pages (currently only linked from weapon pages).
- **Phase 3 — Schema + hero H1.** `FAQPage`, `Organization`, `WebSite`/`SearchAction` JSON-LD; keyword eyebrow restoring the hero's missing eyebrow pattern.
- **Phase 4 — Leaderboard-driven prose on character pages** (+ `revalidate` ISR, low-data fallback). Unique, auto-updating data competitors can't replicate — the real lever for `[character] build` queries.
- **Later — Split `Characters.json`** (lean index + on-demand detail); evaluate i18n (`/ja`, `/vi`) given ~25% non-English demand (heavy: `next-intl`, locale routes, hreflang, fully translated content — do not ship thin machine-translated locales).

### Product-direction corrections

- **"wuwaflex" conquesting is REJECTED.** wuwaflex is a competitor we don't want to emulate; the build-card export those searchers want is a fraction of the use case (core = scanner + leaderboards + calculator). Do not add "alternative" copy. The `wuwaflex` entry lingering in the `app/layout.tsx` keywords array should be removed (it's also ignored by Google regardless).
