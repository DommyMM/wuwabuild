"""
Generate LB base-data from local synced game data.

Inputs (all from frontend public/Data/):
- Characters.json, Weapons.json, Echoes.json
- LevelCurve.json      (ATK_CURVE / STAT_CURVE for scaling weapons to lv90)
- LB/Characters.compact.json
- LB/Echoes.compact.json

Outputs:
- lb/internal/calc/data/character_bases.json
- lb/internal/calc/data/weapon_bases.json    (lv90 ATK + secondary, effect_en, params_r5)
- lb/internal/calc/data/echo_bases.json
- lb/internal/calc/data/id_maps.json
- lb/internal/calc/weapon_buffs_gen.go       (always-active bonuses as Go source)

Weapons.compact.json is not needed — stats are derived from Weapons.json + LevelCurve.json
using the same scaling the frontend uses:
  ATK_lv90  = floor(stats.first.value  * ATK_CURVE["90/90"])
  Stat_lv90 = round(base_main          * STAT_CURVE["90/90"], 1)
  where base_main:
    isRatio=true  → value * 100   (raw decimal ratio, e.g. 0.081 → 8.1%)
    isRatio=false → value / 100   (raw internal units, e.g. 1080 → 10.8%)
"""

from __future__ import annotations

import argparse
import json
import math
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
LEVEL_CURVE_JSON = DATA_DIR / "LevelCurve.json"

CHARACTERS_COMPACT = LB_DATA_DIR / "Characters.compact.json"
ECHOES_COMPACT = LB_DATA_DIR / "Echoes.compact.json"

CHARACTER_BASES_JSON = DATA_OUTPUT_DIR / "character_bases.json"
WEAPON_BASES_JSON = DATA_OUTPUT_DIR / "weapon_bases.json"
ECHO_BASES_JSON = DATA_OUTPUT_DIR / "echo_bases.json"
ID_MAPS_JSON = DATA_OUTPUT_DIR / "id_maps.json"

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

MAIN_STAT_NORMALIZE = {
    "Crit. Rate": "Crit Rate",
    "Crit. DMG": "Crit DMG",
    "Energy Regen": "ER",
    "Energy Regen.": "ER",
    "Energy Regeneration": "ER",
}

WEAPON_RARITY_MAP = {1: "1-star", 2: "2-star", 3: "3-star", 4: "4-star", 5: "5-star"}

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


