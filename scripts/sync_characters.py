"""
Sync Characters from Wuthery CDN to local JSON files.

Fetches character data from CDN (or reads local raw files), transforms it
using a schema (keeping all languages), and outputs:
  - Individual per-character JSON files (by CDN ID)
  - Combined Characters.json for grid/selector views

Usage:
    python sync_characters.py --fetch                    # Sync all from CDN
    python sync_characters.py --fetch --id 1102          # Sync single from CDN
    python sync_characters.py --fetch --id 1102 --dry-run --pretty
    python sync_characters.py --fetch --include-trees    # Include skillTrees (for lb backend)
    python sync_characters.py --input ../../Character    # Process local raw files
"""

import json
import argparse
from pathlib import Path
from typing import Any

CDN_BASE = "https://files.wuthery.com"
CDN_LIST_API = f"{CDN_BASE}/api/fs/list"
CDN_DOWNLOAD_BASE = f"{CDN_BASE}/d/GameData/Grouped/Character"

# Output directory relative to this script
OUTPUT_DIR = Path(__file__).parent.parent / "public/Data/Characters"

# Skip test/placeholder characters
SKIP_IDS = {9990, 9991}

# Full schema for individual character files.
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
    "chains": ["id", "name", "description", "icon", "params"],
    "skill": ["id", "params"],
}

# Lightweight schema for combined Characters.json (grid/selector)
GRID_SCHEMA = {
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


def fetch_cdn_characters(single_id: str = None) -> list[dict]:
    """Fetch character data from CDN."""
    try:
        import requests
    except ImportError:
        print("Install requests library: pip install requests")
        return []

    characters = []

    if single_id:
        url = f"{CDN_DOWNLOAD_BASE}/{single_id}.json"
        print(f"Fetching {url}")
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                characters.append(resp.json())
            else:
                print(f"Failed to fetch {single_id}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"Error fetching {single_id}: {e}")
        return characters

    print("Listing characters from CDN...")
    try:
        list_resp = requests.post(
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
        print(f"Found {len(json_files)} character files")

        for filename in json_files:
            url = f"{CDN_DOWNLOAD_BASE}/{filename}"
            try:
                resp = requests.get(url, timeout=30)
                if resp.status_code == 200:
                    characters.append(resp.json())
                    print(f"  Fetched {filename}")
                else:
                    print(f"  Failed {filename}: HTTP {resp.status_code}")
            except Exception as e:
                print(f"  Error {filename}: {e}")

    except Exception as e:
        print(f"Error listing CDN: {e}")

    return characters


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
    parser.add_argument("--output", "-o", type=Path, default=OUTPUT_DIR,
                       help=f"Output directory (default: {OUTPUT_DIR})")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview output without writing files")
    parser.add_argument("--pretty", action="store_true",
                       help="Pretty print JSON (default: compact)")

    args = parser.parse_args()

    # Optionally include skillTrees
    schema = {**SCHEMA}
    if args.include_trees:
        schema["skillTrees"] = True

    # Load raw data
    if args.input:
        raw_characters = load_local_characters(args.input, single_id=args.id)
    elif args.fetch:
        raw_characters = fetch_cdn_characters(single_id=args.id)
    else:
        parser.error("Specify --input <dir> for local files or --fetch for CDN")
        return 1

    print(f"\nLoaded {len(raw_characters)} raw character files")

    # Transform: full schema for individual files
    characters = []
    for data in raw_characters:
        char = transform_character(data, schema)
        if char:
            characters.append(char)

    # Transform: grid schema for combined file
    grid_characters = []
    for data in raw_characters:
        char = transform_character(data, GRID_SCHEMA)
        if char:
            grid_characters.append(char)

    print(f"Transformed {len(characters)} characters")

    if not characters:
        print("No characters to save")
        return 1

    grid_characters.sort(key=lambda c: c.get("name", {}).get("en", ""))

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

        # Show grid entry too
        if grid_characters:
            grid_json = json.dumps(grid_characters[0], **json_kwargs)
            grid_size = len(grid_json.encode("utf-8")) / 1024
            print(f"\n=== Grid entry ({grid_size:.1f}KB) ===")
            print(grid_json[:3000])
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

        # Write combined grid file
        combined_path = args.output.parent / "Characters.json"
        with open(combined_path, "w", encoding="utf-8") as f:
            json.dump(grid_characters, f, **json_kwargs)
        size_kb = combined_path.stat().st_size / 1024
        print(f"  Saved Characters.json [{size_kb:.1f}KB] ({len(grid_characters)} characters)")

        print(f"\nDone: {len(characters)} characters → {args.output}")

    return 0


if __name__ == "__main__":
    exit(main())
