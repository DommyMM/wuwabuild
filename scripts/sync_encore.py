"""
Sync game data from Encore API into the existing public/Data JSON shapes.

Encore is now the default source for sync_all.py. The older Wuthery scripts stay
available for --wuthery validation and fallback.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from sync_characters import get_preferred_substats  # noqa: E402
from sync_characters_encore import (  # noqa: E402
    ENCORE_API_BASE,
    ENCORE_LANGS,
    ENCORE_RESOURCE_BASE,
    LANGS,
    RARITY_COLORS,
    asset_url,
    fetch_character_locales,
    i18n,
    transform_character,
)
from sync_weapons import (  # noqa: E402
    _load_legacy_weapon_name_index,
    _resolve_legacy_weapon_id,
    extract_unconditional_passive_bonuses,
)
from sync_echoes import extract_main_slot_bonuses  # noqa: E402
from sync_fetters import normalise_prop  # noqa: E402

DATA_DIR = SCRIPTS_DIR.parent / "public" / "Data"
BACKEND_ECHO_ICONS_DIR = SCRIPTS_DIR.parent.parent / "backend" / "Data" / "Echoes"

STAT_LABELS = {
    "Atk": {"en": "ATK", "de": "ANG", "es": "ATQ", "fr": "ATQ", "ja": "攻撃力", "ko": "공격력", "th": "ATK", "uk": "ATK", "zh-Hans": "攻击", "zh-Hant": "攻擊"},
    "Def": {"en": "DEF", "de": "VTD", "es": "DEF", "fr": "DEF", "ja": "防御力", "ko": "방어력", "th": "DEF", "uk": "DEF", "zh-Hans": "防御", "zh-Hant": "防禦"},
    "LifeMax": {"en": "HP", "de": "LP", "es": "PS", "fr": "PV", "ja": "HP", "ko": "HP", "th": "HP", "uk": "ОЗ", "zh-Hans": "生命", "zh-Hant": "生命"},
    "Crit": {"en": "Crit. Rate", "de": "Krit. Rate", "es": "Prob. CRIT", "fr": "Taux critique", "ja": "クリティカル", "ko": "크리티컬", "th": "Crit. Rate", "uk": "Шанс Крит. Удару", "zh-Hans": "暴击", "zh-Hant": "暴擊"},
    "CritDamage": {"en": "Crit. DMG", "de": "Krit. SCH", "es": "Daño CRIT", "fr": "Dégât critique", "ja": "クリティカルダメージ", "ko": "크리티컬 피해", "th": "Crit. DMG", "uk": "Шанс Крит. Шкоди", "zh-Hans": "暴击伤害", "zh-Hant": "暴擊傷害"},
    "EnergyEfficiency": {"en": "Energy Regen", "de": "Energieregeneration", "es": "Regen. de energía", "fr": "Recharge resonante", "ja": "共鳴効率", "ko": "공명 효율", "th": "ฟื้นฟูพลังงาน", "uk": "Відн. Енергії", "zh-Hans": "共鸣效率", "zh-Hant": "共鳴效率"},
}

PROP_ID_TO_ATTR = {
    7: "Atk",
    8: "Crit",
    9: "CritDamage",
    10: "LifeMax",
    11: "EnergyEfficiency",
    12: "Def",
    10005: "LifeMax",
    10006: "Def",
    10007: "Atk",
}

LEGACY_ECHO_ID_RE = re.compile(r"T_IconMonsterGoods_(\d+)_UI")
NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?%?")


def _json_kwargs(pretty: bool) -> dict[str, Any]:
    return {"indent": 2, "ensure_ascii": False} if pretty else {"separators": (",", ":"), "ensure_ascii": False}


def _write_json(path: Path, data: Any, dry_run: bool, pretty: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, **_json_kwargs(pretty)), encoding="utf-8")
    print(f"Wrote {path} ({len(data) if isinstance(data, list) else 'object'})")


def _get(session: requests.Session, lang: str, route: str) -> dict:
    url = f"{ENCORE_API_BASE}/{lang}/{route.lstrip('/')}"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            resp = session.get(url, timeout=45)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and route.strip("/") == "echo":
                return {"Echo": data}
            if not isinstance(data, dict):
                raise ValueError(f"Unexpected response for {lang}/{route}")
            return data
        except Exception as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.75 * (attempt + 1))
    raise last_error or RuntimeError(f"Failed to fetch {url}")


def _fetch_locales(route: str, workers: int) -> dict[str, dict]:
    session = requests.Session()
    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_get, session, lang, route): lang for lang in ENCORE_LANGS}
        for future in as_completed(futures):
            results[futures[future]] = future.result()
    return results


def _list_ids(route: str, list_key: str, id_key: str = "Id") -> list[int]:
    session = requests.Session()
    data = _get(session, "en", route)
    rows = data.get(list_key) or data.get(list_key[0].upper() + list_key[1:]) or []
    ids = [int(row[id_key]) for row in rows if isinstance(row, dict) and row.get(id_key)]
    return sorted(set(ids))


def sync_characters(args: argparse.Namespace) -> list[dict]:
    ids = [args.id] if args.id else _list_ids("character", "roleList")
    print(f"Fetching {len(ids)} Encore characters...")
    characters: list[dict] = []
    for char_id in ids:
        try:
            locales = fetch_character_locales(char_id, min(args.lang_workers, len(ENCORE_LANGS)))
            characters.append(transform_character(locales))
            print(f"  character {char_id}")
        except Exception as exc:
            print(f"  ERROR character {char_id}: {exc}")
            raise
    characters.sort(key=lambda c: c.get("name", {}).get("en", ""))
    _write_json(DATA_DIR / "Characters.json", characters, args.dry_run, args.pretty)
    return characters


def _stat_label(attr: str) -> dict[str, str]:
    labels = STAT_LABELS.get(attr, {"en": attr})
    return {lang: labels.get(lang, "") for lang in LANGS}


def _weapon_stats(en: dict) -> dict:
    first = en.get("FirstPropId") or {}
    second = en.get("SecondPropId") or {}
    first_attr = PROP_ID_TO_ATTR.get(int(first.get("Id") or 0), "Atk")
    second_attr = PROP_ID_TO_ATTR.get(int(second.get("Id") or 0), str(second.get("Id") or ""))
    return {
        "first": {"attribute": first_attr, "value": first.get("Value")},
        "second": {
            "attribute": second_attr,
            "name": _stat_label(second_attr),
            "value": second.get("Value"),
            "isRatio": bool(second.get("IsRatio")),
        },
    }


def _weapon_params(en: dict) -> dict[str, list[str]]:
    params: dict[str, list[str]] = {}
    for index, entry in enumerate(en.get("DescParams") or []):
        values = entry.get("ArrayString") if isinstance(entry, dict) else None
        if isinstance(values, list):
            params[str(index)] = [str(v) for v in values[:5]]
    return params


def _weapon_raw_for_passive(weapon: dict) -> dict:
    return {"effect": weapon.get("effect", {}), "params": weapon.get("params", {})}


def _transform_weapon(locales: dict[str, dict], legacy_index: dict[str, list[str]]) -> dict | None:
    en = locales["en"]
    wid = int(en.get("ItemId") or 0)
    name_en = str(en.get("WeaponName") or "")
    if not wid or str(wid).startswith("200") or not name_en or "test" in name_en.lower():
        return None
    weapon = {
        "id": wid,
        "name": i18n(locales, lambda data: data.get("WeaponName", "")),
        "type": {
            "id": en.get("WeaponType"),
            "name": i18n(locales, lambda data: data.get("WeaponTypeName", "")),
            "icon": asset_url(en.get("TypeIcon", "")),
        },
        "rarity": {"id": en.get("QualityId"), "color": RARITY_COLORS.get(int(en.get("QualityId") or 0), "#DEA544FF")},
        "icon": {
            "icon": asset_url(en.get("Icon", "")),
            "iconMiddle": asset_url(en.get("IconMiddle", "")),
            "iconSmall": asset_url(en.get("IconSmall", "")),
        },
        "effect": i18n(locales, lambda data: data.get("Desc", "")),
        "effectName": i18n(locales, lambda data: data.get("ResonName", "")),
        "params": _weapon_params(en),
        "stats": _weapon_stats(en),
    }
    legacy_id = _resolve_legacy_weapon_id({"name": weapon["name"]}, legacy_index)
    weapon["legacyId"] = legacy_id or str(wid)
    passive = extract_unconditional_passive_bonuses(_weapon_raw_for_passive(weapon))
    if passive:
        weapon["unconditionalPassiveBonuses"] = passive
    return weapon


def sync_weapons(args: argparse.Namespace) -> list[dict]:
    ids = [args.id] if args.id else _list_ids("weapon", "weapons")
    legacy_index = _load_legacy_weapon_name_index()
    print(f"Fetching {len(ids)} Encore weapons...")
    weapons: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_fetch_locales, f"weapon/{wid}", 13): wid for wid in ids}
        for future in as_completed(futures):
            wid = futures[future]
            weapon = _transform_weapon(future.result(), legacy_index)
            if weapon:
                weapons.append(weapon)
                print(f"  weapon {wid}")
    weapons.sort(key=lambda w: w.get("name", {}).get("en", ""))
    _write_json(DATA_DIR / "Weapons.json", weapons, args.dry_run, args.pretty)
    return weapons


def _extract_legacy_echo_id(icon: str) -> str | None:
    match = LEGACY_ECHO_ID_RE.search(icon or "")
    return match.group(1) if match else None


def _echo_name_i18n(locales: dict[str, dict]) -> dict[str, str]:
    return i18n(locales, lambda data: data.get("MonsterName", ""))


def _transform_echo(locales: dict[str, dict]) -> dict | None:
    en = locales["en"]
    if en.get("PhantomType") != 1 or en.get("QualityId") != 5:
        return None
    name_en = str(en.get("MonsterName") or "")
    if name_en.startswith("Phantom: "):
        return None
    icon = asset_url(en.get("Icon", ""))
    skill = en.get("Skill") or {}
    raw_skill = {
        "descriptionEx": {"en": skill.get("DescriptionEx", "")},
        "levelDescriptionStrArray": skill.get("LevelDescStrArray", []),
    }
    echo: dict[str, Any] = {
        "id": en.get("ItemId"),
        "name": _echo_name_i18n(locales),
        "cost": {0: 1, 1: 1, 2: 3, 3: 4}.get(int(en.get("Rarity") or 0), 1),
        "fetter": en.get("FetterGroup", []),
        "element": en.get("ElementType", []),
        "icon": icon,
        "skill": {
            "description": skill.get("DescriptionEx", ""),
            "params": skill.get("LevelDescStrArray", []),
        },
        "legacyId": _extract_legacy_echo_id(icon) or str(en.get("ItemId") or ""),
    }
    bonuses = extract_main_slot_bonuses({"descriptionEx": {"en": skill.get("DescriptionEx", "")}, "levelDescriptionStrArray": skill.get("LevelDescStrArray", [])})
    if bonuses:
        echo["bonuses"] = bonuses
    return echo


def sync_echoes(args: argparse.Namespace) -> list[dict]:
    ids = [args.id] if args.id else _list_ids("echo", "Echo")
    print(f"Fetching {len(ids)} Encore echoes...")
    echoes_by_name: dict[str, dict] = {}
    phantom_skins: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_fetch_locales, f"echo/{eid}", 13): eid for eid in ids}
        for future in as_completed(futures):
            eid = futures[future]
            locales = future.result()
            en = locales["en"]
            if en.get("PhantomType") != 1 or en.get("QualityId") != 5:
                continue
            name_en = str(en.get("MonsterName") or "")
            if name_en.startswith("Phantom: "):
                phantom_skins.append(en)
                continue
            echo = _transform_echo(locales)
            if echo and name_en not in echoes_by_name:
                echoes_by_name[name_en] = echo
                print(f"  echo {eid}")
    for skin in phantom_skins:
        base_name = str(skin.get("MonsterName") or "")[len("Phantom: "):]
        base = echoes_by_name.get(base_name)
        if base:
            base["phantomIcon"] = asset_url(skin.get("Icon", ""))
    echoes = sorted(echoes_by_name.values(), key=lambda e: (-e["cost"], e.get("name", {}).get("en", "")))
    _write_json(DATA_DIR / "Echoes.json", echoes, args.dry_run, args.pretty)
    return echoes


def _params_from_text(text: str) -> list[str]:
    return NUMBER_RE.findall(text or "")


def _build_fetter_from_group(group_id: int, group_by_lang: dict[str, dict]) -> dict:
    en_group = group_by_lang["en"]
    fetters = en_group.get("Fetters") or []
    piece_keys = ["2", "5"] if len(fetters) >= 2 else ["2"]
    piece_effects: dict[str, dict] = {}
    for index, piece_key in enumerate(piece_keys):
        fetter = fetters[index] if index < len(fetters) and isinstance(fetters[index], dict) else {}
        desc = i18n(group_by_lang, lambda data, i=index: (data.get("Fetters") or [])[i].get("EffectDescription", ""))
        piece_effects[piece_key] = {
            "pieceCount": int(piece_key),
            "fetterId": fetter.get("Id"),
            "addProp": [],
            "buffIds": [],
            "effectDescription": desc,
            "effectDescriptionParam": _params_from_text(desc.get("en", "")),
        }
    primary = piece_effects[piece_keys[0]]
    return {
        "id": group_id,
        "name": i18n(group_by_lang, lambda data: data.get("Name", "")),
        "icon": asset_url(en_group.get("Icon", "")),
        "color": "FFFFFF00",
        "pieceCount": primary["pieceCount"],
        "fetterId": primary["fetterId"],
        "addProp": primary["addProp"],
        "buffIds": primary["buffIds"],
        "effectDescription": primary["effectDescription"],
        "effectDescriptionParam": primary["effectDescriptionParam"],
        "pieceEffects": piece_effects,
        "fetterIcon": "",
        "effectDefineDescription": {lang: "" for lang in LANGS},
    }


def sync_fetters(args: argparse.Namespace) -> list[dict]:
    print("Building Fetters.json from Encore echo list FetterGroups...")
    list_locales = _fetch_locales("echo", 13)
    grouped: dict[int, dict[str, dict]] = {}
    for lang, payload in list_locales.items():
        for echo in payload.get("Echo") or []:
            for group in echo.get("FetterGroups") or []:
                if isinstance(group, dict) and isinstance(group.get("Id"), int):
                    grouped.setdefault(group["Id"], {})[lang] = group
    fetters = [
        _build_fetter_from_group(group_id, by_lang)
        for group_id, by_lang in sorted(grouped.items())
        if "en" in by_lang
    ]
    _write_json(DATA_DIR / "Fetters.json", fetters, args.dry_run, args.pretty)
    return fetters


def sync_echo_icon_pngs(args: argparse.Namespace, echoes: list[dict]) -> None:
    if args.skip_echo_icons:
        return
    if not BACKEND_ECHO_ICONS_DIR.exists():
        print(f"Skipping echo icon templates; missing {BACKEND_ECHO_ICONS_DIR}")
        return
    try:
        from PIL import Image
    except ImportError:
        print("Skipping echo icon PNG conversion; install Pillow to convert Encore WebP templates.")
        return
    print(f"Refreshing backend echo templates from Encore images -> {BACKEND_ECHO_ICONS_DIR}")
    BACKEND_ECHO_ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for echo in echoes:
        echo_id = str(echo.get("id"))
        url = echo.get("icon")
        dest = BACKEND_ECHO_ICONS_DIR / f"{echo_id}.png"
        if not echo_id or not isinstance(url, str):
            continue
        if dest.exists() and not args.force_echo_icons:
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "wuwabuilds-backend/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                with Image.open(resp) as im:
                    im.convert("RGBA").save(dest, "PNG")
            print(f"  icon {echo_id}")
        except Exception as exc:
            print(f"  ERROR icon {echo_id}: {exc}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync public/Data from Encore API")
    parser.add_argument("--id", type=int, default=None, help="Single entity ID for selected single-kind syncs")
    parser.add_argument("--only", choices=["all", "characters", "weapons", "echoes", "fetters"], default="all")
    parser.add_argument("--workers", "-w", type=int, default=6)
    parser.add_argument("--lang-workers", type=int, default=13, help="Parallel per-language requests for one entity")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--skip-echo-icons", action="store_true")
    parser.add_argument("--force-echo-icons", action="store_true")
    args = parser.parse_args()

    echoes: list[dict] = []
    if args.only in {"all", "characters"}:
        sync_characters(args)
    if args.only in {"all", "weapons"}:
        sync_weapons(args)
    if args.only in {"all", "echoes"}:
        echoes = sync_echoes(args)
    if args.only in {"all", "fetters"}:
        sync_fetters(args)
    if args.only in {"all", "echoes"} and echoes and not args.dry_run:
        sync_echo_icon_pngs(args, echoes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
