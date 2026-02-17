# CDN Data Sync System

This system syncs game data from Wuthery's CDN to keep character/weapon/echo data up-to-date.

## Data Source

- **CDN Base**: `https://files.wuthery.com`
- **List API**: `POST /api/fs/list` (AList/OpenList server)
- **Download**: `GET /d/GameData/Grouped/{Character,Weapon}/{id}.json`

## Architecture

```
wuwabuilds/
├── scripts/
│   ├── sync_characters.py    # Character sync script (Python, CDN API)
│   ├── sync_weapons.py       # Weapon sync script (Python, CDN API)
│   ├── CDN_SYNC.md           # This file
│   └── (repo root)/scripts/
│       └── sync_echoes.js    # Echo sync script (Node, local Phantom/ repo)
├── public/Data/
│   ├── Characters.json       # Combined character data
│   ├── Characters/           # Individual character JSONs (--individual)
│   ├── Weapons.json          # Combined weapon data
│   ├── Weapons/              # Individual weapon JSONs (--individual)
│   ├── Echoes.json           # Combined echo data (193 echoes)
│   └── LevelCurve.json       # Static scaling data (manual)
```

## What Gets Synced — Characters

Each character JSON includes by default:

| Field | Description |
|-------|-------------|
| `id` | Character ID (e.g., 1205) |
| `name` | All languages |
| `rarity` | Stars, color |
| `weapon` | Weapon type with icon URL |
| `element` | Element with color and icon URLs |
| `icon` | Character icon URLs (face, banner) |
| `skins` | All skins with their icon URLs |
| `stats` | Base stats (HP, ATK, DEF, Crit, CritDMG) |
| `tags` | Role tags (DPS, Support, etc.) |
| `skillTrees` | Forte stat nodes (English-only, see below) |
| `skillIcons` | Skill icon URLs keyed by type (see below) |
| `chains` | Resonance chains / sequences (English-only, see below) |
| `legacyId` | Old sequential ID extracted from iconRound URL |

Optional with `--include-skills`:

| Field | Description |
|-------|-------------|
| `skill` | Full skill data with multiplier params |

### skillTrees (Forte Stat Nodes)

The `skillTrees` field is a flat array of the 8 forte stat nodes (2 per tree branch, excluding tree3/Forte Circuit which has no stat nodes). Each node tells us the exact bonus type, value, and icon:

```json
{
  "id": 746,
  "coordinate": 2,
  "parentNodes": [1],
  "name": "Crit. Rate+",
  "icon": "https://files.wuthery.com/d/.../T_Iconpropertyredbaoji_UI.png",
  "value": [{ "Id": 8, "Value": 120, "IsRatio": false }],
  "valueText": ["1.20%"]
}
```

- `coordinate`: `1` = middle/lower node, `2` = top/upper node
- `parentNodes`: maps to which skill branch — `[1]`=tree1, `[2]`=tree2, `[3]`=tree4, `[6]`=tree5 (for coord 1); `[9]`=tree1, `[10]`=tree2, `[11]`=tree4, `[12]`=tree5 (for coord 2)
- `name`: English stat name (e.g., "Crit. Rate+", "ATK+", "HP+", "DEF+")
- `icon`: Direct CDN URL to the stat icon — can be used in UI directly
- `value[0].IsRatio`: `true` = percentage (ATK%, HP%, DEF%), `false` = flat/base-points (Crit Rate, Crit DMG)

This replaces the old hardcoded `Bonus1`/`Bonus2` fields from the legacy frontend. Instead of guessing "this character has Crit Rate + ATK bonuses", we read them directly from CDN data.

### skillIcons (Skill Icon URLs)

The `skillIcons` field is a flat dict mapping skill type keys to their CDN icon URLs. Extracted from the raw `skill` field (`skill.<id>.params.icon`) for non-tree entries:

```json
{
  "normal-attack": "https://files.wuthery.com/d/.../SP_IconNorKnife.png",
  "skill": "https://files.wuthery.com/d/.../SP_IconAimisiB1.png",
  "liberation": "https://files.wuthery.com/d/.../SP_IconAimisiC1.png",
  "intro": "https://files.wuthery.com/d/.../SP_IconAimisiQTE.png",
  "circuit": "https://files.wuthery.com/d/.../SP_IconAimisiY.png",
  "outro": "https://files.wuthery.com/d/.../SP_IconAimisiT.png",
  "inherent-1": "https://files.wuthery.com/d/.../SP_IconAimisiD1.png",
  "inherent-2": "https://files.wuthery.com/d/.../SP_IconAimisiD2.png"
}
```

Keys map to CDN skill `type` field: `1`→normal-attack, `2`→skill, `3`→liberation, `4`→inherent-1/2, `5`→intro, `6`→circuit, `11`→outro.

This **replaces** the old `paths.ts` approach of constructing skill icon URLs from `SKILL_CDN_NAMES`, `SKILL_ICON_NAMES`, `getRoverVariant`, and special-case handling (Galbrena D1→1D1 etc.). The frontend now uses `character.skillIcons[skillKey]` directly.

