"""
Sync Echoes to public/Data/Echoes.json.

Fetches phantom data from CDN, filters to 5-star echoes,
deduplicates by English name, merges phantom skin variants into base echoes.

Usage:
    python sync_echoes.py --fetch                     # Sync from CDN
    python sync_echoes.py --fetch --id 60000425      # Single phantom from CDN
    python sync_echoes.py --fetch --dry-run --pretty
"""

import json
import re
import argparse
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from cdn_config import CDN_BASE, request_json_with_retry, write_json_atomic

CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Phantom"
ENCORE_ECHO_LIST_API = "https://api-v2.encore.moe/api/en/echo"
# Scripts in /scripts; output in /public/Data
OUTPUT_FILE = Path(__file__).parent.parent / "public/Data/Echoes.json"

STAT_PATTERNS = [
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Glacio DMG Bonus", re.I), "Glacio DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Fusion DMG Bonus", re.I), "Fusion DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Electro DMG Bonus", re.I), "Electro DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Aero DMG Bonus", re.I), "Aero DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Spectro DMG Bonus", re.I), "Spectro DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Havoc DMG Bonus", re.I), "Havoc DMG"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Resonance Skill DMG Bonus", re.I), "Resonance Skill DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Resonance Liberation DMG Bonus", re.I), "Resonance Liberation DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Basic Attack DMG Bonus", re.I), "Basic Attack DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Heavy Attack DMG Bonus", re.I), "Heavy Attack DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Energy Regen", re.I), "Energy Regen"),
    (re.compile(r"\{(\d+)\}\s*(?:more\s+)?Healing Bonus", re.I), "Healing Bonus"),
    # Reversed phrasing, e.g. Adam Smasher: "their Crit. Rate is increased by {4}".
    (re.compile(r"Crit\.?\s*Rate\s+is\s+increased\s+by\s+\{(\d+)\}", re.I), "Crit Rate"),
    (re.compile(r"Crit\.?\s*DMG\s+is\s+increased\s+by\s+\{(\d+)\}", re.I), "Crit DMG"),
]


def _get_sentence_window(text: str, start: int, end: int) -> str:
    """Get the sentence-like window around a matched bonus clause."""
    left = max(text.rfind(".", 0, start), text.rfind("\n", 0, start))
    right_candidates = [idx for idx in [text.find(".", end), text.find("\n", end)] if idx != -1]
    right = min(right_candidates) if right_candidates else len(text)
    return text[left + 1:right].strip()


def _extract_character_condition(desc: str, match_start: int, match_end: int) -> list[str] | None:
    """Extract known character conditions near a matched stat bonus."""
    sentence = _get_sentence_window(desc, match_start, match_end)
    if not sentence:
        return None

    # Pattern: "When Lucy or Rebecca has this Echo equipped ..." (named characters
    # only — generic "the Resonator with/who has this Echo equipped" is no condition).
    has_match = re.search(r"\bWhen\s+([A-Z].*?)\s+(?:has|have)\s+this\s+Echo\s+equipped", sentence)
    if has_match and "resonator" not in has_match.group(1).lower():
        conditions = [t.strip() for t in re.split(r"\s+or\s+|,", has_match.group(1)) if t.strip()]
        if conditions:
            return conditions

    # Pattern: "... main slot by Aemeath ..."
    by_match = re.search(r"\bby\s+([A-Z][A-Za-z]+)\b", sentence)
    if by_match:
        return [by_match.group(1)]

    # Pattern: "When Resonator: Aero or Cartethyia equips this Echo ..."
    resonator_match = re.search(r"\bResonator:\s*([^.]+?)\s+equips\b", sentence, re.I)
    if resonator_match:
        raw_targets = resonator_match.group(1)
        conditions = []
        for token in re.split(r"\s+or\s+|,", raw_targets):
            cleaned = token.strip()
            if cleaned:
                conditions.append(cleaned)
        return conditions if conditions else None

    return None


