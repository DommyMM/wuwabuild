"""
Sync everything the backend OCR server needs from frontend public/Data/ + Encore.

This is the single source of truth for the backend's Data/ directory. It does two things:

1. Transform the rich frontend public/Data/ JSONs into the simpler shapes the backend
   uses for OCR name matching (Characters/Weapons/Echoes.json), and copy the stat files.
2. Fetch every SIFT/template asset the backend matches against, all keyed by CDN id and
   saved as WebP:
     - Elements   -> backend/Data/Elements/<name>.webp   (Encore FetterGroup icons)
     - Characters -> backend/Data/Characters/<id>.webp    (Encore FormationRoleCard splash)
     - Weapons    -> backend/Data/Weapons/<id>.webp       (Encore weapon Icon)
     - Echoes     -> backend/Data/Echoes/<id>.webp        (public/Data icon URL, re-encoded)

Character/weapon SIFT templates load *.webp only (backend card.py _load_asset_features),
so those are written as WebP; echo/element load png+webp but we standardize on WebP too.
Character + weapon icons come from Encore because those are the exact images the live SIFT
templates were validated on; echo icons follow whatever source synced public/Data.

Run after the data syncs (or just use sync_all.py, which calls this). Per-asset
--skip-*-icons / --force-*-icons flags gate each template set.
"""

from pathlib import Path
import json
import shutil
import argparse
import urllib.request
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor

from cdn_config import CDN_BASE

try:
    import requests
except ImportError:
    requests = None

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

SCRIPTS_DIR = Path(__file__).resolve().parent
FRONTEND_DATA = SCRIPTS_DIR.parent / "public" / "Data"
BACKEND_DATA = SCRIPTS_DIR.parent.parent / "backend" / "Data"
BACKEND_ELEMENTS = BACKEND_DATA / "Elements"
BACKEND_CHARACTERS = BACKEND_DATA / "Characters"
BACKEND_WEAPONS = BACKEND_DATA / "Weapons"
BACKEND_ECHOES = BACKEND_DATA / "Echoes"

ENCORE_API = "https://api-v2.encore.moe/api/en"
ENCORE_ECHO_LIST_URL = f"{ENCORE_API}/echo"
UA = {"User-Agent": "wuwabuilds-backend-sync/1.0"}
ICON_WORKERS = 16
WEBP_QUALITY = 95

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


# --- Shared download helpers --------------------------------------------------

def _encore_json(url: str):
    if requests is None:
        raise RuntimeError("requests is required to fetch Encore data")
    resp = requests.get(url, headers=UA, timeout=45)
    resp.raise_for_status()
    return resp.json()


def _encore_rows(payload) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for value in payload.values():
            if isinstance(value, list):
                return value
    return []


def _download_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def _needs_reencode(url: str) -> bool:
    """A source URL that isn't already WebP (e.g. a Wuthery PNG fallback) must be
    decoded and re-encoded; Encore serves WebP, which we pass straight through."""
    return Path(urlparse(url).path).suffix.lower() != ".webp"


def _save_webp(raw: bytes, dest: Path, reencode: bool) -> None:
    """Write image bytes to dest as WebP.

    Encore icons are already WebP, so reencode=False writes the bytes straight through.
    A non-WebP source (Wuthery PNG fallback) needs reencode=True, which decodes and
    re-encodes via OpenCV.
    """
    if not reencode:
        dest.write_bytes(raw)
        return
    if cv2 is None or np is None:
        raise RuntimeError("cv2 + numpy required to re-encode non-WebP source to WebP")
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("could not decode downloaded image")
    if not cv2.imwrite(str(dest), img, [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY]):
        raise RuntimeError("could not write WebP")


