"""
Sync Weapons from Wuthery CDN to public/Data.

Fetches weapon data from CDN, transforms it using a schema (keeping all
languages), and writes to public/Data/Weapons (combined or --individual).

Usage:
    python sync_weapons.py --fetch                     # Sync all → combined Weapons.json
    python sync_weapons.py --fetch --id 21010015       # Sync single weapon from CDN
    python sync_weapons.py --fetch --dry-run --pretty  # Preview without writing
    python sync_weapons.py --fetch --individual        # Write per-weapon files instead
"""

import json
import argparse
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed

CDN_BASE = "https://files.wuthery.com"
CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Weapon"

OUTPUT_DIR = Path(__file__).parent.parent / "public/Data/Weapons"

# Schema: True = keep as-is, ["k1","k2"] = keep only these keys
SCHEMA = {
    "id": True,
    "name": True,
    "type": ["id", "name", "icon"],
    "rarity": ["id", "color"],
    "icon": True,
    # Passive: effect template ("{0}" placeholders) + effectName + params (R1-R5 per placeholder).
    # Params are NOT uniformly scaled — ratios vary (1.5x, 2x, 3.2x etc.), so all 5 ranks are kept.
    # Weapons with multi-stat passives (e.g. Guardian series boosting Basic + Heavy ATK) use a
    # single {0} param for both; there is no separate "passive2" — the effect text describes it.
    "effect": True,
    "effectName": True,
    "params": True,
    # Stats: custom handler extracts lv1 base values only (statsLevel is redundant bulk).
    # NOTE on CDN stat value formats:
    #   - stats.first.value: flat base ATK (e.g. 47 = 47 ATK). Always isRatio=false.
    #   - stats.second: substat. Two formats depending on isRatio:
    #       isRatio=true:  decimal ratio, multiply by 100 for display (0.081 → "8.1%")
    #       isRatio=false: raw int, divide by 100 for display (1080 → "10.8%")
    #     The attribute field uses internal names: "Atk", "CritRate", "CritDamage",
    #     "Hp", "Def", "EnergyRecover". The name field has the display-ready label per language.
    "stats": True,
}