def extract_main_slot_bonuses(skill: dict) -> list[dict] | None:
    """Extract first-panel bonuses from echo skill description."""
    desc = (skill.get("descriptionEx") or {}).get("en") or ""
    if "main slot" not in desc:
        return None
    params = (skill.get("levelDescriptionStrArray") or [{}])[0].get("ArrayString") or []
    bonuses = []
    for regex, stat in STAT_PATTERNS:
        for m in regex.finditer(desc):
            param_index = int(m.group(1))
            if param_index < len(params):
                val_str = params[param_index]
                try:
                    val = float(val_str.replace("%", ""))
                    bonus: dict[str, Any] = {"stat": stat, "value": val}
                    condition = _extract_character_condition(desc, m.start(), m.end())
                    if condition:
                        bonus["characterCondition"] = condition
                    bonuses.append(bonus)
                except ValueError:
                    pass
    return bonuses if bonuses else None


def extract_legacy_id(icon_path: str) -> str | None:
    """Extract legacy numeric ID from icon path like T_IconMonsterGoods_992_UI.png."""
    m = re.search(r"T_IconMonsterGoods_(\d+)_UI\.png", icon_path)
    return m.group(1) if m else None


def fetch_encore_echo_name_index() -> dict[int, str]:
    """Fetch Encore echo names keyed by MonsterId/Id for Wuthery localization gaps."""
    try:
        import requests
    except ImportError:
        raise RuntimeError("requests is required for the Encore name fallback")

    try:
        payload = request_json_with_retry(
            requests,
            "get",
            ENCORE_ECHO_LIST_API,
        )
    except Exception as exc:
        raise RuntimeError(
            "Failed to fetch the required Encore echo-name fallback; refusing "
            "to write echoes with blank names"
        ) from exc

    if not isinstance(payload, dict):
        raise ValueError("Unexpected Encore echo-name payload; expected an object")

    out: dict[int, str] = {}
    for item in payload.get("Echo", []):
        try:
            echo_id = int(item.get("Id"))
        except (TypeError, ValueError):
            continue
        name = str(item.get("Name") or "").strip()
        if name:
            out[echo_id] = name
    return out


def _apply_name_fallback(raw: dict, encore_names: dict[int, str]) -> dict:
    name = dict(raw.get("name") or {})
    if not name.get("en"):
        fallback = encore_names.get(raw.get("monsterId"))
        if fallback:
            name["en"] = fallback
    return name


def transform_echo(raw: dict, encore_names: dict[int, str] | None = None) -> dict:
    """Transform raw Phantom JSON to our Echo schema."""
    icon_path = raw["icon"].get("icon", "")
    legacy_id = extract_legacy_id(icon_path)
    name = _apply_name_fallback(raw, encore_names or {})
    echo: dict[str, Any] = {
        "id": raw["id"],
        "name": name,
        "cost": raw["cost"]["cost"],
        "fetter": raw["fetter"],
        "element": raw["element"],
        "icon": icon_path,
        "skill": {
            # Keep the full i18n object so the frontend can localize; was .en-only.
            "description": raw["skill"].get("descriptionEx") or {},
            "params": raw["skill"].get("levelDescriptionStrArray"),
        },
        "legacyId": legacy_id or str(raw.get("id", "") or ""),
    }
    bonuses = extract_main_slot_bonuses(raw["skill"])
    if bonuses:
        echo["bonuses"] = bonuses
    return echo


def _fetch_one(session, filename: str) -> tuple[str, dict | None]:
    """Fetch a single phantom JSON from CDN."""
    url = f"{CDN_DOWNLOAD_BASE}/{filename}"
    try:
        data = request_json_with_retry(session, "get", url)
        if not isinstance(data, dict):
            raise ValueError(f"expected an object, got {type(data).__name__}")
        return (filename, data)
    except Exception as e:
        print(f"  Failed {filename} after retries: {e}")
    return (filename, None)