def _download_icons(tasks: list[tuple[str, str, Path]], force: bool, reencode, label: str) -> int:
    """tasks = [(id, url, dest)]. Downloads missing (or all, if force). Returns count downloaded.

    reencode: True/False, or "auto" to decide per-URL by suffix (WebP passthrough,
    anything else re-encoded). "auto" lets echo icons take Encore WebP for free while
    still handling a Wuthery PNG source.
    """
    todo = [t for t in tasks if force or not t[2].exists()]
    skipped = len(tasks) - len(todo)
    if not todo:
        print(f"  {label}: all {len(tasks)} present, nothing to fetch")
        return 0

    def work(item):
        tid, url, dest = item
        re = _needs_reencode(url) if reencode == "auto" else reencode
        try:
            _save_webp(_download_bytes(url), dest, re)
            return tid, None
        except Exception as exc:  # noqa: BLE001
            return tid, str(exc)

    downloaded = errors = 0
    with ThreadPoolExecutor(max_workers=ICON_WORKERS) as pool:
        for tid, err in pool.map(work, todo):
            if err:
                errors += 1
                print(f"    x {tid}: {err}")
            else:
                downloaded += 1
    print(f"  {label}: {downloaded} downloaded, {skipped} skipped, {errors} errors")
    return downloaded


# --- Element templates (Encore FetterGroup icons) -----------------------------

def _encore_fetter_groups() -> dict[int, dict]:
    data = _encore_json(ENCORE_ECHO_LIST_URL)
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
        print(f"  Element icons: skipped; missing {BACKEND_ELEMENTS}")
        return 0
    groups = _encore_fetter_groups()
    tasks: list[tuple[str, str, Path]] = []
    missing: list[int] = []
    for group_id, backend_name in FETTER_MAP.items():
        group = groups.get(group_id)
        if not group:
            missing.append(group_id)
            continue
        url = group.get("Icon")
        suffix = Path(urlparse(url).path).suffix or ".webp"
        tasks.append((backend_name, url, BACKEND_ELEMENTS / f"{backend_name}{suffix}"))
    if missing:
        print(f"  WARNING: Encore did not return fetter group IDs: {missing}")
    if dry_run:
        n = sum(1 for _, _, d in tasks if force or not d.exists())
        print(f"  Element icons: {n}/{len(tasks)} to refresh -> {BACKEND_ELEMENTS}")
        return n
    # Element source URLs may be non-WebP; write through in their native suffix (the
    # element loader accepts png+webp). No re-encode to avoid a hard cv2 dependency here.
    return _download_icons(tasks, force, reencode=False, label="Element icons")


# --- Character / weapon / echo SIFT templates ---------------------------------

def sync_character_icons(dry_run: bool, force: bool) -> int:
    BACKEND_CHARACTERS.mkdir(parents=True, exist_ok=True)
    ids = [str(c.get("Id", "")).strip() for c in _encore_rows(_encore_json(f"{ENCORE_API}/character"))]
    ids = [i for i in ids if i]
    # Each splash URL is a per-character detail call, so resolve only the ids we need.
    needed = [i for i in ids if force or not (BACKEND_CHARACTERS / f"{i}.webp").exists()]
    if dry_run:
        print(f"  Character icons: {len(needed)}/{len(ids)} to fetch -> {BACKEND_CHARACTERS}")
        return len(needed)
    if not needed:
        print(f"  Character icons: all {len(ids)} present")
        return 0
    print(f"  Character icons: resolving {len(needed)} splash URLs from Encore...")

    def resolve(cid: str) -> tuple[str, str | None]:
        try:
            detail = _encore_json(f"{ENCORE_API}/character/{cid}")
            url = detail.get("FormationRoleCard") if isinstance(detail, dict) else None
            return cid, (url if isinstance(url, str) and url else None)
        except Exception:  # noqa: BLE001
            return cid, None

    tasks: list[tuple[str, str, Path]] = []
    missing_url: list[str] = []
    with ThreadPoolExecutor(max_workers=ICON_WORKERS) as pool:
        for cid, url in pool.map(resolve, needed):
            if url:
                tasks.append((cid, url, BACKEND_CHARACTERS / f"{cid}.webp"))
            else:
                missing_url.append(cid)
    if missing_url:
        print(f"    WARNING: no splash URL for ids: {missing_url}")
    return _download_icons(tasks, force, reencode=False, label="Character icons")


