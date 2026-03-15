"""
Sync Characters from Wuthery CDN to public/Data.

Fetches character data from CDN, transforms it using a schema (keeping all
languages), and writes to public/Data/Characters (combined or --individual).

Usage:
    python sync_characters.py --fetch                    # Sync all → combined Characters.json
    python sync_characters.py --fetch --id 1102          # Sync single from CDN
    python sync_characters.py --fetch --id 1102 --dry-run --pretty
    python sync_characters.py --fetch --individual       # Write per-character files instead
    python sync_characters.py --fetch --include-skills   # Include full skill multiplier data
"""

import json
import argparse
import re
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from cdn_config import CDN_BASE

# Regex to extract legacy ID from iconRound URL
# e.g. "T_IconRoleHeadCircle256_26_UI.png" -> 26
LEGACY_ID_PATTERN = re.compile(r"T_IconRoleHeadCircle256_(\d+)_UI\.png")
NUMBER_TOKEN_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")
NON_PARAM_BRACE_TOKEN_PATTERN = re.compile(r"\{(?!\d+\})[^{}]+\}")
SIZE_TAG_PATTERN = re.compile(r"</?size(?:=[^>]+)?>", re.IGNORECASE)
TEXT_ENTRY_TAG_PATTERN = re.compile(r"</?te\b[^>]*>", re.IGNORECASE)
SAP_TAG_PATTERN = re.compile(r"</?SapTag[^>]*>", re.IGNORECASE)

