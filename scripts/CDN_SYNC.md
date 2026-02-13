# CDN Data Sync System

This system syncs game data from Wuthery's CDN to keep character/weapon/echo data up-to-date.

## Data Source

- **CDN Base**: `https://files.wuthery.com`
- **List API**: `POST /api/fs/list` (AList/OpenList server)
- **Download**: `GET /d/GameData/Grouped/Character/{id}.json`

## Architecture

```
wuwabuilds/
├── scripts/
│   ├── sync_characters.py    # Sync script
│   └── CDN_SYNC.md           # This file
├── public/Data/
│   ├── Characters/           # Individual character JSONs (synced from CDN)
│   │   ├── Changli.json
│   │   ├── Jiyan.json
│   │   └── ...
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

### Sync all characters
```bash
cd wuwabuilds/scripts
python sync_characters.py --fetch
```

### Sync single character
```bash
python sync_characters.py --id 1205
```

### Preview without saving
```bash
python sync_characters.py --id 1205 --dry-run --pretty
```

### Use local Character/ folder (if you have raw CDN data cached)
```bash
python sync_characters.py --input ../../Character
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

## Future: Weapons & Echoes

Similar sync scripts can be created for:
- `/GameData/Grouped/Weapon/{id}.json`
- `/GameData/Grouped/Phantom/{id}.json`
