"""
Generate LB base-data from local synced game data.

Inputs (all from frontend public/Data/):
- Characters.json, Weapons.json, Echoes.json
- Fetters.json
- CharacterCurve.json, LevelCurve.json

Outputs:
- lb/internal/calc/data/character_bases.json
- lb/internal/calc/data/weapon_bases.json    (lv1 ATK + secondary, effect_en, params_r1/params_r5)
- lb/internal/calc/data/echo_bases.json
- lb/internal/calc/data/fetter_bases.json
- lb/internal/calc/data/id_maps.json
- lb/internal/calc/data/character_curve.json
- lb/internal/calc/data/level_curve.json
- lb/internal/calc/weapon_buffs_gen.go       (always-active bonuses as Go source)
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPTS_DIR.parent / "public" / "Data"
LB_DATA_DIR = DATA_DIR / "LB"
LB_REPO_DIR = SCRIPTS_DIR.parent.parent / "lb"
DATA_OUTPUT_DIR = LB_REPO_DIR / "internal" / "calc" / "data"

CHARACTERS_JSON = DATA_DIR / "Characters.json"
WEAPONS_JSON = DATA_DIR / "Weapons.json"
ECHOES_JSON = DATA_DIR / "Echoes.json"
FETTERS_JSON = DATA_DIR / "Fetters.json"
CHARACTER_CURVE_JSON = DATA_DIR / "CharacterCurve.json"
LEVEL_CURVE_JSON = DATA_DIR / "LevelCurve.json"
CHARACTERS_COMPACT = LB_DATA_DIR / "Characters.compact.json"

CHARACTER_BASES_JSON = DATA_OUTPUT_DIR / "character_bases.json"
WEAPON_BASES_JSON = DATA_OUTPUT_DIR / "weapon_bases.json"
ECHO_BASES_JSON = DATA_OUTPUT_DIR / "echo_bases.json"
FETTER_BASES_JSON = DATA_OUTPUT_DIR / "fetter_bases.json"
ID_MAPS_JSON = DATA_OUTPUT_DIR / "id_maps.json"
CHARACTER_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "character_curve.json"
LEVEL_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "level_curve.json"

WEAPON_BUFFS_GEN_GO = LB_REPO_DIR / "internal" / "calc" / "weapon_buffs_gen.go"

HARDCODED_WEAPON_ID_OVERRIDES = {
    "21020019": "21020017",  # Somnoire Anchor
    "21020025": "21020036",  # Unflickering Valor
    "21030017": "21030016",  # The Last Dance
    "21040018": "21040026",  # Tragicomedy
    "21040019": "21040036",  # Blazing Justice
    "21050029": "21050046",  # Luminous Hymn
    "21050030": "21050056",  # Whispers of Sirens
}

BONUS_NAME_MAP = {
    "Crit. Rate+": "Crit Rate",
    "Crit. DMG+": "Crit DMG",
    "ATK+": "ATK",
    "HP+": "HP",
    "DEF+": "DEF",
    "Healing Bonus+": "Healing",
    "Aero DMG Bonus+": "Aero",
    "Glacio DMG Bonus+": "Glacio",
    "Fusion DMG Bonus+": "Fusion",
    "Electro DMG Bonus+": "Electro",
    "Havoc DMG Bonus+": "Havoc",
    "Spectro DMG Bonus+": "Spectro",
}

FORTE_PARENT_TO_TREE = {
    1: "tree1", 2: "tree2", 3: "tree4", 6: "tree5",
    9: "tree1", 10: "tree2", 11: "tree4", 12: "tree5",
}

FORTE_COORD_TO_POS = {1: "middle", 2: "top"}

MAIN_STAT_NORMALIZE = {
    "Crit. Rate": "Crit Rate",
    "Crit. DMG": "Crit DMG",
    "Energy Regen": "ER",
    "Energy Regen.": "ER",
    "Energy Regeneration": "ER",
}

WEAPON_RARITY_MAP = {1: "1-star", 2: "2-star", 3: "3-star", 4: "4-star", 5: "5-star"}

FETTER_ID_TO_SET_KEY = {
    1: "Glacio", 2: "Fusion", 3: "Electro", 4: "Aero", 5: "Spectro", 6: "Havoc",
    7: "Healing", 8: "ER", 9: "Attack", 10: "Frosty", 11: "Radiance", 12: "Midnight",
    13: "Empyrean", 14: "Tidebreaking", 16: "Gust", 17: "Windward", 18: "Flaming",
    19: "Dream", 20: "Crown", 21: "Law", 22: "Flamewing", 23: "Thread", 24: "Pact",
    25: "Halo", 26: "Rite", 27: "Trailblazing", 28: "Chromatic", 29: "Sound",
}

# Maps unconditionalPassiveBonuses keys to (GoField, elementCode, moveTypeCode).
# Only keys relevant for DPS calculations are listed; HP%, DEF%, ER etc. are skipped.
UNCONDITIONAL_TO_GO: dict[str, tuple[str, str, str]] = {
    "ATK%":              ("AtkPercentage", "", ""),
    "Crit Rate":         ("CritRate", "", ""),
    "Crit Rate%":        ("CritRate", "", ""),
    "Crit DMG":          ("CritDMG", "", ""),
    "Crit DMG%":         ("CritDMG", "", ""),
    "Aero DMG Bonus":    ("ElementalDMG", "AD", ""),
    "Glacio DMG Bonus":  ("ElementalDMG", "GD", ""),
    "Fusion DMG Bonus":  ("ElementalDMG", "FD", ""),
    "Electro DMG Bonus": ("ElementalDMG", "ED", ""),
    "Havoc DMG Bonus":   ("ElementalDMG", "HD", ""),
    "Spectro DMG Bonus": ("ElementalDMG", "SD", ""),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def _fmt_float(v: float) -> str:
    """Format a float as a Go literal — whole numbers without decimal point."""
    return str(int(v)) if v == int(v) else str(v)


def _write_json(path: Path, data: Any, dry_run: bool, pretty: bool = False) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        payload = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
    else:
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    path.write_text(payload, encoding="utf-8")
    print(f"Wrote {path}")


def _write_go(path: Path, content: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Wrote {path}")


def _load_previous_id_maps(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _fmt_effect_value(value: float) -> str:
    if value == int(value):
        return str(int(value))
    return f"{value:.4f}".rstrip("0").rstrip(".")


def _resolve_effect_placeholders(effect_en: str, add_prop: list[dict], effect_params: list[str] | None = None) -> str:
    if not effect_en:
        return ""
    values_from_params: list[str] = []
    if isinstance(effect_params, list):
        values_from_params = [str(v) for v in effect_params]

    values_from_add_prop = [_fmt_effect_value(float(p.get("value", 0))) for p in add_prop]

    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if idx < len(values_from_params):
            return values_from_params[idx]
        return values_from_add_prop[idx] if idx < len(values_from_add_prop) else match.group(0)

    return re.sub(r"\{(\d+)\}", repl, effect_en)


# ---------------------------------------------------------------------------
# Character bases
# ---------------------------------------------------------------------------

def _parse_forte_node_value(node: dict) -> float:
    value_text = node.get("valueText")
    if isinstance(value_text, list) and value_text:
        raw = str(value_text[0]).replace("%", "").strip()
        try:
            return round(float(raw), 4)
        except ValueError:
            pass

    value_arr = node.get("value")
    if isinstance(value_arr, list) and value_arr:
        first = value_arr[0]
        if isinstance(first, dict):
            raw_val = float(first.get("Value", 0) or 0)
            is_ratio = bool(first.get("IsRatio", False))
            return round((raw_val * 100) if is_ratio else (raw_val / 100), 4)
    return 0.0


def _extract_forte_nodes(char: dict) -> dict[str, dict]:
    nodes = char.get("skillTrees")
    if not isinstance(nodes, list):
        return {}

    forte_nodes: dict[str, dict] = {}
    for node in nodes:
        if not isinstance(node, dict):
            continue
        parents = node.get("parentNodes")
        parent = parents[0] if isinstance(parents, list) and parents else None
        tree = FORTE_PARENT_TO_TREE.get(parent)
        pos = FORTE_COORD_TO_POS.get(node.get("coordinate"))
        if not tree or not pos:
            continue

        value = _parse_forte_node_value(node)
        if value <= 0:
            continue
        key = f"{tree}.{pos}"
        forte_nodes[key] = {
            "name": str(node.get("name", "") or ""),
            "value": value,
        }
    return forte_nodes

def _choose_bonus(char: dict) -> tuple[str, str]:
    name = (char.get("name") or {}).get("en", "")
    element = ((char.get("element") or {}).get("name") or {}).get("en", "")
    bonus1 = "ATK" if name.startswith("Rover") else (element or "ATK")
    bonus2 = "ATK"

    nodes = char.get("skillTrees")
    if not isinstance(nodes, list):
        return bonus1, bonus2

    for node in nodes:
        if not isinstance(node, dict) or node.get("coordinate") != 1:
            continue
        parents = node.get("parentNodes")
        parent = parents[0] if isinstance(parents, list) and parents else None
        mapped = BONUS_NAME_MAP.get(node.get("name", ""))
        if not mapped:
            continue
        if parent == 1:
            bonus1 = mapped
        elif parent == 2 and mapped in {"ATK", "HP", "DEF"}:
            bonus2 = mapped

    return bonus1, bonus2


def _build_character_bases(
    full_chars: list[dict]
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    out: dict[str, dict] = {}
    character_legacy_to_cdn: dict[str, str] = {}

    for char in full_chars:
        cdn_id = str(char.get("id"))
        name = (char.get("name") or {}).get("en", "")
        element = ((char.get("element") or {}).get("name") or {}).get("en", "") or "Spectro"
        weapon_type = ((char.get("weapon") or {}).get("name") or {}).get("en", "Sword")

        stats = char.get("stats", {})
        hp = int(round(float(stats.get("Life", 0) or 0)))
        atk = int(round(float(stats.get("Atk", 0) or 0)))
        defense = int(round(float(stats.get("Def", 0) or 0)))

        bonus1, bonus2 = _choose_bonus(char)
        forte_nodes = _extract_forte_nodes(char)

        out[cdn_id] = {
            "name": name,
            "element": element,
            "weaponType": weapon_type,
            "bonus1": bonus1,
            "bonus2": bonus2,
            "forte_nodes": forte_nodes,
            "stats": {
                "HP": hp, "ATK": atk, "DEF": defense,
                "Crit Rate": 5, "Crit DMG": 150, "Energy Regen": 100,
                "Healing Bonus": 0,
                "Aero DMG": 0, "Glacio DMG": 0, "Fusion DMG": 0,
                "Electro DMG": 0, "Havoc DMG": 0, "Spectro DMG": 0,
                "Basic Attack DMG Bonus": 0, "Heavy Attack DMG Bonus": 0,
                "Resonance Skill DMG Bonus": 0, "Resonance Liberation DMG Bonus": 0,
            },
        }

        legacy_id = str(char.get("legacyId", "") or "")
        if legacy_id:
            if character_legacy_to_cdn.get(legacy_id) is None:
                character_legacy_to_cdn[legacy_id] = cdn_id
            elif "Spectro" in (char.get("name") or {}).get("en", ""):
                character_legacy_to_cdn[legacy_id] = cdn_id

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}
    character_cdn_to_old: dict[str, str] = {}
    for old, new in sorted(
        character_legacy_to_cdn.items(),
        key=lambda x: int(x[0]) if x[0].isdigit() else x[0]
    ):
        character_cdn_to_old.setdefault(new, old)

    character_old_to_cdn = {k: k for k in out}
    character_old_to_cdn.update(character_legacy_to_cdn)

    return out, character_old_to_cdn, character_cdn_to_old


# ---------------------------------------------------------------------------
# Weapon bases
# ---------------------------------------------------------------------------

def _weapon_secondary_stat(second: dict) -> tuple[str, float]:
    """Return (stat_name, base_main_as_percent) from stats.second.

    Conversion rules (matching frontend stats.ts):
      isRatio=true  → value is a raw decimal ratio (0.081 → 8.1%)   multiply by 100
      isRatio=false → value is in internal units   (1080  → 10.8%)  divide by 100

    For "Atk" attribute with isRatio=true the stat is ATK% (percent of base ATK).
    """
    attribute = second.get("attribute", "")
    value = float(second.get("value", 0))
    is_ratio = bool(second.get("isRatio", False))

    # Normalize to percent
    base_main = (value * 100) if is_ratio else (value / 100)

    # Derive stat name
    name_en = (second.get("name") or {}).get("en", "")
    # First try the display name normalization table
    normalized = MAIN_STAT_NORMALIZE.get(name_en, "")
    if normalized:
        return normalized, base_main

    # For ATK/HP/DEF distinguish flat vs percentage
    if attribute == "Atk":
        return ("ATK%" if is_ratio else "ATK"), base_main
    if attribute == "Hp":
        return ("HP%" if is_ratio else "HP"), base_main
    if attribute == "Def":
        return ("DEF%" if is_ratio else "DEF"), base_main

    # Fall back to display name (may still need normalization)
    return name_en if name_en else attribute, base_main


def _params_for_rank(weapon: dict, rank: int) -> list[str]:
    """Return weapon effect parameters for rank R1..R5 (clamped per slot)."""
    idx = max(rank - 1, 0)
    params = weapon.get("params") or {}
    result = []
    for i in sorted(params.keys(), key=lambda x: int(x)):
        values = params[i]
        if isinstance(values, list) and values:
            result.append(str(values[min(idx, len(values) - 1)]))
    return result


def _params_r1(weapon: dict) -> list[str]:
    return _params_for_rank(weapon, 1)


def _params_r5(weapon: dict) -> list[str]:
    return _params_for_rank(weapon, 5)


def _unconditional_for_rank(weapon: dict, rank: int) -> dict[str, float]:
    """Return always-active bonuses at a given rank from unconditionalPassiveBonuses."""
    idx = max(0, min(4, rank - 1))
    bonuses = weapon.get("unconditionalPassiveBonuses") or {}
    result: dict[str, float] = {}
    for key, values in bonuses.items():
        if isinstance(values, list) and values:
            result[key] = float(values[min(idx, len(values) - 1)])
    return result


def _passive_bonus_matrix(weapon: dict) -> dict[str, list[float]]:
    bonuses = weapon.get("unconditionalPassiveBonuses") or {}
    result: dict[str, list[float]] = {}
    for key, values in bonuses.items():
        if not isinstance(values, list) or not values:
            continue
        parsed = []
        for v in values[:5]:
            try:
                parsed.append(float(v))
            except (TypeError, ValueError):
                parsed.append(0.0)
        if parsed:
            result[key] = parsed
    return result


def _build_weapon_bases(
    full_weapons: list[dict],
    previous_old_to_cdn: dict[str, str],
) -> tuple[dict[str, dict], dict[str, str], dict[str, str], list[tuple[str, str, dict]]]:
    """Build weapon_bases dict and unconditional bonus list for Go generation."""
    out: dict[str, dict] = {}
    unconditional_list: list[tuple[str, str, dict]] = []

    for w in full_weapons:
        wid = str(w.get("id", ""))
        if not wid:
            continue

        name = (w.get("name") or {}).get("en", "")
        type_name = ((w.get("type") or {}).get("name") or {}).get("en", "")
        rarity_id = (w.get("rarity") or {}).get("id", 0)
        rarity_str = WEAPON_RARITY_MAP.get(rarity_id, f"{rarity_id}-star")

        # Base ATK (level 1) from stats.first
        first = (w.get("stats") or {}).get("first", {})
        base_atk = float(first.get("value", 0))
        atk_lv1 = int(round(base_atk))

        # Secondary stat from stats.second (level 1 display units)
        second = (w.get("stats") or {}).get("second", {})
        main_stat, base_main = _weapon_secondary_stat(second)
        main_stat = MAIN_STAT_NORMALIZE.get(main_stat, main_stat)
        base_main_lv1 = round(base_main, 1)

        effect_en = (w.get("effect") or {}).get("en", "")
        params_r1 = _params_r1(w)
        params_r5 = _params_r5(w)
        bonuses = _unconditional_for_rank(w, 1)
        passive_bonuses = _passive_bonus_matrix(w)

        out[wid] = {
            "name": name,
            "type": type_name,
            "rarity": rarity_str,
            "ATK": atk_lv1,
            "main_stat": main_stat,
            "base_main": base_main_lv1,
            "passive_bonuses": passive_bonuses,
            "effect_en": effect_en,
            "params_r1": params_r1,
            "params_r5": params_r5,
        }
        unconditional_list.append((wid, name, bonuses))

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}

    old_to_cdn = {k: k for k in out}
    old_to_cdn.update(HARDCODED_WEAPON_ID_OVERRIDES)
    old_to_cdn.update(previous_old_to_cdn)

    cdn_to_old: dict[str, str] = {}
    for old_id in sorted(old_to_cdn):
        cdn_to_old.setdefault(old_to_cdn[old_id], old_id)

    return out, old_to_cdn, cdn_to_old, unconditional_list


# ---------------------------------------------------------------------------
# Echo bases
# ---------------------------------------------------------------------------

def _build_echo_bases(
    echoes: list[dict],
    previous_old_to_cdn: dict[str, str],
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    out: dict[str, dict] = {}

    for echo in echoes:
        eid = str(echo.get("id"))
        if not eid:
            continue
        name = (echo.get("name") or {}).get("en", "")
        cost = int(echo.get("cost", 0))
        raw_fetters = echo.get("fetter", []) if isinstance(echo.get("fetter"), list) else []
        set_keys = [
            FETTER_ID_TO_SET_KEY[f]
            for f in raw_fetters
            if isinstance(f, int) and f in FETTER_ID_TO_SET_KEY
        ]
        effect_en = ((echo.get("skill") or {}).get("description") or "").strip()
        raw_bonuses = echo.get("bonuses") if isinstance(echo.get("bonuses"), list) else []
        bonuses = []
        for bonus in raw_bonuses:
            if not isinstance(bonus, dict):
                continue
            stat = str(bonus.get("stat", "") or "").strip()
            if stat == "":
                continue
            value = float(bonus.get("value", 0) or 0)
            entry = {"stat": stat, "value": value}
            cond = bonus.get("characterCondition")
            if isinstance(cond, list):
                cleaned = [str(c).strip() for c in cond if str(c).strip()]
                if cleaned:
                    entry["characterCondition"] = cleaned
            bonuses.append(entry)
        out[eid] = {
            "name": name,
            "cost": cost,
            "elements": set_keys,
            "fetter_ids": [f for f in raw_fetters if isinstance(f, int)],
            "effect_en": effect_en,
            "bonuses": bonuses,
        }

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}

    old_to_cdn = {k: k for k in out}
    for echo in echoes:
        eid = str(echo.get("id"))
        legacy = str(echo.get("legacyId", "") or "")
        if not legacy:
            continue
        old_to_cdn[legacy] = eid
        if legacy.isdigit():
            old_to_cdn[str(int(legacy))] = eid
    old_to_cdn.update(previous_old_to_cdn)

    cdn_to_old: dict[str, str] = {}
    for old_id in sorted(old_to_cdn):
        cdn_to_old.setdefault(old_to_cdn[old_id], old_id)

    return out, old_to_cdn, cdn_to_old


def _build_fetter_bases(fetters: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for fetter in fetters:
        group_id = fetter.get("id")
        if not isinstance(group_id, int):
            continue
        set_key = FETTER_ID_TO_SET_KEY.get(group_id)
        if not set_key:
            continue

        name_en = ((fetter.get("name") or {}).get("en") or "").strip()
        piece_effects_raw = fetter.get("pieceEffects")
        normalized_piece_effects: dict[str, dict] = {}

        if isinstance(piece_effects_raw, dict) and piece_effects_raw:
            items = sorted(piece_effects_raw.items(), key=lambda kv: int(kv[0]))
        else:
            # Backward-compatible fallback for older Fetters.json that only has one tier.
            fallback_piece = str(int(fetter.get("pieceCount", 2) or 2))
            items = [(fallback_piece, {
                "pieceCount": int(fetter.get("pieceCount", 2) or 2),
                "fetterId": fetter.get("fetterId"),
                "addProp": fetter.get("addProp", []),
                "buffIds": fetter.get("buffIds", []),
                "effectDescription": fetter.get("effectDescription", {}),
                "effectDescriptionParam": fetter.get("effectDescriptionParam", []),
            })]

        for piece_key, piece_data in items:
            if not isinstance(piece_data, dict):
                continue
            add_prop = piece_data.get("addProp", [])
            if not isinstance(add_prop, list):
                add_prop = []
            effect_params = piece_data.get("effectDescriptionParam", [])
            if not isinstance(effect_params, list):
                effect_params = []
            effect_obj = piece_data.get("effectDescription", {})
            effect_en_raw = (effect_obj.get("en", "") if isinstance(effect_obj, dict) else "").strip()
            normalized_piece_effects[piece_key] = {
                "fetter_id": piece_data.get("fetterId"),
                "effect_en_raw": effect_en_raw,
                "effect_en": _resolve_effect_placeholders(effect_en_raw, add_prop, effect_params),
                "add_prop": add_prop,
                "effect_params": effect_params,
                "buff_ids": piece_data.get("buffIds", []),
            }

        out[set_key] = {
            "group_id": group_id,
            "name": name_en,
            "piece_count": int(fetter.get("pieceCount", 2) or 2),
            "piece_effects": normalized_piece_effects,
        }

    return {k: out[k] for k in sorted(out)}


# ---------------------------------------------------------------------------
# Go code generation for weapon_buffs_gen.go
# ---------------------------------------------------------------------------

def _format_weapon_buff_go(wid: str, name: str, bonuses: dict[str, float]) -> str | None:
    """Format one WeaponBuffEntry Go struct literal from unconditional bonuses.

    Returns None if there are no DPS-relevant bonuses for this weapon.
    """
    atk_pct = 0.0
    crit_rate = 0.0
    crit_dmg = 0.0
    elemental: list[tuple[str, float]] = []

    for key, val in bonuses.items():
        mapping = UNCONDITIONAL_TO_GO.get(key)
        if not mapping:
            continue
        field, elem, _ = mapping
        if field == "AtkPercentage":
            atk_pct = val
        elif field == "CritRate":
            crit_rate = val
        elif field == "CritDMG":
            crit_dmg = val
        elif field == "ElementalDMG" and elem:
            elemental.append((elem, val))

    fields: list[str] = []
    if atk_pct:
        fields.append(f"AtkPercentage: {_fmt_float(atk_pct)}")
    if crit_rate:
        fields.append(f"CritRate: {_fmt_float(crit_rate)}")
    if crit_dmg:
        fields.append(f"CritDMG: {_fmt_float(crit_dmg)}")
    if elemental:
        items = ", ".join(f'{{Element: "{e}", Value: {_fmt_float(v)}}}' for e, v in elemental)
        fields.append(f"ElementalDMG: []ElementalDMGBuff{{{items}}}")

    if not fields:
        return None

    return f'\t"{wid}": {{{", ".join(fields)}}}, // {name}'


def _generate_weapon_buffs_go(unconditional_list: list[tuple[str, str, dict]]) -> str:
    lines = [
        "// Code generated by wuwabuilds/scripts/sync_lb.py. DO NOT EDIT.",
        "// Regenerate: python wuwabuilds/scripts/sync_lb.py",
        "//",
        "// WeaponBuffs holds always-active bonuses extracted from",
        "// unconditionalPassiveBonuses at R1. Trigger-based conditional effects",
        "// are layered on top by weapon_effects.go via init().",
        "package calc",
        "",
        "// WeaponBuffs maps weapon IDs to their passive buff entries.",
        "var WeaponBuffs = map[string]WeaponBuffEntry{",
    ]

    added = 0
    for wid, name, bonuses in sorted(unconditional_list, key=lambda x: int(x[0])):
        line = _format_weapon_buff_go(wid, name, bonuses)
        if line:
            lines.append(line)
            added += 1

    lines.append("}")
    print(f"  Weapon buff entries generated: {added}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def _cleanup_compact_artifacts(dry_run: bool) -> None:
    targets = [CHARACTERS_COMPACT]
    existing = [p for p in targets if p.exists()]

    if not existing:
        print("No compact LB artifacts to clean up.")
        return

    if dry_run:
        for p in existing:
            print(f"[DRY RUN] Would delete {p}")
        return

    for p in existing:
        p.unlink(missing_ok=True)
        print(f"Deleted {p}")

    try:
        LB_DATA_DIR.rmdir()
        print(f"Removed empty directory {LB_DATA_DIR}")
    except OSError:
        pass


def _sync_weapons_only(dry_run: bool, pretty: bool) -> int:
    required = [WEAPONS_JSON]
    for path in required:
        if not path.exists():
            print(f"ERROR: Missing required input: {path}")
            return 1

    full_weapons = _load_json(WEAPONS_JSON)

    previous_maps = _load_previous_id_maps(ID_MAPS_JSON)
    previous_weapon_old_to_cdn = previous_maps.get("weaponOldToCdn", {})

    weapon_bases, weapon_old_to_cdn, weapon_cdn_to_old, unconditional_list = _build_weapon_bases(
        full_weapons, previous_weapon_old_to_cdn
    )

    id_maps = {
        "characterOldToCdn": previous_maps.get("characterOldToCdn", {}),
        "characterCdnToOld": previous_maps.get("characterCdnToOld", {}),
        "weaponOldToCdn": weapon_old_to_cdn,
        "weaponCdnToOld": weapon_cdn_to_old,
        "echoOldToCdn": previous_maps.get("echoOldToCdn", {}),
        "echoCdnToOld": previous_maps.get("echoCdnToOld", {}),
    }

    _write_json(WEAPON_BASES_JSON, weapon_bases, dry_run, pretty=pretty)
    _write_json(ID_MAPS_JSON, id_maps, dry_run, pretty=pretty)
    _write_go(WEAPON_BUFFS_GEN_GO, _generate_weapon_buffs_go(unconditional_list), dry_run)

    print("\nGenerated summary (weapons-only):")
    print(f"  Weapons:    {len(weapon_bases)}")
    print(f"  Weapon map: {len(weapon_old_to_cdn)} old->cdn")
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate LB base-data from local synced game data")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON outputs")
    parser.add_argument("--keep-compact", action="store_true", help="Keep compact LB artifacts")
    parser.add_argument(
        "--weapons-only",
        action="store_true",
        help="Regenerate weapon base data + weapon ID maps only",
    )
    args = parser.parse_args()

    if args.weapons_only:
        return _sync_weapons_only(args.dry_run, args.pretty)

    required = [CHARACTERS_JSON, WEAPONS_JSON, ECHOES_JSON, FETTERS_JSON, CHARACTER_CURVE_JSON, LEVEL_CURVE_JSON]
    for path in required:
        if not path.exists():
            print(f"ERROR: Missing required input: {path}")
            return 1

    full_chars = _load_json(CHARACTERS_JSON)
    full_weapons = _load_json(WEAPONS_JSON)
    full_echoes = _load_json(ECHOES_JSON)
    full_fetters = _load_json(FETTERS_JSON)
    character_curve = _load_json(CHARACTER_CURVE_JSON)
    level_curves = _load_json(LEVEL_CURVE_JSON)

    previous_maps = _load_previous_id_maps(ID_MAPS_JSON)
    previous_weapon_old_to_cdn = previous_maps.get("weaponOldToCdn", {})
    previous_echo_old_to_cdn = previous_maps.get("echoOldToCdn", {})

    character_bases, character_old_to_cdn, character_cdn_to_old = _build_character_bases(full_chars)
    weapon_bases, weapon_old_to_cdn, weapon_cdn_to_old, unconditional_list = _build_weapon_bases(
        full_weapons, previous_weapon_old_to_cdn
    )
    echo_bases, echo_old_to_cdn, echo_cdn_to_old = _build_echo_bases(
        full_echoes, previous_echo_old_to_cdn
    )
    fetter_bases = _build_fetter_bases(full_fetters)

    id_maps = {
        "characterOldToCdn": character_old_to_cdn,
        "characterCdnToOld": character_cdn_to_old,
        "weaponOldToCdn": weapon_old_to_cdn,
        "weaponCdnToOld": weapon_cdn_to_old,
        "echoOldToCdn": echo_old_to_cdn,
        "echoCdnToOld": echo_cdn_to_old,
    }

    _write_json(CHARACTER_BASES_JSON, character_bases, args.dry_run, pretty=args.pretty)
    _write_json(WEAPON_BASES_JSON, weapon_bases, args.dry_run, pretty=args.pretty)
    _write_json(ECHO_BASES_JSON, echo_bases, args.dry_run, pretty=args.pretty)
    _write_json(FETTER_BASES_JSON, fetter_bases, args.dry_run, pretty=args.pretty)
    _write_json(ID_MAPS_JSON, id_maps, args.dry_run, pretty=args.pretty)
    _write_json(CHARACTER_CURVE_OUT_JSON, character_curve, args.dry_run, pretty=args.pretty)
    _write_json(LEVEL_CURVE_OUT_JSON, level_curves, args.dry_run, pretty=args.pretty)
    _write_go(WEAPON_BUFFS_GEN_GO, _generate_weapon_buffs_go(unconditional_list), args.dry_run)

    print("\nGenerated summary:")
    print(f"  Characters: {len(character_bases)}")
    print(f"  Weapons:    {len(weapon_bases)}")
    print(f"  Echoes:     {len(echo_bases)}")
    print(f"  Fetters:    {len(fetter_bases)}")
    print(f"  Char map:   {len(character_old_to_cdn)} old->cdn")
    print(f"  Weapon map: {len(weapon_old_to_cdn)} old->cdn")
    print(f"  Echo map:   {len(echo_old_to_cdn)} old->cdn")

    if args.keep_compact:
        print("\nKeeping compact LB artifacts (--keep-compact set).")
    else:
        print("\nCleaning up temporary LB compact artifacts...")
        _cleanup_compact_artifacts(args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
