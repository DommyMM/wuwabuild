"""
Download echo icon PNGs from Wuthery CDN and save them to backend/Data/Echoes/
using the CDN id as the filename (e.g. 60000425.png).

Why IDs, not English names:
  - No special-character issues (colons, etc.) on any OS
  - Works identically on Windows (local dev) and Linux (Railway)
  - SIFT match returns the ID stem directly, backend returns it as echo id with no extra lookup
  - IDs are stable; names can theoretically change

First-time setup: clear the existing English-named templates before running.
  rm backend/Data/Echoes/*.png   (or use --clean below)

Usage:
    python download_echo_icons.py              # Download missing only
    python download_echo_icons.py --force      # Re-download all (overwrite)
    python download_echo_icons.py --clean      # Delete old non-ID files, then download missing
    python download_echo_icons.py --dry-run    # Preview without downloading
"""

import json
import re
import argparse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPTS_DIR = Path(__file__).resolve().parent
ECHOES_JSON = SCRIPTS_DIR.parent / "public" / "Data" / "Echoes.json"
ICONS_DIR   = SCRIPTS_DIR.parent.parent / "backend" / "Data" / "Echoes"
CDN_BASE    = "https://files.wuthery.com"
MAX_WORKERS = 16

_ID_RE = re.compile(r"^\d+$")  # pure numeric filename → already an ID-named file


def is_legacy_file(path: Path) -> bool:
    """True if this file uses an old English name rather than a numeric ID."""
    return not _ID_RE.match(path.stem)


def download_icon(echo_id: str, icon_path: str, dest: Path, force: bool) -> tuple[str, str]:
    if dest.exists() and not force:
        return echo_id, "skipped"
    url = CDN_BASE + icon_path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "wuwabuilds-backend/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            dest.write_bytes(resp.read())
        return echo_id, "downloaded"
    except Exception as e:
        return echo_id, f"ERROR: {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download echo icon PNGs from Wuthery CDN")
    parser.add_argument("--force",   action="store_true", help="Re-download even if file exists")
    parser.add_argument("--clean",   action="store_true", help="Delete old English-named files before downloading")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no downloads or deletes")
    args = parser.parse_args()

    if not ECHOES_JSON.exists():
        print(f"ERROR: {ECHOES_JSON} not found, run sync_echoes.py --fetch first")
        return 1
    if not ICONS_DIR.exists():
        print(f"ERROR: {ICONS_DIR} not found")
        return 1

    echoes = json.loads(ECHOES_JSON.read_text(encoding="utf-8"))

    # Optionally remove old English-named files
    if args.clean or args.dry_run:
        legacy = [p for p in ICONS_DIR.glob("*.png") if is_legacy_file(p)]
        if legacy:
            print(f"{'[DRY RUN] ' if args.dry_run else ''}Removing {len(legacy)} legacy English-named templates:")
            for p in legacy:
                print(f"  {'would delete' if args.dry_run else 'deleting'}: {p.name}")
                if not args.dry_run:
                    p.unlink()
        else:
            print("No legacy English-named templates found.")

    tasks: list[tuple[str, str, Path]] = []
    for echo in echoes:
        echo_id  = str(echo["id"])
        icon_rel = echo.get("icon", "")
        if not icon_rel:
            print(f"  WARNING: No icon path for id={echo_id} ({echo['name']['en']!r}), skipping")
            continue
        tasks.append((echo_id, icon_rel, ICONS_DIR / f"{echo_id}.png"))

    if args.dry_run:
        missing = sum(1 for _, _, dest in tasks if not dest.exists())
        print(f"\n[DRY RUN] {len(tasks)} echoes total, {missing} missing → {ICONS_DIR}")
        for echo_id, _, dest in tasks:
            if not dest.exists():
                echo_name = next(e["name"]["en"] for e in echoes if str(e["id"]) == echo_id)
                print(f"  [missing] {dest.name}  ({echo_name})")
        return 0

    print(f"\nDownloading echo icons → {ICONS_DIR}  (force={args.force})")
    downloaded = skipped = errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(download_icon, echo_id, icon_rel, dest, args.force): echo_id
            for echo_id, icon_rel, dest in tasks
        }
        for future in as_completed(futures):
            echo_id, status = future.result()
            if status == "downloaded":
                downloaded += 1
                print(f"  ✓ {echo_id}")
            elif status == "skipped":
                skipped += 1
            else:
                errors += 1
                print(f"  ✗ {echo_id}: {status}")

    print(f"\nDone: {downloaded} downloaded, {skipped} skipped, {errors} errors")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    exit(main())
