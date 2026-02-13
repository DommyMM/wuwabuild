#!/usr/bin/env python3
"""
Sync Characters from Wuthery CDN to local JSON files.

Fetches character data from CDN, extracts English-only fields via schema,
and saves individual JSON files per character.

Usage:
    python sync_characters.py              # Sync all characters from CDN
    python sync_characters.py --id 1205    # Sync single character
    python sync_characters.py --dry-run    # Preview without saving
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

# Schema defines what to extract from CDN data
# - True = keep entire field
# - List = keep only these subfields
# - "value" = extract just the 'value' key (for stats)
SCHEMA = {
    "id": True,
    "name": True,
    "nickname": True,
    "rarity": ["id", "name", "color", "stars"],
    "weapon": ["id", "name", "icon"],
    "element": ["id", "name", "color", "icon"],
    "skins": True,
    "tags": True,
    "icon": True,
    "influenceIcon": True,
    "info": ["birthday", "country", "influence", "sex", "talentName"],
    "stats": "value",
    "chains": True,
    "skillTrees": True,
    "skill": True,
}

# Language keys to detect multi-language dicts
LANG_KEYS = {"de", "en", "es", "fr", "id", "ja", "ko", "pt", "ru", "th", "vi", "uk", "zh-Hans", "zh-Hant"}


def to_english(obj: Any) -> Any:
    """Recursively convert multi-language dicts to English only."""
    if isinstance(obj, dict):
        keys = set(obj.keys())
        if "en" in keys and len(keys & LANG_KEYS) > 1:
            return obj.get("en", "")
        return {k: to_english(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_english(item) for item in obj]
    return obj


def prepend_cdn(obj: Any) -> Any:
    """Prepend CDN base URL to paths starting with /d/"""
    if isinstance(obj, str):
        return f"{CDN_BASE}{obj}" if obj.startswith("/d/") else obj
    elif isinstance(obj, dict):
        return {k: prepend_cdn(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [prepend_cdn(item) for item in obj]
    return obj


def extract_by_schema(data: dict, schema: dict) -> dict:
    """Extract fields from data according to schema."""
    output = {}

    for field, rule in schema.items():
        if field not in data:
            continue

        value = data[field]

        if rule is True:
            output[field] = prepend_cdn(to_english(value))

        elif rule == "value":
            if isinstance(value, dict):
                output[field] = {
                    k: (v.get("value") if isinstance(v, dict) and "value" in v else v)
                    for k, v in value.items()
                }
            else:
                output[field] = value

        elif isinstance(rule, list):
            if isinstance(value, dict):
                filtered = {k: v for k, v in value.items() if k in rule}
                output[field] = prepend_cdn(to_english(filtered))
            else:
                output[field] = prepend_cdn(to_english(value))

        elif isinstance(rule, dict):
            if isinstance(value, dict):
                output[field] = extract_by_schema(value, rule)
            else:
                output[field] = value

    return output


def sanitize_filename(name: str) -> str:
    """Sanitize name for use as filename (remove/replace invalid chars)."""
    # Replace colons with nothing (Rover: Aero -> RoverAero)
    return name.replace(": ", "").replace(":", "")


def transform_character(data: dict) -> dict | None:
    """Transform CDN character data to English-only format using schema."""
    char_id = data.get("id")
    name = data.get("name", {}).get("en", "")

    # Skip test/placeholder characters
    if not name or char_id in [9990, 9991]:
        return None

    return extract_by_schema(data, SCHEMA)


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


def main():
    parser = argparse.ArgumentParser(description="Sync character data from Wuthery CDN")
    parser.add_argument("--id", type=str, default=None,
                       help="Sync single character by ID (e.g., --id 1205)")
    parser.add_argument("--output", "-o", type=Path, default=OUTPUT_DIR,
                       help=f"Output directory (default: {OUTPUT_DIR})")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview output without writing files")
    parser.add_argument("--pretty", action="store_true",
                       help="Pretty print JSON (default: compact)")

    args = parser.parse_args()

    # Fetch from CDN
    raw_characters = fetch_cdn_characters(single_id=args.id)
    print(f"Loaded {len(raw_characters)} character files")

    # Transform
    characters = []
    for data in raw_characters:
        char = transform_character(data)
        if char:
            characters.append(char)

    print(f"Transformed {len(characters)} characters")

    if not characters:
        print("No characters to save")
        return 1

    # Output
    args.output.mkdir(parents=True, exist_ok=True)

    for char in characters:
        name = char["name"]
        char_id = char["id"]

        if args.pretty:
            output_json = json.dumps(char, indent=2, ensure_ascii=False)
        else:
            output_json = json.dumps(char, separators=(',', ':'), ensure_ascii=False)

        filename = sanitize_filename(name)

        if args.dry_run:
            print(f"\n--- {name} ({char_id}) ---")
            preview = output_json[:2000] + "..." if len(output_json) > 2000 else output_json
            print(preview)
        else:
            output_path = args.output / f"{filename}.json"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(output_json)
            print(f"  Saved {output_path.name}")

    if not args.dry_run:
        print(f"\nSaved {len(characters)} characters to {args.output}")

    return 0


if __name__ == "__main__":
    exit(main())