def sync_weapon_icons(dry_run: bool, force: bool) -> int:
    BACKEND_WEAPONS.mkdir(parents=True, exist_ok=True)
    rows = _encore_rows(_encore_json(f"{ENCORE_API}/weapon"))
    tasks: list[tuple[str, str, Path]] = []
    for weapon in rows:
        wid = str(weapon.get("Id", "")).strip()
        url = weapon.get("Icon")
        if wid and isinstance(url, str) and url:
            tasks.append((wid, url, BACKEND_WEAPONS / f"{wid}.webp"))
    if dry_run:
        n = sum(1 for _, _, d in tasks if force or not d.exists())
        print(f"  Weapon icons: {n}/{len(tasks)} to fetch -> {BACKEND_WEAPONS}")
        return n
    return _download_icons(tasks, force, reencode=False, label="Weapon icons")


def _echo_icon_url(raw: str) -> str:
    return raw if raw.startswith(("http://", "https://")) else CDN_BASE + raw


def sync_echo_icons(dry_run: bool, force: bool) -> int:
    BACKEND_ECHOES.mkdir(parents=True, exist_ok=True)
    echoes = json.loads((FRONTEND_DATA / "Echoes.json").read_text(encoding="utf-8"))
    tasks: list[tuple[str, str, Path]] = []
    for echo in echoes:
        eid = str(echo.get("id", "")).strip()
        raw = echo.get("icon")
        if eid and isinstance(raw, str) and raw:
            tasks.append((eid, _echo_icon_url(raw), BACKEND_ECHOES / f"{eid}.webp"))
    if dry_run:
        n = sum(1 for _, _, d in tasks if force or not d.exists())
        print(f"  Echo icons: {n}/{len(tasks)} to fetch -> {BACKEND_ECHOES}")
        return n
    # Encore icon URLs are WebP (passed through); only a non-WebP Wuthery fallback needs cv2.
    return _download_icons(tasks, force, reencode="auto", label="Echo icons")


# --- JSON transforms ----------------------------------------------------------

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
    parser = argparse.ArgumentParser(description="Sync backend Data/ (JSON + all SIFT/template assets)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    parser.add_argument("--skip-element-icons", action="store_true", help="Skip backend element template refresh")
    parser.add_argument("--force-element-icons", action="store_true", help="Refresh existing backend element templates")
    parser.add_argument("--skip-character-icons", action="store_true", help="Skip backend character splash templates")
    parser.add_argument("--force-character-icons", action="store_true", help="Refresh existing backend character templates")
    parser.add_argument("--skip-weapon-icons", action="store_true", help="Skip backend weapon icon templates")
    parser.add_argument("--force-weapon-icons", action="store_true", help="Refresh existing backend weapon templates")
    parser.add_argument("--skip-echo-icons", action="store_true", help="Skip backend echo icon templates")
    parser.add_argument("--force-echo-icons", action="store_true", help="Refresh existing backend echo templates")
    args = parser.parse_args()

    if not FRONTEND_DATA.exists():
        print(f"ERROR: Frontend data not found: {FRONTEND_DATA}")
        print("Run sync_all.py first to fetch data from CDN.")
        return 1
    if not BACKEND_DATA.exists():
        print(f"ERROR: Backend data directory not found: {BACKEND_DATA}")
        return 1

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Syncing backend Data/ from frontend public/Data/ + Encore")

    # 1. JSON shapes the backend matches names against.
    sync_characters(args.dry_run)
    sync_weapons(args.dry_run)
    sync_echoes(args.dry_run)
    copy_unchanged("EchoStats.json", args.dry_run)
    copy_unchanged("Stats.json", args.dry_run)

    # 2. SIFT/template assets (all id-keyed WebP).
    if not args.skip_element_icons:
        sync_element_templates(args.dry_run, args.force_element_icons)
    if not args.skip_character_icons:
        sync_character_icons(args.dry_run, args.force_character_icons)
    if not args.skip_weapon_icons:
        sync_weapon_icons(args.dry_run, args.force_weapon_icons)
    if not args.skip_echo_icons:
        sync_echo_icons(args.dry_run, args.force_echo_icons)

    print("Backend sync complete." if not args.dry_run else "Dry run complete, nothing written.")
    return 0


if __name__ == "__main__":
    exit(main())