# Sequence bonus parsing, embedded into each chain entry at sync time.
# Maps game description text patterns to our StatName values.
# More-specific patterns must appear before shorter overlapping ones.
_CHAIN_STAT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Resonance\s+Skill\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),   'Resonance Skill DMG Bonus'),
    (re.compile(r"Resonance\s+Liberation\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I), 'Resonance Liberation DMG Bonus'),
    (re.compile(r"Basic\s+Attack\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),       'Basic Attack DMG Bonus'),
    (re.compile(r"Heavy\s+Attack\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),       'Heavy Attack DMG Bonus'),
    (re.compile(r"Aero\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),     'Aero DMG'),
    (re.compile(r"Glacio\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),   'Glacio DMG'),
    (re.compile(r"Fusion\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),   'Fusion DMG'),
    (re.compile(r"Electro\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),  'Electro DMG'),
    (re.compile(r"Havoc\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),    'Havoc DMG'),
    (re.compile(r"Spectro\s+DMG\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),  'Spectro DMG'),
    (re.compile(r"Crit[.]\s+Rate\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),  'Crit Rate'),
    (re.compile(r"Crit[.]\s+DMG\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),   'Crit DMG'),
    (re.compile(r"Energy\s+Regen\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),   'Energy Regen'),
    (re.compile(r"Healing\s+Bonus\s+is\s+increased\s+by\s+\{(\d+)\}", re.I),  'Healing Bonus'),
    (re.compile(r"\bATK\s+is\s+increased\s+by\s+\{(\d+)\}", re.I), 'ATK%'),
    (re.compile(r"\bHP\s+is\s+increased\s+by\s+\{(\d+)\}",  re.I), 'HP%'),
    (re.compile(r"\bDEF\s+is\s+increased\s+by\s+\{(\d+)\}", re.I), 'DEF%'),
]

_CHAIN_CONDITIONAL_RE = re.compile(
    r'\b(?:when|after|upon|if|while|during|casting|triggers?|stacks?'
    r'|consumes?|consuming|cooldown|entering|teammates?|team\s+members?'
    r'|nearby|allies?|below|above|state)\b'
    r'|for\s+\d+s?\b|for\s+\{\d+\}s?\b|\{\d+\}s\b',
    re.IGNORECASE,
)

_MARKUP_RE = re.compile(r'<[^>]+>')
# Stat names with internal periods that would be split by a naive sentence splitter.
_PROTECT_PAIRS = [('Crit. Rate', 'CRIT_RATE_PH'), ('Crit. DMG', 'CRIT_DMG_PH')]

DAMAGE_TYPE_TAG_MAP = {
    4: "Basic Attack DMG",
    5: "Heavy Attack DMG",
    6: "Resonance Skill DMG",
    7: "Resonance Liberation DMG",
}

DAMAGE_TYPE_TEXT_TO_SUBSTAT = {
    damage_type: f"{damage_type} Bonus"
    for damage_type in DAMAGE_TYPE_TAG_MAP.values()
}


def _chain_strip_markup(text: str) -> str:
    return _MARKUP_RE.sub('', text)


def _chain_split_sentences(text: str) -> list[str]:
    protected = text
    for original, ph in _PROTECT_PAIRS:
        protected = protected.replace(original, ph)
    sentences: list[str] = []
    for line in protected.split('\n'):
        for part in re.split(r'\.(?=\s|$)', line):
            s = part.strip()
            if s:
                for original, ph in _PROTECT_PAIRS:
                    s = s.replace(ph, original)
                sentences.append(s)
    return sentences


def _parse_param_value(param_str: str) -> float | None:
    m = re.match(r'^\s*(\d+(?:\.\d+)?)%?\s*$', param_str)
    return float(m.group(1)) if m else None


def parse_chain_bonus(desc_en: str, params: list[str]) -> dict | None:
    """Return {stat, value} for an unconditional passive stat bonus, or None."""
    clean = _chain_strip_markup(desc_en)
    for sentence in _chain_split_sentences(clean):
        for pattern, stat_name in _CHAIN_STAT_PATTERNS:
            m = pattern.search(sentence)
            if not m:
                continue
            before = sentence[:m.start()]
            after  = sentence[m.end():]
            if _CHAIN_CONDITIONAL_RE.search(before) or _CHAIN_CONDITIONAL_RE.search(after):
                break  # sentence is conditional and we skip it
            param_idx = int(m.group(1))
            if param_idx >= len(params):
                break
            value = _parse_param_value(params[param_idx])
            if value is None:
                break
            return {'stat': stat_name, 'value': int(value) if value == int(value) else value}
    return None

CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Character"
CDN_ITEM_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Item"
CDN_SKILL_CONFIG_URL = f"{CDN_BASE}/d/GameData/ConfigDBParsed/Skill.json"

# Known CDN path typos that need deterministic normalization.
CDN_PATH_FIXUPS = {
    "/d/GameData/UIResources/Common/Image/IconRolePile/T_IconRole_Pile_zanni1_UI.png":
        "/d/GameData/UIResources/Common/Image/IconRolePile/T_IconRole_Pile_zanNi1_UI.png",
}

# Output directory relative to this script
OUTPUT_DIR = Path(__file__).parent.parent / "public/Data/Characters"

# Skip test/placeholder characters
SKIP_IDS = {9990, 9991}

# Most characters expose a canonical waveband item at 1000<character_id>.
# Rover variants reuse shared grouped Item ids instead of per-variant ids.
ROVER_SEQUENCE_ITEM_IDS = {
    "Rover: Aero": 10001406,
    "Rover: Spectro": 10001500,
    "Rover: Havoc": 10001604,
}

# Default schema for character files.
#   True           = keep entire field as-is
#   ["k1", "k2"]   = keep only these keys (auto-recurses into dicts-of-dicts and lists-of-dicts)
#   "value"        = extract just the 'value' from each stat entry
#
# skillTrees and chains are included by default but post-processed.
# skillTrees are trimmed to a compact English-facing format for forte nodes.
# chains keep localized name/description objects for frontend tooltips.
SCHEMA = {
    "id": True,
    "name": True,
    "rarity": ["id", "color"],
    "weapon": ["id", "name", "icon"],
    "element": ["id", "name", "color", "icon"],
    "icon": ["iconRound", "banner"],
    "skins": ["id", "icon", "color"],
    "tags": ["id", "priority", "name", "icon"],
    "stats": "value",
    "skillTrees": True,
    "chains": True,
}

# Optional fields for --include-skills flag (full skill multiplier data)
SKILLS_SCHEMA = {
    "skill": ["id", "params"],
}

# Sub-filters applied after main schema extraction to trim nested icon dicts.
# field -> sub_field -> [keys to keep]
SUB_FILTERS = {
    "element": {"icon": ["1", "7"]},
    "skins": {"icon": ["iconRound", "banner"]},
}


def prepend_cdn(obj: Any) -> Any:
    """Prepend CDN base URL to paths starting with /d/"""
    if isinstance(obj, str):
        fixed = CDN_PATH_FIXUPS.get(obj, obj)
        if fixed.startswith("/d/"):
            return f"{CDN_BASE}{fixed}"
        return fixed
    elif isinstance(obj, dict):
        return {k: prepend_cdn(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [prepend_cdn(item) for item in obj]
    return obj


def filter_keys(obj: Any, keys: list[str]) -> Any:
    """Filter object to only specified keys.

    Handles three shapes automatically:
    - Direct dict (keys match): filter keys directly
    - Dict of dicts (keys don't match outer): recurse into each value
    - List of dicts: recurse into each item
    """
    keys_set = set(keys)

    if isinstance(obj, dict):
        if keys_set & set(obj.keys()):
            # Target keys found at this level - filter directly
            return {k: v for k, v in obj.items() if k in keys_set}
        else:
            # Dict of dicts (e.g. chains, skill keyed by ID) - recurse
            return {k: filter_keys(v, keys) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [filter_keys(item, keys) for item in obj]
    return obj


def apply_sub_filters(data: dict, filters: dict) -> dict:
    """Apply nested key filters to trim sub-fields (e.g. element.icon → keep only "1","7")."""
    for field, sub_filters in filters.items():
        if field not in data:
            continue

        value = data[field]

        if isinstance(value, dict):
            for sub_field, sub_keys in sub_filters.items():
                if sub_field in value and isinstance(value[sub_field], dict):
                    keys_set = set(sub_keys)
                    value[sub_field] = {k: v for k, v in value[sub_field].items() if k in keys_set}

        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    for sub_field, sub_keys in sub_filters.items():
                        if sub_field in item and isinstance(item[sub_field], dict):
                            keys_set = set(sub_keys)
                            item[sub_field] = {k: v for k, v in item[sub_field].items() if k in keys_set}

    return data


def _has_non_null_skin_color(color: Any) -> bool:
    """Return True if a skin color object contains any non-null override value."""
    if not isinstance(color, dict):
        return False
    return any(value is not None for value in color.values())


def _is_redundant_default_skin(skin: Any, base_icon: Any) -> bool:
    """Detect the duplicated default skin entry (same icons as icon + no color overrides)."""
    if not isinstance(skin, dict) or not isinstance(base_icon, dict):
        return False

    skin_icon = skin.get("icon")
    if not isinstance(skin_icon, dict):
        return False

    same_round = skin_icon.get("iconRound") == base_icon.get("iconRound")
    same_banner = skin_icon.get("banner") == base_icon.get("banner")
    return same_round and same_banner and not _has_non_null_skin_color(skin.get("color"))


def prune_default_skins(skins: Any, base_icon: Any) -> list[dict]:
    """Drop the redundant default skin entry and keep only real alternates."""
    if not isinstance(skins, list):
        return []
    return [
        skin for skin in skins
        if isinstance(skin, dict) and not _is_redundant_default_skin(skin, base_icon)
    ]


def extract_stats(value: Any) -> Any:
    """Extract just the numeric value from each stat entry."""
    if isinstance(value, dict):
        return {
            k: (v.get("value") if isinstance(v, dict) and "value" in v else v)
            for k, v in value.items()
        }
    return value


def extract_legacy_id(data: dict) -> str | None:
    """Extract legacy ID from iconRound URL.

    The iconRound URL contains the old sequential ID used in frontend/backends:
    e.g. ".../T_IconRoleHeadCircle256_26_UI.png" -> "26" (Changli)
         ".../T_IconRoleHeadCircle256_7_UI.png"  -> "7"  (Sanhua)
    """
    icon_data = data.get("icon", {})
    icon_round = icon_data.get("iconRound", "") if isinstance(icon_data, dict) else ""

    match = LEGACY_ID_PATTERN.search(icon_round)
    return match.group(1) if match else None


def simplify_skill_trees(trees: Any) -> list[dict] | None:
    """Simplify skillTrees to a flat English-only list of forte stat nodes.

    Raw CDN shape (dict of dicts keyed by node ID):
        { "746": { id, consume, coordinate, params: { name: {i18n}, icon, value, ... }, parentNodes, ... } }

    Output (flat list, English-only, internal-facing):
        [ { id, coordinate, parentNodes, name, icon, value, valueText } ]

    coordinate: 1 = middle/lower node, 2 = top/upper node
    parentNodes: maps to which skill branch the node belongs to
    """
    if not isinstance(trees, dict):
        return None

    nodes = []
    for node_id, node in trees.items():
        if not isinstance(node, dict):
            continue

        params = node.get("params", {})
        if not isinstance(params, dict):
            continue

        # Extract English name from i18n dict
        name_field = params.get("name", {})
        name = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field)

        # Get icon and prepend CDN base
        icon = params.get("icon", "")
        if isinstance(icon, str) and icon.startswith("/d/"):
            icon = f"{CDN_BASE}{icon}"

        nodes.append({
            "id": node.get("id"),
            "coordinate": node.get("coordinate"),
            "parentNodes": node.get("parentNodes"),
            "name": name,
            "icon": icon,
            "value": params.get("value"),
            "valueText": params.get("valueText"),
        })

    return nodes if nodes else None


def extract_skill_icons(data: dict) -> dict[str, str] | None:
    """Extract skill icon URLs from the raw skill field, keyed by skill type.

    Reads the raw CDN `skill` dict (before schema filtering) and pulls out
    `params.icon` for each non-tree skill entry, mapped by its `type` field:

        type 1  → "normal-attack"
        type 2  → "skill"
        type 3  → "liberation"
        type 4  → "inherent-1" / "inherent-2" (two passives, sorted by sort order)
        type 5  → "intro"
        type 6  → "circuit"
        type 11 → "outro"

    Returns a flat dict like:
        { "normal-attack": "https://...png", "skill": "https://...png", ... }
    """
    skill_data = data.get("skill")
    if not isinstance(skill_data, dict):
        return None

    # CDN type number → our key name
    TYPE_MAP = {1: "normal-attack", 2: "skill", 3: "liberation", 5: "intro", 6: "circuit", 11: "outro"}

    icons: dict[str, str] = {}
    # Collect type-4 entries separately to sort them
    type4_entries: list[tuple[int, str]] = []

    for entry in skill_data.values():
        if not isinstance(entry, dict) or entry.get("tree", False):
            continue

        skill_type = entry.get("type")
        params = entry.get("params", {})
        icon = params.get("icon", "") if isinstance(params, dict) else ""
        if not icon:
            continue

        if isinstance(icon, str) and icon.startswith("/d/"):
            icon = f"{CDN_BASE}{icon}"

        if skill_type in TYPE_MAP:
            icons[TYPE_MAP[skill_type]] = icon
        elif skill_type == 4:
            type4_entries.append((entry.get("sort", 0), icon))

    # Sort type-4 by sort order → first is inherent-1, second is inherent-2
    type4_entries.sort(key=lambda x: x[0])
    for i, (_, icon) in enumerate(type4_entries):
        icons[f"inherent-{i + 1}"] = icon

    return icons if icons else None


def simplify_chains(chains: Any) -> list[dict] | None:
    """Simplify chains to a flat list while preserving localization.

    Raw CDN shape (dict of dicts keyed by chain ID):
        { "271": { id, name: {i18n}, description: {i18n}, icon, param } }

    Output (flat list):
        [ { id, name, description, icon, param } ]
    """
    if not isinstance(chains, dict):
        return None

    result = []
    for chain_id, chain in chains.items():
        if not isinstance(chain, dict):
            continue

        name_field = chain.get("name", {})
        name = _sanitize_i18n_value(name_field if isinstance(name_field, dict) else str(name_field))

        desc_field = chain.get("description", {})
        desc = _sanitize_i18n_value(desc_field if isinstance(desc_field, dict) else str(desc_field))

        icon = chain.get("icon", "")
        if isinstance(icon, str) and icon.startswith("/d/"):
            icon = f"{CDN_BASE}{icon}"

        params = chain.get("param") or []
        en_desc = desc.get("en", "") if isinstance(desc, dict) else str(desc)
        bonus = parse_chain_bonus(en_desc, params)

        entry: dict = {
            "id": chain.get("id"),
            "name": name,
            "description": desc,
            "icon": icon,
            "param": params if params else None,
        }
        if bonus:
            entry["bonus"] = bonus
        result.append(entry)

    return result if result else None


def get_sequence_item_id(data: dict) -> int | None:
    """Return the grouped Item ID that stores the canonical sequence icon."""
    name_field = data.get("name", {})
    en_name = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field or "")
    if en_name in ROVER_SEQUENCE_ITEM_IDS:
        return ROVER_SEQUENCE_ITEM_IDS[en_name]

    char_id = data.get("id")
    if not isinstance(char_id, int):
        return None
    return int(f"1000{char_id}")


def _fetch_sequence_icon(session: Any, item_id: int) -> tuple[int, str | None]:
    url = f"{CDN_ITEM_DOWNLOAD_BASE}/{item_id}.json"
    try:
        resp = session.get(url, timeout=30)
        if resp.status_code != 200:
            print(f"  Failed sequence item {item_id}: HTTP {resp.status_code}")
            return (item_id, None)

        data = resp.json()
        icon_data = data.get("icon", {}) if isinstance(data, dict) else {}
        icon = icon_data.get("icon", "") if isinstance(icon_data, dict) else ""
        if isinstance(icon, str) and icon.startswith("/d/"):
            icon = f"{CDN_BASE}{icon}"
        return (item_id, icon if isinstance(icon, str) and icon else None)
    except Exception as e:
        print(f"  Error sequence item {item_id}: {e}")
        return (item_id, None)


def fetch_sequence_icons(raw_characters: list[dict], workers: int | None = None) -> dict[int, str]:
    """Fetch canonical sequence icons from grouped Item files for non-Rover characters."""
    try:
        import requests
    except ImportError:
        print("Install requests library: pip install requests")
        return {}

    char_to_item: dict[int, int] = {}
    for data in raw_characters:
        char_id = data.get("id")
        item_id = get_sequence_item_id(data)
        if isinstance(char_id, int) and isinstance(item_id, int):
            char_to_item[char_id] = item_id

    if not char_to_item:
        return {}

    session = requests.Session()
    item_ids = sorted(set(char_to_item.values()))
    actual_workers = workers if workers else 20
    print(f"Fetching {len(item_ids)} canonical sequence icons with {actual_workers} threads...")

    item_icon_map: dict[int, str] = {}
    with ThreadPoolExecutor(max_workers=actual_workers) as pool:
        futures = {pool.submit(_fetch_sequence_icon, session, item_id): item_id for item_id in item_ids}
        for future in as_completed(futures):
            item_id, icon = future.result()
            if icon:
                item_icon_map[item_id] = icon

    return {
        char_id: item_icon_map[item_id]
        for char_id, item_id in char_to_item.items()
        if item_id in item_icon_map
    }


def extract_by_schema(data: dict, schema: dict) -> dict:
    """Extract fields from data according to schema."""
    output = {}

    for field, rule in schema.items():
        if field not in data:
            continue

        value = data[field]

        if rule is True:
            output[field] = prepend_cdn(value)

        elif rule == "value":
            output[field] = extract_stats(value)

        elif isinstance(rule, list):
            output[field] = prepend_cdn(filter_keys(value, rule))

    return output


def transform_character(
    data: dict,
    schema: dict,
    description_param_map: dict[int, list[str]] | None = None,
    sequence_icon_map: dict[int, str] | None = None,
) -> dict | None:
    """Transform raw CDN character data using schema."""
    char_id = data.get("id")
    name = data.get("name", {})
    en_name = name.get("en", "") if isinstance(name, dict) else name

    if not en_name or char_id in SKIP_IDS:
        return None

    result = extract_by_schema(data, schema)
    apply_sub_filters(result, SUB_FILTERS)
    if "skins" in result:
        result["skins"] = prune_default_skins(result["skins"], result.get("icon"))

    # Post-process skillTrees → flat English-only list
    if "skillTrees" in result:
        simplified = simplify_skill_trees(result["skillTrees"])
        if simplified:
            result["skillTrees"] = simplified
        else:
            del result["skillTrees"]

    # Post-process chains → flat localized list
    if "chains" in result:
        simplified = simplify_chains(result["chains"])
        if simplified:
            result["chains"] = simplified
        else:
            del result["chains"]

    # Extract skill icons from raw data (before schema filtering strips it)
    skill_icons = extract_skill_icons(data)
    if skill_icons:
        result["skillIcons"] = skill_icons

    # Extract compact move payload for frontend (localized text + level 1-10 params)
    moves = _extract_moves_frontend(data, description_param_map or {})
    if moves:
        result["moves"] = moves

    # Add legacyId extracted from iconRound URL for backwards compatibility
    legacy_id = extract_legacy_id(data)
    if legacy_id:
        result["legacyId"] = legacy_id

    # Derive preferred substats from character tags and skillTrees
    # Only includes substat-eligible stats (no Elemental DMG or Healing Bonus)
    if "tags" in result:
        # Pass raw skillTrees data before it gets simplified
        raw_skill_trees = data.get("skillTrees")
        preferred = get_preferred_substats(result["tags"], raw_skill_trees, result.get("moves"))
        if preferred:
            result["preferredStats"] = preferred

    if isinstance(char_id, int):
        sequence_icon = (sequence_icon_map or {}).get(char_id)
        if sequence_icon:
            result["sequenceIcon"] = sequence_icon

    return result


def _strip_game_markup_for_matching(text: str) -> str:
    return _MARKUP_RE.sub('', _sanitize_game_text(text or ''))


def _extract_damage_type_from_tags(tags: list[dict]) -> str | None:
    if not tags:
        return None

    for tag in tags:
        tag_id = tag.get("id")
        priority = tag.get("priority", 999)
        if priority == 2 and tag_id in DAMAGE_TYPE_TAG_MAP:
            return DAMAGE_TYPE_TAG_MAP[tag_id]
    return None


def _collect_move_damage_type_counts(moves: Any) -> dict[str, int]:
    counts = {damage_type: 0 for damage_type in DAMAGE_TYPE_TEXT_TO_SUBSTAT}
    if not isinstance(moves, list):
        return counts

    patterns = {
        damage_type: re.compile(
            rf"(?:considered(?:\s+as)?|counts?\s+as|is)\s+{re.escape(damage_type)}\b",
            re.IGNORECASE,
        )
        for damage_type in DAMAGE_TYPE_TEXT_TO_SUBSTAT
    }

    for move in moves:
        if not isinstance(move, dict):
            continue

        description = move.get("description")
        if isinstance(description, dict):
            text = description.get("en", "")
        else:
            text = str(description or "")

        clean = _strip_game_markup_for_matching(text)
        if not clean:
            continue

        for damage_type, pattern in patterns.items():
            counts[damage_type] += len(pattern.findall(clean))

    return counts


def _infer_damage_type_from_moves(moves: Any) -> str | None:
    counts = _collect_move_damage_type_counts(moves)
    ranked = sorted(
        ((count, damage_type) for damage_type, count in counts.items() if count > 0),
        reverse=True,
    )
    if not ranked:
        return None

    top_count, top_damage_type = ranked[0]
    second_count = ranked[1][0] if len(ranked) > 1 else 0

    if top_count <= second_count:
        return None

    return top_damage_type


def get_preferred_substats(
    tags: list[dict],
    skill_trees: dict | list[dict] | None = None,
    moves: list[dict] | None = None,
) -> list[str]:
    """
    Derive preferred substats from character tags and skillTree nodes.
    
    Logic:
    1. By default, assign Crit Rate + Crit DMG to all characters
    2. BUT if healer (tag ID 1) OR has "Healing Bonus" in skill tree: remove crits
    3. Extract scaling stats from skill tree (HP/ATK/DEF from "HP+", "ATK+", "DEF+" nodes)
    4. Add damage type bonus from priority 2 tags when present
    5. Always include Energy Regen
    
    Args:
        tags: List of tag dicts with id, priority, name fields
        skill_trees: Raw skillTrees dict from CDN (before simplification)
        
    Returns:
        List of preferred substat names (only stats that can appear as substats)
    """
    if not tags:
        return []
    
    stats = []
    damage_type = None
    is_healer = False
    
    # Check healer tag first.
    for tag in tags:
        tag_id = tag.get("id")
        
        # Tag ID 1 = Support and Healer
        if tag_id == 1:
            is_healer = True

    damage_type = _extract_damage_type_from_tags(tags) or _infer_damage_type_from_moves(moves)
    
    # Step 1: Add crits by default
    stats.extend(["Crit Rate", "Crit DMG"])
    
    # Step 2: Remove crits if healer OR has Healing Bonus in skill tree
    has_healing_bonus = _has_healing_bonus_in_skill_tree(skill_trees)
    if is_healer or has_healing_bonus:
        stats.remove("Crit Rate")
        stats.remove("Crit DMG")
    
    # Step 3: Extract scaling stats from skill tree (HP/ATK/DEF)
    skill_tree_stats = _extract_skill_tree_substats(skill_trees)
    for stat in skill_tree_stats:
        if stat not in stats:
            stats.append(stat)
    
    # Step 4: Add damage type bonus from tags if present
    damage_type_stat = DAMAGE_TYPE_TEXT_TO_SUBSTAT.get(damage_type or "")
    if damage_type_stat and damage_type_stat not in stats:
        stats.append(damage_type_stat)
    
    # Step 5: Always include Energy Regen
    if "Energy Regen" not in stats:
        stats.append("Energy Regen")
    
    return stats

# Does what its name says it does
def _has_healing_bonus_in_skill_tree(skill_trees: dict | list[dict] | None) -> bool:
    if not skill_trees or not isinstance(skill_trees, (dict, list)):
        return False

    nodes = skill_trees.values() if isinstance(skill_trees, dict) else skill_trees
    for node in nodes:
        if not isinstance(node, dict):
            continue

        if isinstance(skill_trees, dict):
            params = node.get("params", {})
            if not isinstance(params, dict):
                continue
            name_field = params.get("name", {})
            en_name = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field)
        else:
            en_name = str(node.get("name", ""))

        # Check for "Healing Bonus"
        if "Healing Bonus" in en_name:
            return True
    
    return False


def _extract_skill_tree_substats(skill_trees: dict | list[dict] | None) -> list[str]:
    # Extract scaling stats from skill tree nodes by parsing English names.
    if not skill_trees or not isinstance(skill_trees, (dict, list)):
        return []
    
    # Map English name prefixes to substat names
    NAME_TO_STAT = {
        "HP+": "HP",
        "HP Up": "HP",
        "ATK+": "ATK",
        "DEF+": "DEF",
    }
    
    found_stats = set()
    
    # Scan all skill tree nodes
    nodes = skill_trees.values() if isinstance(skill_trees, dict) else skill_trees
    for node in nodes:
        if not isinstance(node, dict):
            continue

        if isinstance(skill_trees, dict):
            if not node.get("tree"):
                continue
            params = node.get("params", {})
            if not isinstance(params, dict):
                continue
            name_field = params.get("name", {})
            en_name = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field)
        else:
            en_name = str(node.get("name", ""))

        # Check if this is a scaling stat we care about
        for prefix, stat_name in NAME_TO_STAT.items():
            if en_name.startswith(prefix):
                found_stats.add(stat_name)
                break
    
    return list(found_stats)


def _round2(value: float) -> float:
    # Normalize float noise from CDN values (e.g. 262.4999999999997 -> 262.5)
    return round(value, 2)


def _format_rounded_number(value: float) -> str:
    rounded = _round2(value)
    if float(rounded).is_integer():
        return str(int(rounded))
    return f"{rounded:.2f}".rstrip("0").rstrip(".")


def _sanitize_game_text(value: str) -> str:
    """Remove control tokens like {Cus:Ipt,...} while keeping numeric placeholders."""
    if not value:
        return ""
    cleaned = NON_PARAM_BRACE_TOKEN_PATTERN.sub("", value)
    cleaned = SIZE_TAG_PATTERN.sub("", cleaned)
    cleaned = TEXT_ENTRY_TAG_PATTERN.sub("", cleaned)
    cleaned = SAP_TAG_PATTERN.sub("", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    return cleaned


def _sanitize_i18n_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _sanitize_game_text(text) if isinstance(text, str) else text
            for key, text in value.items()
        }
    if isinstance(value, str):
        return _sanitize_game_text(value)
    return value


def _normalize_param_value(value: Any) -> str:
    text = _sanitize_game_text(str(value))

    def repl(match: re.Match[str]) -> str:
        raw = match.group(0)
        try:
            return _format_rounded_number(float(raw))
        except (TypeError, ValueError):
            return raw

    return NUMBER_TOKEN_PATTERN.sub(repl, text)


def _resanitize_existing_character_text_fields(character: dict[str, Any]) -> None:
    for chain in character.get("chains") or []:
        if not isinstance(chain, dict):
            continue
        if "name" in chain:
            chain["name"] = _sanitize_i18n_value(chain.get("name"))
        if "description" in chain:
            chain["description"] = _sanitize_i18n_value(chain.get("description"))

    for move in character.get("moves") or []:
        if not isinstance(move, dict):
            continue
        if "name" in move:
            move["name"] = _sanitize_i18n_value(move.get("name"))
        if "description" in move:
            move["description"] = _sanitize_i18n_value(move.get("description"))
        if "descriptionParams" in move and isinstance(move.get("descriptionParams"), list):
            move["descriptionParams"] = [_normalize_param_value(value) for value in move["descriptionParams"]]
        for value_entry in move.get("values") or []:
            if not isinstance(value_entry, dict):
                continue
            if "name" in value_entry:
                value_entry["name"] = _sanitize_i18n_value(value_entry.get("name"))
            if "values" in value_entry and isinstance(value_entry.get("values"), list):
                value_entry["values"] = [_normalize_param_value(value) for value in value_entry["values"]]


def _extract_moves_frontend(raw: dict, description_param_map: dict[int, list[str]]) -> list[dict]:
    """Extract localized move payload with level 1-10 params for frontend tooltips."""
    skill = raw.get("skill")
    if not isinstance(skill, dict):
        return []

    entries: list[dict] = []
    for entry in skill.values():
        if not isinstance(entry, dict):
            continue
        if entry.get("tree", False):
            continue

        params = entry.get("params", {})
        if not isinstance(params, dict):
            continue

        name_i18n = params.get("name", {})
        move_name = _sanitize_i18n_value(name_i18n if isinstance(name_i18n, dict) else str(name_i18n))
        desc_i18n = params.get("description", {})
        move_description = _sanitize_i18n_value(desc_i18n if isinstance(desc_i18n, dict) else str(desc_i18n))
        level_data = params.get("level", {})

        values: list[dict] = []
        if isinstance(level_data, dict):
            for level in level_data.values():
                if not isinstance(level, dict):
                    continue

                sub_name_i18n = level.get("name", {})
                sub_name = _sanitize_i18n_value(sub_name_i18n if isinstance(sub_name_i18n, dict) else str(sub_name_i18n))
                raw_params = level.get("params", [])
                level_values: list[str] = []
                if isinstance(raw_params, list) and raw_params:
                    upper = min(10, len(raw_params))
                    for index in range(upper):
                        level_values.append(_normalize_param_value(raw_params[index]))

                values.append({
                    "id": level.get("id"),
                    "name": sub_name,
                    "values": level_values,
                })

        values.sort(key=lambda x: (x.get("id") is None, x.get("id", 0)))
        detail_params = description_param_map.get(int(entry.get("id", 0) or 0), [])

        entries.append({
            "id": entry.get("id"),
            "type": entry.get("type"),
            "sort": entry.get("sort"),
            "name": move_name,
            "description": move_description,
            "descriptionParams": detail_params,
            "maxLevel": params.get("maxLevel"),
            "values": values,
        })

    entries.sort(key=lambda x: (x.get("sort") is None, x.get("sort", 0), x.get("id", 0)))
    return entries


def fetch_skill_description_params() -> dict[int, list[str]]:
    """Load SkillDetailNum map from ConfigDB Skill.json keyed by skill id."""
    try:
        import requests
    except ImportError:
        print("Install requests library: pip install requests")
        return {}

    try:
        response = requests.get(CDN_SKILL_CONFIG_URL, timeout=45)
        response.raise_for_status()
        payload = response.json()
    except Exception as error:
        print(f"Warning: failed to fetch skill config ({error}); move descriptions may keep placeholders.")
        return {}

    if not isinstance(payload, list):
        print("Warning: unexpected Skill.json payload shape; move descriptions may keep placeholders.")
        return {}

    result: dict[int, list[str]] = {}
    for row in payload:
        if not isinstance(row, dict):
            continue
        skill_id = row.get("Id")
        if not isinstance(skill_id, int):
            continue
        raw_values = row.get("SkillDetailNum")
        if not isinstance(raw_values, list) or not raw_values:
            raw_values = row.get("MultiSkillDetailNum")
        if not isinstance(raw_values, list):
            continue
        result[skill_id] = [_sanitize_game_text(str(value)) for value in raw_values]

    print(f"Loaded SkillDetailNum for {len(result)} skills")
    return result


# --- CDN fetch ---

def _fetch_one(session, filename: str) -> tuple[str, dict | None]:
    """Fetch a single character JSON from CDN. Returns (filename, data_or_None)."""
    url = f"{CDN_DOWNLOAD_BASE}/{filename}"
    try:
        resp = session.get(url, timeout=30)
        if resp.status_code == 200:
            return (filename, resp.json())
        else:
            print(f"  Failed {filename}: HTTP {resp.status_code}")
            return (filename, None)
    except Exception as e:
        print(f"  Error {filename}: {e}")
        return (filename, None)


def fetch_cdn_characters(single_id: str | None = None, workers: int | None = None) -> list[dict]:
    """Fetch character data from CDN, parallelized with threads.

    Args:
        single_id: Optional single character ID to fetch
        workers: Number of parallel threads. None = all files in parallel
    """
    try:
        import requests
    except ImportError:
        print("Install requests library: pip install requests")
        return []

    session = requests.Session()

    if single_id:
        url = f"{CDN_DOWNLOAD_BASE}/{single_id}.json"
        print(f"Fetching {url}")
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200:
                return [resp.json()]
            else:
                print(f"Failed to fetch {single_id}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"Error fetching {single_id}: {e}")
        return []

    print("Listing characters from CDN...")
    try:
        list_resp = session.post(
            CDN_LIST_API,
            json={"path": "/GameData/Grouped/Character"},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        list_data = list_resp.json()

        if list_data.get("code") != 200:
            print(f"List API error: {list_data.get('message')}")
            return []

        files = list_data.get("data", {}).get("content", [])
        json_files = [f["name"] for f in files if f["name"].endswith(".json")]

        actual_workers = workers if workers else 20
        print(f"Found {len(json_files)} character files, fetching with {actual_workers} threads...")

        characters = []
        with ThreadPoolExecutor(max_workers=actual_workers) as pool:
            futures = {pool.submit(_fetch_one, session, f): f for f in json_files}
            for future in as_completed(futures):
                filename, data = future.result()
                if data:
                    characters.append(data)
                    print(f"  Fetched {filename}")

        return characters

    except Exception as e:
        print(f"Error listing CDN: {e}")

    return []


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Sync character data from Wuthery CDN")
    parser.add_argument("--id", type=str, default=None,
                       help="Process single character by ID (e.g., --id 1102)")
    parser.add_argument("--fetch", action="store_true",
                       help="Fetch from CDN")
    parser.add_argument("--include-skills", action="store_true",
                       help="Include full skill multiplier data (off by default)")
    parser.add_argument("--individual", action="store_true",
                       help="Write per-character files instead of combined Characters.json")
    parser.add_argument("--workers", "-w", type=int, default=None,
                       help="Parallel fetch threads (default: all files in parallel)")
    parser.add_argument("--output", "-o", type=Path, default=OUTPUT_DIR,
                       help=f"Output directory (default: {OUTPUT_DIR})")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview output without writing files")
    parser.add_argument("--pretty", action="store_true",
                       help="Pretty print JSON (default: compact)")

    args = parser.parse_args()

    # Build schema based on flags
    schema = {**SCHEMA}
    if args.include_skills:
        schema.update(SKILLS_SCHEMA)

    if not args.fetch:
        # No CDN fetch, re-parse bonus fields on existing Characters.json and exit.
        combined_path = args.output.parent / "Characters.json"
        if not combined_path.exists():
            parser.error(f"No Characters.json found at {combined_path}. Use --fetch to sync from CDN.")
            return 1
        print(f"Re-parsing sequence bonuses and preferred stats in {combined_path} ...")
        with open(combined_path, encoding="utf-8") as f:
            characters = json.load(f)
        total = 0
        preferred_updates = 0
        for char in characters:
            _resanitize_existing_character_text_fields(char)
            for chain in char.get("chains") or []:
                desc = chain.get("description")
                en_desc = desc.get("en", "") if isinstance(desc, dict) else str(desc or "")
                params = chain.get("param") or []
                chain.pop("bonus", None)
                bonus = parse_chain_bonus(en_desc, params)
                if bonus:
                    chain["bonus"] = bonus
                    total += 1

            preferred = get_preferred_substats(
                char.get("tags") or [],
                char.get("skillTrees"),
                char.get("moves"),
            )
            existing_preferred = char.get("preferredStats")
            if preferred:
                if preferred != existing_preferred:
                    preferred_updates += 1
                char["preferredStats"] = preferred
            elif "preferredStats" in char:
                preferred_updates += 1
                char.pop("preferredStats", None)
        if not args.dry_run:
            with open(combined_path, "w", encoding="utf-8") as f:
                json.dump(characters, f, separators=(",", ":"), ensure_ascii=False)
            print(f"Embedded {total} sequence bonuses and refreshed {preferred_updates} preferred stat sets → {combined_path}")
        else:
            print(f"[dry-run] Would embed {total} sequence bonuses and refresh {preferred_updates} preferred stat sets")
        return 0

    raw_characters = fetch_cdn_characters(single_id=args.id, workers=args.workers)
    description_param_map = fetch_skill_description_params()
    sequence_icon_map = fetch_sequence_icons(raw_characters, workers=args.workers)

    print(f"\nLoaded {len(raw_characters)} raw character files")
    print(f"Resolved {len(sequence_icon_map)} canonical sequence icons")

    # Transform characters using schema.
    characters = []
    for data in raw_characters:
        char = transform_character(data, schema, description_param_map, sequence_icon_map)
        if char:
            characters.append(char)

    print(f"Transformed {len(characters)} characters")

    if not characters:
        print("No characters to save")
        return 1

    characters.sort(key=lambda c: c.get("name", {}).get("en", ""))

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (',', ':'), "ensure_ascii": False}
    )

    if args.dry_run:
        for char in characters:
            char_id = char["id"]
            en_name = char.get("name", {}).get("en", str(char_id))
            output_json = json.dumps(char, **json_kwargs)
            size_kb = len(output_json.encode("utf-8")) / 1024
            print(f"\n=== {en_name} ({char_id}), {size_kb:.1f}KB ===")
            print(output_json[:5000])
            if len(output_json) > 5000:
                print(f"\n... [{size_kb:.1f}KB total, truncated]")
    else:
        if args.individual:
            # Write per-character files
            args.output.mkdir(parents=True, exist_ok=True)

            for char in characters:
                char_id = char["id"]
                en_name = char.get("name", {}).get("en", str(char_id))
                output_path = args.output / f"{char_id}.json"
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(char, f, **json_kwargs)
                size_kb = output_path.stat().st_size / 1024
                print(f"  Saved {output_path.name} ({en_name}) [{size_kb:.1f}KB]")

            print(f"\nDone: {len(characters)} characters → {args.output}")
        else:
            # Default: combined Characters.json
            combined_path = args.output.parent / "Characters.json"
            combined_path.parent.mkdir(parents=True, exist_ok=True)
            with open(combined_path, "w", encoding="utf-8") as f:
                json.dump(characters, f, **json_kwargs)
            size_kb = combined_path.stat().st_size / 1024
            print(f"  Saved Characters.json [{size_kb:.1f}KB] ({len(characters)} characters)")
            print(f"\nDone: {len(characters)} characters → {combined_path}")

    return 0


if __name__ == "__main__":
    exit(main())
