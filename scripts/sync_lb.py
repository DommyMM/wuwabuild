"""
Generate LB constants and migration maps from local synced data.

Inputs:
- ../public/Data/Characters.json
- ../public/Data/Weapons.json
- ../public/Data/Echoes.json
- ../public/Data/LB/*.compact.json

Outputs:
- ../../lb/src/constants/{characterBases.ts,weaponBases.ts,echoBases.ts,idMaps.ts}

By default, temporary compact artifacts in ../public/Data/LB/*.compact.json are
deleted after a successful generation run. Use --keep-compact to retain them.
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
CONST_DIR = LB_REPO_DIR / "src" / "constants"
LEGACY_GEN_DIR = CONST_DIR / "generated"

CHARACTERS_JSON = DATA_DIR / "Characters.json"
WEAPONS_JSON = DATA_DIR / "Weapons.json"
ECHOES_JSON = DATA_DIR / "Echoes.json"

CHARACTERS_COMPACT = LB_DATA_DIR / "Characters.compact.json"
WEAPONS_COMPACT = LB_DATA_DIR / "Weapons.compact.json"
ECHOES_COMPACT = LB_DATA_DIR / "Echoes.compact.json"

CHARACTER_BASES_FILE = CONST_DIR / "characterBases.ts"
WEAPON_BASES_FILE = CONST_DIR / "weaponBases.ts"
ECHO_BASES_FILE = CONST_DIR / "echoBases.ts"
ID_MAPS_FILE = CONST_DIR / "idMaps.ts"

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

ECHO_BLOCK_START = "// AUTO-GENERATED ECHOBASES START"
ECHO_BLOCK_END = "// AUTO-GENERATED ECHOBASES END"


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def _to_ts_obj(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)


def _parse_legacy_weapon_bases(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    if "export const WEAPONBASES" not in text:
        return {}

    entries: dict[str, dict] = {}
    pattern = re.compile(r'"(?P<id>\d+)"\s*:\s*\{(?P<body>.*?)\n\s*\}', re.S)
    for m in pattern.finditer(text):
        body = m.group("body")

        def _get_str(field: str) -> str | None:
            x = re.search(rf'"?{re.escape(field)}"?\s*:\s*"([^"]+)"', body)
            return x.group(1) if x else None

        def _get_num(field: str) -> float | None:
            x = re.search(rf'"?{re.escape(field)}"?\s*:\s*([-]?[0-9]+(?:\.[0-9]+)?)', body)
            return float(x.group(1)) if x else None

        name = _get_str("name")
        if not name:
            continue

        entry: dict[str, Any] = {
            "id": m.group("id"),
            "name": name,
            "type": _get_str("type"),
            "rarity": _get_str("rarity"),
            "ATK": _get_num("ATK"),
            "main_stat": _get_str("main_stat"),
            "base_main": _get_num("base_main"),
        }
        passive = _get_str("passive")
        passive_stat = _get_num("passive_stat")
        passive2 = _get_str("passive2")
        passive_stat2 = _get_num("passive_stat2")
        if passive is not None:
            entry["passive"] = passive
        if passive_stat is not None:
            entry["passive_stat"] = passive_stat
        if passive2 is not None:
            entry["passive2"] = passive2
        if passive_stat2 is not None:
            entry["passive_stat2"] = passive_stat2

        entries[_normalize_name(name)] = entry
    return entries


def _parse_legacy_echo_name_map(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    block = re.search(r"export const ECHOBASES:.*?=\s*\{(?P<body>.*?)\}\s*as const;", text, re.S)
    if not block:
        return {}
    body = block.group("body")
    out: dict[str, str] = {}
    pattern = re.compile(r'"(?P<id>[^"]+)"\s*:\s*\{\s*name:\s*"(?P<name>[^"]+)"', re.S)
    for m in pattern.finditer(body):
        out[m.group("id")] = m.group("name")
    return out


def _parse_record_from_generated_maps(path: Path, export_name: str) -> dict[str, str]:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    block = re.search(
        rf"export const {re.escape(export_name)}:[^=]*=\s*(?P<body>\{{.*?\}})\s*as const;",
        text,
        re.S,
    )
    if not block:
        return {}
    body = block.group("body")
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    return {str(k): str(v) for k, v in parsed.items()}


def _first_nonempty_weapon_map(paths: list[Path]) -> dict[str, dict]:
    for path in paths:
        parsed = _parse_legacy_weapon_bases(path)
        if parsed:
            return parsed
    return {}


def _first_nonempty_echo_name_map(paths: list[Path]) -> dict[str, str]:
    for path in paths:
        parsed = _parse_legacy_echo_name_map(path)
        if parsed:
            return parsed
    return {}


def _first_nonempty_id_map(paths: list[Path], export_name: str) -> dict[str, str]:
    for path in paths:
        parsed = _parse_record_from_generated_maps(path, export_name)
        if parsed:
            return parsed
    return {}


def _upsert_echo_imports(text: str) -> str:
    if "import type { EchoBase } from '../types/base';" not in text:
        text = "import type { EchoBase } from '../types/base';\n" + text
    return text


def _strip_generated_echo_export(text: str) -> str:
    text = re.sub(
        r"^\s*export\s+\{\s*ECHOBASES_GENERATED\s+as\s+ECHOBASES\s*\}\s+from\s+['\"]\.\/generated\/echoBases\.generated['\"];\s*\n?",
        "",
        text,
        flags=re.M,
    )
    return text


def _replace_echo_bases_block(existing_text: str, block: str) -> str:
    pattern = re.compile(
        rf"{re.escape(ECHO_BLOCK_START)}.*?{re.escape(ECHO_BLOCK_END)}\n?",
        re.S,
    )
    if pattern.search(existing_text):
        return pattern.sub(block + "\n", existing_text)

    insertion_anchor = "export const ECHO_DEFAULT_STATS"
    idx = existing_text.find(insertion_anchor)
    if idx >= 0:
        return existing_text[:idx] + block + "\n\n" + existing_text[idx:]
    return block + "\n\n" + existing_text


def _choose_bonus(char: dict) -> tuple[str, str]:
    name = (char.get("name") or {}).get("en", "")
    element = ((char.get("element") or {}).get("name") or {}).get("en", "")
    bonus1 = "ATK" if name.startswith("Rover") else (element or "ATK")
    bonus2 = "ATK"

    nodes = char.get("skillTrees")
    if not isinstance(nodes, list):
        return bonus1, bonus2

    for node in nodes:
        if not isinstance(node, dict):
            continue
        if node.get("coordinate") != 1:
            continue
        parents = node.get("parentNodes")
        parent = parents[0] if isinstance(parents, list) and parents else None
        node_name = node.get("name", "")
        mapped = BONUS_NAME_MAP.get(node_name)
        if not mapped:
            continue
        if parent == 1:
            bonus1 = mapped
        elif parent == 2 and mapped in {"ATK", "HP", "DEF"}:
            bonus2 = mapped

    return bonus1, bonus2


def _build_character_bases(full_chars: list[dict], compact_chars: list[dict]) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    compact_by_id = {str(c.get("id")): c for c in compact_chars if c.get("id")}
    out: dict[str, dict] = {}
    character_legacy_to_cdn: dict[str, str] = {}

    for char in full_chars:
        cdn_id = str(char.get("id"))
        compact = compact_by_id.get(cdn_id, {})

        name = compact.get("name") or ((char.get("name") or {}).get("en", ""))
        element = compact.get("element") or (((char.get("element") or {}).get("name") or {}).get("en", "") or "Spectro")
        weapon_type_raw = compact.get("weaponType") or (((char.get("weapon") or {}).get("name") or {}).get("en", "Sword"))
        weapon_type = weapon_type_raw

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
                "HP": hp,
                "ATK": atk,
                "DEF": defense,
                "Crit Rate": 5,
                "Crit DMG": 150,
                "Energy Regen": 100,
                "Healing Bonus": 0,
                "Aero DMG": 0,
                "Glacio DMG": 0,
                "Fusion DMG": 0,
                "Electro DMG": 0,
                "Havoc DMG": 0,
                "Spectro DMG": 0,
                "Basic Attack DMG Bonus": 0,
                "Heavy Attack DMG Bonus": 0,
                "Resonance Skill DMG Bonus": 0,
                "Resonance Liberation DMG Bonus": 0,
            },
        }

        legacy_id = str(char.get("legacyId", "") or "")
        if legacy_id:
            existing = character_legacy_to_cdn.get(legacy_id)
            if existing is None:
                character_legacy_to_cdn[legacy_id] = cdn_id
            else:
                # Prefer Spectro Rover variants for duplicate legacy IDs (4/5).
                current_name = ((char.get("name") or {}).get("en", ""))
                if "Spectro" in current_name:
                    character_legacy_to_cdn[legacy_id] = cdn_id

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}
    character_cdn_to_legacy: dict[str, str] = {}
    for old, new in sorted(character_legacy_to_cdn.items(), key=lambda x: int(x[0]) if x[0].isdigit() else x[0]):
        character_cdn_to_legacy.setdefault(new, old)

    # Include identity to simplify migration script usage.
    character_old_to_cdn = {k: k for k in out}
    character_old_to_cdn.update(character_legacy_to_cdn)

    return out, character_old_to_cdn, character_cdn_to_legacy


def _build_weapon_bases(
    compact_weapons: list[dict],
    legacy_by_name: dict[str, dict],
    previous_old_to_cdn: dict[str, str],
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    out: dict[str, dict] = {}
    current_by_name: dict[str, str] = {}

    for w in compact_weapons:
        wid = str(w.get("id", ""))
        if not wid:
            continue
        name = str(w.get("name", ""))
        n_name = _normalize_name(name)
        current_by_name[n_name] = wid

        legacy = legacy_by_name.get(n_name, {})

        entry: dict[str, Any] = {
            "name": name,
            "type": str(w.get("type", "")),
            "rarity": str(w.get("rarity", "0-star")),
            "ATK": int(round(float(w.get("ATK", 0) or 0))),
            "main_stat": MAIN_STAT_NORMALIZE.get(str(w.get("main_stat", "ATK")), str(w.get("main_stat", "ATK"))),
            "base_main": float(w.get("base_main", 0) or 0),
        }

        # Keep curated passive metadata when available.
        for key in ("passive", "passive_stat", "passive2", "passive_stat2"):
            if key in legacy:
                val = legacy[key]
                if val is not None:
                    entry[key] = val

        out[wid] = entry

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}

    old_to_cdn = {k: k for k in out}

    # Prefer name-based remap from legacy constants when available.
    for legacy in legacy_by_name.values():
        old_id = str(legacy.get("id", ""))
        old_name = str(legacy.get("name", ""))
        if not old_id or not old_name:
            continue
        new_id = current_by_name.get(_normalize_name(old_name))
        if new_id:
            old_to_cdn[old_id] = new_id

    # Hardcoded safety overrides for known moved IDs.
    old_to_cdn.update(HARDCODED_WEAPON_ID_OVERRIDES)
    old_to_cdn.update(previous_old_to_cdn)

    cdn_to_old: dict[str, str] = {}
    for old_id in sorted(old_to_cdn):
        cdn_id = old_to_cdn[old_id]
        cdn_to_old.setdefault(cdn_id, old_id)

    return out, old_to_cdn, cdn_to_old


def _build_echo_bases(
    echoes: list[dict],
    compact_echoes: list[dict],
    legacy_echo_name_map: dict[str, str],
    previous_old_to_cdn: dict[str, str],
) -> tuple[dict[str, dict], dict[str, str], dict[str, str]]:
    compact_by_id = {str(e.get("id")): e for e in compact_echoes if e.get("id")}
    out: dict[str, dict] = {}
    name_to_id: dict[str, str] = {}

    for echo in echoes:
        eid = str(echo.get("id"))
        if not eid:
            continue
        compact = compact_by_id.get(eid, {})
        name = compact.get("name") or ((echo.get("name") or {}).get("en", ""))
        cost = int(compact.get("cost", echo.get("cost", 0)))
        sets = compact.get("sets", []) if isinstance(compact, dict) else []
        out[eid] = {
            "name": name,
            "cost": cost,
            "elements": sets,
        }
        name_to_id[_normalize_name(name)] = eid

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

    for old_id, old_name in legacy_echo_name_map.items():
        mapped = name_to_id.get(_normalize_name(old_name))
        if mapped:
            old_to_cdn[old_id] = mapped
            if old_id.isdigit():
                old_to_cdn[str(int(old_id))] = mapped

    old_to_cdn.update(previous_old_to_cdn)

    cdn_to_old: dict[str, str] = {}
    for old_id in sorted(old_to_cdn):
        cdn_id = old_to_cdn[old_id]
        cdn_to_old.setdefault(cdn_id, old_id)

    return out, old_to_cdn, cdn_to_old


def _write_ts(path: Path, content: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Wrote {path}")


def _cleanup_compact_artifacts(dry_run: bool) -> None:
    targets = [CHARACTERS_COMPACT, WEAPONS_COMPACT, ECHOES_COMPACT]
    existing = [p for p in targets if p.exists()]

    if not existing:
        print("No compact LB artifacts to clean up.")
        return

    if dry_run:
        for p in existing:
            print(f"[DRY RUN] Would delete {p}")
        if LB_DATA_DIR.exists():
            print(f"[DRY RUN] Would remove {LB_DATA_DIR} if empty")
        return

    for p in existing:
        p.unlink(missing_ok=True)
        print(f"Deleted {p}")

    try:
        LB_DATA_DIR.rmdir()
        print(f"Removed empty directory {LB_DATA_DIR}")
    except OSError:
        # Directory still has other files; leave it.
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate LB constants + ID maps from local synced data")
    parser.add_argument("--dry-run", action="store_true", help="Preview outputs without writing files")
    parser.add_argument("--pretty", action="store_true", help="Accepted for passthrough compatibility")
    parser.add_argument("--keep-compact", action="store_true", help="Keep temporary public/Data/LB/*.compact.json files")
    args = parser.parse_args()

    for required in [CHARACTERS_JSON, WEAPONS_JSON, ECHOES_JSON, CHARACTERS_COMPACT, WEAPONS_COMPACT, ECHOES_COMPACT]:
        if not required.exists():
            print(f"ERROR: Missing required input: {required}")
            return 1

    full_chars = _load_json(CHARACTERS_JSON)
    full_echoes = _load_json(ECHOES_JSON)

    compact_chars = _load_json(CHARACTERS_COMPACT)
    compact_weapons = _load_json(WEAPONS_COMPACT)
    compact_echoes = _load_json(ECHOES_COMPACT)

    legacy_weapons = _first_nonempty_weapon_map(
        [WEAPON_BASES_FILE, LEGACY_GEN_DIR / "weaponBases.generated.ts"]
    )
    legacy_echo_name_map = _first_nonempty_echo_name_map(
        [ECHO_BASES_FILE, LEGACY_GEN_DIR / "echoBases.generated.ts"]
    )
    previous_maps_candidates = [ID_MAPS_FILE, LEGACY_GEN_DIR / "idMaps.generated.ts"]
    previous_weapon_old_to_cdn = _first_nonempty_id_map(previous_maps_candidates, "weaponOldToCdn")
    previous_echo_old_to_cdn = _first_nonempty_id_map(previous_maps_candidates, "echoOldToCdn")

    character_bases, character_old_to_cdn, character_cdn_to_old = _build_character_bases(full_chars, compact_chars)
    weapon_bases, weapon_old_to_cdn, weapon_cdn_to_old = _build_weapon_bases(
        compact_weapons, legacy_weapons, previous_weapon_old_to_cdn
    )
    echo_bases, echo_old_to_cdn, echo_cdn_to_old = _build_echo_bases(
        full_echoes, compact_echoes, legacy_echo_name_map, previous_echo_old_to_cdn
    )

    char_ts = (
        "import { CharacterBase } from '../types/base';\n\n"
        "export const CHARACTER_BASES: Record<string, CharacterBase> = "
        f"{_to_ts_obj(character_bases)} as const;\n"
    )
    weapon_ts = (
        "import { WeaponBase } from '../types/base';\n\n"
        "export const WEAPONBASES: Record<string, WeaponBase> = "
        f"{_to_ts_obj(weapon_bases)} as const;\n"
    )
    echo_block = (
        f"{ECHO_BLOCK_START}\n"
        "export const ECHOBASES: Record<string, EchoBase> = "
        f"{_to_ts_obj(echo_bases)} as const;\n"
        f"{ECHO_BLOCK_END}"
    )
    id_maps_ts = (
        "export const characterOldToCdn: Record<string, string> = "
        f"{_to_ts_obj(character_old_to_cdn)} as const;\n\n"
        "export const characterLegacyToCdn: Record<string, string> = characterOldToCdn;\n\n"
        "export const characterCdnToOld: Record<string, string> = "
        f"{_to_ts_obj(character_cdn_to_old)} as const;\n\n"
        "export const characterCdnToLegacy: Record<string, string> = characterCdnToOld;\n\n"
        "export const weaponOldToCdn: Record<string, string> = "
        f"{_to_ts_obj(weapon_old_to_cdn)} as const;\n\n"
        "export const weaponCdnToOld: Record<string, string> = "
        f"{_to_ts_obj(weapon_cdn_to_old)} as const;\n\n"
        "export const echoOldToCdn: Record<string, string> = "
        f"{_to_ts_obj(echo_old_to_cdn)} as const;\n\n"
        "export const echoCdnToOld: Record<string, string> = "
        f"{_to_ts_obj(echo_cdn_to_old)} as const;\n"
    )

    _write_ts(CHARACTER_BASES_FILE, char_ts, args.dry_run)
    _write_ts(WEAPON_BASES_FILE, weapon_ts, args.dry_run)
    _write_ts(ID_MAPS_FILE, id_maps_ts, args.dry_run)

    if args.dry_run:
        print(f"[DRY RUN] Would patch {ECHO_BASES_FILE} ({ECHO_BLOCK_START}..{ECHO_BLOCK_END})")
    else:
        echo_existing = ECHO_BASES_FILE.read_text(encoding="utf-8") if ECHO_BASES_FILE.exists() else ""
        echo_existing = _strip_generated_echo_export(echo_existing)
        echo_existing = _upsert_echo_imports(echo_existing)
        echo_updated = _replace_echo_bases_block(echo_existing, echo_block)
        ECHO_BASES_FILE.write_text(echo_updated, encoding="utf-8")
        print(f"Wrote {ECHO_BASES_FILE}")

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
