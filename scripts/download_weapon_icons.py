"""
Download weapon icon PNGs from Wuthery CDN and save them to
backend/Data/Weapons/ using the weapon id as the filename
(e.g. 21010013.png).

Why IDs, not English names:
  - No special-character issues on any OS
  - Works identically on Windows (local dev) and Linux (Railway)
  - SIFT match returns the ID stem directly, backend returns it as
    weapon id with no extra lookup
  - IDs are stable; names can theoretically change

Source field: `icon.iconMiddle` (160px). Big enough for stable SIFT
keypoints, small enough that 117 PNGs stay light in RAM.

Usage:
    python download_weapon_icons.py              # Download missing only
    python download_weapon_icons.py --force      # Re-download all
    python download_weapon_icons.py --dry-run    # Preview only
"""

import json
import argparse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from cdn_config import CDN_BASE

SCRIPTS_DIR   = Path(__file__).resolve().parent
WEAPONS_JSON  = SCRIPTS_DIR.parent / "public" / "Data" / "Weapons.json"
ICONS_DIR     = SCRIPTS_DIR.parent.parent / "backend" / "Data" / "Weapons"
MAX_WORKERS   = 16

# Field preference order — fall back if the preferred field is missing.
ICON_FIELD_PREFERENCE = ["iconMiddle", "icon", "iconSmall"]


def _resolve_icon_url(weapon: dict) -> str | None:
    icon = weapon.get("icon") or {}
    if not isinstance(icon, dict):
        return None
    for field in ICON_FIELD_PREFERENCE:
        url = icon.get(field)
        if isinstance(url, str) and url:
            return url if url.startswith("http") else CDN_BASE + url
    return None


def download_icon(weapon_id: str, url: str, dest: Path, force: bool) -> tuple[str, str]:
    if dest.exists() and not force:
        return weapon_id, "skipped"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "wuwabuilds-backend/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            dest.write_bytes(resp.read())
        return weapon_id, "downloaded"
    except Exception as e:
        return weapon_id, f"ERROR: {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download weapon icons from Wuthery CDN")
    parser.add_argument("--force",   action="store_true", help="Re-download even if file exists")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no downloads")
    args = parser.parse_args()

    if not WEAPONS_JSON.exists():
        print(f"ERROR: {WEAPONS_JSON} not found, run sync_weapons.py --fetch first")
        return 1
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    weapons = json.loads(WEAPONS_JSON.read_text(encoding="utf-8"))

    tasks: list[tuple[str, str, Path]] = []
    missing_icon: list[str] = []
    for weapon in weapons:
        weapon_id = str(weapon.get("id", "")).strip()
        if not weapon_id:
            continue
        url = _resolve_icon_url(weapon)
        if not url:
            name = (weapon.get("name") or {}).get("en", weapon_id)
            missing_icon.append(f"{weapon_id} ({name})")
            continue
        tasks.append((weapon_id, url, ICONS_DIR / f"{weapon_id}.png"))

    if missing_icon:
        print(f"WARNING: {len(missing_icon)} weapons have no usable icon URL: {missing_icon}")

    if args.dry_run:
        missing = sum(1 for _, _, dest in tasks if not dest.exists())
        print(f"\n[DRY RUN] {len(tasks)} weapons total, {missing} missing → {ICONS_DIR}")
        for weapon_id, url, dest in tasks:
            if not dest.exists():
                print(f"  [missing] {dest.name}  ← {url}")
        return 0

    print(f"\nDownloading weapon icons → {ICONS_DIR}  (force={args.force})")
    downloaded = skipped = errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(download_icon, weapon_id, url, dest, args.force): weapon_id
            for weapon_id, url, dest in tasks
        }
        for future in as_completed(futures):
            weapon_id, status = future.result()
            if status == "downloaded":
                downloaded += 1
                print(f"  ✓ {weapon_id}")
            elif status == "skipped":
                skipped += 1
            else:
                errors += 1
                print(f"  ✗ {weapon_id}: {status}")

    print(f"\nDone: {downloaded} downloaded, {skipped} skipped, {errors} errors")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    exit(main())