def prepend_cdn(obj: Any) -> Any:
    """Prepend CDN base URL to paths starting with /d/."""
    if isinstance(obj, str):
        return f"{CDN_BASE}{obj}" if obj.startswith("/d/") else obj
    elif isinstance(obj, dict):
        return {k: prepend_cdn(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [prepend_cdn(item) for item in obj]
    return obj


def filter_keys(obj: Any, keys: list[str]) -> Any:
    """Filter object to only specified keys.

    Handles direct dicts, dict-of-dicts, and list-of-dicts.
    """
    keys_set = set(keys)

    if isinstance(obj, dict):
        if keys_set & set(obj.keys()):
            return {k: v for k, v in obj.items() if k in keys_set}
        else:
            return {k: filter_keys(v, keys) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [filter_keys(item, keys) for item in obj]
    return obj


def extract_stats(stats: dict) -> dict:
    """Extract lv1 base stats from the stats object.

    Input:  { first: {attribute, name, value, isRatio, icon}, second: {...} }
    Output: { first: {attribute, value},
              second: {attribute, name, value, isRatio} }

    first is always flat ATK (value=47 means 47 ATK).
    second is the substat — see SCHEMA comments for value format notes.
    We keep second.name (multilingual display label) so consumers don't need
    to map internal attribute names like "CritDamage" → "Crit. DMG".
    """
    result = {}
    first = stats.get("first")
    if isinstance(first, dict):
        result["first"] = {"attribute": first.get("attribute"), "value": first.get("value")}

    second = stats.get("second")
    if isinstance(second, dict):
        result["second"] = {
            "attribute": second.get("attribute"),
            "name": second.get("name"),
            "value": second.get("value"),
            "isRatio": second.get("isRatio"),
        }
    return result


def should_skip(data: dict) -> bool:
    """Skip test/placeholder weapons."""
    wid = data.get("id", 0)
    name = data.get("name", {})
    en_name = name.get("en", "") if isinstance(name, dict) else str(name)

    if str(wid).startswith("200"):
        return True
    if not en_name or en_name.strip() == "":
        return True
    if "test" in en_name.lower():
        return True
    return False


def extract_by_schema(data: dict, schema: dict) -> dict:
    """Extract fields from data according to schema."""
    output = {}

    for field, rule in schema.items():
        if field not in data:
            continue

        value = data[field]

        if field == "stats":
            output[field] = extract_stats(value)
        elif rule is True:
            output[field] = prepend_cdn(value)
        elif isinstance(rule, list):
            output[field] = prepend_cdn(filter_keys(value, rule))

    return output


def transform_weapon(data: dict, schema: dict) -> dict | None:
    """Transform raw CDN weapon data using schema."""
    if should_skip(data):
        return None
    return extract_by_schema(data, schema)


# --- CDN fetch ---

def _fetch_one(session, filename: str) -> tuple[str, dict | None]:
    """Fetch a single weapon JSON from CDN."""
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


def fetch_cdn_weapons(single_id: str = None, workers: int | None = None) -> list[dict]:
    """Fetch weapon data from CDN, parallelized with threads."""
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

    print("Listing weapons from CDN...")
    try:
        list_resp = session.post(
            CDN_LIST_API,
            json={"path": "/GameData/Grouped/Weapon"},
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        list_data = list_resp.json()

        if list_data.get("code") != 200:
            print(f"List API error: {list_data.get('message')}")
            return []

        files = list_data.get("data", {}).get("content", [])
        json_files = [f["name"] for f in files if f["name"].endswith(".json")]

        actual_workers = workers if workers else 20
        print(f"Found {len(json_files)} weapon files, fetching with {actual_workers} threads...")

        weapons = []
        with ThreadPoolExecutor(max_workers=actual_workers) as pool:
            futures = {pool.submit(_fetch_one, session, f): f for f in json_files}
            for future in as_completed(futures):
                filename, data = future.result()
                if data:
                    weapons.append(data)
                    print(f"  Fetched {filename}")

        return weapons

    except Exception as e:
        print(f"Error listing CDN: {e}")

    return []


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Sync weapon data from Wuthery CDN")
    parser.add_argument("--id", type=str, default=None,
                        help="Process single weapon by ID (e.g., --id 21010015)")
    parser.add_argument("--fetch", action="store_true",
                        help="Fetch from CDN")
    parser.add_argument("--individual", action="store_true",
                        help="Write per-weapon files instead of combined Weapons.json")
    parser.add_argument("--workers", "-w", type=int, default=None,
                        help="Parallel fetch threads (default: all files in parallel)")
    parser.add_argument("--output", "-o", type=Path, default=OUTPUT_DIR,
                        help=f"Output directory (default: {OUTPUT_DIR})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview output without writing files")
    parser.add_argument("--pretty", action="store_true",
                        help="Pretty print JSON (default: compact)")

    args = parser.parse_args()

    if not args.fetch:
        parser.error("Specify --fetch to sync from CDN")
        return 1
    raw_weapons = fetch_cdn_weapons(single_id=args.id, workers=args.workers)

    print(f"\nLoaded {len(raw_weapons)} raw weapon files")

    # Transform
    weapons = []
    skipped = 0
    for data in raw_weapons:
        weapon = transform_weapon(data, SCHEMA)
        if weapon:
            weapons.append(weapon)
        else:
            wid = data.get("id", "?")
            name = data.get("name", {}).get("en", "?") if isinstance(data.get("name"), dict) else "?"
            print(f"  Skipped {wid} ({name})")
            skipped += 1

    weapons.sort(key=lambda w: w.get("name", {}).get("en", ""))
    print(f"Transformed {len(weapons)} weapons ({skipped} skipped)")

    if not weapons:
        print("No weapons to save")
        return 1

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (",", ":"), "ensure_ascii": False}
    )

    if args.dry_run:
        for weapon in weapons:
            wid = weapon["id"]
            en_name = weapon.get("name", {}).get("en", str(wid))
            output_json = json.dumps(weapon, **json_kwargs)
            size_kb = len(output_json.encode("utf-8")) / 1024
            print(f"\n=== {en_name} ({wid}) — {size_kb:.1f}KB ===")
            print(output_json[:5000])
            if len(output_json) > 5000:
                print(f"\n... [{size_kb:.1f}KB total, truncated]")

    elif args.individual:
        # Write per-weapon files
        args.output.mkdir(parents=True, exist_ok=True)
        for weapon in weapons:
            wid = weapon["id"]
            en_name = weapon.get("name", {}).get("en", str(wid))
            output_path = args.output / f"{wid}.json"
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(weapon, f, **json_kwargs)
            size_kb = output_path.stat().st_size / 1024
            print(f"  Saved {output_path.name} ({en_name}) [{size_kb:.1f}KB]")
        print(f"\nDone: {len(weapons)} weapons → {args.output}")

    else:
        # Default: combined Weapons.json
        combined_path = args.output.parent / "Weapons.json"
        combined_path.parent.mkdir(parents=True, exist_ok=True)
        with open(combined_path, "w", encoding="utf-8") as f:
            json.dump(weapons, f, **json_kwargs)
        size_kb = combined_path.stat().st_size / 1024
        print(f"  Saved Weapons.json [{size_kb:.1f}KB] ({len(weapons)} weapons)")
        print(f"\nDone: {len(weapons)} weapons → {combined_path}")

    return 0


if __name__ == "__main__":
    exit(main())
