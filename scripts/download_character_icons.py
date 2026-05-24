"""
Download character splash-art PNGs from Wuthery CDN and save them to
backend/Data/Characters/ using the character id as the filename
(e.g. 1108.png for Hiyuki).

Why IDs, not English names:
  - No special-character issues (colons, etc.) on any OS
  - Works identically on Windows (local dev) and Linux (Railway)
  - SIFT match returns the ID stem directly, backend returns it as
    character id with no extra lookup
  - IDs are stable; names can theoretically change

Source field: `icon.banner` (the `T_IconRole_Pile_*_UI.png` splash art the
in-game build card renders behind the character name).

Usage:
    python download_character_icons.py              # Download missing only
    python download_character_icons.py --force      # Re-download all
    python download_character_icons.py --dry-run    # Preview only
"""

import json
import argparse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from cdn_config import CDN_BASE

SCRIPTS_DIR  = Path(__file__).resolve().parent
CHARS_JSON   = SCRIPTS_DIR.parent / "public" / "Data" / "Characters.json"
ICONS_DIR    = SCRIPTS_DIR.parent.parent / "backend" / "Data" / "Characters"
MAX_WORKERS  = 16


def _resolve_banner_url(char: dict) -> str | None:
    icon = char.get("icon") or {}
    banner = icon.get("banner") if isinstance(icon, dict) else None
    if isinstance(banner, str) and banner:
        return banner if banner.startswith("http") else CDN_BASE + banner
    return None


def download_icon(char_id: str, url: str, dest: Path, force: bool) -> tuple[str, str]:
    if dest.exists() and not force:
        return char_id, "skipped"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "wuwabuilds-backend/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            dest.write_bytes(resp.read())
        return char_id, "downloaded"
    except Exception as e:
        return char_id, f"ERROR: {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download character splash icons from Wuthery CDN")
    parser.add_argument("--force",   action="store_true", help="Re-download even if file exists")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no downloads")
    args = parser.parse_args()

    if not CHARS_JSON.exists():
        print(f"ERROR: {CHARS_JSON} not found, run sync_characters.py --fetch first")
        return 1
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    characters = json.loads(CHARS_JSON.read_text(encoding="utf-8"))

    tasks: list[tuple[str, str, Path]] = []
    missing_banner: list[str] = []
    for char in characters:
        char_id = str(char.get("id", "")).strip()
        if not char_id:
            continue
        url = _resolve_banner_url(char)
        if not url:
            name = (char.get("name") or {}).get("en", char_id)
            missing_banner.append(f"{char_id} ({name})")
            continue
        tasks.append((char_id, url, ICONS_DIR / f"{char_id}.png"))

    if missing_banner:
        print(f"WARNING: {len(missing_banner)} characters have no banner URL: {missing_banner}")

    if args.dry_run:
        missing = sum(1 for _, _, dest in tasks if not dest.exists())
        print(f"\n[DRY RUN] {len(tasks)} characters total, {missing} missing → {ICONS_DIR}")
        for char_id, url, dest in tasks:
            if not dest.exists():
                print(f"  [missing] {dest.name}  ← {url}")
        return 0

    print(f"\nDownloading character splash icons → {ICONS_DIR}  (force={args.force})")
    downloaded = skipped = errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(download_icon, char_id, url, dest, args.force): char_id
            for char_id, url, dest in tasks
        }
        for future in as_completed(futures):
            char_id, status = future.result()
            if status == "downloaded":
                downloaded += 1
                print(f"  ✓ {char_id}")
            elif status == "skipped":
                skipped += 1
            else:
                errors += 1
                print(f"  ✗ {char_id}: {status}")

    print(f"\nDone: {downloaded} downloaded, {skipped} skipped, {errors} errors")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    exit(main())
