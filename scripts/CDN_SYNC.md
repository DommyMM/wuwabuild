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

## What Gets Synced

Each character JSON includes:

| Field | Description |
|-------|-------------|
| `id` | Character ID (e.g., 1205) |
| `name` | English name |
| `rarity` | Stars, color |
| `weapon` | Weapon type with icon URL |
| `element` | Element with color and icon URLs |
| `icon` | Character icon URLs (face, banner, etc.) |
| `skins` | All skins with their icon URLs |
| `stats` | Base stats (HP, ATK, DEF, Crit, CritDMG) |
| `chains` | Resonance chain (constellation) data |
| `skillTrees` | Forte tree node data |
| `skill` | All skill data with multipliers |
| `tags` | Role tags (DPS, Support, etc.) |
| `info` | Birthday, country, etc. |

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
```

## Usage

### Characters

```bash
python sync_characters.py --fetch                     # Sync all → Characters.json (default)
python sync_characters.py --fetch --individual        # Write per-character files instead
python sync_characters.py --fetch --id 1205           # Sync single character
python sync_characters.py --fetch --dry-run --pretty  # Preview
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
| Character head | `icon.icon` |
| Character card/banner | `icon.banner` |
| Alt skin banner | `skins[1].icon.banner` (if exists) |
| Element icon | `element.icon["1"]` or `["7"]` |
| Skill icons | `skill[id].params.icon` |
| Chain icons | `chains[id].icon` |

## Migration from paths.ts

The following paths.ts logic can be simplified:

| paths.ts | Replaced by |
|----------|-------------|
| `ELEMENT_NAME_MAP` | `character.element.icon` |
| `SKILL_CDN_NAMES` | `character.skill[id].params.icon` |
| `getCharacterFacePaths()` | `character.icon.iconRound` |
| `getCharacterIconPaths()` | `character.icon.banner` |
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
| `description` | Flavor text (all languages) |
| `effect` | Passive effect description with `{0}` placeholders |
| `effectName` | Passive effect name |
| `params` | Refinement values per rank (5 levels per param) |
| `stats` | Lv1 base ATK + substat (attribute, value, isRatio) |

Skipped: `statsLevel` (use LevelCurve scaling), `ascensions` (material costs), test/placeholder weapons.

## Future: Echoes

Similar sync script can be created for:
- `/GameData/Grouped/Phantom/{id}.json`
