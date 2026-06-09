"""
Sync game data from Encore API into the existing public/Data JSON shapes.

Encore is now the default source for sync_all.py. The older Wuthery scripts stay
available for --wuthery validation and fallback.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import time
import urllib.request
from collections import defaultdict, deque
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
from sync_fetters import fetch_and_build as build_wuthery_fetters  # noqa: E402

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
    # Weapon substat (ratio) prop IDs.
    10002: "LifeMax",
    10005: "LifeMax",
    10006: "Def",
    10007: "Atk",
    10010: "Def",
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


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _merge_by_id(path: Path, incoming: list[dict], dry_run: bool, pretty: bool, sort_key) -> list[dict]:
    existing = _load_json(path, [])
    by_id = {
        str(row.get("id")): row
        for row in existing
        if isinstance(row, dict) and row.get("id") is not None
    }
    for row in incoming:
        if isinstance(row, dict) and row.get("id") is not None:
            by_id[str(row["id"])] = row
    merged = sorted(by_id.values(), key=sort_key)
    _write_json(path, merged, dry_run, pretty)
    return merged


def _get(session: requests.Session, lang: str, route: str) -> dict:
    url = f"{ENCORE_API_BASE}/{lang}/{route.lstrip('/')}"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            resp = session.get(url, timeout=45)
            resp.raise_for_status()
            data = resp.json()
            clean_route = route.strip("/")
            if isinstance(data, list) and clean_route == "echo":
                return {"Echo": data}
            if isinstance(data, list) and clean_route == "new":
                return {"_list": data}
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


def _params_from_text(text: str) -> list[str]:
    return NUMBER_RE.findall(text or "")


def _parse_ids(raw: str | None) -> list[int]:
    if not raw:
        return []
    return [int(part.strip()) for part in raw.split(",") if part.strip()]


def _new_payload() -> dict:
    data = _get(requests.Session(), "en", "new")
    rows = data.get("_list") if isinstance(data, dict) else data
    if isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict) and any(key in row for key in ("character", "weapon", "echo")):
                return row
    return data if isinstance(data, dict) else {}


def _list_ids(route: str, list_key: str, id_key: str = "Id") -> list[int]:
    session = requests.Session()
    data = _get(session, "en", route)
    rows = data.get(list_key) or data.get(list_key[0].upper() + list_key[1:]) or []
    ids = [int(row[id_key]) for row in rows if isinstance(row, dict) and row.get(id_key)]
    return sorted(set(ids))


def _backfill_rover_skill_data(characters: list[dict]) -> None:
    """Encore attaches forte/skill data to only one Rover gender per element; the
    sibling variant (e.g. 1408 vs 1406) returns empty SkillTree/Skills. The M/F
    Rovers share an identical kit, so copy the populated sibling's skillTrees,
    skillIcons and moves and re-derive preferredStats. Each variant keeps its own
    name/icon/legacyId/chains/stats/tags. Without this, the empty variant would
    drop forte nodes (breaking the LB forte mapping) and its move list entirely.
    """
    by_name: dict[str, list[dict]] = {}
    for char in characters:
        name_en = (char.get("name") or {}).get("en", "")
        by_name.setdefault(name_en, []).append(char)

    for name_en, group in by_name.items():
        if len(group) < 2:
            continue
        donor = next((c for c in group if c.get("skillTrees")), None)
        if not donor:
            continue
        for char in group:
            if char.get("skillTrees"):
                continue
            char["skillTrees"] = copy.deepcopy(donor["skillTrees"])
            char["skillIcons"] = copy.deepcopy(donor.get("skillIcons", {}))
            char["moves"] = copy.deepcopy(donor.get("moves", []))
            preferred = get_preferred_substats(
                char.get("tags") or [],
                char.get("skillTrees"),
                char.get("moves"),
                char.get("id"),
            )
            if preferred:
                char["preferredStats"] = preferred
            print(f"  backfilled skill data for {name_en} ({char.get('id')}) from sibling {donor.get('id')}")


def sync_characters(args: argparse.Namespace) -> list[dict]:
    ids = _parse_ids(args.character_ids)
    if args.id and not ids:
        ids = [args.id]
    if args.new_only and not ids:
        ids = [int(v) for v in _new_payload().get("character", [])]
    if not ids:
        ids = _list_ids("character", "roleList")
    print(f"Fetching {len(ids)} Encore characters...")
    lang_workers = min(args.lang_workers, len(ENCORE_LANGS))

    def _fetch_and_transform(char_id: int) -> dict:
        return transform_character(fetch_character_locales(char_id, lang_workers))

    # Fan out across characters (each still fetches its languages in parallel),
    # mirroring sync_weapons/sync_echoes. The sequential loop was the slow leg:
    # Encore needs one request per language, so doing characters one-at-a-time
    # serialized ~50 round-trips. The rover backfill and sort are post-passes,
    # so completion order does not matter.
    characters: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_fetch_and_transform, char_id): char_id for char_id in ids}
        for future in as_completed(futures):
            char_id = futures[future]
            try:
                characters.append(future.result())
                print(f"  character {char_id}")
            except Exception as exc:
                print(f"  ERROR character {char_id}: {exc}")
                raise
    _backfill_rover_skill_data(characters)
    if args.merge:
        characters = _merge_by_id(
            DATA_DIR / "Characters.json",
            characters,
            args.dry_run,
            args.pretty,
            lambda c: c.get("name", {}).get("en", ""),
        )
    else:
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


_WEAPON_SPAN_RE = re.compile(r"<span[^>]*>(.*?)</span>", re.DOTALL)


def _weapon_effect_to_placeholders(desc: str, desc_params: list) -> str:
    """Convert Encore's value-substituted weapon Desc back to Wuthery's "{i}"
    placeholder template. Encore wraps each DescParams value-group (the
    slash-joined R1-R5 ranks) in a <span>; replacing each span with "{i}",
    matched by its content to the DescParams index, restores the template that
    extract_unconditional_passive_bonuses and sync_lb's per-rank resolver expect.
    """
    if not desc:
        return desc
    content_to_idx: dict[str, int] = {}
    for index, entry in enumerate(desc_params or []):
        values = entry.get("ArrayString") if isinstance(entry, dict) else None
        if isinstance(values, list):
            content_to_idx.setdefault("/".join(str(v) for v in values), index)
    counter = [0]

    def repl(match: re.Match[str]) -> str:
        idx = content_to_idx.get(match.group(1))
        if idx is None:
            idx = counter[0]
        counter[0] += 1
        return "{%d}" % idx

    return _WEAPON_SPAN_RE.sub(repl, desc)


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
        "effect": i18n(locales, lambda data: _weapon_effect_to_placeholders(data.get("Desc", ""), data.get("DescParams") or [])),
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
    ids = _parse_ids(args.weapon_ids)
    if args.id and not ids:
        ids = [args.id]
    if args.new_only and not ids:
        ids = [int(v) for v in _new_payload().get("weapon", [])]
    if not ids:
        ids = _list_ids("weapon", "weapons")
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
    if args.merge:
        weapons = _merge_by_id(
            DATA_DIR / "Weapons.json",
            weapons,
            args.dry_run,
            args.pretty,
            lambda w: w.get("name", {}).get("en", ""),
        )
    else:
        weapons.sort(key=lambda w: w.get("name", {}).get("en", ""))
        _write_json(DATA_DIR / "Weapons.json", weapons, args.dry_run, args.pretty)
    return weapons


def _extract_legacy_echo_id(icon: str) -> str | None:
    match = LEGACY_ECHO_ID_RE.search(icon or "")
    return match.group(1) if match else None


def _echo_name_i18n(locales: dict[str, dict]) -> dict[str, str]:
    return i18n(locales, lambda data: data.get("MonsterName", ""))


# Encore exposes no direct echo cost field; the main-stat random pool
# (MainProp.RandGroupId) is cost-specific. Verified 1:1 across all 5-star echoes.
ECHO_RANDGROUP_TO_COST = {501: 4, 502: 3, 503: 1}

_ECHO_BR_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)


def _echo_cost(en: dict) -> int:
    rand_group = (en.get("MainProp") or {}).get("RandGroupId")
    cost = ECHO_RANDGROUP_TO_COST.get(rand_group)
    if cost is None:
        print(f"  WARN: unknown echo RandGroupId {rand_group!r} for {en.get('MonsterName')!r}; defaulting cost 4")
        return 4
    return cost


def _echo_desc_to_placeholders(desc: str, max_params: list) -> str:
    """Convert Encore's value-substituted echo DescriptionEx back to Wuthery's
    "{i}" placeholder template. Encore substitutes the MAX-level values
    (LevelDescStrArray[-1]) and uses <br> where Wuthery uses newlines.
    Placeholders are assigned in text order while each value's indices are
    consumed in index order, so repeated and out-of-order values map correctly
    (e.g. Nightmare echoes that reference the same multiplier twice, bracketing
    the main-slot bonus values). Restoring placeholders keeps
    extract_main_slot_bonuses source-agnostic and lets sync_lb re-resolve the
    description at the level it wants (it resolves with params[0]).
    """
    desc = _ECHO_BR_RE.sub("\n", desc or "")
    queues: dict[str, deque] = defaultdict(deque)
    for index, value in enumerate(max_params or []):
        if value:
            queues[str(value)].append(index)
    if not queues:
        return desc
    # Longest values first so "12.00%" wins over a bare "12"; the boundary
    # guards keep a bare "15" from matching inside "150" or "1.5".
    alternation = "|".join(re.escape(v) for v in sorted(queues, key=len, reverse=True))
    pattern = re.compile(r"(?<![\d.%])(" + alternation + r")(?!\d)")

    def repl(match: re.Match[str]) -> str:
        queue = queues.get(match.group(1))
        return "{%d}" % queue.popleft() if queue else match.group(1)

    return pattern.sub(repl, desc)


def _echo_description_i18n(locales: dict[str, dict]) -> dict[str, str]:
    def getter(data: dict) -> str:
        skill = data.get("Skill") or {}
        levels = skill.get("LevelDescStrArray") or []
        max_params = (levels[-1] if levels else {}).get("ArrayString") or []
        return _echo_desc_to_placeholders(str(skill.get("DescriptionEx", "")), max_params)

    return i18n(locales, getter)


def _transform_echo(locales: dict[str, dict]) -> dict | None:
    en = locales["en"]
    if en.get("PhantomType") != 1 or en.get("QualityId") != 5:
        return None
    name_en = str(en.get("MonsterName") or "")
    if name_en.startswith("Phantom: "):
        return None
    icon = asset_url(en.get("Icon", ""))
    skill = en.get("Skill") or {}
    description = _echo_description_i18n(locales)
    echo: dict[str, Any] = {
        "id": en.get("ItemId"),
        "name": _echo_name_i18n(locales),
        "cost": _echo_cost(en),
        "fetter": en.get("FetterGroup", []),
        "element": en.get("ElementType", []),
        "icon": icon,
        "skill": {
            "description": description,
            "params": skill.get("LevelDescStrArray", []),
        },
        "legacyId": _extract_legacy_echo_id(icon) or str(en.get("ItemId") or ""),
    }
    bonuses = extract_main_slot_bonuses({
        "descriptionEx": {"en": description.get("en", "")},
        "levelDescriptionStrArray": skill.get("LevelDescStrArray", []),
    })
    if bonuses:
        echo["bonuses"] = bonuses
    return echo


def sync_echoes(args: argparse.Namespace) -> list[dict]:
    ids = _parse_ids(args.echo_ids)
    if args.id and not ids:
        ids = [args.id]
    if args.new_only and not ids:
        ids = [int(v) for v in _new_payload().get("echo", [])]
    if not ids:
        ids = _list_ids("echo", "Echo")
    print(f"Fetching {len(ids)} Encore echoes...")
    existing_echoes = _load_json(DATA_DIR / "Echoes.json", []) if args.merge else []
    echoes_by_name: dict[str, dict] = {
        str(echo.get("name", {}).get("en") or ""): echo
        for echo in existing_echoes
        if isinstance(echo, dict) and isinstance(echo.get("name"), dict)
    }
    phantom_skins: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_fetch_locales, f"echo/{eid}", 13): eid for eid in ids}
        for future in as_completed(futures):
            eid = futures[future]
            locales = future.result()
            en = locales["en"]
            name_en = str(en.get("MonsterName") or "")
            if name_en.startswith("Phantom: ") and en.get("QualityId") == 5:
                phantom_skins.append(en)
                continue
            if en.get("PhantomType") != 1 or en.get("QualityId") != 5:
                continue
            echo = _transform_echo(locales)
            if echo:
                # Re-fetched echoes replace the stored entry (so --merge --echo-ids
                # refreshes data), but keep a previously merged phantom skin icon
                # when this run doesn't also fetch the skin.
                previous = echoes_by_name.get(name_en)
                if previous and previous.get("phantomIcon") and not echo.get("phantomIcon"):
                    echo["phantomIcon"] = previous["phantomIcon"]
                echoes_by_name[name_en] = echo
                print(f"  echo {eid}")
    orphaned = 0
    for skin in phantom_skins:
        base_name = str(skin.get("MonsterName") or "")[len("Phantom: "):]
        if base_name not in echoes_by_name:
            # The skin name doesn't always spell the base name the same way
            # (e.g. "Phantom: Nightmare Crownless" -> "Nightmare: Crownless",
            # "Phantom: Twin Nova - Collapsar Blade" -> "Twin Nova: Collapsar Blade").
            for attempt in (
                base_name.replace("Nightmare ", "Nightmare: "),
                base_name.replace("Reminiscence ", "Reminiscence: "),
                base_name.replace(" - ", ": "),
            ):
                if attempt in echoes_by_name:
                    base_name = attempt
                    break
        base = echoes_by_name.get(base_name)
        if base:
            base["phantomIcon"] = asset_url(skin.get("Icon", ""))
        else:
            orphaned += 1
            print(f"  Warning: orphaned phantom skin {str(skin.get('MonsterName'))!r}")
    echoes = sorted(echoes_by_name.values(), key=lambda e: (-e["cost"], e.get("name", {}).get("en", "")))
    _write_json(DATA_DIR / "Echoes.json", echoes, args.dry_run, args.pretty)
    return echoes


def sync_fetters(args: argparse.Namespace) -> list[dict]:
    # Encore's echo FetterGroups expose set bonuses only as free text (no
    # structured AddProp/pieceCount), so the LB-critical 2pc/3pc stat bonuses
    # can't be derived reliably from them. Sonata sets are a small, stable
    # dataset and Wuthery serves them as three localization-index files (not the
    # flaky large-parallel fetch), so we reuse Wuthery's structured builder here.
    print("Building Fetters.json from Wuthery localization index (structured addProp)...")
    fetters = build_wuthery_fetters()
    existing_ids = {int(f.get("id")) for f in fetters if isinstance(f.get("id"), int)}
    encore_fetters = _build_missing_encore_fetters(existing_ids, args)
    if encore_fetters:
        print(f"Appending {len(encore_fetters)} Encore-only fetter groups...")
        fetters.extend(encore_fetters)
        fetters.sort(key=lambda f: int(f.get("id") or 0))
    _write_json(DATA_DIR / "Fetters.json", fetters, args.dry_run, args.pretty)
    return fetters


def _build_missing_encore_fetters(existing_ids: set[int], args: argparse.Namespace) -> list[dict]:
    delta_echo_ids = _parse_ids(args.echo_ids)
    if args.new_only and not delta_echo_ids:
        delta_echo_ids = [int(v) for v in _new_payload().get("echo", [])]
    if delta_echo_ids:
        return _build_missing_encore_fetters_from_echo_details(existing_ids, delta_echo_ids, args)

    print("Checking Encore echo list for fetter groups missing from Wuthery...")
    list_locales = _fetch_locales("echo", min(args.lang_workers, len(ENCORE_LANGS)))
    grouped: dict[int, dict[str, dict]] = {}
    first_echo_by_group: dict[int, int] = {}
    for lang, payload in list_locales.items():
        for echo in payload.get("Echo") or []:
            echo_id = echo.get("Id")
            for group in echo.get("FetterGroups") or []:
                group_id = group.get("Id")
                if not isinstance(group_id, int) or group_id in existing_ids:
                    continue
                grouped.setdefault(group_id, {})[lang] = group
                if isinstance(echo_id, int):
                    first_echo_by_group.setdefault(group_id, echo_id)

    substituted_effects: dict[int, list[str]] = {}
    session = requests.Session()
    for group_id, echo_id in first_echo_by_group.items():
        try:
            detail = _get(session, "en", f"echo/{echo_id}")
            details = detail.get("FetterDetails") or {}
            group_name = (grouped.get(group_id, {}).get("en") or {}).get("Name")
            effect_list = (details.get(group_name) or {}).get("EffectDescriptions") or []
            substituted_effects[group_id] = [str(effect) for effect in effect_list]
        except Exception as exc:
            print(f"  WARNING: could not fetch detail text for Encore fetter group {group_id}: {exc}")

    return [
        _build_encore_fetter_from_group(group_id, by_lang, substituted_effects.get(group_id, []))
        for group_id, by_lang in sorted(grouped.items())
        if "en" in by_lang
    ]


def _asset_object_path_to_webp(raw_path: str) -> str:
    if not raw_path:
        return ""
    path = raw_path.split(".", 1)[0]
    if path.startswith("/Game/"):
        return asset_url(f"{path}.webp")
    return asset_url(raw_path)


def _build_missing_encore_fetters_from_echo_details(
    existing_ids: set[int],
    echo_ids: list[int],
    args: argparse.Namespace,
) -> list[dict]:
    print(f"Checking {len(echo_ids)} Encore echo details for fetter groups missing from Wuthery...")
    groups: dict[int, dict[str, dict]] = {}

    def group_name(detail: dict, group_id: int) -> str:
        for item in detail.get("FetterGroupDetails") or []:
            group = item.get("Group") or {}
            if group.get("Id") == group_id:
                return str(group.get("FetterGroupName") or "")
        return ""

    for echo_id in echo_ids:
        locales = _fetch_locales(f"echo/{echo_id}", min(args.lang_workers, len(ENCORE_LANGS)))
        en_detail = locales.get("en") or {}
        for item in en_detail.get("FetterGroupDetails") or []:
            group = item.get("Group") or {}
            group_id = group.get("Id")
            if not isinstance(group_id, int) or group_id in existing_ids:
                continue
            by_lang: dict[str, dict] = {}
            for lang, detail in locales.items():
                lang_group = next(
                    (
                        (entry.get("Group") or {})
                        for entry in detail.get("FetterGroupDetails") or []
                        if (entry.get("Group") or {}).get("Id") == group_id
                    ),
                    {},
                )
                name = str(lang_group.get("FetterGroupName") or group_name(detail, group_id))
                effects = ((detail.get("FetterDetails") or {}).get(name) or {}).get("EffectDescriptions") or []
                keys = ((detail.get("FetterDetails") or {}).get(name) or {}).get("EffectKeys") or []
                icon = _asset_object_path_to_webp(str(lang_group.get("FetterElementPath") or group.get("FetterElementPath") or ""))
                by_lang[lang] = {
                    "Id": group_id,
                    "Name": name,
                    "Icon": icon,
                    "Fetters": [
                        {
                            "Id": (group.get("FetterMap") or [{}])[idx].get("Value") if idx < len(group.get("FetterMap") or []) else None,
                            "Key": keys[idx] if idx < len(keys) else idx + 1,
                            "Name": name,
                            "EffectDescription": str(effect),
                        }
                        for idx, effect in enumerate(effects)
                    ],
                }
            groups[group_id] = by_lang

    return [
        _build_encore_fetter_from_group(group_id, by_lang, [])
        for group_id, by_lang in sorted(groups.items())
        if "en" in by_lang
    ]


def _build_encore_fetter_from_group(group_id: int, group_by_lang: dict[str, dict], substituted_en: list[str]) -> dict:
    en_group = group_by_lang["en"]
    en_fetters = en_group.get("Fetters") or []
    piece_effects: dict[str, dict] = {}

    def fetter_desc(data: dict, index: int) -> str:
        fetters = data.get("Fetters") or []
        if index >= len(fetters) or not isinstance(fetters[index], dict):
            return ""
        return fetters[index].get("EffectDescription", "")

    for index, fetter in enumerate(en_fetters):
        if not isinstance(fetter, dict):
            continue
        piece_key = str(int(fetter.get("Key") or index + 1))
        desc = i18n(group_by_lang, lambda data, i=index: fetter_desc(data, i))
        effect_text = substituted_en[index] if index < len(substituted_en) else desc.get("en", "")
        piece_effects[piece_key] = {
            "pieceCount": int(piece_key),
            "fetterId": fetter.get("Id"),
            "addProp": [],
            "buffIds": [],
            "effectDescription": desc,
            "effectDescriptionParam": _params_from_text(effect_text),
        }

    if not piece_effects:
        piece_effects["1"] = {
            "pieceCount": 1,
            "fetterId": None,
            "addProp": [],
            "buffIds": [],
            "effectDescription": {lang: "" for lang in LANGS},
            "effectDescriptionParam": [],
        }
    primary_key = sorted(piece_effects, key=int)[0]
    primary = piece_effects[primary_key]
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
    parser.add_argument("--new-only", action="store_true", help="Fetch IDs from Encore /new and merge them into existing JSON")
    parser.add_argument("--merge", action="store_true", help="Merge selected IDs into existing JSON instead of replacing the file")
    parser.add_argument("--character-ids", default="", help="Comma-separated Encore character IDs to fetch")
    parser.add_argument("--weapon-ids", default="", help="Comma-separated Encore weapon IDs to fetch")
    parser.add_argument("--echo-ids", default="", help="Comma-separated Encore echo IDs to fetch")
    parser.add_argument("--workers", "-w", type=int, default=6)
    parser.add_argument("--lang-workers", type=int, default=13, help="Parallel per-language requests for one entity")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--skip-echo-icons", action="store_true")
    parser.add_argument("--force-echo-icons", action="store_true")
    args = parser.parse_args()
    if args.new_only:
        args.merge = True

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