def fetch_cdn_echoes(single_id: str | None = None, workers: int | None = None) -> list[dict]:
    """Fetch phantom data from CDN, parallelized with threads."""
    try:
        import requests
    except ImportError:
        print("Install requests: pip install requests")
        return []

    session = requests.Session()

    if single_id:
        url = f"{CDN_DOWNLOAD_BASE}/{single_id}.json"
        print(f"Fetching {url}")
        try:
            data = request_json_with_retry(session, "get", url)
            if not isinstance(data, dict):
                raise ValueError(f"expected an object, got {type(data).__name__}")
            return [data]
        except Exception as e:
            print(f"Failed to fetch {single_id} after retries: {e}")
        return []

    print("Listing Phantom from CDN...")
    try:
        list_data = request_json_with_retry(
            session,
            "post",
            CDN_LIST_API,
            json={"path": "/GameData/Grouped/Phantom"},
            headers={"Content-Type": "application/json"},
        )
        if list_data.get("code") != 200:
            print(f"List API error: {list_data.get('message')}")
            return []

        files = list_data.get("data", {}).get("content", [])
        json_files = [f["name"] for f in files if f["name"].endswith(".json")]
        actual_workers = workers if workers else 20
        print(f"Found {len(json_files)} phantom files, fetching with {actual_workers} threads...")

        raw_list = []
        failed: list[str] = []
        with ThreadPoolExecutor(max_workers=actual_workers) as pool:
            futures = {pool.submit(_fetch_one, session, f): f for f in json_files}
            for future in as_completed(futures):
                filename, data = future.result()
                if data:
                    raw_list.append(data)
                    print(f"  Fetched {filename}")
                else:
                    failed.append(filename)
        if failed:
            print(
                f"ERROR: fetched only {len(raw_list)}/{len(json_files)} echo files; "
                f"refusing to replace Echoes.json. Failed: {', '.join(sorted(failed))}"
            )
            return []
        return raw_list
    except Exception as e:
        print(f"Error listing CDN: {e}")
    return []


