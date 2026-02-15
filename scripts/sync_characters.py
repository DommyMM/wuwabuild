"""
Sync Characters from Wuthery CDN to local JSON files.

Fetches character data from CDN (or reads local raw files), transforms it
using a schema (keeping all languages), and outputs individual per-character
JSON files (by CDN ID).

Usage:
    python sync_characters.py --fetch                    # Sync all from CDN
    python sync_characters.py --fetch --id 1102          # Sync single from CDN
    python sync_characters.py --fetch --id 1102 --dry-run --pretty
    python sync_characters.py --fetch --combined         # Also generate Characters.json
    python sync_characters.py --fetch --include-trees    # Include skillTrees (for lb backend)
    python sync_characters.py --fetch --include-skills   # Include chains/skills
    python sync_characters.py --input ../../Character    # Process local raw files
"""

import json
import argparse
import re
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed

# Regex to extract legacy ID from iconRound URL
# e.g. "T_IconRoleHeadCircle256_26_UI.png" -> 26
LEGACY_ID_PATTERN = re.compile(r"T_IconRoleHeadCircle256_(\d+)_UI\.png")

CDN_BASE = "https://files.wuthery.com"
CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Character"

# Output directory relative to this script
OUTPUT_DIR = Path(__file__).parent.parent / "public/Data/Characters"

# Skip test/placeholder characters
SKIP_IDS = {9990, 9991}

# Default schema for character files (lightweight, no skills/chains).
#   True           = keep entire field as-is
#   ["k1", "k2"]   = keep only these keys (auto-recurses into dicts-of-dicts and lists-of-dicts)
#   "value"        = extract just the 'value' from each stat entry
SCHEMA = {
    "id": True,
    "name": True,
    "rarity": ["id", "color"],
    "weapon": ["id", "name", "icon"],
    "element": ["id", "name", "color", "icon"],
    "icon": ["iconRound", "banner"],
    "skins": ["id", "icon", "color"],
    "tags": ["id", "name", "icon"],
    "stats": "value",
}

# Optional fields for --include-skills flag
SKILLS_SCHEMA = {
    "chains": ["id", "name", "description", "icon", "params"],
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
        return f"{CDN_BASE}{obj}" if obj.startswith("/d/") else obj
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


def transform_character(data: dict, schema: dict) -> dict | None:
    """Transform raw CDN character data using schema."""
    char_id = data.get("id")
    name = data.get("name", {})
    en_name = name.get("en", "") if isinstance(name, dict) else name

    if not en_name or char_id in SKIP_IDS:
        return None

    result = extract_by_schema(data, schema)
    apply_sub_filters(result, SUB_FILTERS)

    # Add legacyId extracted from iconRound URL for backwards compatibility
    legacy_id = extract_legacy_id(data)
    if legacy_id:
        result["legacyId"] = legacy_id

    return result


# --- Data loading ---

def load_local_characters(input_dir: Path, single_id: str = None) -> list[dict]:
    """Load character data from local JSON files."""
    characters = []

    if single_id:
        filepath = input_dir / f"{single_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                characters.append(json.load(f))
            print(f"  Loaded {filepath.name}")
        else:
            print(f"  File not found: {filepath}")
        return characters

    json_files = sorted(input_dir.glob("*.json"))
    print(f"Found {len(json_files)} character files in {input_dir}")

    for filepath in json_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                characters.append(json.load(f))
            print(f"  Loaded {filepath.name}")
        except Exception as e:
            print(f"  Error loading {filepath.name}: {e}")

    return characters


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


def fetch_cdn_characters(single_id: str = None, workers: int | None = None) -> list[dict]:
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

        # Default to all files in parallel if workers not specified
        actual_workers = workers if workers else len(json_files)
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
    parser.add_argument("--input", "-i", type=Path, default=None,
                       help="Read from local directory instead of CDN")
    parser.add_argument("--fetch", action="store_true",
                       help="Fetch from CDN (required if no --input)")
    parser.add_argument("--include-trees", action="store_true",
                       help="Include skillTrees in output (off by default, useful for lb backend)")
    parser.add_argument("--include-skills", action="store_true",
                       help="Include chains and skill fields (off by default)")
    parser.add_argument("--combined", action="store_true",
                       help="Also generate combined Characters.json for grid/selector")
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
    if args.include_trees:
        schema["skillTrees"] = True

    # Load raw data
    if args.input:
        raw_characters = load_local_characters(args.input, single_id=args.id)
    elif args.fetch:
        raw_characters = fetch_cdn_characters(single_id=args.id, workers=args.workers)
    else:
        parser.error("Specify --input <dir> for local files or --fetch for CDN")
        return 1

    print(f"\nLoaded {len(raw_characters)} raw character files")

    # Transform characters using schema
    characters = []
    for data in raw_characters:
        char = transform_character(data, schema)
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
            print(f"\n=== {en_name} ({char_id}) — {size_kb:.1f}KB ===")
            print(output_json[:5000])
            if len(output_json) > 5000:
                print(f"\n... [{size_kb:.1f}KB total, truncated]")
    else:
        # Write individual files
        args.output.mkdir(parents=True, exist_ok=True)

        for char in characters:
            char_id = char["id"]
            en_name = char.get("name", {}).get("en", str(char_id))
            output_path = args.output / f"{char_id}.json"
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(char, f, **json_kwargs)
            size_kb = output_path.stat().st_size / 1024
            print(f"  Saved {output_path.name} ({en_name}) [{size_kb:.1f}KB]")

        # Optionally write combined Characters.json
        if args.combined:
            combined_path = args.output.parent / "Characters.json"
            with open(combined_path, "w", encoding="utf-8") as f:
                json.dump(characters, f, **json_kwargs)
            size_kb = combined_path.stat().st_size / 1024
            print(f"  Saved Characters.json [{size_kb:.1f}KB] ({len(characters)} characters)")

        print(f"\nDone: {len(characters)} characters → {args.output}")

    return 0


if __name__ == "__main__":
    exit(main())
