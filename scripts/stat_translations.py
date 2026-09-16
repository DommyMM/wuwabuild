"""Sync stat translations from Wuthery's PropertyIndexs.json into public/Data/Stats.json.

Entries are picked by exact CDN English name, in the order WANT_EN lists them.
HP%, ATK% and DEF% have no CDN entry, so each is derived by appending "%" to every translation of its base.
Each entry carries the PropertyIndexs icon URL, so the frontend needs no name→filename mapping.

Usage:
    python stat_translations.py            # Fetch and write Stats.json
    python stat_translations.py --dry-run  # Preview without writing
    python stat_translations.py --pretty   # Pretty-print output
"""

import json
import argparse
from pathlib import Path
from cdn_config import CDN_BASE, pick, request_json_with_retry, write_mapping_atomic

try:
    import requests
except ImportError:
    print("pip install requests")
    raise SystemExit(1)

PROPERTY_INDEXS_URL = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PropertyIndexs.json"

OUTPUT = Path(__file__).parent.parent / "public/Data/Stats.json"

LANGS = ["de", "en", "es", "fr", "id", "ja", "ko", "pt", "ru", "th", "vi", "uk", "zh-Hans", "zh-Hant"]

# Exact CDN Name.en values to pick, in output order
# HP, ATK and DEF get their % variant inserted immediately after them
WANT_EN = [
    "HP",
    "ATK",
    "DEF",
    "Crit. Rate",
    "Crit. DMG",
    "Energy Regen",
    "Aero DMG Bonus",
    "Glacio DMG Bonus",
    "Fusion DMG Bonus",
    "Electro DMG Bonus",
    "Havoc DMG Bonus",
    "Spectro DMG Bonus",
    "Healing Bonus",
    "Basic Attack DMG Bonus",
    "Heavy Attack DMG Bonus",
    "Resonance Skill DMG Bonus",
    "Resonance Liberation DMG Bonus",
]

# CDN English name → our output key, only where the two differ
# Anything not listed keeps the CDN English name as its key
EN_TO_KEY: dict[str, str] = {
    "Crit. Rate":         "Crit Rate",
    "Crit. DMG":          "Crit DMG",
    "Aero DMG Bonus":     "Aero DMG",
    "Glacio DMG Bonus":   "Glacio DMG",
    "Fusion DMG Bonus":   "Fusion DMG",
    "Electro DMG Bonus":  "Electro DMG",
    "Havoc DMG Bonus":    "Havoc DMG",
    "Spectro DMG Bonus":  "Spectro DMG",
}

# Base stat output key → the percent stat derived from it and emitted right after it
PCT_AFTER: dict[str, str] = {
    "HP":   "HP%",
    "ATK":  "ATK%",
    "DEF":  "DEF%",
}


def get_icon_url(entry: dict) -> str:
    """Return full CDN icon URL from a PropertyIndexs entry, or empty string."""
    icon = pick(entry, "icon", "Icon", default="") or ""
    return f"{CDN_BASE}{icon}" if icon.startswith("/d/") else ""


def derive_percent(base_i18n: dict) -> dict:
    """Append '%' to each non-empty translation, leaving empty strings empty.

    Callers merge the 'icon' key in afterwards, so it never reaches here
    """
    return {lang: (val + "%" if val else "") for lang, val in base_i18n.items()}


def main():
    parser = argparse.ArgumentParser(description="Sync stat translations from Wuthery CDN")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing")
    parser.add_argument("--pretty",  action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    session = requests.Session()

    print("Fetching PropertyIndexs.json ...")
    props_raw = request_json_with_retry(session, "get", PROPERTY_INDEXS_URL)
    if not isinstance(props_raw, list):
        raise ValueError("Unexpected PropertyIndexs payload; expected a list")
    print(f"  {len(props_raw)} property entries")

    # Index by Name.en, prefer IsShow=True entries when names collide (e.g. HP appears twice)
    by_en: dict[str, dict] = {}
    for p in props_raw:
        en = (pick(p, "name", "Name", default={}) or {}).get("en", "")
        if not en:
            continue
        if en not in by_en or pick(p, "isShow", "IsShow", default=False):
            by_en[en] = p

    # Build ordered output, inserting % variants right after their base
    output: dict[str, dict] = {}
    for en_name in WANT_EN:
        our_key = EN_TO_KEY.get(en_name, en_name)
        entry = by_en.get(en_name)
        if not entry:
            print(f"  WARNING: '{en_name}' not found in PropertyIndexs")
            continue

        # Translations only, derive_percent must not see the icon key
        i18n = {lang: (pick(entry, "name", "Name", default={}) or {}).get(lang, "") for lang in LANGS}

        icon_url = get_icon_url(entry)

        output[our_key] = {**i18n, **({"icon": icon_url} if icon_url else {})}

        # % variant goes immediately after its base and shares its icon
        pct_key = PCT_AFTER.get(our_key)
        if pct_key:
            pct_i18n = derive_percent(i18n)
            output[pct_key] = {**pct_i18n, **({"icon": icon_url} if icon_url else {})}

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (",", ":"), "ensure_ascii": False}
    )

    if args.dry_run:
        print(json.dumps(dict(list(output.items())[:3]), indent=2, ensure_ascii=False))
        print(f"\n(dry-run) {len(output)} stats, not written")
        return

    write_mapping_atomic(OUTPUT, output, **json_kwargs)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nWrote {OUTPUT} [{size_kb:.1f} KB], {len(output)} stat entries")


if __name__ == "__main__":
    main()
