"""
Transform frontend public/Data/ JSONs into the simpler format needed by the backend OCR server.

Reads already-synced data from ../public/Data/ and writes to ../../backend/Data/.
Run this after sync_all.py (or just use sync_all.py which calls this automatically).

The backend only needs English names + minimal metadata for OCR name matching.
The frontend holds the full rich dataset and we just extract what the backend needs.
"""

from pathlib import Path
import json
import shutil
import argparse
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    requests = None

SCRIPTS_DIR = Path(__file__).resolve().parent
FRONTEND_DATA = SCRIPTS_DIR.parent / "public" / "Data"
BACKEND_DATA = SCRIPTS_DIR.parent.parent / "backend" / "Data"
BACKEND_ELEMENTS = BACKEND_DATA / "Elements"
ENCORE_ECHO_LIST_URL = "https://api-v2.encore.moe/api/en/echo"

# Maps echo fetter IDs (raw numbers in Echoes.json) → sonata set names (backend format)
FETTER_MAP: dict[int, str] = {
    1: "Glacio",       2: "Fusion",       3: "Electro",      4: "Aero",
    5: "Spectro",      6: "Havoc",        7: "Healing",      8: "ER",
    9: "Attack",       10: "Frosty",      11: "Radiance",    12: "Midnight",
    13: "Empyrean",    14: "Tidebreaking", 16: "Gust",       17: "Windward",
    18: "Flaming",     19: "Dream",       20: "Crown",       21: "Law",
    22: "Flamewing",   23: "Thread",      24: "Pact",        25: "Halo",
    26: "Rite",        27: "Trailblazing", 28: "Chromatic",  29: "Sound",
    30: "QuietSnow",   31: "Memories",    32: "Adam",
}


def _encore_fetter_groups() -> dict[int, dict]:
    if requests is None:
        raise RuntimeError("requests is required to refresh Encore element templates")
    session = requests.Session()
    session.headers.update({"User-Agent": "wuwabuilds-backend-sync/1.0"})
    resp = session.get(ENCORE_ECHO_LIST_URL, timeout=45)
    resp.raise_for_status()
    data = resp.json()
    rows = data.get("Echo") if isinstance(data, dict) else data
    groups: dict[int, dict] = {}
    for echo in rows or []:
        for group in echo.get("FetterGroups") or []:
            group_id = group.get("Id")
            icon = group.get("Icon")
            if isinstance(group_id, int) and isinstance(icon, str) and icon:
                groups.setdefault(group_id, group)
    return groups


def sync_element_templates(dry_run: bool, force: bool) -> int:
    if not BACKEND_ELEMENTS.exists():
        print(f"  Element templates: skipped; missing {BACKEND_ELEMENTS}")
        return 0
    groups = _encore_fetter_groups()
    downloaded = 0
    missing: list[int] = []
    session = requests.Session()
    session.headers.update({"User-Agent": "wuwabuilds-backend-sync/1.0"})

    for group_id, backend_name in FETTER_MAP.items():
        group = groups.get(group_id)
        if not group:
            missing.append(group_id)
            continue
        url = group.get("Icon")
        suffix = Path(urlparse(url).path).suffix or ".webp"
        dest = BACKEND_ELEMENTS / f"{backend_name}{suffix}"
        if dest.exists() and not force:
            continue
        if dry_run:
            print(f"  Element template: would fetch {backend_name} <- {url}")
            downloaded += 1
            continue
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        downloaded += 1
        print(f"  Element template: {backend_name}{suffix}")

    if missing:
        print(f"  WARNING: Encore did not return fetter group IDs: {missing}")
    print(f"  Element templates: {downloaded} {'would be refreshed' if dry_run else 'refreshed'} from Encore")
    return downloaded

def sync_characters(dry_run: bool) -> int:
    data = json.loads((FRONTEND_DATA / "Characters.json").read_text(encoding="utf-8"))
    out = []
    for char in data:
        out.append({
            "name": char["name"]["en"],
            # Canonical backend/runtime ID is CDN character id.
            "id": str(char["id"]),
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
        # Keep raw CDN/frontend weapon type name (no legacy plural remapping).
        key = type_en
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
        echo_id = str(echo["id"])
        elements = [FETTER_MAP[fid] for fid in echo.get("fetter", []) if fid in FETTER_MAP]
        out.append({
            "name": echo["name"].get("en") or echo_id,
            "id": echo_id,  # Always CDN ID, match what _load_from_cdn uses
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
    parser.add_argument("--skip-element-icons", action="store_true", help="Skip backend element template refresh from Encore")
    parser.add_argument("--force-element-icons", action="store_true", help="Refresh existing backend element templates")
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
    copy_unchanged("EchoStats.json", args.dry_run)
    if not args.skip_element_icons:
        sync_element_templates(args.dry_run, args.force_element_icons)
    print("Backend sync complete." if not args.dry_run else "Dry run complete, nothing written.")
    return 0


if __name__ == "__main__":
    exit(main())
