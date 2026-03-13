# WuWaBuilds — Technical Reference

## Project Overview

WuWaBuilds is a Wuthering Waves build creator at [wuwabuilds.moe](https://wuwabuilds.moe). Players create, customize, and share character builds with real-time stat calculations, echo management, and build card export. The app is a full rewrite of the legacy `frontend/` codebase, using React Context providers for centralized state management.

**This is the active codebase** — located in `/wuwabuilds/`. The legacy `/frontend/` and backend services (`/backend/`, `/lb/`) are separate projects with their own documentation.


Data sync scripts (Python, run from `scripts/`):
```bash
python sync_characters.py --fetch    # Sync characters from CDN
python sync_weapons.py --fetch       # Sync weapons from CDN
python sync_echoes.py --fetch        # Sync echoes from CDN
python sync_fetters.py               # Sync sonata sets from CDN
python stat_translations.py          # Sync stat i18n + icon URLs from CDN
python sync_backend.py               # Write backend/Data JSON from public/Data
python sync_lb.py                    # Generate lb/internal/calc/data + weapon_buffs_gen.go
python sync_all.py                   # Run full sync pipeline (frontend + backend + lb generation)
python download_echo_icons.py --clean --force  # Refresh backend echo template PNGs by CDN ID
```

## Environment Variables

```
NEXT_PUBLIC_GA_TRACKING_ID=G-SP375JKDPX
API_URL=https://ocr.wuwabuilds.moe            # server-only, used by /api/ocr proxy
LB_URL=https://db.wuwabuilds.moe              # server-only, used by generic /api/lb/[...path] proxy
INTERNAL_API_KEY=shared_secret_here           # shared by /api/ocr, /api/lb/*, backend, lb
NEXT_PUBLIC_POSTHOG_KEY=phc_...
CLOUDFLARE_ACCOUNT_ID=...                     # optional, R2 screenshot/report storage
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

Import OCR requests use the `X-OCR-Region` header via the frontend `/api/ocr` proxy.
Leaderboard requests from browser code go through the generic `/api/lb/*` proxy, which adds `X-Internal-Key` server-side.
When R2 is configured, `/import` also uploads deduplicated source screenshots and can persist OCR issue reports as JSON objects.

## Analytics

### Google Analytics
- **Package**: `@next/third-parties`
- **Implementation**: `GoogleAnalytics` component in `app/layout.tsx`
- **Tracking**: Automatic pageviews across all routes

### PostHog
- **Implementation**: Client-side initialization via `instrumentation-client.ts` (Next.js 15.3+ pattern) with reverse proxy configured in `next.config.ts`

### Tracked Events (7 total)

High-value conversion events optimized for PostHog free tier (1M events/month):

| Event | Description | File |
|-------|-------------|------|
| `build_card_downloaded` | User downloads build card PNG | `components/edit/BuildEditor.tsx` |
| `build_saved` | User saves build via Save modal | `components/save/SaveBuildModal.tsx` |
| `import_completed` | User completes OCR import flow | `components/import/ImportPageClient.tsx` |
| `ocr_issue_report_submitted` | User submits an OCR issue report from `/import` | `components/import/ImportPageClient.tsx` |
| `builds_exported_all` | User exports all builds to JSON | `components/save/SavesPageClient.tsx` |
| `builds_imported` | User imports builds from JSON | `components/save/SavesPageClient.tsx` |
| `builds_session_summary` | Session aggregation (expansion count on /builds unmount) | `components/build/BuildPageClient.tsx` |

## LB + Builds Current Status (2026-03-10)

- `/builds` route is live and wired to LB `GET /build` filters/sort/pagination plus detail expansion via `GET /build/{id}`.
- `/builds`, `/leaderboards`, and `/leaderboards/[characterId]` are all **SSR-prefetched** — current query rendered server-side (2-minute ISR), hydrated directly into client state, silently revalidated on mount using diff-based ref signatures.
- `/leaderboards` route is **live** — overview page + per-character pages implemented.
- `/import` uploads to LB through `POST /api/lb/build` when `Upload to Leaderboard` is enabled, sending canonical `buildState` only and letting `/lb` derive stats/CV/echo summaries server-side.
- `/import` also supports manual OCR issue reporting backed by R2 screenshot storage and JSON report objects.
- `BuildEditor` has a `View Ranking` button that routes to the selected character leaderboard.
- Go LB runtime is validated with migrated legacy data and single-pass canonical ingest (`make import DUMP=...`).
- API filtering should use canonical CDN IDs.
- Frontend LB clients now use repeated query params for multi-value filters where the backend expects them, and canonical leaderboard routes use `weaponId + track` rather than `weaponIndex`.
- Go LB currently has 9 registered character configs (`carlotta`, `jinhsi`, `changli`, `camellya`, `zani`, `phoebe`, `cartethyia`, `jiyan`, `lupa`), but `lupa` is still a placeholder with no tracks/team config.
- Frontend leaderboard track migration is live: `lib/lb.ts`, `lib/lbServer.ts`, and `components/leaderboard/*` now model `track`/`tracks` only.
- DB index suite updated via migration 002: sort indexes corrected to `NULLS LAST`, dead GIN indexes removed, stat sort indexes added.
- Backend direction for this phase is:
  - **Go LB primary** (`/lb`, Chi + pgx + PostgreSQL).
  - **Node fallback** (`/mongo`, Express + MongoDB) until Go parity gates are met.
- See `docs/LB_MIGRATION_STATUS.md` for implementation parity, risks, and decision gates.

### SSR prefetch architecture (`lib/lbServer.ts`)

- `lbServer.ts` is a server-only module that fetches directly from `LB_URL` with `X-Internal-Key`, bypassing the `/api/lb` proxy.
- `PREFETCH_TTL_S = 120` (2 minutes) — single constant shared across all three prefetch functions.
- Three exports: `prefetchBuilds()`, `prefetchLeaderboardOverview()`, `prefetchLeaderboard(characterId, query?)` — each returns typed data or `null` on error.
- Page server components call the prefetch function and pass `initialData` to the client component.
- Client components treat `initialData` as the SSR result for the current URL, not only the default query.
- Diff-based refs (`buildListSigRef`, `leaderboardSigRef`, `overviewSigRef`) track current state signature and skip `setState` if data hasn't changed after revalidation.

## Frontend Routes (Canonical, 2026-03-09)

| Route | Status | Entry | Primary Client Tree |
|-------|--------|-------|---------------------|
| `/` | Implemented | `app/page.tsx` | `components/home/*` + shared `Navigation` |
| `/builds` | Implemented | `app/(game)/builds/page.tsx` | `components/build/*` + `lib/lb.ts` |
| `/edit` | Implemented | `app/(game)/edit/page.tsx` | `components/edit/*`, `components/card/*`, `components/echo/*`, `components/forte/*`, selectors |
| `/import` | Implemented | `app/(game)/import/page.tsx` | `components/import/*`, `hooks/useOcrImport.ts`, `lib/import/*` |
| `/saves` | Implemented | `app/(game)/saves/page.tsx` | `components/save/*`, `lib/storage.ts`, `lib/legacyMigration.ts` |
| `/leaderboards` | Implemented | `app/(game)/leaderboards/page.tsx` | `components/leaderboard/*` + `lib/lb.ts` |
| `/leaderboards/[characterId]` | Implemented | `app/(game)/leaderboards/[characterId]/page.tsx` | `components/leaderboard/*` + `lib/lb.ts` |

`app/layout.tsx` now stays lightweight (`RootProviders` + `Navigation`) while game-data routes render under `app/(game)/layout.tsx`, which mounts `ToolProviders` and the game-data loading gate only for pages that need the data bundle.
This matches the Next.js App Router route-group convention for opting only a subset of segments into a shared layout. Route-local implementation files remain safely colocated under `app` because only `page.tsx` and `route.ts` create public routes.

## Page-By-Page Function Inventory

### `/` Home

- Entry: `app/page.tsx` -> `HomePage()`.
- `Navigation()`:
  - `checkMobile()` (inside `useEffect`) tracks viewport and mobile sidebar mode.
  - `closeSidebar()`, `isActive(path)` for link state.
  - Body-scroll lock `useEffect` when mobile sidebar is open.
- `HomePage()` composes `Typewriter`, `Carousel`, `CTACards`, `Disclaimer`.
- `Typewriter()`:
  - Cycles `FEATURES` with typing/deleting loop via timed `useEffect`.
- `Carousel()`:
  - `isMobileViewport()`, resize effect, 4s autoplay interval effect.
  - `getCardStyle(index)` computes 3D desktop transform vs single-card mobile mode.
  - `isActive(index)` controls play/pause overlay visibility.
- `CTACards()` renders animated links to `/import` and `/edit`.
- `Disclaimer()` renders legal disclaimer section.

### `/builds`

- Entry: `app/(game)/builds/page.tsx` seeds `BuildPageClient` with SSR-prefetched data and lets the shared game-data gate own first-load loading behavior.
- `BuildPageClient()`:
  - Query/state bootstrap: `parseInitialQuery(...)`.
  - URL sync effect: `serializeQuery(querySnapshot)` + `router.replace(...)`.
  - Data effect:
    - cache read via `readCachedBuildList(cacheKey)`,
    - fetch via `listBuilds(...)` with `AbortController`,
    - stale-page correction (`setPage(nextPageCount)`),
    - cache write via `writeCachedBuildList(...)`.
  - Mutators: `addCharacter`, `addWeapon`, `addRegion`, `addSetFilter`, `addMainFilter`, `clearAllFilters`.
  - Computed pagination rank: `rankStart`.
- `BuildFiltersPanel()`:
  - Helpers: `toMainStatLabel`, `getRegionLabel`, `getSetSubSection`, `getMainSubSection`, `getCostOrder`, `getPieceOrder`, `getTypeTagLabel`.
  - Core handler: `handleSelectItem(item)` dispatches selected filter chip type.
  - Keyboard navigation: up/down/enter/escape/backspace behavior for filter command bar.
- `BuildResultsPanel()`:
  - Sort/presentation helpers:
    - `resolveRegionBadge`, `formatStatByKey`, `resolvePrimaryScalingStatKey`,
    - `resolveCharacterBaseScaling`, `resolveElementStatKey`,
    - `pickHighestStatKey`, `resolveBuildRowStatKeys`.
  - `SortHeaderMenu` handles sortable header + menu UX.
  - `handleSortRequest(nextSort)` toggles direction on same key.
  - Skeleton/loading/refresh overlay and first/skip/back/next/skip/last pagination controls.
- `BuildHeader()` is static descriptive header text.
- `BuildEntryCard()` exists in `components/build/BuildEntry.tsx` but is not currently mounted by `/builds`.
- Query/cache helpers:
  - `buildQuery.ts`: `parsePositiveInt`, `parseCSV`, `parseEchoSetCSV`, `parseEchoMainCSV`, `parseInitialQuery`, `serializeQuery`.
  - `buildCache.ts`: `readCachedBuildList`, `writeCachedBuildList`, plus internal cache integrity guards.
- LB API client (`lib/lb.ts`):
  - Response normalization pipeline (`normalizeStats`, `normalizeBuildState`, `normalizeBuildEntry`).
  - `listBuilds(query, signal)` serializes all current filters and calls `GET /build`.

### `/edit`

- Entry: `app/(game)/edit/page.tsx` -> `BuildEditor()` inside `GameDataLoadingGate` from the shared game layout.
- `BuildEditor()` orchestration:
  - Card/art helpers:
    - `clearArtState`, `handleToggleArtEditMode`, `handleGenerateCard`, `handleDownload`,
    - custom art flow: `handleCustomArtUpload`, `handleRemoveCustomArt`, `handleUseSplashArt`,
    - transform controls: `handleResetArtTransform`, `handleNudgeArt`, `handleZoomArt`.
  - Build actions: `handleResetBuild`, `handleOpenSaveModal`.
  - UX effects:
    - portal target resolution for compact nav toolbar,
    - scroll visibility tracking (`useScroll` + `useMotionValueEvent`),
    - weapon reset when character weapon type changes.
- `BuildActionBar()` central save/reset action strip (full and compact variants).
- `BuildCardOptions()`:
  - Emits `CardOptions` state (`source`, `showRollQuality`, `showCV`, `useAltSkin`) via `onChange`.
  - `handlePaste(field, max)` enforces username/UID input caps.
- `BuildCard()`:
  - Normalizes weapon main-stat icon key (`normalizeWeaponStatIconKey`),
  - calculates weapon stats and hover-match state,
  - orchestrates card subcomponents:
    - `CharacterPanel`, `SequenceStrip`, `NameGroup`, `WeaponGroup`,
    - `ForteCardSection`, `ActiveSetsSection`, `StatsTableSection`, `EchoSection`.
- Tooltip status:
  - `HoverTooltip` is currently fully synced in `/edit` build-card surfaces (sequence chains, forte/move details, active sets, and weapon passive details).
  - Planned next step is broader rollout to other relevant routes/components with dense stat metadata.
- Card subcomponents and key behavior:
  - `CharacterPanel()`:
    - drag/drop upload and pointer-drag art reposition (`handlePointerDown/Move/Up`, `queuePositionUpdate`, `flushPendingPosition`).
  - `SequenceStrip()`:
    - per-chain tooltip content (`resolveLocalizedText`) + active sequence rendering.
  - `WeaponGroup()`:
    - passive text interpolation via `renderTemplateWithHighlights` and rank-aware parameter substitution.
  - `ForteCardSection()`:
    - `buildMoveTooltipContent(...)` for move/inherent tooltips.
    - `NodeBadge()` internal badge renderer with hover-linked stat highlighting.
  - `StatsTableSection()`:
    - filters to active stats and current element DMG row.
    - `renderStatRow(...)` drives hover-linked highlight behavior.
  - `EchoSection()`:
    - `matchesEchoBonusCondition(...)` for first-panel conditional bonus activation.
    - per-pill hover synchronization and roll-tier color display.
  - `ActiveSetsSection()`:
    - `getFetterPieceTooltipModels(...)`, `getPieceLabel(...)`, `formatSetBonusValue(...)`.
    - tooltip fallback to normalized set bonuses when buff-id text is absent.
- Editor-side selectors and panels:
  - `CharacterSelector()`: rover dedupe (`deduplicateRovers`), filters (`toggleElement`, `toggleRarity`, `clearFilters`), selection (`handleSelect`).
  - `SequenceSelector()`: local fallback waveband path (`getLocalWavebandPath`), arc-node position map, click-to-toggle sequence.
  - `WeaponSelector()`: rarity filtering + weapon pick (`handleSelect`) + vertical rank slider.
  - `ForteGroup()`: bonus summaries + per-column dispatch (`handleNodeClick`, `handleLevelChange`) + `Max All`.
  - `SkillBranch()`: level slider/edit input (`startEditing`, `finalize`, `handleSliderChange`), inherent node rendering for tree3.
  - `ForteNode()`: stat node activation button.
  - `EchoGrid()`: dnd-kit reorder (`handleDragEnd`) + `EchoCostBadge`.
  - `EchoPanel()`: `handleEchoSelect`, `handleLevelChange`, `handleMainStatChange`, `handleSubstatChange`, `handleClear`.
  - `EchoSelector()`: set/cost filtering (`toggleSetFilter`, `clearFilters`, `renderCostColumn`), mobile cost tabs.
  - `StatSelector.tsx`:
    - `MainStatSelector` (`getValueForStat`, `handleStatChange`),
    - `SubstatSelector` (`handleStatChange`, `handleValueChange`),
    - `SubstatsList` (`getUsedStatsForIndex`).

### `/import`

- Entry: `app/(game)/import/page.tsx` -> `ImportPageClient()`.
- `ImportPageClient()`:
  - `handleFile(file)` validates the 1920x1080 screenshot, starts OCR, and kicks off best-effort screenshot upload to R2 in parallel.
  - `handleReset()`, `buildImportedState(wm)`, `uploadImportedState(buildState)`, `doImport(wm)`, `saveImportToSaves(wm)`, `handleImport(wm)`.
  - `submitIssueReport(note)` posts screenshot-linked JSON diagnostics to `/api/report-ocr-issue`.
  - Leaderboard submission goes through `lib/lb.ts -> submitBuild(buildState)`, posting only canonical `buildState` to `/api/lb/build`.
- `ImportUploader()`:
  - `isValidFile`, `handleFile`, document-level paste listener, drag/drop and file input handlers.
- `ImportResults()`:
  - Internal UI helpers: `Sk`, `ImageWithSkeleton`, `ProgressDot`, `EchoCard`.
  - Watermark override fields, import gating from OCR progress, and a generic `Report Scan Issue` action.
- `ReportIssueModal()`:
  - Collects an optional note, explains attached diagnostics, and submits the issue payload.
- OCR hook (`useOcrImport()`):
  - `reset()`, `processImage(file)`:
    - crops each region and posts parallel OCR calls with `X-OCR-Region`.
- Import conversion/utils:
  - `convert.ts`: `findByName`, `parseRoverInfo`, `convertAnalysisToSavedState`.
  - `echoMatching.ts`: `parseValue`, `normalizeStatName`, `matchEchoData`.
  - `cropImage.ts`: `getImageDpi`, `loadImage`, `cropImageToRegion`, `encodeImageFileAsJpegBase64`.
  - `report.ts`: OCR issue payload types + default reason resolution.
  - `regions.ts`: canonical normalized OCR crop coordinates.
- API routes used by import:
  - `app/api/ocr/route.ts`: health proxy + OCR proxy with region header forwarding.
  - `app/api/upload-training/route.ts`: R2 dedupe/upload for import screenshots (root-level hash-keyed JPEGs like `<hash>.jpg`).
  - `app/api/report-ocr-issue/route.ts`: stores OCR issue reports as JSON linked to the uploaded screenshot key.
  - `app/api/upload-bucket/route.ts`: compatibility alias to `upload-training`; no longer the canonical name.
- Server storage helpers:
  - `lib/server/r2.ts`: shared R2 client, root-level hash image keys, and `reports/YYYY/MM/DD/<reportId>.json` object-key helpers.

#### OCR report storage layout

- Screenshot uploads are deduplicated JPEG objects stored at the bucket root with keys like `<sha256-16>.jpg`.
- OCR issue reports are JSON text objects stored under `reports/YYYY/MM/DD/<reportId>.json`.
- Report payloads include:
  - screenshot key
  - OCR progress by region
  - raw OCR `analysisData`
  - converted `SavedState` when conversion succeeds
  - surfaced validation / OCR / leaderboard-upload errors
  - optional user note
- First-pass operations are manual: no webhook, bot, or database dependency is required.

### `/saves`

- Entry: `app/(game)/saves/page.tsx` -> `SavesPageClient()`.
- `SavesPageClient()`:
  - load/refresh: `refreshBuilds`, `refreshLegacySummary`.
  - actions:
    - `handleExportAll`, `handleImport`, `handleDeleteAll`,
    - `handleLoadBuild` + `confirmLoadBuild`,
    - `handleDeleteBuild` + `confirmDeleteBuild`,
    - `handleRenameBuild`,
    - `handleMigrateLegacy`, `confirmDeleteLegacy`.
  - helpers:
    - `isV2StateShape`, `isV2ImportPayload`,
    - filter chips: `addFilterSuggestion`, `removeCharacterFilter`, `removeWeaponFilter`,
    - keyboard behavior: `handleFilterInputKeyDown`.
- `BuildList()` / internal `BuildItem()`:
  - renaming helpers: `beginRename`, `cancelRename`, `submitRename`, `handleRenameKeyDown`.
  - preview expansion with character/weapon/forte/echo/watermark sections.
  - `OverflowMarquee` (and `ResizeObserver`) for long stat/echo labels.
- `SaveBuildModal()`:
  - validates name + persists current build (`handleSave`), keyboard submit (`handleKeyDown`).
  - preview snapshot includes CV, sets, echoes, forte-node count.
- Storage/migration backend:
  - `lib/storage.ts`: `loadBuilds`, `saveBuild`, `mergeBuilds`, `loadBuild`, `deleteBuild`, `duplicateBuild`, `renameBuild`, `clearAllBuilds`, `exportBuild`, `exportAllBuilds`, `importBuild`, `getStorageStats`.
  - `lib/legacyMigration.ts`: legacy ID extraction/mapping + shape conversions + storage summary/read/clear helpers.

### `/leaderboards`

- Entry: `app/(game)/leaderboards/page.tsx` → `LeaderboardOverviewClient`.
- `LeaderboardOverviewClient()`:
  - Fetches `GET /api/lb/leaderboard` via `listLeaderboardOverview(signal)`.
  - **Per-track rows**: the API returns one row per (character × track), so Changli with 4 tracks yields 4 rows. Characters sorted by total entry count (most popular first).
  - Grid: `# | Character (portrait + name + track label subtitle) | Team | Top runs (weapon cards) | Entries`.
  - `#` column: plain sequential index (no circle badge).
  - Character portrait: bare `<img className="h-12 w-12 rounded-2xl">`, no border wrapper, no element icon overlay.
  - Team portraits: direct `<img className="h-9 w-9 rounded-xl">`, no border wrapper — empty for solo tracks.
  - Weapon cards: icon + damage number + owner username; no weapon name text, no inner border box; `title={weaponName}` for tooltip.
  - Track label rendered as a subtitle under character name (e.g. "Hypercarry", "Solo").
  - No track toggle chips — track is baked into each row.
  - Row key: `` `${entry.id}:${entry.trackKey}` ``.
  - `overviewSignature` includes `trackKey` for diff-based SSR revalidation.
  - `LBCharacterOverview` shape: `id`, `trackKey`, `trackLabel`, `totalEntries`, `weapons[]`, `weaponIds[]` (derived), `teamCharacterIds[]`.

### `/leaderboards/[characterId]`

- Entry: `app/(game)/leaderboards/[characterId]/page.tsx` → `LeaderboardCharacterClient`.
- `LeaderboardCharacterClient()`:
  - Fetches `GET /api/lb/leaderboard/{characterId}?weaponId=&track=&sort=&...` via `listLeaderboard(id, query, signal)`.
  - Uses backend-returned `tracks`, `activeTrack`, `activeWeaponId`, and `teamCharacterIds` directly.
  - State: `page`, `pageSize`, `sort` (default `damage`), `direction`, local `weaponIndex` for tab rendering, canonical `weaponId`, `track`, plus echo/region/uid/username filters.
  - `configWeaponIds`, `configTracks`, and `configTeamCharacterIds` state are populated from the API response; SSR prefetch now seeds the exact selected board from the current URL.
  - URL sync persists canonical `weaponId`, `track`, `sort`, `direction`, `page`, `pageSize`, and filter params; `weaponId` and `track` are always present, and legacy `weaponIndex` URLs are rewritten to canonical URLs.
  - Reuses `BuildFiltersPanel` (with empty `characters`/`weaponList` to hide those sections) and `LeaderboardResultsPanel`.
- `LeaderboardResultsPanel()`:
  - Table header: `# | Owner | Weapon | Seq | Sets | Damage | CV+Stats`.
  - Damage column is primary sort; CV+Stats group reuses `SortHeaderMenu`.
  - `globalRank` is the board's absolute rank for the selected `weaponId + track`, independent of the current display sort.
  - Reuses `BuildPagination`.
- `LeaderboardRow()`:
  - Rank display uses `globalRank`, which always means best damage on the current board = `#1`.
  - Gold/silver/bronze styling for top 3.
  - Compact row payload comes from `/leaderboard/{characterId}`; full `buildState` is fetched on demand via `GET /build/{buildId}` when the row expands.
  - Expanded rows pass the current board's `damage`, `weaponId`, and `track` into `BuildExpanded`, so board-context UI can render without another list query.
- `BuildExpanded()` / `BuildSimulationSection()`:
  - Move breakdown and substat upgrades stay as two separate lazy endpoints:
    - `GET /api/lb/build/{id}/moves/{weaponId}/{track}`
    - `GET /api/lb/build/{id}/substat-upgrades/{weaponId}/{track}`
  - The expanded row now renders in this order:
    - `View in Editor`
    - move toggle
    - move content
    - substat toggle
    - substat content
  - Both endpoints fetch only after the user opens the relevant toggle inside an already-expanded row.
  - `BuildSimulationSection.tsx` owns the lazy fetch/cache state and toggle state only; rendering is split into:
    - `BuildMoveBreakdown.tsx`
    - `BuildSubstatUpgrades.tsx`
  - Move breakdown is a frontend-rendered raw SVG visualization, not a chart-library dependency.
  - Current move visualization is a single move-level pie chart with a custom hover tooltip.
  - Individual hit/sub-move breakdown stays in the move list on the right rather than being rendered as a second chart ring.
  - The move section intentionally does not repeat weapon / track text inside the chart block because that context is already visible in the row header.
  - Substat upgrades payload is interpreted as **damage gain over the current board result** for one additional min / median / max roll.
  - The frontend derives the displayed projected damage (`base board damage + gain`) locally from the leaderboard row's already-loaded `damage`.
  - Upgrade columns use canonical substat ordering matching build substat summaries (crits first, then natural stat order, flat stats last), not "largest gain first".
  - Projected leaderboard rank is intentionally not shown yet; adding it cleanly would require a backend rank-projection query rather than client inference.
- `WeaponCards` / `TrackTabs`: private sub-components inside `LeaderboardTabs.tsx`; track tabs render backend labels from `{ key, label }`.
- `LeaderboardHeader` now receives `teamCharacterIds` on the character page and renders team portraits above the table.
- `leaderboardConstants.ts`: exports `LB_TABLE_GRID`, `DEFAULT_LB_SORT`, and `DEFAULT_LB_TRACK`.

## Architecture

### Context Provider Hierarchy

```
RootProviders (app/layout.tsx)
└─ LanguageProvider       → i18n language state used by Navigation and app UI

ToolProviders (app/(game)/layout.tsx)
└─ GameDataProvider       → Client-cached JSON bundle for tool routes only
   └─ ToastProvider       → Transient feedback notifications
      └─ GameDataLoadingGate → Blocks tool pages until game data is ready

EditorProviders (nested on /edit, /characters/[id], /weapons/[id])
└─ BuildProvider          → Current build state via useReducer + localStorage
   └─ StatsProvider       → Derived calculations from GameData + BuildState
```

### State Management

- **GameDataContext**: Loads all `/Data/*.json` files client-side for tool routes, memoizes the processed result in a module-level singleton cache, and provides `useGameData()` lookup/calculation helpers.
- **BuildContext**: `useReducer`-based state with debounced localStorage persistence. Provides `useBuild()` hook with action dispatchers for all build modifications.
- **StatsContext**: Purely derived — recalculates whenever GameData or BuildState changes. Provides final stats, CV, set bonuses, stat breakdowns.

### Key Data Flow

```
User interaction → BuildContext dispatch → BuildState updates →
StatsContext recalculates → Components re-render with new stats
```

## Core Types

### ForteState (Compact Tuple Array)

```typescript
type ForteEntry = [level: number, topNode: boolean, middleNode: boolean];
type ForteState = [ForteEntry, ForteEntry, ForteEntry, ForteEntry, ForteEntry];
// Column order: normal-attack(0), skill(1), circuit(2), liberation(3), intro(4)
// Example maxed: [[10,true,true], [10,true,true], [10,true,true], [10,true,true], [10,true,true]]
```

### SavedState (Build State)

```typescript
interface SavedState {
  characterId: string | null;
  characterLevel: number;        // 1-90
  roverElement?: string;         // For Rover only
  sequence: number;              // 0-6
  weaponId: string | null;
  weaponLevel: number;           // 1-90
  weaponRank: number;            // 1-5
  forte: ForteState;
  echoPanels: EchoPanelState[];  // 5 panels
  watermark: WatermarkState;
  verified?: boolean;
}
```

### EchoPanelState

```typescript
interface EchoPanelState {
  id: string | null;
  level: number;                          // 0-25
  selectedElement: string | null;         // Sonata set element
  stats: {
    mainStat: { type: string | null; value: number | null };
    subStats: Array<{ type: string | null; value: number | null }>;  // Max 5
  };
  phantom: boolean;
}
```

## Game Data (CDN-Synced)

Data is synced from Wuthery's CDN (`https://files.wuthery.com`) using Python scripts. See `scripts/CDN_SYNC.md` for full details.

### Characters.json

Each character includes: `id`, `name` (all languages), `rarity`, `weapon` type, `element` with icons, `icon` URLs (face, banner), `skins`, `stats` (base HP/ATK/DEF), `tags` (Role), `skillTrees` (8 forte stat nodes with icons), `skillIcons` (direct CDN URLs per skill type), `chains` (6 resonance chain entries with icons), `legacyId`.

The `skillIcons` field provides direct CDN URLs keyed by type: `normal-attack`, `skill`, `liberation`, `intro`, `circuit`, `outro`, `inherent-1`, `inherent-2`. This replaces the old `paths.ts` approach of constructing URLs manually.

### Weapons.json

Flat JSON array of weapon objects. Each weapon includes: `id`, `legacyId`, `name` (all languages), `type`, `rarity`, `icon` URLs, `effect` (passive description with `{0}` placeholders), `effectName`, `params` (refinement values per rank), `stats` (base ATK + substat), and optional `unconditionalPassiveBonuses`.

### Echoes.json

Each echo: `id`, `legacyId`, `name` (all languages), `cost` (1/3/4), `fetter` (raw IDs → mapped to sonata sets via `FETTER_MAP`), `element` (raw numbers → mapped to element names), `icon`/`phantomIcon` (CDN paths), `bonuses` (first-panel stat bonuses if any).

### Fetters.json

Each sonata set: `id`, `name` (all languages), `icon` (direct CDN URL), `pieceCount` (2 or 3), `addProp` (stat bonuses), `effectDescription` (all languages), `fetterIcon` (element icon URL).

### Fetter → Sonata Set Mapping

| Fetter ID | Set | Fetter ID | Set |
|-----------|-----|-----------|-----|
| 1 | Glacio | 14 | Tidebreaking |
| 2 | Fusion | 16 | Gust |
| 3 | Electro | 17 | Windward |
| 4 | Aero | 18 | Flaming |
| 5 | Spectro | 19 | Dream |
| 6 | Havoc | 20 | Crown |
| 7 | Healing | 21 | Law |
| 8 | ER | 22 | Flamewing |
| 9 | Attack | 23 | Thread |
| 10 | Frosty | 24 | Pact |
| 11 | Radiance | 25 | Halo |
| 12 | Midnight | 26 | Rite |
| 13 | Empyrean | 27-29 | Trailblazing/Chromatic/Sound |

No fetter ID 15 exists.

## Calculation Engine

### Character Stat Scaling

```
scaledStat = baseStat × (curve[level] / 10000)
```

Uses `CharacterCurve.json` for character stats and `LevelCurve.json` for weapon ATK/stat curves.

### Echo Default Stats

4-cost and 3-cost echoes provide built-in ATK. 1-cost provides HP. Calculated from cost and level:
- 4-cost: `30 + normalLevels×4.5 + bonusLevels×6`
- 3-cost: `20 + normalLevels×3 + bonusLevels×4`
- 1-cost: `456 + 72 + (level-1)×73` (for level > 0)

### Echo Main Stat Interpolation

```
value = min + ((max - min) × level / 25)
```

### Forte Bonus Calculation

8 stat nodes across 4 trees (tree3/circuit has no stat nodes):
- tree1 (col 0) & tree5 (col 4) → Bonus1 (element DMG / Crit Rate / Crit DMG / Healing)
- tree2 (col 1) & tree4 (col 3) → Bonus2 (ATK% / HP% / DEF%)
- Each node: top = 70% of base value, middle = 30% of base value

### CV (Crit Value)

```
CV = (2 × totalCritRate) + totalCritDMG
```

Ratings: goat (≥230), excellent (≥220), high (≥205), good (≥195), decent (≥175), low (<175)

### Set Bonuses

2-piece bonuses grant 10% of the set's stat (except Frosty Resolve = 12% Resonance Skill DMG Bonus). 5-piece bonuses are conditional. Three-piece-only sets: Dream, Crown, Law, Flamewing, Thread.

### Final Stat Calculation

```
finalStat = base × (1 + percent/100) + flat + echoDefault
```

Where `base` = character scaled + weapon scaled, `percent` = sum of all % sources (echo main/sub, weapon main, forte, set bonus), `flat` = sum of flat echo stats, `echoDefault` = built-in ATK/HP from echo cost/level.

## Special Cases

### Rover Handling
- Rover (M) id `"4"`, Rover (F) id `"5"` — detected via `name.startsWith('Rover')`
- Element stored separately in `roverElement` field
- Affects forte bonus type, Fleurdelys echo bonus, skill tree visuals

### Phantom Echoes
- 35+ special echoes with phantom skin variants
- `phantom` boolean on EchoPanelState toggles display

### Zani S2 Passive
- Character id `"38"` (Zani) at sequence ≥2 gains +20% Crit Rate

### Weapon "Attribute" Passive
- Weapons with `passive: "Attribute"` apply their passive% as the character's element DMG

### Echo Cost Validation
- Max total cost: 12
- Max 4-cost echoes: 2
- Max 3-cost echoes: 3

### Substat Deduplication
- Each stat type can only appear once per echo panel
- Same stat can appear across different panels

### Characters with Alternate Skins
- Jinhsi, Sanhua, Changli, Carlotta

## Theme & Styling

### Tailwind v4 Theme Variables

```css
--color-background: #121212
--color-background-secondary: #1E1E1E
--color-text-primary: #E0E0E0
--color-accent: #a69662          /* Gold accent */
--color-accent-hover: #bfad7d
--color-border: #333333
```

### Element Colors
```css
--color-glacio: #41AEFB    --color-fusion: #F0744E
--color-electro: #B46BFF   --color-aero: #55FFB5
--color-spectro: #F8E56C   --color-havoc: #E649A6
--color-rover: #7892A1
```

### Rarity Colors
```css
--color-rarity-4: #E400F0   --color-rarity-5: #CFB17F
```

### Custom CSS Classes
- `.char-sig.{element}` — Animated gradient text for element names
- `.level-slider` / `.rank-slider` / `.forte-level-slider` — Custom slider thumb styles
- `rover-rainbow` — Keyframe animation cycling all element border colors

## Code Conventions

### Path Alias
- `@/*` maps to project root (e.g., `@/components/...`, `@/contexts/...`)

### Component Patterns
- All page components are `'use client'` (App Router client components)
- Contexts export their own hooks: `useBuild()`, `useGameData()`, `useStats()`, `useLanguage()`
- Modals use the reusable `Modal` component from `components/ui/Modal.tsx`
- Level sliders use the reusable `LevelSlider` component with snap breakpoints at [1, 20, 40, 50, 60, 70, 80, 90]
- Tooltips use the reusable `HoverTooltip` component (`components/ui/HoverTooltip.tsx`); `/edit` is the current reference implementation before wider adoption.

### Naming Conventions
- Components: PascalCase files and exports
- Hooks: `use` prefix, camelCase
- Types/interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE
- CSS: Tailwind utility classes preferred; custom CSS only for complex animations/sliders

### Image Assets
- CDN base: `https://files.wuthery.com`
- Character/weapon/echo data now includes direct CDN URLs from sync scripts
- `paths.ts` is being deprecated in favor of direct URLs from data

## Migration Status

Current status (March 9, 2026): core frontend migration is complete for all user flows.

| Track | Scope | Status |
|-------|-------|--------|
| Frontend rewrite | App Router + providers + `/`, `/edit`, `/import`, `/saves` | Done |
| Builds surface | `/builds` list, filters, sort, pagination, SSR prefetch | Done |
| Leaderboard integration | `/leaderboards` overview + per-character pages; SSR prefetch; `/import` upload + `/edit` View Ranking | Done |
| LB backend cutover | Go `/lb` parity, migrations, submit normalization/backfill, Node fallback retirement | In Progress |

Primary remaining workstreams:
1. Close Go LB parity gates (dedupe constraint, globalRank CTE, echo backfill) and remove Node fallback dependency.
2. UX polish and fine-tuning.

## Domain Migration (wuwabuilds.moe → wuwa.build)

**Status**: Implemented in code, dormant until `wuwa.build` is added to Vercel.

Single Vercel deployment serves both domains once `wuwa.build` is wired. `www.wuwabuilds.moe` localStorage holds existing user saves (same origin as legacy); `wuwa.build` starts empty.

**`next.config.ts`**: redirects `www.wuwabuilds.moe/*` → `wuwa.build/*` except `/saves` (`permanent: false` during transition).

**`components/save/SavesPageClient.tsx`**: hostname-conditional banner between the search panel and legacy notices:
- On `www.wuwabuilds.moe`: "We've moved to wuwa.build — export here, import there"
- On `wuwa.build` (or any other host): "Coming from wuwabuilds.moe? Go export there first"

Cleanup: when `wuwabuilds.moe/saves` traffic drops to near zero, add `/saves` to the redirect list and remove banners.

## Related Services

| Service | Location | Tech | URL |
|---------|----------|------|-----|
| OCR Backend | `/backend/` | FastAPI + RapidOCR | https://ocr.wuwabuilds.moe |
| Leaderboard API (Primary) | `/lb/` | Go (Chi + pgx + PostgreSQL) | https://db.wuwabuilds.moe |
| Leaderboard API (Fallback) | `/mongo/` | Express + MongoDB | https://lb.wuwabuilds.moe |
| Legacy Frontend | `/frontend/` | Next.js 15 (deprecated) | — |

Each has its own CLAUDE.md / README with documentation.
