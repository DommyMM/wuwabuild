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
│   ├── sync_characters.py    # Character sync script
│   ├── sync_weapons.py       # Weapon sync script
│   └── CDN_SYNC.md           # This file
├── public/Data/
│   ├── Characters.json       # Combined character data (default output)
│   ├── Characters/           # Individual character JSONs (--individual)
│   ├── Weapons.json          # Combined weapon data (default output)
│   ├── Weapons/              # Individual weapon JSONs (--individual)
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
| Skill icons | `skill[id].params.icon` (with `--include-skills`) |

## Migration from paths.ts

The following paths.ts logic can be simplified:

| paths.ts | Replaced by |
|----------|-------------|
| `ELEMENT_NAME_MAP` | `character.element.icon` / `character.elementIcon` |
| `STAT_CDN_NAMES` (for forte) | `character.skillTrees[n].icon` |
| `getCharacterFacePaths()` | `character.icon.iconRound` |
| `getCharacterIconPaths()` | `character.icon.banner` |
| `Bonus1`/`Bonus2` heuristic | Derived from `skillTrees` node names |
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

## Future: Echoes

Similar sync script can be created for:
- `/GameData/Grouped/Phantom/{id}.json`
