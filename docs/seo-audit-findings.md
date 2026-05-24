# WuWaBuilds SEO Audit & Search Performance Analysis

Audit Date: 2026-05-24 (Updated with Google Search Console & Vercel Web Analytics)

---

## Executive Summary

A cross-analysis between **Google Search Console (GSC)** and **Vercel Web Analytics** reveals a significant search visibility opportunity:
1. **The Tool Traffic Gap:** Pages like `/import` (4.7K actual visitors) and `/edit` (3.9K actual visitors) are core product offerings used heavily by the community, yet they receive almost zero traffic from organic search (13 and 6 clicks respectively).
2. **Competitor Conquesting ("wuwaflex"):** Search terms like `wuwaflex` and `wuwa flex` represent a high-impression search volume (~3,500 total impressions) but yield a sub-1% click-through rate (CTR), as search engines did not associate our site as a primary target for "flexing" builds.
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

### 1. Leverage Competitor Search Volume ("wuwaflex")
* **Action:** To capture searches for `wuwaflex`, insert a subtle FAQ or description block on the homepage or `/edit` page detailing our build card exporter as a "high-quality wuwaflex alternative for build showcases".
* **Impact:** This signals to search engine crawlers that the page is a highly relevant result for those search keywords.

### 2. Multi-Locale SEO Target (Vietnam & Japan)
* **Action:** Since Vietnam (14%) and Japan (12%) make up over a quarter of your actual active traffic, translating route metadata and game data values server-side represents the highest visibility scaling opportunity.
* **Next Steps:** Prioritize Japanese and Vietnamese localization directories using a routing middleware like `next-intl` to allow search engines to crawl and index `/ja/characters/[id]` and `/vi/characters/[id]`.

### 3. Google Search Console Sitemap Refresh
* **Action:** After deploying these metadata changes, log into GSC and request a re-crawl of `sitemap.xml`.
* **Verification:** Monitor the **Pages** indexing report to ensure that `/edit`, `/import`, `/changelog`, `/privacy`, and `/tos` shift from "Discovered - currently not indexed" to "Indexed".
