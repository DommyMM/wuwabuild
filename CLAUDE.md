# WuWaBuilds — Technical Reference

## Project Overview

WuWaBuilds is a Wuthering Waves build creator at [wuwabuilds.moe](https://wuwabuilds.moe). Players create, customize, and share character builds with real-time stat calculations, echo management, and build card export. The app is a full rewrite of the legacy `frontend/` codebase, using React Context providers for centralized state management.

**This is the active codebase** — located in `/wuwabuilds/`. The legacy `/frontend/` and backend services (`/backend/`, `/lb/`) are separate projects with their own documentation.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.0 (App Router) |
| React | 19.2.3 with TypeScript 5 |
| Styling | Tailwind CSS v4 + PostCSS |
| Animation | Motion 12.23.26 (Framer Motion successor) |
| Drag & Drop | @dnd-kit/core + sortable + utilities |
| Icons | Lucide React |
| Image Export | html-to-image |
| Fonts | Ropa (primary), Gowun Dodum (secondary) |
| Deployment | Vercel |

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

Data sync scripts (Python, run from `scripts/`):
```bash
python sync_characters.py --fetch    # Sync characters from CDN
python sync_weapons.py --fetch       # Sync weapons from CDN
python sync_echoes.py --fetch        # Sync echoes from CDN
python sync_fetters.py               # Sync sonata sets from CDN
python sync_all.py                   # Run full sync pipeline (frontend + backend transforms)
python sync_backend.py               # Write backend/Data JSON from public/Data
python download_echo_icons.py --clean --force  # Refresh backend echo template PNGs by CDN ID
```

## Environment Variables

```
NEXT_PUBLIC_GA_TRACKING_ID=G-SP375JKDPX
API_URL=https://ocr.wuwabuilds.moe            # server-only, used by /api/ocr proxy
NEXT_PUBLIC_LB_URL=https://lb.wuwabuilds.moe
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

Import OCR requests use the `X-OCR-Region` header via the frontend `/api/ocr` proxy.

## Project Structure

```
wuwabuilds/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout with AppProviders + Navigation
│   ├── page.tsx                      # Home page
│   ├── globals.css                   # Tailwind v4 theme + custom slider/animation styles
│   ├── edit/page.tsx                 # Build editor (main workspace)
│   ├── builds/page.tsx               # Global builds browser (WIP)
│   ├── import/page.tsx               # Discord image import (WIP)
│   ├── leaderboards/page.tsx         # Character rankings (WIP)
│   └── saves/page.tsx                # Saved builds management
│
├── contexts/                         # React Context providers
│   ├── index.tsx                     # AppProviders wrapper + DataLoadingGate
│   ├── GameDataContext.tsx           # Characters, weapons, echoes, curves, stats data
│   ├── BuildContext.tsx              # Build state (useReducer + debounced localStorage)
│   ├── StatsContext.tsx              # Derived stats from GameData + BuildState
│   ├── LanguageContext.tsx           # i18n language management
│   └── ToastContext.tsx              # Global toast notifications
│
├── components/
│   ├── build/                        # Main editor layout components
│   │   ├── BuildEditor.tsx           # Edit page orchestrator
│   │   ├── BuildActionBar.tsx        # Export/save/share action bar (portal to navbar)
│   │   ├── BuildCard.tsx             # Visual build card for export
│   │   ├── BuildCardOptions.tsx      # Card options and download
│   │   ├── CharacterPanel.tsx        # Character section in editor
│   │   ├── WeaponSection.tsx         # Weapon section in editor
│   │   ├── EchoesRowSection.tsx      # Echo panels section
│   │   ├── ForteCardSection.tsx      # Forte tree section
│   │   ├── StatsTableSection.tsx     # Final stats display
│   │   └── SequenceStrip.tsx         # Sequence selector strip
│   ├── character/
│   │   ├── CharacterSelector.tsx     # Modal: element/rarity filters, CDN icons, Rover dedup
│   │   ├── CharacterInfo.tsx         # Character details display
│   │   └── SequenceSelector.tsx      # Sequence 0-6 with CDN icons
│   ├── weapon/
│   │   ├── WeaponSelector.tsx        # Modal: type-filtered, rarity filters, rank slider
│   │   └── WeaponInfo.tsx            # Weapon display
│   ├── forte/
│   │   ├── ForteGroup.tsx            # Pyramid layout, bonus chips, Max All button
│   │   ├── SkillBranch.tsx           # CDN frames, level slider, inherent nodes
│   │   └── ForteNode.tsx             # CDN node icons, toggle activation
│   ├── echo/
│   │   ├── EchoGrid.tsx              # 5-panel echo grid with DND Kit
│   │   ├── EchoPanel.tsx             # Individual echo panel
│   │   ├── EchoSelector.tsx          # Echo selection modal
│   │   ├── SortableEchoPanel.tsx     # DND Kit reorderable wrapper
│   │   └── StatSelector.tsx          # Main/sub stat selection
│   ├── stats/
│   │   ├── StatsDisplay.tsx          # Full stats display
│   │   ├── StatRow.tsx               # Individual stat row
│   │   ├── StatBreakdown.tsx         # Stat source breakdown
│   │   └── CVDisplay.tsx             # CV value with rating
│   ├── home/
│   │   ├── HomePage.tsx              # Landing page
│   │   ├── Carousel.tsx              # Featured builds carousel
│   │   ├── CTACards.tsx              # Call-to-action cards
│   │   ├── QuickStart.tsx            # Getting started guide
│   │   ├── Typewriter.tsx            # Typewriter effect
│   │   └── Disclaimer.tsx            # Legal disclaimer
│   ├── save/
│   │   ├── SavesPageClient.tsx       # Saves management page
│   │   ├── BuildList.tsx             # Saved builds list
│   │   └── SaveBuildModal.tsx        # Save dialog
│   ├── ui/
│   │   ├── Modal.tsx                 # Reusable modal
│   │   └── LevelSlider.tsx           # Reusable level slider with breakpoint snaps
│   ├── Navigation.tsx                # Top nav bar with toolbar portal target
│   └── LanguageSwitcher.tsx          # Language selection
│
├── hooks/
│   ├── useSelectedCharacter.ts       # Derives banner/icon/i18n from character + state
│   ├── useLocalStorage.ts            # Local storage hook
│   └── useDebounce.ts                # Debounce hook
│
├── lib/
│   ├── build.ts                      # SavedState, ForteEntry/ForteState types, defaults
│   ├── character.ts                  # Character type, helpers (isRover, SKIN_CHARACTERS)
│   ├── weapon.ts                     # Weapon type, ScaledStats, WeaponState
│   ├── echo.ts                       # Echo types, EchoPanelState, ELEMENT_SETS, PHANTOM_ECHOES
│   ├── paths.ts                      # CDN path helpers (being replaced by direct CDN URLs)
│   ├── storage.ts                    # Build save/load/migrate with forte array migration
│   ├── calculations/
│   │   ├── stats.ts                  # Character stat scaling, forte bonus calculation
│   │   ├── echoes.ts                 # Echo stat summation, default stats
│   │   ├── cv.ts                     # CV = (2 × Crit Rate) + Crit DMG
│   │   └── setSummary.ts             # Echo set bonus calculation
│   └── constants/
│       ├── statMappings.ts           # Stat display names, icons, CDN names
│       ├── setBonuses.ts             # SET_TO_STAT mapping (19 sets)
│       └── echoBonuses.ts            # First-panel echo special bonuses (29 echoes)
│
├── scripts/
│   ├── CDN_SYNC.md                   # Data sync documentation
│   ├── sync_characters.py            # Character data sync from Wuthery CDN
│   ├── sync_weapons.py               # Weapon data sync
│   ├── sync_echoes.py                # Echo data sync
│   ├── sync_fetters.py               # Sonata set data sync
│   ├── sync_backend.py               # Transform public/Data into backend/Data OCR schema
│   ├── download_echo_icons.py        # Download backend echo templates as {id}.png
│   ├── sync_all.py                   # Run full frontend+backend sync pipeline
│   └── stat_translations.py          # Stat name translations
│
├── public/Data/                      # Static game data (JSON)
│   ├── Characters.json               # All characters with CDN URLs, stats, skillTrees, chains
│   ├── Weapons.json                  # All weapons by type with CDN URLs, stats, params
│   ├── Echoes.json                   # All echoes with cost, fetter IDs, icons, bonuses
│   ├── Fetters.json                  # Sonata sets with i18n names, icons, stat bonuses
│   ├── Mainstat.json                 # Echo main stat ranges by cost (4/3/1)
│   ├── Substats.json                 # Substat roll value arrays
│   ├── CharacterCurve.json           # Character level scaling multipliers
│   └── LevelCurve.json              # Weapon level ATK/stat scaling curves
```

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

See `MIGRATION_PLAN.md` for full details.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation (types, contexts, providers) | Done |
| 2 | Character components (selector, weapon, forte, sequence) | Done |
| 3 | Echo system (selectors, panels, stats, DND, cost validation) | In Progress |
| 4 | Stats & Build card (stats display, CV, set bonuses, build card redesign) | Planned |
| 5 | Polish (save/load, compression, OCR, mobile, performance) | Planned |

## Related Services

| Service | Location | Tech | URL |
|---------|----------|------|-----|
| OCR Backend | `/backend/` | FastAPI + RapidOCR | https://ocr.wuwabuilds.moe |
| Leaderboard API | `/lb/` | Express + MongoDB + Redis | https://lb.wuwabuilds.moe |
| Legacy Frontend | `/frontend/` | Next.js 15 (deprecated) | — |

Each has its own CLAUDE.md / README with documentation.
