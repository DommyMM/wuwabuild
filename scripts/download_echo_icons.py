"""
Download echo icon templates from synced Echoes.json and save them to
backend/Data/Echoes/ using the CDN item id as the filename. Backend echo
templates are stored as WebP by default, even when the source URL is PNG.

Why IDs, not English names:
  - No special-character issues (colons, etc.) on any OS
  - Works identically on Windows (local dev) and Linux (Railway)
  - SIFT match returns the ID stem directly, backend returns it as echo id with no extra lookup
  - IDs are stable; names can theoretically change

First-time setup: clear the existing English-named templates before running.
  rm backend/Data/Echoes/*.{png,webp}   (or use --clean below)

Usage:
    python download_echo_icons.py              # Download/convert missing WebP templates only
    python download_echo_icons.py --force      # Re-download all (overwrite)
    python download_echo_icons.py --clean      # Delete old non-ID files, then download missing
    python download_echo_icons.py --dry-run    # Preview without downloading
"""

import json
import re
import argparse
import urllib.request
from urllib.parse import urlparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from cdn_config import CDN_BASE

try:
    import cv2
    import numpy as np
except ModuleNotFoundError:
    cv2 = None
    np = None

SCRIPTS_DIR = Path(__file__).resolve().parent
ECHOES_JSON = SCRIPTS_DIR.parent / "public" / "Data" / "Echoes.json"
ICONS_DIR   = SCRIPTS_DIR.parent.parent / "backend" / "Data" / "Echoes"
MAX_WORKERS = 16

_ID_RE = re.compile(r"^\d+$")  # pure numeric filename -> already an ID-named file
_SUPPORTED_EXTS = {".png", ".webp", ".jpg", ".jpeg"}
_WEBP_QUALITY = 95


def is_legacy_file(path: Path) -> bool:
    """True if this file uses an old English name rather than a numeric ID."""
    return not _ID_RE.match(path.stem)


def icon_url(raw_path: str) -> str:
    if raw_path.startswith(("http://", "https://")):
        return raw_path
    if raw_path.startswith("/d/"):
        return CDN_BASE + raw_path
    return CDN_BASE + raw_path


def icon_ext(raw_path: str) -> str:
    suffix = Path(urlparse(raw_path).path).suffix.lower()
    return suffix if suffix in _SUPPORTED_EXTS else ".png"


def existing_template(echo_id: str, preferred_ext: str | None = None) -> Path | None:
    if preferred_ext:
        path = ICONS_DIR / f"{echo_id}{preferred_ext}"
        if path.exists():
            return path
    for suffix in _SUPPORTED_EXTS:
        path = ICONS_DIR / f"{echo_id}{suffix}"
        if path.exists():
            return path
    return None


def encode_webp(raw: bytes, dest: Path) -> None:
    if cv2 is None or np is None:
        raise RuntimeError("cv2 and numpy are required to save echo templates as WebP")
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("could not decode downloaded image")
    if not cv2.imwrite(str(dest), img, [cv2.IMWRITE_WEBP_QUALITY, _WEBP_QUALITY]):
        raise RuntimeError("could not write WebP image")


def convert_existing_to_webp(existing: Path, dest: Path) -> None:
    if cv2 is None:
        raise RuntimeError("cv2 is required to convert existing echo templates to WebP")
    img = cv2.imread(str(existing), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"could not decode existing template: {existing.name}")
    if not cv2.imwrite(str(dest), img, [cv2.IMWRITE_WEBP_QUALITY, _WEBP_QUALITY]):
        raise RuntimeError(f"could not write WebP template: {dest.name}")


def download_icon(echo_id: str, icon_path: str, dest: Path, force: bool, output_format: str) -> tuple[str, str]:
    preferred_ext = ".webp" if output_format == "webp" else None
    existing_preferred = existing_template(echo_id, preferred_ext)
    existing_any = existing_template(echo_id)
    if existing_preferred and not force:
        return echo_id, "skipped"

    if output_format == "webp" and existing_any and existing_any.suffix.lower() != ".webp" and not force:
        try:
            convert_existing_to_webp(existing_any, dest)
            return echo_id, "converted"
        except Exception as e:
            return echo_id, f"ERROR: {e}"

    if existing_any and not force:
        return echo_id, "skipped"
    url = icon_url(icon_path)
    try:
        if force:
            for suffix in _SUPPORTED_EXTS:
                stale = ICONS_DIR / f"{echo_id}{suffix}"
                if stale.exists() and stale != dest:
                    stale.unlink()
        req = urllib.request.Request(url, headers={"User-Agent": "wuwabuilds-backend/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
        if output_format == "webp":
            encode_webp(raw, dest)
        else:
            dest.write_bytes(raw)
        return echo_id, "downloaded"
    except Exception as e:
        return echo_id, f"ERROR: {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download backend echo icon templates")
    parser.add_argument("--force",   action="store_true", help="Re-download even if file exists")
    parser.add_argument("--clean",   action="store_true", help="Delete old English-named files before downloading")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no downloads or deletes")
    parser.add_argument("--format", choices=("webp", "source"), default="webp", help="Saved template format")
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
        legacy = [
            p for p in ICONS_DIR.iterdir()
            if p.is_file() and p.suffix.lower() in _SUPPORTED_EXTS and is_legacy_file(p)
        ]
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
        suffix = ".webp" if args.format == "webp" else icon_ext(icon_rel)
        tasks.append((echo_id, icon_rel, ICONS_DIR / f"{echo_id}{suffix}"))

    if args.dry_run:
        preferred_ext = ".webp" if args.format == "webp" else None
        missing = sum(1 for echo_id, _, _ in tasks if not existing_template(echo_id, preferred_ext))
        print(f"\n[DRY RUN] {len(tasks)} echoes total, {missing} missing/convertible → {ICONS_DIR}")
        for echo_id, _, dest in tasks:
            if not existing_template(echo_id, preferred_ext):
                echo_name = next(e["name"]["en"] for e in echoes if str(e["id"]) == echo_id)
                print(f"  [missing] {dest.name}  ({echo_name})")
        return 0

    print(f"\nDownloading echo icons → {ICONS_DIR}  (force={args.force}, format={args.format})")
    downloaded = converted = skipped = errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(download_icon, echo_id, icon_rel, dest, args.force, args.format): echo_id
            for echo_id, icon_rel, dest in tasks
        }
        for future in as_completed(futures):
            echo_id, status = future.result()
            if status == "downloaded":
                downloaded += 1
                print(f"  ✓ {echo_id}")
            elif status == "converted":
                converted += 1
                print(f"  ↻ {echo_id}")
            elif status == "skipped":
                skipped += 1
            else:
                errors += 1
                print(f"  ✗ {echo_id}: {status}")

    print(f"\nDone: {downloaded} downloaded, {converted} converted, {skipped} skipped, {errors} errors")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    exit(main())
