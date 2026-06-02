"""
Prototype character sync from Encore API v2.

This script intentionally mirrors the public/Data/Characters.json shape emitted by
sync_characters.py while leaving the existing Wuthery sync untouched.

Usage:
    py sync_characters_encore.py --id 1608 --pretty
    py sync_characters_encore.py --id 1608 --compare
    py sync_characters_encore.py --id 1608 --output ../public/Data/Characters.encore.json
"""

from __future__ import annotations

import argparse
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests

from sync_characters import (
    _normalize_param_value,
    _sanitize_i18n_value,
    get_preferred_substats,
    parse_chain_bonus,
)

ENCORE_API_BASE = "https://api-v2.encore.moe/api"
ENCORE_RESOURCE_BASE = "https://api.encore.moe/resource/Data"
OUTPUT_DIR = Path(__file__).parent.parent / "public/Data"

LANGS = [
    "de",
    "en",
    "es",
    "fr",
    "id",
    "ja",
    "ko",
    "pt",
    "ru",
    "th",
    "vi",
    "uk",
    "zh-Hans",
    "zh-Hant",
]
ENCORE_LANGS = [lang for lang in LANGS if lang != "uk"]

RARITY_COLORS = {
    4: "#E400F0FF",
    5: "#CFB17F",
}

ELEMENT_COLORS = {
    1: "#41AEFBFF",  # Glacio
    2: "#F0744EFF",  # Fusion
    3: "#B46BFFFF",  # Electro
    4: "#55FFB5FF",  # Aero
    5: "#F8E56CFF",  # Spectro
    6: "#E649A6FF",  # Havoc
}

TAG_PRIORITIES = {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    11: 3,
    12: 3,
    13: 4,
    14: 4,
    15: 4,
    16: 4,
    17: 4,
    18: 4,
    19: 4,
    20: 4,
    21: 4,
    22: 4,
    23: 4,
    24: 5,
    25: 5,
    27: 5,
    28: 5,
    29: 5,
    30: 3,
    31: 4,
    32: 4,
    33: 6,
    34: 7,
    35: 7,
    36: 6,
    37: 2,
}

SKILL_TYPE_ORDER = {
    "Normal Attack": (1, 1, "normal-attack"),
    "Resonance Skill": (2, 2, "skill"),
    "Resonance Liberation": (3, 3, "liberation"),
    "Intro Skill": (5, 4, "intro"),
    "Outro Skill": (11, 4, "outro"),
    "Tune Break": (12, 4, None),
    "Forte Circuit": (6, 5, "circuit"),
}

SKILL_ICON_TYPE_KEYS = {
    "Normal Attack": "normal-attack",
    "Resonance Skill": "skill",
    "Resonance Liberation": "liberation",
    "Intro Skill": "intro",
    "Outro Skill": "outro",
    "Forte Circuit": "circuit",
}

PARENT_NODES_BY_INDEX = [1, 2, 3, 6, 9, 10, 11, 12]
COORDINATE_BY_INDEX = [1, 1, 1, 1, 2, 2, 2, 2]

STAT_NAME_MAP = {
    "HP": "Life",
    "ATK": "Atk",
    "DEF": "Def",
    "Crit. Rate": "Crit",
    "Crit. DMG": "CritDamage",
    "Basic Attack DMG Bonus": "DamageChangeNormalSkill",
    "Tune Break Boost": "DamageChangeNormalSkill",
}

STAT_ID_BY_NODE_NAME = {
    "Crit. Rate+": (8, False, 100),
    "Crit. Rate Up": (8, False, 100),
    "Crit. DMG+": (9, False, 100),
    "Crit. DMG Up": (9, False, 100),
    "ATK+": (10007, True, 10000),
    "ATK Up": (10007, True, 10000),
    "HP+": (10005, True, 10000),
    "HP Up": (10005, True, 10000),
    "DEF+": (10006, True, 10000),
    "DEF Up": (10006, True, 10000),
    "Healing Bonus+": (26, False, 100),
    "Healing Bonus Up": (26, False, 100),
    "Aero DMG Bonus+": (25, False, 100),
    "Aero DMG Bonus Up": (25, False, 100),
    "Glacio DMG Bonus+": (21, False, 100),
    "Glacio DMG Bonus Up": (21, False, 100),
    "Fusion DMG Bonus+": (22, False, 100),
    "Fusion DMG Bonus Up": (22, False, 100),
    "Electro DMG Bonus+": (23, False, 100),
    "Electro DMG Bonus Up": (23, False, 100),
    "Havoc DMG Bonus+": (24, False, 100),
    "Havoc DMG Bonus Up": (24, False, 100),
    "Spectro DMG Bonus+": (27, False, 100),
    "Spectro DMG Bonus Up": (27, False, 100),
}