def _write_json(path: Path, data: Any, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
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


# ---------------------------------------------------------------------------
# Character bases
# ---------------------------------------------------------------------------

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
    full_chars: list[dict], compact_chars: list[dict]
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    compact_by_id = {str(c.get("id")): c for c in compact_chars if c.get("id")}
    out: dict[str, dict] = {}
    character_legacy_to_cdn: dict[str, str] = {}

    for char in full_chars:
        cdn_id = str(char.get("id"))
        compact = compact_by_id.get(cdn_id, {})

        name = compact.get("name") or ((char.get("name") or {}).get("en", ""))
        element = compact.get("element") or (
            ((char.get("element") or {}).get("name") or {}).get("en", "") or "Spectro"
        )
        weapon_type = compact.get("weaponType") or (
            ((char.get("weapon") or {}).get("name") or {}).get("en", "Sword")
        )

        stats90 = compact.get("statsLv90", {}) if isinstance(compact, dict) else {}
        hp = int(round(float(stats90.get("HP", 0) or 0)))
        atk = int(round(float(stats90.get("ATK", 0) or 0)))
        defense = int(round(float(stats90.get("DEF", 0) or 0)))

        bonus1 = compact.get("bonus1") if isinstance(compact, dict) else None
        bonus2 = compact.get("bonus2") if isinstance(compact, dict) else None
        if not bonus1 or not bonus2:
            b1, b2 = _choose_bonus(char)
            bonus1 = bonus1 or b1
            bonus2 = bonus2 or b2

        out[cdn_id] = {
            "name": name,
            "element": element,
            "weaponType": weapon_type,
            "bonus1": bonus1,
            "bonus2": bonus2,
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
# Weapon bases (reads Weapons.json + LevelCurve.json)
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


def _params_r5(weapon: dict) -> list[str]:
    """Return weapon effect parameters at R5 (last index per slot)."""
    params = weapon.get("params") or {}
    result = []
    for i in sorted(params.keys(), key=lambda x: int(x)):
        values = params[i]
        if isinstance(values, list) and values:
            result.append(str(values[-1]))
    return result


def _unconditional_r5(weapon: dict) -> dict[str, float]:
    """Return always-active bonuses at R5 from unconditionalPassiveBonuses."""
    bonuses = weapon.get("unconditionalPassiveBonuses") or {}
    result: dict[str, float] = {}
    for key, values in bonuses.items():
        if isinstance(values, list) and values:
            result[key] = float(values[-1])
    return result


def _build_weapon_bases(
    full_weapons: list[dict],
    atk_curve_lv90: float,
    stat_curve_lv90: float,
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
        atk_lv90 = int(math.floor(base_atk * atk_curve_lv90))

        # Secondary stat from stats.second
        second = (w.get("stats") or {}).get("second", {})
        main_stat, base_main = _weapon_secondary_stat(second)
        main_stat = MAIN_STAT_NORMALIZE.get(main_stat, main_stat)
        base_main_lv90 = round(base_main * stat_curve_lv90, 1)

        effect_en = (w.get("effect") or {}).get("en", "")
        params = _params_r5(w)
        bonuses = _unconditional_r5(w)

        out[wid] = {
            "name": name,
            "type": type_name,
            "rarity": rarity_str,
            "ATK": atk_lv90,
            "main_stat": main_stat,
            "base_main": base_main_lv90,
            "effect_en": effect_en,
            "params_r5": params,
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
    compact_echoes: list[dict],
    previous_old_to_cdn: dict[str, str],
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    compact_by_id = {str(e.get("id")): e for e in compact_echoes if e.get("id")}
    out: dict[str, dict] = {}

    for echo in echoes:
        eid = str(echo.get("id"))
        if not eid:
            continue
        compact = compact_by_id.get(eid, {})
        name = compact.get("name") or ((echo.get("name") or {}).get("en", ""))
        cost = int(compact.get("cost", echo.get("cost", 0)))
        sets = compact.get("sets", []) if isinstance(compact, dict) else []
        out[eid] = {"name": name, "cost": cost, "elements": sets}

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
        "// unconditionalPassiveBonuses at R5. Trigger-based conditional effects",
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
    targets = [CHARACTERS_COMPACT, ECHOES_COMPACT]
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate LB base-data from local synced game data")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--keep-compact", action="store_true", help="Keep compact LB artifacts")
    args = parser.parse_args()

    required = [CHARACTERS_JSON, WEAPONS_JSON, ECHOES_JSON, LEVEL_CURVE_JSON,
                CHARACTERS_COMPACT, ECHOES_COMPACT]
    for path in required:
        if not path.exists():
            print(f"ERROR: Missing required input: {path}")
            return 1

    full_chars = _load_json(CHARACTERS_JSON)
    full_weapons = _load_json(WEAPONS_JSON)
    full_echoes = _load_json(ECHOES_JSON)
    level_curves = _load_json(LEVEL_CURVE_JSON)
    compact_chars = _load_json(CHARACTERS_COMPACT)
    compact_echoes = _load_json(ECHOES_COMPACT)

    atk_curve_lv90 = float(level_curves["ATK_CURVE"]["90/90"])
    stat_curve_lv90 = float(level_curves["STAT_CURVE"]["90/90"])
    print(f"Level curves: ATK×{atk_curve_lv90}, STAT×{stat_curve_lv90} at lv90")

    previous_maps = _load_previous_id_maps(ID_MAPS_JSON)
    previous_weapon_old_to_cdn = previous_maps.get("weaponOldToCdn", {})
    previous_echo_old_to_cdn = previous_maps.get("echoOldToCdn", {})

    character_bases, character_old_to_cdn, character_cdn_to_old = _build_character_bases(
        full_chars, compact_chars
    )
    weapon_bases, weapon_old_to_cdn, weapon_cdn_to_old, unconditional_list = _build_weapon_bases(
        full_weapons, atk_curve_lv90, stat_curve_lv90, previous_weapon_old_to_cdn
    )
    echo_bases, echo_old_to_cdn, echo_cdn_to_old = _build_echo_bases(
        full_echoes, compact_echoes, previous_echo_old_to_cdn
    )

    id_maps = {
        "characterOldToCdn": character_old_to_cdn,
        "characterCdnToOld": character_cdn_to_old,
        "weaponOldToCdn": weapon_old_to_cdn,
        "weaponCdnToOld": weapon_cdn_to_old,
        "echoOldToCdn": echo_old_to_cdn,
        "echoCdnToOld": echo_cdn_to_old,
    }

    _write_json(CHARACTER_BASES_JSON, character_bases, args.dry_run)
    _write_json(WEAPON_BASES_JSON, weapon_bases, args.dry_run)
    _write_json(ECHO_BASES_JSON, echo_bases, args.dry_run)
    _write_json(ID_MAPS_JSON, id_maps, args.dry_run)
    _write_go(WEAPON_BUFFS_GEN_GO, _generate_weapon_buffs_go(unconditional_list), args.dry_run)

    print("\nGenerated summary:")
    print(f"  Characters: {len(character_bases)}")
    print(f"  Weapons:    {len(weapon_bases)}")
    print(f"  Echoes:     {len(echo_bases)}")
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
