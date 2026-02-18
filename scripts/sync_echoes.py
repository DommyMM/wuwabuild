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

CDN_BASE = "https://files.wuthery.com"
CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Phantom"
# Scripts in /scripts; output in /public/Data
OUTPUT_FILE = Path(__file__).parent.parent / "public/Data/Echoes.json"

STAT_PATTERNS = [
    (re.compile(r"\{(\d+)\}\s*Glacio DMG Bonus", re.I), "Glacio DMG"),
    (re.compile(r"\{(\d+)\}\s*Fusion DMG Bonus", re.I), "Fusion DMG"),
    (re.compile(r"\{(\d+)\}\s*Electro DMG Bonus", re.I), "Electro DMG"),
    (re.compile(r"\{(\d+)\}\s*Aero DMG Bonus", re.I), "Aero DMG"),
    (re.compile(r"\{(\d+)\}\s*Spectro DMG Bonus", re.I), "Spectro DMG"),
    (re.compile(r"\{(\d+)\}\s*Havoc DMG Bonus", re.I), "Havoc DMG"),
    (re.compile(r"\{(\d+)\}\s*Resonance Skill DMG Bonus", re.I), "Resonance Skill DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*Resonance Liberation DMG Bonus", re.I), "Resonance Liberation DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*Basic Attack DMG Bonus", re.I), "Basic Attack DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*Heavy Attack DMG Bonus", re.I), "Heavy Attack DMG Bonus"),
    (re.compile(r"\{(\d+)\}\s*Energy Regen", re.I), "Energy Regen"),
    (re.compile(r"\{(\d+)\}\s*Healing Bonus", re.I), "Healing Bonus"),
]


def extract_main_slot_bonuses(skill: dict) -> list[dict] | None:
    """Extract first-panel bonuses from echo skill description."""
    desc = (skill.get("descriptionEx") or {}).get("en") or ""
    if "main slot" not in desc:
        return None
    params = (skill.get("levelDescriptionStrArray") or [{}])[0].get("ArrayString") or []
    bonuses = []
    for regex, stat in STAT_PATTERNS:
        m = regex.search(desc)
        if m:
            param_index = int(m.group(1))
            if param_index < len(params):
                val_str = params[param_index]
                try:
                    val = float(val_str.replace("%", ""))
                    bonuses.append({"stat": stat, "value": val})
                except ValueError:
                    pass
    return bonuses if bonuses else None


def extract_legacy_id(icon_path: str) -> str | None:
    """Extract legacy numeric ID from icon path like T_IconMonsterGoods_992_UI.png."""
    m = re.search(r"T_IconMonsterGoods_(\d+)_UI\.png", icon_path)
    return m.group(1) if m else None


def transform_echo(raw: dict) -> dict:
    """Transform raw Phantom JSON to our Echo schema."""
    icon_path = raw["icon"].get("icon", "")
    legacy_id = extract_legacy_id(icon_path)
    echo: dict[str, Any] = {
        "id": raw["id"],
        "name": raw["name"],
        "cost": raw["cost"]["cost"],
        "fetter": raw["fetter"],
        "element": raw["element"],
        "icon": icon_path,
        "skill": {
            "description": (raw["skill"].get("descriptionEx") or {}).get("en"),
            "params": raw["skill"].get("levelDescriptionStrArray"),
        },
    }
    if legacy_id:
        echo["legacyId"] = legacy_id
    bonuses = extract_main_slot_bonuses(raw["skill"])
    if bonuses:
        echo["bonuses"] = bonuses
    return echo


def _fetch_one(session, filename: str) -> tuple[str, dict | None]:
    """Fetch a single phantom JSON from CDN."""
    url = f"{CDN_DOWNLOAD_BASE}/{filename}"
    try:
        resp = session.get(url, timeout=30)
        if resp.status_code == 200:
            return (filename, resp.json())
        print(f"  Failed {filename}: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  Error {filename}: {e}")
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
            resp = session.get(url, timeout=30)
            if resp.status_code == 200:
                return [resp.json()]
            print(f"Failed: HTTP {resp.status_code}")
        except Exception as e:
            print(f"Error: {e}")
        return []

    print("Listing Phantom from CDN...")
    try:
        list_resp = session.post(
            CDN_LIST_API,
            json={"path": "/GameData/Grouped/Phantom"},
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
        print(f"Found {len(json_files)} phantom files, fetching with {actual_workers} threads...")

        raw_list = []
        with ThreadPoolExecutor(max_workers=actual_workers) as pool:
            futures = {pool.submit(_fetch_one, session, f): f for f in json_files}
            for future in as_completed(futures):
                filename, data = future.result()
                if data:
                    raw_list.append(data)
                    print(f"  Fetched {filename}")
        return raw_list
    except Exception as e:
        print(f"Error listing CDN: {e}")
    return []


def _process_raw_list(raw_list: list[dict]) -> tuple[list[dict], dict]:
    """Filter, dedupe, merge phantom skins; return (echoes, stats)."""
    base_echoes: dict[str, dict] = {}
    phantom_skins: list[dict] = []
    skipped_cosmetic = skipped_rarity = duplicates = 0

    for raw in raw_list:
        if raw.get("phantomType") != 1:
            skipped_cosmetic += 1
            continue
        if raw.get("rarity", {}).get("id") != 5:
            skipped_rarity += 1
            continue
        name_en = raw.get("name", {}).get("en", "")
        if name_en.startswith("Phantom: "):
            phantom_skins.append(raw)
            continue
        if name_en in base_echoes:
            duplicates += 1
            continue
        base_echoes[name_en] = transform_echo(raw)

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

    print(f"\nProcessing {len(raw_list)} raw phantom entries...")
    echoes, stats = _process_raw_list(raw_list)

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
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        kwargs = {"indent": 2, "ensure_ascii": False} if args.pretty else {"separators": (",", ":"), "ensure_ascii": False}
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(echoes, f, **kwargs)
        print(f"\nWrote {len(echoes)} echoes to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    exit(main())