VALUE_TEXT_RE = re.compile(r"(-?\d+(?:\.\d+)?)%")
LEGACY_ID_RE = re.compile(r"T_IconRoleHeadCircle256_(\d+)_UI")


def encore_get(session: requests.Session, lang: str, route: str) -> dict:
    url = f"{ENCORE_API_BASE}/{lang}/{route.lstrip('/')}"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            resp = session.get(url, timeout=45)
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, dict):
                raise ValueError(f"Unexpected non-object response from {url}")
            return data
        except Exception as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.75 * (attempt + 1))
    raise last_error or RuntimeError(f"Failed to fetch {url}")


def fetch_character_locales(char_id: int, workers: int) -> dict[str, dict]:
    session = requests.Session()
    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(encore_get, session, lang, f"character/{char_id}"): lang
            for lang in ENCORE_LANGS
        }
        for future in as_completed(futures):
            lang = futures[future]
            results[lang] = future.result()
    return results


def fetch_item(item_id: int) -> dict | None:
    session = requests.Session()
    try:
        return encore_get(session, "en", f"item/{item_id}")
    except requests.RequestException as error:
        print(f"Warning: failed to fetch item {item_id}: {error}")
        return None


def i18n(locales: dict[str, dict], getter, default: str = "") -> dict[str, str]:
    values: dict[str, str] = {}
    for lang in LANGS:
        if lang == "uk":
            values[lang] = default
            continue
        try:
            value = getter(locales[lang])
        except (KeyError, TypeError, IndexError):
            value = default
        values[lang] = value if isinstance(value, str) else default
    return _sanitize_i18n_value(values)


def asset_url(value: Any) -> Any:
    if not isinstance(value, str) or not value:
        return value
    url = value
    if url.startswith("/Game/"):
        url = f"{ENCORE_RESOURCE_BASE}{url}"
    if url.startswith("http://") or url.startswith("https://"):
        # Encore sometimes returns Unreal object paths rather than file paths:
        # .../T_IconWeapon21040066_UI.T_IconWeapon21040066_UI
        # The actual resource URL is the package path with .webp.
        if not re.search(r"\.(?:webp|png|jpg|jpeg|gif|mp4|mp3)(?:$|\?)", url, re.IGNORECASE):
            head, tail = url.rsplit("/", 1)
            package_name = tail.split(".", 1)[0]
            return f"{head}/{package_name}.webp"
        return url
    if value.startswith("/Game/"):
        return f"{ENCORE_RESOURCE_BASE}{value}"
    return value


def extract_legacy_id(icon_round: str, char_id: int) -> str:
    match = LEGACY_ID_RE.search(icon_round or "")
    return match.group(1) if match else str(char_id)


def transform_stats(en: dict) -> dict[str, float | int]:
    stats: dict[str, float | int] = {
        "Life": 0,
        "Atk": 0,
        "Def": 0,
        "DamageChangeNormalSkill": 0,
        "Crit": 5,
        "CritDamage": 150,
    }
    for prop in en.get("Properties") or []:
        if not isinstance(prop, dict):
            continue
        target = STAT_NAME_MAP.get(str(prop.get("Name")))
        if not target:
            continue
        value = prop.get("BaseValue", 0)
        if target in {"Crit", "CritDamage"}:
            value = value / 100
        stats[target] = int(value) if isinstance(value, float) and value.is_integer() else value
    return stats


def transform_tags(locales: dict[str, dict]) -> list[dict]:
    en = locales["en"]
    tag_ids = en.get("Tag") if isinstance(en.get("Tag"), list) else []
    tags: list[dict] = []
    for index, tag_id in enumerate(tag_ids):
        def tag_name(data: dict) -> str:
            tag = (data.get("Tags") or [])[index]
            return tag.get("TagName", "")

        en_tag = (en.get("Tags") or [])[index] if index < len(en.get("Tags") or []) else {}
        tags.append({
            "id": tag_id,
            "priority": TAG_PRIORITIES.get(int(tag_id), index + 1),
            "name": i18n(locales, tag_name),
            "icon": asset_url(en_tag.get("TagIcon", "")),
        })
    return tags


def node_value_from_description(name: str, description: str) -> tuple[list[dict] | None, list[str] | None]:
    match = VALUE_TEXT_RE.search(description or "")
    if not match:
        return None, None

    value_text = f"{match.group(1)}%"
    stat_id, is_ratio, divisor = STAT_ID_BY_NODE_NAME.get(name, (0, False, 100))
    numeric_value = float(match.group(1))
    value = numeric_value / 100 if is_ratio else int(round(numeric_value * divisor))
    return ([{"Id": stat_id, "Value": value, "IsRatio": is_ratio}], [value_text])


