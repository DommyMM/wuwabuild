"""
Transform frontend public/Data/ JSONs into the simpler format needed by the backend OCR server.

Reads already-synced data from ../public/Data/ and writes to ../../backend/Data/.
Run this after sync_all.py (or just use sync_all.py which calls this automatically).

The backend only needs English names + minimal metadata for OCR name matching.
The frontend holds the full rich dataset — we just extract what the backend needs.
"""

from pathlib import Path
import json
import shutil
import argparse

SCRIPTS_DIR = Path(__file__).resolve().parent
FRONTEND_DATA = SCRIPTS_DIR.parent / "public" / "Data"
BACKEND_DATA = SCRIPTS_DIR.parent.parent / "backend" / "Data"

# Maps echo fetter IDs (raw numbers in Echoes.json) → sonata set names (backend format)
FETTER_MAP: dict[int, str] = {
    1: "Glacio",       2: "Fusion",       3: "Electro",      4: "Aero",
    5: "Spectro",      6: "Havoc",        7: "Healing",      8: "ER",
    9: "Attack",       10: "Frosty",      11: "Radiance",    12: "Midnight",
    13: "Empyrean",    14: "Tidebreaking", 16: "Gust",       17: "Windward",
    18: "Flaming",     19: "Dream",       20: "Crown",       21: "Law",
    22: "Flamewing",   23: "Thread",      24: "Pact",        25: "Halo",
    26: "Rite",        27: "Trailblazing", 28: "Chromatic",  29: "Sound",
}


def sync_characters(dry_run: bool) -> int:
    data = json.loads((FRONTEND_DATA / "Characters.json").read_text(encoding="utf-8"))
    out = []
    for char in data:
        out.append({
            "name": char["name"]["en"],
            "id": str(char.get("legacyId", char["id"])),
            "element": char["element"]["name"]["en"],
            "weaponType": char["weapon"]["name"]["en"],
        })
    if not dry_run:
        (BACKEND_DATA / "Characters.json").write_text(
            json.dumps(out, ensure_ascii=False), encoding="utf-8"
        )
    print(f"  Characters: {len(out)} entries")
    return len(out)


def sync_weapons(dry_run: bool) -> int:
    data = json.loads((FRONTEND_DATA / "Weapons.json").read_text(encoding="utf-8"))
    grouped: dict[str, list] = {}
    for weapon in data:
        type_en = weapon["type"]["name"]["en"]
        # Normalize to backend plural key: "Rectifier" → "Rectifiers", "Gauntlets" stays
        key = type_en if type_en.endswith("s") else type_en + "s"
        grouped.setdefault(key, []).append({
            "name": weapon["name"]["en"],
            "id": str(weapon["id"]),
        })
    if not dry_run:
        (BACKEND_DATA / "Weapons.json").write_text(
            json.dumps(grouped, ensure_ascii=False), encoding="utf-8"
        )
    total = sum(len(v) for v in grouped.values())
    print(f"  Weapons: {total} entries across {len(grouped)} types ({list(grouped.keys())})")
    return total


def sync_echoes(dry_run: bool) -> int:
    data = json.loads((FRONTEND_DATA / "Echoes.json").read_text(encoding="utf-8"))
    out = []
    for echo in data:
        elements = [FETTER_MAP[fid] for fid in echo.get("fetter", []) if fid in FETTER_MAP]
        out.append({
            "name": echo["name"]["en"],
            "id": str(echo["id"]),  # Always CDN ID — matches what _load_from_cdn uses
            "cost": echo["cost"],
            "elements": elements,
        })
    if not dry_run:
        (BACKEND_DATA / "Echoes.json").write_text(
            json.dumps(out, ensure_ascii=False), encoding="utf-8"
        )
    print(f"  Echoes: {len(out)} entries")
    return len(out)


def copy_unchanged(filename: str, dry_run: bool) -> None:
    src = FRONTEND_DATA / filename
    if not dry_run:
        shutil.copy2(src, BACKEND_DATA / filename)
    print(f"  {filename}: copied unchanged")


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync backend Data/ from frontend public/Data/")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    args = parser.parse_args()

    if not FRONTEND_DATA.exists():
        print(f"ERROR: Frontend data not found: {FRONTEND_DATA}")
        print("Run sync_all.py first to fetch data from CDN.")
        return 1
    if not BACKEND_DATA.exists():
        print(f"ERROR: Backend data directory not found: {BACKEND_DATA}")
        return 1

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Syncing backend Data/ from frontend public/Data/")
    sync_characters(args.dry_run)
    sync_weapons(args.dry_run)
    sync_echoes(args.dry_run)
    copy_unchanged("Mainstat.json", args.dry_run)
    copy_unchanged("Substats.json", args.dry_run)
    print("Backend sync complete." if not args.dry_run else "Dry run complete — nothing written.")
    return 0


if __name__ == "__main__":
    exit(main())
