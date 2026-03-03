"""
Sync fetter data to public/Data/Fetters.json.

Fetches PhantomFetters.json and PhantomFetterGroups.json, merges them into one
file keyed by FetterGroup ID (the same IDs used in Echo.fetter arrays).

The smallest piece-count tier is still exposed in top-level fields for backward
compatibility (2-piece for most sets, 3-piece for 3-piece-only sets), and all
available tiers are also exposed under `pieceEffects` (e.g. both 2 and 5).

Output shape per entry:
  {
    "id":        <FetterGroup.Id>,   -- matches echo fetter[] values and FETTER_MAP
    "name":      { "en": ..., "de": ..., ... },
    "icon":      "https://files.wuthery.com/d/...",
    "color":     "RRGGBBAA",
    "pieceCount": 2,                 -- 2 for standard sets, 3 for 3-piece-only sets
    "fetterId":  <PhantomFetter.Id>,
    "addProp":   [{ "id": 22, "value": 10, "isRatio": false }],
    "buffIds":   [],
    "effectDescription": { "en": ..., ... },
    "pieceEffects": {
      "2": { "pieceCount": 2, "fetterId": ..., "addProp": [...], "buffIds": [...], "effectDescription": {...} },
      "5": { "pieceCount": 5, "fetterId": ..., "addProp": [...], "buffIds": [...], "effectDescription": {...} }
    },
    "fetterIcon": "https://...",
    "effectDefineDescription": { "en": ..., ... }  -- lore text
  }

Usage:
    python sync_fetters.py            # Fetch and write Fetters.json
    python sync_fetters.py --dry-run  # Preview without writing
    python sync_fetters.py --pretty   # Pretty-print output
"""

import json
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip install requests")
    raise SystemExit(1)

CDN_BASE = "https://files.wuthery.com"
FETTERS_URL  = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PhantomFetters.json"
GROUPS_URL   = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PhantomFetterGroups.json"

OUTPUT = Path(__file__).parent.parent / "public/Data/Fetters.json"


def prepend_cdn(path: str) -> str:
    """Prepend CDN base to /d/ paths."""
    return f"{CDN_BASE}{path}" if isinstance(path, str) and path.startswith("/d/") else path


def normalise_prop(prop: dict) -> dict:
    """Normalise AddProp entry: camelCase keys, value as percentage if IsRatio."""
    raw_value = prop["Value"]
    is_ratio = prop["IsRatio"]
    # CDN stores ratios as e.g. 0.1 (= 10%), multiply to get human-readable %
    value = round(raw_value * 100, 4) if is_ratio else raw_value / 10
    return {
        "id":      prop["Id"],
        "value":   value,
        "isRatio": is_ratio,
    }


def build_piece_effect(piece_count: int, fetter: dict) -> dict:
    """Build one piece-tier payload (2/3/5) from a PhantomFetter row."""
    return {
        "pieceCount": piece_count,
        "fetterId": fetter["Id"],
        "addProp": [normalise_prop(p) for p in fetter.get("AddProp", [])],
        "buffIds": fetter.get("BuffIds", []),
        "effectDescription": fetter.get("EffectDescription", {}),
    }


def main():
    parser = argparse.ArgumentParser(description="Sync fetter data from Wuthery CDN")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing")
    parser.add_argument("--pretty",  action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    session = requests.Session()

    print("Fetching PhantomFetters.json ...")
    fetters_raw: list[dict] = session.get(FETTERS_URL, timeout=30).json()
    print(f"  {len(fetters_raw)} fetter entries")

    print("Fetching PhantomFetterGroups.json ...")
    groups_raw: list[dict] = session.get(GROUPS_URL, timeout=30).json()
    print(f"  {len(groups_raw)} fetter groups")

    # Index individual fetter entries by their Id
    fetters_by_id: dict[int, dict] = {f["Id"]: f for f in fetters_raw}

    output: list[dict] = []

    for group in groups_raw:
        group_id   = group["Id"]
        fetter_map = group["FetterMap"]   # e.g. {"2": 1, "5": 2} or {"3": 192}
        icon       = prepend_cdn(group["Icon"])
        color      = group.get("FetterElementColor", "")
        name       = group["FetterGroupName"]

        # Pick the smallest piece count (2 for standard sets, 3 for 3-piece-only)
        sorted_keys = sorted(fetter_map.keys(), key=int)
        piece_count_str = sorted_keys[0]
        fetter_id = fetter_map[piece_count_str]

        fetter = fetters_by_id.get(fetter_id)
        if not fetter:
            print(f"  WARNING: fetter id {fetter_id} not found for group {group_id}")
            continue

        # Build all available piece tiers (e.g. 2+5, or 3-only).
        piece_effects: dict[str, dict] = {}
        for key in sorted_keys:
            fid = fetter_map[key]
            tier_fetter = fetters_by_id.get(fid)
            if not tier_fetter:
                print(f"  WARNING: piece {key} fetter id {fid} missing for group {group_id}")
                continue
            piece_effects[key] = build_piece_effect(int(key), tier_fetter)

        # Lore text is consistent across pieces, take from primary entry.
        lore = fetter.get("EffectDefineDescription", {})
        primary_effect = piece_effects.get(piece_count_str, build_piece_effect(int(piece_count_str), fetter))

        entry = {
            "id":         group_id,
            "name":       name,
            "icon":       icon,
            "color":      color,
            "pieceCount": int(piece_count_str),
            "fetterId":   primary_effect["fetterId"],
            "addProp":    primary_effect["addProp"],
            "buffIds":    primary_effect["buffIds"],
            "effectDescription": primary_effect["effectDescription"],
            "pieceEffects": piece_effects,
            "fetterIcon": prepend_cdn(fetter.get("FetterIcon", "")),
            "effectDefineDescription": lore,
        }
        output.append(entry)

    output.sort(key=lambda e: e["id"])

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (",", ":"), "ensure_ascii": False}
    )

    if args.dry_run:
        print(json.dumps(output[:3], indent=2, ensure_ascii=False))
        print(f"\n(dry-run) {len(output)} groups, not written")
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, **json_kwargs)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nWrote {OUTPUT} [{size_kb:.1f} KB], {len(output)} fetter groups")


if __name__ == "__main__":
    main()
