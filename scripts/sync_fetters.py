"""Sync fetter data to public/Data/Fetters.json.

Merges PhantomFetters.json, PhantomFetterGroups.json and ConfigDBParsed/PhantomFetter.json into one file,
keyed by FetterGroup ID (the same IDs used in Echo.fetter arrays).

Top-level fields still carry the smallest piece-count tier, 2 for most sets and 3 for 3-piece-only ones.
Every available tier also appears under `pieceEffects` (1, 2, 3 or 5).

Output shape per entry:
  {
    "id":        <FetterGroup.Id>,   -- matches echo fetter[] values and FETTER_MAP
    "name":      { "en": ..., "de": ..., ... },
    "icon":      "https://files.wuthery.com/d/...",
    "color":     "RRGGBBAA",
    "pieceCount": 2,                 -- smallest activation tier (currently 1, 2, or 3)
    "fetterId":  <PhantomFetter.Id>,
    "addProp":   [{ "id": 22, "value": 10, "isRatio": false }],
    "buffIds":   [],
    "effectDescription": { "en": ..., ... },
    "effectDescriptionParam": ["10%"],
    "pieceEffects": {
      "2": { "pieceCount": 2, "fetterId": ..., "addProp": [...], "buffIds": [...], "effectDescription": {...}, "effectDescriptionParam": [...] },
      "5": { "pieceCount": 5, "fetterId": ..., "addProp": [...], "buffIds": [...], "effectDescription": {...}, "effectDescriptionParam": [...] }
    },
    "pieceEffects[tier].displayBonuses": [{ "stat": "Crit Rate", "value": 20, "requires": ["1109"] }],
                                     -- optional, panel-visible clauses from DISPLAY_BONUSES below
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
from cdn_config import CDN_BASE, pick, request_json_with_retry, write_records_atomic
from game_text import sanitize_i18n_value

try:
    import requests
except ImportError:
    print("pip install requests")
    raise SystemExit(1)

FETTERS_URL  = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PhantomFetters.json"
GROUPS_URL   = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PhantomFetterGroups.json"
FETTERS_CONFIG_URL = f"{CDN_BASE}/d/GameData/ConfigDBParsed/PhantomFetter.json"

OUTPUT = Path(__file__).parent.parent / "public/Data/Fetters.json"


# Set clauses the character panel can show, hand-authored
# A 2-piece tier is a bare stat line that lands in `addProp`, so the board columns and the editor already have it
# Almost every 3pc and 5pc clause needs an in-combat action and belongs to the damage engine, not a static panel
# Listed here are the few that need nothing: no condition or a permanent wearer property, and a stat the panel has
# Echo Skill, Outro Skill and Coordinated Attack DMG clauses are absent because the panel has nowhere to show them
# Deriving it from the parsed trigger surfaces four phantom bonuses, five of eight empty triggers being dropped ones
# Anaphora, aggregation conditions and bullet lists do not parse, the same reason move typing stays hand-authored
# `requires` lists the character IDs a clause is unconditional for, None when it holds for everyone
# Gating here keeps max Resonance Energy out of the frontend, and lb asserts this list against its engine-side gate
# lb's TestEchoSetDisplayBonusesMatchEngine rechecks each copied value against the parsed effect it came from
DISPLAY_BONUSES: dict[int, list[dict]] = {
    14: [
        {
            "tier": "5",
            "stat": "ATK%",
            "value": 15,
            "requires": None,
            "prose": "Increase the Resonator's ATK by 15%.",
        },
    ],
    19: [
        {
            # Lucilla (1109) and Phrolova (1608) cap at 0 Resonance Energy, so only for them is it always true
            "tier": "3",
            "stat": "Crit Rate",
            "value": 20,
            "requires": ["1109", "1608"],
            "prose": "Holding 0 Resonance Energy increases Crit. Rate by 20% and grants 35% Echo Skill DMG Bonus.",
        },
    ],
}


def display_bonuses_for(group_id: int, tier: str) -> list[dict]:
    """Panel-visible clauses declared for one set tier, in output shape."""
    return [
        {
            "stat": entry["stat"],
            "value": entry["value"],
            "requires": entry["requires"],
        }
        for entry in DISPLAY_BONUSES.get(group_id, [])
        if entry["tier"] == tier
    ]


def prepend_cdn(path: str) -> str:
    """Prepend CDN base to /d/ paths."""
    return f"{CDN_BASE}{path}" if isinstance(path, str) and path.startswith("/d/") else path


def normalise_prop(prop: dict) -> dict:
    """Normalise an addProp entry: camelCase keys, value as percentage if a ratio."""
    raw_value = pick(prop, "value", "Value")
    is_ratio = bool(pick(prop, "isRatio", "IsRatio", default=False))
    # CDN stores a ratio as 0.1 for 10%, and a flat value at ten times its real size
    value = round(raw_value * 100, 4) if is_ratio else raw_value / 10
    return {
        "id":      pick(prop, "id", "Id"),
        "value":   value,
        "isRatio": is_ratio,
    }


def build_piece_effect(piece_count: int, fetter: dict, config_fetter: dict | None) -> dict:
    """Build one activation-tier payload from a PhantomFetter row."""
    effect_description_param = pick(config_fetter, "effectDescriptionParam", "EffectDescriptionParam", default=[]) if isinstance(config_fetter, dict) else []
    if not isinstance(effect_description_param, list):
        effect_description_param = []

    return {
        "pieceCount": piece_count,
        "fetterId": pick(fetter, "id", "Id"),
        "addProp": [normalise_prop(p) for p in pick(fetter, "addProp", "AddProp", default=[])],
        "buffIds": pick(fetter, "buffIds", "BuffIds", default=[]),
        "effectDescription": sanitize_i18n_value(pick(fetter, "effectDescription", "EffectDescription", default={})),
        "effectDescriptionParam": [str(v) for v in effect_description_param],
    }


def fetch_and_build(session: "requests.Session | None" = None) -> list[dict]:
    """Fetch the three localization-index files and build the Fetters.json list.

    Encore's echo FetterGroups carry the set bonus as free text with no AddProp or pieceCount
    So `sync_encore.py` reuses this instead, a small 3-file fetch rather than the parallel pattern it avoids
    """
    session = session or requests.Session()

    print("Fetching PhantomFetters.json ...")
    fetters_raw = request_json_with_retry(session, "get", FETTERS_URL)
    if not isinstance(fetters_raw, list):
        raise ValueError("Unexpected PhantomFetters payload; expected a list")
    print(f"  {len(fetters_raw)} fetter entries")

    print("Fetching PhantomFetterGroups.json ...")
    groups_raw = request_json_with_retry(session, "get", GROUPS_URL)
    if not isinstance(groups_raw, list):
        raise ValueError("Unexpected PhantomFetterGroups payload; expected a list")
    print(f"  {len(groups_raw)} fetter groups")

    print("Fetching ConfigDBParsed/PhantomFetter.json ...")
    fetters_config_raw = request_json_with_retry(
        session,
        "get",
        FETTERS_CONFIG_URL,
    )
    if not isinstance(fetters_config_raw, list):
        raise ValueError("Unexpected PhantomFetter config payload; expected a list")
    print(f"  {len(fetters_config_raw)} config fetter entries")

    fetters_by_id: dict[int, dict] = {pick(f, "id", "Id"): f for f in fetters_raw}
    config_fetters_by_id: dict[int, dict] = {
        int(pick(f, "id", "Id")): f for f in fetters_config_raw
        if isinstance(f, dict) and pick(f, "id", "Id") is not None
    }

    output: list[dict] = []

    for group in groups_raw:
        group_id   = pick(group, "id", "Id")
        fetter_map = pick(group, "fetterMap", "FetterMap")   # e.g. {"2": 1, "5": 2} or {"3": 192}
        icon       = prepend_cdn(pick(group, "icon", "Icon", default=""))
        color      = pick(group, "fetterElementColor", "FetterElementColor", default="")
        name       = pick(group, "fetterGroupName", "FetterGroupName")

        # Smallest piece count is 2 for standard sets, 3 for 3-piece-only ones
        sorted_keys = sorted(fetter_map.keys(), key=int)
        piece_count_str = sorted_keys[0]
        fetter_id = fetter_map[piece_count_str]

        fetter = fetters_by_id.get(fetter_id)
        if not fetter:
            print(f"  WARNING: fetter id {fetter_id} not found for group {group_id}")
            continue

        piece_effects: dict[str, dict] = {}
        for key in sorted_keys:
            fid = fetter_map[key]
            tier_fetter = fetters_by_id.get(fid)
            if not tier_fetter:
                print(f"  WARNING: piece {key} fetter id {fid} missing for group {group_id}")
                continue
            tier_config_fetter = config_fetters_by_id.get(int(fid))
            piece_effects[key] = build_piece_effect(int(key), tier_fetter, tier_config_fetter)
            declared = display_bonuses_for(group_id, key)
            if declared:
                piece_effects[key]["displayBonuses"] = declared

        # Lore text is the same across tiers, so take the primary entry's
        lore = pick(fetter, "effectDefineDescription", "EffectDefineDescription", default={})
        primary_config_fetter = config_fetters_by_id.get(int(fetter_id))
        primary_effect = piece_effects.get(piece_count_str, build_piece_effect(int(piece_count_str), fetter, primary_config_fetter))

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
            "effectDescriptionParam": primary_effect["effectDescriptionParam"],
            "pieceEffects": piece_effects,
            "fetterIcon": prepend_cdn(pick(fetter, "fetterIcon", "FetterIcon", default="")),
            "effectDefineDescription": lore,
        }
        output.append(entry)

    output.sort(key=lambda e: e["id"])

    # A typo in DISPLAY_BONUSES would drop a clause silently and the panel would go back to under-reporting
    emitted = {
        (entry["id"], tier)
        for entry in output
        for tier, pe in entry["pieceEffects"].items()
        if pe.get("displayBonuses")
    }
    for group_id, declared in DISPLAY_BONUSES.items():
        for clause in declared:
            if (group_id, clause["tier"]) not in emitted:
                raise ValueError(
                    f"DISPLAY_BONUSES declares set {group_id} tier {clause['tier']} "
                    f"({clause['stat']}) but no such tier was built"
                )

    return output


def main():
    parser = argparse.ArgumentParser(description="Sync fetter data from Wuthery CDN")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing")
    parser.add_argument("--pretty",  action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    output = fetch_and_build()

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (",", ":"), "ensure_ascii": False}
    )

    if args.dry_run:
        print(json.dumps(output[:3], indent=2, ensure_ascii=False))
        print(f"\n(dry-run) {len(output)} groups, not written")
        return

    write_records_atomic(OUTPUT, output, **json_kwargs)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nWrote {OUTPUT} [{size_kb:.1f} KB], {len(output)} fetter groups")


if __name__ == "__main__":
    main()