def transform_skill_trees(en: dict) -> list[dict]:
    nodes: list[dict] = []
    for index, node in enumerate(en.get("SkillTree") or []):
        if index >= len(PARENT_NODES_BY_INDEX) or not isinstance(node, dict):
            continue
        name = node.get("PropertyNodeTitle", "")
        value, value_text = node_value_from_description(name, node.get("PropertyNodeDescribe", ""))
        nodes.append({
            "id": node.get("Id"),
            "coordinate": COORDINATE_BY_INDEX[index],
            "parentNodes": [PARENT_NODES_BY_INDEX[index]],
            "name": name,
            "icon": asset_url(node.get("PropertyNodeIcon", "")),
            "value": value,
            "valueText": value_text,
        })
    return nodes


def transform_skill_icons(en: dict) -> dict[str, str]:
    icons: dict[str, str] = {}
    inherent_index = 1
    for skill in en.get("Skills") or []:
        if not isinstance(skill, dict):
            continue
        skill_type = skill.get("SkillType")
        icon = asset_url(skill.get("Icon", ""))
        if skill_type == "Inherent Skill":
            name = str(skill.get("SkillName") or "")
            if not name or name == "Skillful Cooking":
                continue
            icons[f"inherent-{inherent_index}"] = icon
            inherent_index += 1
            continue
        key = SKILL_ICON_TYPE_KEYS.get(str(skill_type))
        if key:
            icons[key] = icon
    return icons


def transform_chains(locales: dict[str, dict]) -> list[dict]:
    en = locales["en"]
    chains: list[dict] = []
    for index, chain in enumerate(en.get("ResonantChain") or []):
        if not isinstance(chain, dict):
            continue

        def chain_name(data: dict) -> str:
            return (data.get("ResonantChain") or [])[index].get("NodeName", "")

        def chain_description(data: dict) -> str:
            return (data.get("ResonantChain") or [])[index].get("AttributesDescription", "")

        params = chain.get("AttributesDescriptionParams") or []
        desc = i18n(locales, chain_description)
        bonus = parse_chain_bonus(desc.get("en", ""), params)

        entry: dict[str, Any] = {
            "id": chain.get("Id"),
            "name": i18n(locales, chain_name),
            "description": desc,
            "icon": asset_url(chain.get("NodeIcon", "")),
            "param": params if params else None,
        }
        if bonus:
            entry["bonus"] = bonus
        chains.append(entry)
    return chains


def transform_moves(locales: dict[str, dict]) -> list[dict]:
    en = locales["en"]
    inherent_seen = 0
    moves: list[dict] = []
    for index, skill in enumerate(en.get("Skills") or []):
        if not isinstance(skill, dict):
            continue
        skill_type_name = str(skill.get("SkillType") or "")
        skill_name = str(skill.get("SkillName") or "")
        if skill_type_name == "Inherent Skill":
            if not skill_name or skill_name == "Skillful Cooking":
                continue
            inherent_seen += 1
            skill_type, sort, _ = (4, 5 + inherent_seen, None)
        elif skill_type_name in SKILL_TYPE_ORDER:
            skill_type, sort, _ = SKILL_TYPE_ORDER[skill_type_name]
        else:
            continue

        def move_name(data: dict) -> str:
            return (data.get("Skills") or [])[index].get("SkillName", "")

        def move_description(data: dict) -> str:
            return (data.get("Skills") or [])[index].get("SkillDescribe", "")

        values: list[dict] = []
        for attr_index, attr in enumerate(skill.get("SkillAttributes") or []):
            if not isinstance(attr, dict):
                continue

            def attr_name(data: dict) -> str:
                return (
                    ((data.get("Skills") or [])[index].get("SkillAttributes") or [])[attr_index]
                    .get("attributeName", "")
                )

            raw_values = attr.get("values") or []
            values.append({
                "id": attr.get("attributeId"),
                "name": i18n(locales, attr_name),
                "values": [_normalize_param_value(value) for value in raw_values[:10]],
            })

        max_level = 10 if values else 1
        moves.append({
            "id": skill.get("SkillId"),
            "type": skill_type,
            "sort": sort,
            "name": i18n(locales, move_name),
            "description": i18n(locales, move_description),
            "descriptionParams": [_normalize_param_value(value) for value in skill.get("SkillDetailNum", [])],
            "maxLevel": max_level,
            "values": values,
        })
    moves.sort(key=lambda x: (x.get("sort") is None, x.get("sort", 0), x.get("id", 0)))
    return moves


def transform_skins(en: dict) -> list[dict]:
    skins: list[dict] = []
    base_round = en.get("RoleHeadIconCircle", "")
    base_banner = en.get("FormationRoleCard") or en.get("Card") or ""
    for skin in en.get("Skins") or []:
        if not isinstance(skin, dict):
            continue
        icon_round = skin.get("RoleHeadIconLarge") or skin.get("RoleHeadIcon") or base_round
        banner = skin.get("FormationRoleCard") or skin.get("Card") or ""
        if icon_round == base_round and banner == base_banner:
            continue
        skins.append({
            "id": skin.get("Id"),
            "icon": {
                "iconRound": asset_url(icon_round),
                "banner": asset_url(banner),
            },
            "color": {},
        })
    return skins


