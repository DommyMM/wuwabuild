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
LB_URL=https://lb.wuwabuilds.moe              # server-only, used by generic /api/lb/[...path] proxy
INTERNAL_API_KEY=shared_secret_here           # shared by /api/ocr, /api/lb/*, backend, lb
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

Import OCR requests use the `X-OCR-Region` header via the frontend `/api/ocr` proxy.
Leaderboard requests from browser code go through the generic `/api/lb/*` proxy, which adds `X-Internal-Key` server-side.

## LB + Builds Current Status (2026-03-07)

- `/builds` route is live and wired to LB `GET /build` filters/sort/pagination plus detail expansion via `GET /build/{id}`.
- `/leaderboards` route is still placeholder.
- `/import` has an `Upload to Leaderboard` toggle in UI, but no leaderboard submission wiring is connected yet.
- `BuildEditor` still has a disabled `View Ranking` button with a TODO note for leaderboard logic.
- Go LB runtime is validated with migrated legacy data and single-pass canonical ingest (`make import DUMP=...`).
- API filtering should use canonical CDN IDs.
- Go LB currently has 8 registered server-side character calculation configs (carlotta, jinhsi, changli, camellya, zani, phoebe, cartethyia, jiyan).
- Latest migration verification includes:
  - full reimport + normalize succeeded (`11302` converted, `0` errors),
  - canonical repair succeeded (`11302` scanned, updates applied, `0` errors),
  - sample weapon mapping verified (`uid=901955607`, Camellya -> `weaponId 21020026`, rendered as Red Spring).
- Backend direction for this phase is:
  - **Go LB primary** (`/lb`, Chi + pgx + PostgreSQL).
  - **Node fallback** (`/mongo`, Express + MongoDB) until Go parity gates are met.
- See `docs/LB_MIGRATION_STATUS.md` for implementation parity, risks, and decision gates.

## Frontend Routes (Canonical, 2026-03-07)

| Route | Status | Entry | Primary Client Tree |
|-------|--------|-------|---------------------|
| `/` | Implemented | `app/page.tsx` | `components/home/*` + shared `Navigation` |
| `/builds` | Implemented | `app/builds/page.tsx` | `components/build/*` + `lib/lb.ts` |
| `/edit` | Implemented | `app/edit/page.tsx` | `components/edit/*`, `components/card/*`, `components/echo/*`, `components/forte/*`, selectors |
| `/import` | Implemented | `app/import/page.tsx` | `components/import/*`, `hooks/useOcrImport.ts`, `lib/import/*` |
| `/saves` | Implemented | `app/saves/page.tsx` | `components/save/*`, `lib/storage.ts`, `lib/legacyMigration.ts` |
| `/leaderboards` | Placeholder | `app/leaderboards/page.tsx` | Empty `<main>` shell only |

All routes render inside `app/layout.tsx` (`AppProviders` + `Navigation`), and all page state is context-driven.

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

- Entry: `app/builds/page.tsx` wraps `BuildPageClient` in `Suspense`.
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

- Entry: `app/edit/page.tsx` -> `DataLoadingGate` -> `BuildEditor()`.
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

- Entry: `app/import/page.tsx` -> `ImportPageClient()`.
- `ImportPageClient()`:
  - `handleFile(file)` validates size format (1920x1080) and DPI, then starts OCR.
  - `handleReset()`, `buildImportedState(wm)`, `doImport(wm)`, `saveImportToSaves(wm)`, `handleImport(wm)`.
  - `uploadToLb` toggle exists in UI but is currently not wired to leaderboard submission.
- `ImportUploader()`:
  - `isValidFile`, `handleFile`, document-level paste listener, drag/drop and file input handlers.
- `ImportResults()`:
  - Internal UI helpers: `Sk`, `ImageWithSkeleton`, `ProgressDot`, `EchoCard`.
  - Watermark override fields and import gating from OCR progress.
- OCR hook (`useOcrImport()`):
  - `reset()`, `processImage(file)`:
    - optional `/api/upload-training` fire-and-forget for full 1920x1080 images,
    - crops each region and posts parallel OCR calls with `X-OCR-Region`.
- Import conversion/utils:
  - `convert.ts`: `findByName`, `parseRoverInfo`, `convertAnalysisToSavedState`.
  - `echoMatching.ts`: `parseValue`, `normalizeStatName`, `matchEchoData`.
  - `cropImage.ts`: `getImageDpi`, `loadImage`, `cropImageToRegion`.
  - `regions.ts`: canonical normalized OCR crop coordinates.
- API routes used by import:
  - `app/api/ocr/route.ts`: health proxy + OCR proxy with region header forwarding.
  - `app/api/upload-training/route.ts`: R2 dedupe/upload for training images (hash-keyed PNGs).

### `/saves`

- Entry: `app/saves/page.tsx` -> `SavesPageClient()`.
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

- Current implementation is intentionally minimal:
  - `app/leaderboards/page.tsx` returns an empty `<main className="min-h-screen bg-background">`.
  - No client component tree or data wiring yet.

## Architecture

### Context Provider Hierarchy

```
LanguageProvider          → i18n language state
  └─ GameDataProvider     → Loads all JSON data once, provides lookup helpers
      └─ BuildProvider    → Current build state via useReducer + localStorage
          └─ StatsProvider → Derived calculations from GameData + BuildState
              └─ ToastProvider → Transient feedback notifications
```

Wrapped by `AppProviders` in `contexts/index.tsx`. The `DataLoadingGate` component gates children behind game data loading.

### State Management

- **GameDataContext**: Loads all `/Data/*.json` files once at startup. Provides `useGameData()` hook with character/weapon/echo lookups and stat calculation helpers.
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

Organized by weapon type. Each weapon includes: `id`, `name` (all languages), `type`, `rarity`, `icon` URLs, `effect` (passive description with `{0}` placeholders), `params` (refinement values per rank), `stats` (base ATK + substat).

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

Current status (March 5, 2026): core frontend migration is complete for main user flows.

| Track | Scope | Status |
|-------|-------|--------|
| Frontend rewrite | App Router + providers + `/`, `/edit`, `/import`, `/saves` | Done |
| Builds surface | `/builds` list, filters, sort, pagination, LB fetch wiring | Live (fine-tuning in progress) |
| Leaderboard integration | `/leaderboards` page, `/import` leaderboard upload wiring, `/edit` View Ranking wiring | In Progress |
| LB backend cutover | Go `/lb` parity, migrations, submit normalization/backfill, Node fallback retirement | In Progress |

Primary remaining workstreams:
1. Fine-tune `/builds` behavior and UX polish.
2. Implement `/leaderboards` and wire it to LB endpoints.
3. Connect `/import` leaderboard submission toggle and `/edit` View Ranking action.
4. Close Go LB parity gates and remove Node fallback dependency.

## Related Services

| Service | Location | Tech | URL |
|---------|----------|------|-----|
| OCR Backend | `/backend/` | FastAPI + RapidOCR | https://ocr.wuwabuilds.moe |
| Leaderboard API (Primary) | `/lb/` | Go (Chi + pgx + PostgreSQL) | https://lb.wuwabuilds.moe |
| Leaderboard API (Fallback) | `/mongo/` | Express + MongoDB | https://lb.wuwabuilds.moe |
| Legacy Frontend | `/frontend/` | Next.js 15 (deprecated) | — |

Each has its own CLAUDE.md / README with documentation.
