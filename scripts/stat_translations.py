"""
Sync stat translations from Wuthery CDN PropertyIndexs.json to public/Data/Stats.json.

Fetches PropertyIndexs.json and picks out the stats used in Mainstat.json and Substats.json by their exact CDN English name.

HP%, ATK%, DEF% are not separate entries so they're derived by
appending "%" to each translation of their base stat (HP / ATK / DEF).

Usage:
    python stat_translations.py            # Fetch and write Stats.json
    python stat_translations.py --dry-run  # Preview without writing
    python stat_translations.py --pretty   # Pretty-print output
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
PROPERTY_INDEXS_URL = f"{CDN_BASE}/d/GameData/Grouped/LocalizationIndex/PropertyIndexs.json"

OUTPUT = Path(__file__).parent.parent / "public/Data/Stats.json"

LANGS = ["de", "en", "es", "fr", "id", "ja", "ko", "pt", "ru", "th", "vi", "uk", "zh-Hans", "zh-Hant"]

# Exact CDN Name.en values to pick, in output order.
# HP/ATK/DEF will have their % variants inserted immediately after them.
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

# CDN English name → our output key, only where they differ.
# Stats not listed here keep the CDN English name as their key.
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

# Percentage stats — derived from base, inserted into output right after base.
# key = base stat output key, value = pct stat output key
PCT_AFTER: dict[str, str] = {
    "HP":   "HP%",
    "ATK":  "ATK%",
    "DEF":  "DEF%",
}


def derive_percent(base_i18n: dict) -> dict:
    """Append '%' to each non-empty translation; leave empty strings empty."""
    return {lang: (val + "%" if val else "") for lang, val in base_i18n.items()}


def main():
    parser = argparse.ArgumentParser(description="Sync stat translations from Wuthery CDN")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing")
    parser.add_argument("--pretty",  action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    session = requests.Session()

    print("Fetching PropertyIndexs.json ...")
    props_raw: list[dict] = session.get(PROPERTY_INDEXS_URL, timeout=30).json()
    print(f"  {len(props_raw)} property entries")

    # Index by Name.en — prefer IsShow=True entries when names collide (e.g. HP appears twice)
    by_en: dict[str, dict] = {}
    for p in props_raw:
        en = p.get("Name", {}).get("en", "")
        if not en:
            continue
        if en not in by_en or p.get("IsShow", False):
            by_en[en] = p

    # Build ordered output, inserting % variants right after their base
    output: dict[str, dict] = {}
    for en_name in WANT_EN:
        our_key = EN_TO_KEY.get(en_name, en_name)
        entry = by_en.get(en_name)
        if not entry:
            print(f"  WARNING: '{en_name}' not found in PropertyIndexs")
            continue
        i18n = {lang: entry["Name"].get(lang, "") for lang in LANGS}
        output[our_key] = i18n
        # Insert % variant immediately after if applicable
        pct_key = PCT_AFTER.get(our_key)
        if pct_key:
            output[pct_key] = derive_percent(i18n)

    json_kwargs = (
        {"indent": 2, "ensure_ascii": False}
        if args.pretty
        else {"separators": (",", ":"), "ensure_ascii": False}
    )

    if args.dry_run:
        print(json.dumps(dict(list(output.items())[:3]), indent=2, ensure_ascii=False))
        print(f"\n(dry-run) {len(output)} stats — not written")
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, **json_kwargs)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nWrote {OUTPUT} [{size_kb:.1f} KB] — {len(output)} stat entries")


if __name__ == "__main__":
    main()