def get_sequence_icon(en: dict) -> str | None:
    spillover = en.get("SpilloverItem") or []
    if not spillover or not isinstance(spillover[0], dict):
        return None
    item_id = spillover[0].get("Key")
    if not isinstance(item_id, int):
        return None
    item = fetch_item(item_id)
    if not item:
        return None
    icon = item.get("Icon")
    return asset_url(icon) if isinstance(icon, str) and icon else None


def transform_character(locales: dict[str, dict]) -> dict:
    en = locales["en"]
    char_id = int(en["Id"])
    tags = transform_tags(locales)
    skill_trees = transform_skill_trees(en)
    moves = transform_moves(locales)
    icon_round = asset_url(en.get("RoleHeadIconCircle", ""))

    character: dict[str, Any] = {
        "id": char_id,
        "name": i18n(locales, lambda data: data.get("Name", {}).get("Content", "")),
        "rarity": {
            "id": en.get("QualityId"),
            "color": RARITY_COLORS.get(int(en.get("QualityId") or 0), "#CFB17F"),
        },
        "weapon": {
            "id": en.get("WeaponType"),
            "name": i18n(locales, lambda data: data.get("WeaponTypeName", "")),
            "icon": asset_url(en.get("WeaponTypeIcon", "")),
        },
        "element": {
            "id": en.get("ElementId"),
            "name": i18n(locales, lambda data: data.get("ElementName", "")),
            "color": ELEMENT_COLORS.get(int(en.get("ElementId") or 0), "#FFFFFFFF"),
            "icon": {
                "1": asset_url(en.get("ElementIcon", "")),
                "7": asset_url(en.get("ElementIcon6", "")),
            },
        },
        "icon": {
            "iconRound": icon_round,
            "banner": asset_url(en.get("FormationRoleCard") or en.get("Card") or ""),
        },
        "skins": transform_skins(en),
        "tags": tags,
        "stats": transform_stats(en),
        "skillTrees": skill_trees,
        "chains": transform_chains(locales),
        "skillIcons": transform_skill_icons(en),
        "moves": moves,
        "legacyId": extract_legacy_id(icon_round, char_id),
    }

    preferred = get_preferred_substats(tags, skill_trees, moves, char_id)
    if preferred:
        character["preferredStats"] = preferred

    sequence_icon = get_sequence_icon(en)
    if sequence_icon:
        character["sequenceIcon"] = sequence_icon

    return character


def load_existing_character(char_id: int) -> dict | None:
    path = OUTPUT_DIR / "Characters.json"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        characters = json.load(f)
    for character in characters:
        if isinstance(character, dict) and character.get("id") == char_id:
            return character
    return None


def diff_paths(left: Any, right: Any, prefix: str = "") -> list[str]:
    if type(left) is not type(right):
        return [prefix or "$"]
    if isinstance(left, dict):
        paths: list[str] = []
        for key in sorted(set(left) | set(right)):
            child = f"{prefix}.{key}" if prefix else str(key)
            if key not in left or key not in right:
                paths.append(child)
            else:
                paths.extend(diff_paths(left[key], right[key], child))
        return paths
    if isinstance(left, list):
        paths = []
        for index in range(max(len(left), len(right))):
            child = f"{prefix}[{index}]"
            if index >= len(left) or index >= len(right):
                paths.append(child)
            else:
                paths.extend(diff_paths(left[index], right[index], child))
        return paths
    return [] if left == right else [prefix or "$"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Prototype sync character data from Encore API")
    parser.add_argument("--id", type=int, required=True, help="Character ID to fetch")
    parser.add_argument("--workers", type=int, default=13, help="Parallel language fetch workers")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    parser.add_argument("--compare", action="store_true", help="Compare generated output to current Characters.json")
    parser.add_argument("--output", type=Path, help="Write generated character array to this path")
    args = parser.parse_args()

    locales = fetch_character_locales(args.id, args.workers)
    character = transform_character(locales)

    if args.compare:
        existing = load_existing_character(args.id)
        if not existing:
            print(f"No existing character {args.id} found in {OUTPUT_DIR / 'Characters.json'}")
        else:
            paths = diff_paths(existing, character)
            print(f"Compared character {args.id}: {len(paths)} differing paths")
            for path in paths[:80]:
                print(f"  {path}")
            if len(paths) > 80:
                print(f"  ... {len(paths) - 80} more")

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as f:
            json.dump([character], f, ensure_ascii=False, indent=2 if args.pretty else None)
            f.write("\n")
        print(f"Wrote {args.output}")
    elif not args.compare:
        print(json.dumps(character, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