### chains (Resonance Chains / Sequences)

The `chains` field is a flat array of 6 resonance chain entries (S1–S6), English-only:

```json
{
  "id": 271,
  "name": "Gilded Glimmer of the First Dawn",
  "description": "In <color=Highlight>...",
  "icon": "https://files.wuthery.com/d/.../T_IconDevice_AimisiM1_UI.png",
  "param": ["20%", "4", "300%", "10", "1"]
}
```

- `description`: Contains markup tags like `<color=Highlight>` and `<te href=...>` (game text formatting)
- `param`: Array of string values that fill `{0}`, `{1}`, etc. placeholders in the description

## Why CDN URLs?

The CDN data includes **direct image URLs** which eliminates the need for manual path mapping:

**Before (paths.ts approach):**
```typescript
// Had to manually map element names, construct URLs, handle edge cases
const ELEMENT_NAME_MAP = { 'Fusion': 'Fire', 'Glacio': 'Ice', ... };
const url = `${CDN_BASE}/IconElement${ELEMENT_NAME_MAP[element]}.png`;
```

**After (CDN data):**
```typescript
// Direct URLs from data
const url = character.element.icon["1"]; // Already complete URL
const faceUrl = character.icon.iconRound; // Direct URL
const statIcon = character.skillTrees[0].icon; // Forte node stat icon
```

## Usage

### Characters

```bash
python sync_characters.py --fetch                     # Sync all → Characters.json (default)
python sync_characters.py --fetch --individual        # Write per-character files instead
python sync_characters.py --fetch --id 1205           # Sync single character
python sync_characters.py --fetch --dry-run --pretty  # Preview
python sync_characters.py --fetch --include-skills    # Include full skill multiplier data
python sync_characters.py --input ../../Character     # From local files
```

### Weapons

```bash
python sync_weapons.py --fetch                        # Sync all → Weapons.json (default)
python sync_weapons.py --fetch --individual           # Write per-weapon files instead
python sync_weapons.py --fetch --id 21010015          # Sync single weapon
python sync_weapons.py --fetch --dry-run --pretty     # Preview
python sync_weapons.py --input ../../Weapon           # From local files
```

## Stat Scaling

Base stats from CDN are used with `LevelCurve.json` for scaling:

```
scaledStat = baseStat * ATK_CURVE[level]
```

The CDN's `statsLevel` field is redundant - our LevelCurve scaling matches it exactly.

## Icon URL Mapping

| Usage | CDN Field |
|-------|-----------|
| Character face (circle) | `icon.iconRound` |
| Character card/banner | `icon.banner` |
| Alt skin banner | `skins[1].icon.banner` (if exists) |
| Element icon (round) | `element.icon["1"]` |
| Element icon (shine) | `element.icon["7"]` |
| Forte stat node icon | `skillTrees[n].icon` |
| Chain/sequence icon | `chains[n].icon` |
| Skill icons (all types) | `skillIcons["normal-attack"]`, `skillIcons["skill"]`, etc. |
| Skill multiplier data | `skill[id].params` (with `--include-skills`) |

## Migration from paths.ts

The following paths.ts logic can be simplified:

| paths.ts | Replaced by |
|----------|-------------|
| `ELEMENT_NAME_MAP` | `character.element.icon` / `character.elementIcon` |
| `STAT_CDN_NAMES` (for forte) | `character.skillTrees[n].icon` |
| `getCharacterFacePaths()` | `character.icon.iconRound` |
| `getCharacterIconPaths()` | `character.icon.banner` |
| `Bonus1`/`Bonus2` heuristic | Derived from `skillTrees` node names |
| `SKILL_CDN_NAMES` / `SKILL_ICON_NAMES` / `getRoverVariant` | `character.skillIcons[skillKey]` (direct URLs) |
| Manual ID construction | Direct URLs from CDN |

## What Gets Synced — Weapons

Each weapon JSON includes:

| Field | Description |
|-------|-------------|
| `id` | Weapon ID (e.g., 21010015) |
| `name` | All languages |
| `type` | Weapon type (Broadblade/Sword/Pistol/Gauntlet/Rectifier) with icon |
| `rarity` | Star count (1-5) and color hex |
| `icon` | Icon URLs (full, medium, small) |
| `effect` | Passive effect description with `{0}` placeholders |
| `effectName` | Passive effect name |
| `params` | Refinement values per rank (5 levels per param) |
| `stats` | Lv1 base ATK + substat (attribute, value, isRatio) |

Skipped: `description` (flavor text), `statsLevel` (use LevelCurve scaling), `ascensions` (material costs), test/placeholder weapons.

## What Gets Synced — Echoes

Each echo JSON includes:

| Field | Description |
|-------|-------------|
| `id` | Phantom ID (e.g., 60000425) |
| `name` | All languages |
| `cost` | Echo cost (1, 3, or 4) |
| `fetter` | Raw fetter IDs — frontend maps to sonata set names |
| `element` | Raw element numbers — frontend maps to names |
| `icon` | Raw `/d/` icon paths (full, 160px, 80px) — frontend prepends CDN base |
| `phantomIcon` | Phantom skin icon paths (same structure as `icon`), if skin exists |
| `bonuses` | First-panel (main slot) stat bonuses, if any |

Optional with `--include-skills`:

| Field | Description |
|-------|-------------|
| `skill.description` | `descriptionEx` with `{N}` placeholders (all languages) |
| `skill.params` | `levelDescriptionStrArray` — values to fill placeholders |

### Echo Data Source

Echo data comes from the **local `Phantom/` repo** (not CDN API), containing 733 individual JSON files:

```
Phantom/
├── 60000012.json  (Vanguard Junrock, rarity 2)
├── 60000225.json  (Thundering Mephis, rarity 5, base)
├── 60001225.json  (Phantom: Thundering Mephis, rarity 5, skin → merged)
├── 60100425.json  (Phantom: Crownless, rarity 5, skin → merged)
├── ...
└── 60201015.json  (Phantom: Sigillum, phantomType 2 → skipped)
```

### Phantom Skin Merging

**Phantom skins** ("Phantom: X") are cosmetic variants with different icons but identical stats/skills. They are merged into their base echo as a `phantomIcon` field, not kept as separate entries.

**Nightmare echoes** ("Nightmare: X") are entirely different echoes with different stats, skills, and elements (like "mega evolutions"). They stay as separate entries and can also have their own phantom skins.

Matching: Strip "Phantom: " prefix and match by English name, with normalization for inconsistencies ("Phantom: Nightmare Crownless" → "Nightmare: Crownless", "Phantom: Twin Nova - Collapsar Blade" → "Twin Nova: Collapsar Blade").

**Result**: 34 phantom skins merged, 0 orphaned.

### Filtering & Result

- `phantomType === 1` only (filters out 63 `phantomType 2` cosmetic unlock items)
- `rarity.id === 5` only (5-star echoes)
- Deduplicated by English name
- Phantom skins merged into base echoes

**Result**: 159 unique echoes (37 cost-4, 50 cost-3, 72 cost-1), 34 with phantom skins

### Fetter → Sonata Set Mapping

The `fetter` array in each Phantom file maps to sonata set names. These are kept as raw IDs in Echoes.json — frontend maps them:

| Fetter | Set | Fetter | Set | Fetter | Set |
|--------|-----|--------|-----|--------|-----|
| 1 | Glacio | 11 | Radiance | 21 | Law |
| 2 | Fusion | 12 | Midnight | 22 | Flamewing |
| 3 | Electro | 13 | Empyrean | 23 | Thread |
| 4 | Aero | 14 | Tidebreaking | 24 | Pact |
| 5 | Spectro | 16 | Gust | 25 | Halo |
| 6 | Havoc | 17 | Windward | 26 | Rite |
| 7 | Healing | 18 | Flaming | 27 | Trailblazing |
| 8 | ER | 19 | Dream | 28 | Chromatic |
| 9 | Attack | 20 | Crown | 29 | Sound |
| 10 | Frosty | | | | |

No fetter 15 exists (gap in numbering).

### Element Number Mapping

The `element` array uses numeric IDs for the monster's innate element. Kept as raw numbers in Echoes.json — frontend maps them:

| Number | Element |
|--------|---------|
| 0 | Common |
| 1 | Glacio |
| 2 | Fusion |
| 3 | Electro |
| 4 | Aero |
| 5 | Spectro |
| 6 | Havoc |

### Main-Slot Bonuses (Auto-Extracted)

29 echoes have first-panel bonuses, extracted from skill description templates like:
```
"The Resonator with this Echo equipped in their main slot gains {1} Fusion DMG Bonus and {2} Resonance Skill DMG Bonus."
```

The `{N}` placeholders are resolved from `skill.levelDescriptionStrArray[0].ArrayString`. These bonuses replace the hardcoded `ECHO_BONUSES` in `frontend/src/types/echo.ts`.

### Echo Icon URLs

| Size | CDN Field | Phantom Skin |
|------|-----------|--------------|
| Full size | `icon.icon` | `phantomIcon.icon` |
| 160px | `icon.iconMiddle` | `phantomIcon.iconMiddle` |
| 80px | `icon.iconSmall` | `phantomIcon.iconSmall` |

All paths are raw `/d/` paths — frontend prepends CDN base URL.

### Usage

```bash
# From the repo root:
node scripts/sync_echoes.js                    # Sync all → wuwabuilds/public/Data/Echoes.json
node scripts/sync_echoes.js --dry-run --pretty # Preview without writing
node scripts/sync_echoes.js --include-skills   # Include echo skill descriptions
```

Skipped: `phantomType 2` (cosmetic unlock items), `rarity < 5`, `type`, `attributes` (generic equip text), `obtainedDescription`, redundant skill sub-fields (`id`, `cd`, `simplyDescription`).