def _process_raw_list(
    raw_list: list[dict],
    existing_echoes: list[dict] | None = None,
) -> tuple[list[dict], dict]:
    """Filter, deterministically dedupe, and merge base/phantom echoes."""
    base_echoes: dict[str, dict] = {
        str(echo.get("name", {}).get("en") or ""): echo
        for echo in existing_echoes or []
        if isinstance(echo, dict) and isinstance(echo.get("name"), dict)
    }
    phantom_skins: list[dict] = []
    skipped_cosmetic = skipped_rarity = duplicates = 0
    names_seen_this_run: set[str] = set()
    needs_name_fallback = any(
        raw.get("phantomType") == 1
        and raw.get("rarity", {}).get("id") == 5
        and not raw.get("name", {}).get("en")
        for raw in raw_list
    )
    encore_names = fetch_encore_echo_name_index() if needs_name_fallback else {}

    def raw_sort_key(raw: dict) -> tuple[int, str]:
        try:
            return (int(raw.get("id")), "")
        except (TypeError, ValueError):
            return (2**63 - 1, str(raw.get("id") or ""))

    for raw in sorted(raw_list, key=raw_sort_key):
        if raw.get("phantomType") != 1:
            skipped_cosmetic += 1
            continue
        if raw.get("rarity", {}).get("id") != 5:
            skipped_rarity += 1
            continue
        name_en = _apply_name_fallback(raw, encore_names).get("en", "")
        if name_en.startswith("Phantom: "):
            phantom_skins.append(raw)
            continue
        if name_en in names_seen_this_run:
            duplicates += 1
            continue
        transformed = transform_echo(raw, encore_names)
        transformed_id = str(transformed.get("id"))
        for old_name, old_echo in list(base_echoes.items()):
            if old_name != name_en and str(old_echo.get("id")) == transformed_id:
                del base_echoes[old_name]
        base_echoes[name_en] = transformed
        names_seen_this_run.add(name_en)

    merged = orphaned = 0
    for skin in phantom_skins:
        base_name = skin["name"]["en"][len("Phantom: "):]
        if base_name not in base_echoes:
            for attempt in [
                base_name.replace("Nightmare ", "Nightmare: "),
                base_name.replace("Reminiscence ", "Reminiscence: "),
                base_name.replace(" - ", ": "),
            ]:
                if attempt in base_echoes:
                    base_name = attempt
                    break
        base = base_echoes.get(base_name)
        if base:
            base["phantomIcon"] = skin["icon"].get("icon", "")
            merged += 1
        else:
            print(f"  Warning: orphaned phantom skin \"{skin['name']['en']}\" ({skin['id']})")
            orphaned += 1

    echoes = sorted(
        base_echoes.values(),
        key=lambda e: (-e["cost"], e.get("name", {}).get("en", "")),
    )
    cost_dist = {1: 0, 3: 0, 4: 0}
    bonus_count = with_phantom = 0
    for e in echoes:
        cost_dist[e["cost"]] = cost_dist.get(e["cost"], 0) + 1
        if e.get("bonuses"):
            bonus_count += 1
        if e.get("phantomIcon"):
            with_phantom += 1

    stats = {
        "skipped_cosmetic": skipped_cosmetic,
        "skipped_rarity": skipped_rarity,
        "duplicates": duplicates,
        "orphaned": orphaned,
        "cost_dist": cost_dist,
        "bonus_count": bonus_count,
        "with_phantom": with_phantom,
    }
    return echoes, stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync echo data from Wuthery CDN (Grouped/Phantom)")
    parser.add_argument("--fetch", action="store_true", help="Fetch from CDN")
    parser.add_argument("--id", type=str, default=None, help="Single phantom ID (e.g. 60000425)")
    parser.add_argument("--workers", "-w", type=int, default=None, help="Parallel fetch threads")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    if not args.fetch:
        parser.error("Specify --fetch to sync from CDN")
        return 1
    raw_list = fetch_cdn_echoes(single_id=args.id, workers=args.workers)

    if not raw_list:
        print("No phantom data to process")
        return 1

    existing_echoes: list[dict] | None = None
    if args.id:
        if not OUTPUT_FILE.exists():
            parser.error(
                f"Cannot merge echo {args.id}: {OUTPUT_FILE} does not exist. "
                "Run a full sync first."
            )
        with OUTPUT_FILE.open(encoding="utf-8") as handle:
            existing_echoes = json.load(handle)
        if not isinstance(existing_echoes, list):
            parser.error(f"Expected a JSON array in {OUTPUT_FILE}")
        print(
            f"Single-echo mode: merging {args.id} into the "
            f"{len(existing_echoes)}-record canonical file"
        )

    print(f"\nProcessing {len(raw_list)} raw phantom entries...")
    echoes, stats = _process_raw_list(raw_list, existing_echoes)

    s = stats
    print("\nResults:")
    print(f"  Total echoes: {len(echoes)}")
    print(f"  Cost 4: {s['cost_dist'].get(4, 0)}, Cost 3: {s['cost_dist'].get(3, 0)}, Cost 1: {s['cost_dist'].get(1, 0)}")
    print(f"  With main-slot bonuses: {s['bonus_count']}")
    print(f"  With phantom skin: {s['with_phantom']}/{len(echoes)}")
    print(f"  Skipped: {s['skipped_cosmetic']} cosmetic, {s['skipped_rarity']} non-5-star, {s['duplicates']} duplicates")
    if s["orphaned"]:
        print(f"  Orphaned phantom skins: {s['orphaned']}")
    if args.dry_run:
        print("\n[DRY RUN] Would write to:", OUTPUT_FILE)
        if args.pretty:
            print("\nSample output (first 3):")
            print(json.dumps(echoes[:3], indent=2, ensure_ascii=False))
        print("\n=== Echoes with main-slot bonuses ===")
        for e in echoes:
            if e.get("bonuses"):
                print(f"  {e['name']['en']} (cost {e['cost']}): {e['bonuses']}")
    else:
        kwargs = {"indent": 2, "ensure_ascii": False} if args.pretty else {"separators": (",", ":"), "ensure_ascii": False}
        write_json_atomic(OUTPUT_FILE, echoes, **kwargs)
        print(f"\nWrote {len(echoes)} echoes to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    exit(main())
