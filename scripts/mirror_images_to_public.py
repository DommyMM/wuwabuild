"""Mirror game-data images from Wuthery/Encore into public/assets/ as WebP, then repoint public/Data/*.json at them.

Covers the icon URLs in Characters/Weapons/Echoes/Fetters/Stats plus the UI chrome hardcoded in components and CSS.
Removes the runtime dependency on either upstream CDN staying reachable, see docs/data-pipeline.md.
Both upstreams mirror the game's resource tree, so local paths are host-agnostic and one asset is one file on disk.

Everything lands as .webp:

Encore sources are already WebP and pass through byte-for-byte.
Wuthery PNGs are converted locally at quality 90, which measured equal or better at similar or smaller sizes.
Encore's own encoder is rough on UI atlas art, which is why its WebP is not preferred outright.
A Wuthery URL that keeps failing falls back to Encore (GameData/UIResources <-> Game/Aki/UI/UIResources).

No manifest: presence under public/assets/ is what "already mirrored" means, so a re-run fetches only what is missing.
A partial mirror from failures or --limit never rewrites, the JSON waits until every reference is a file on disk.

Usage:
  py mirror_images_to_public.py             # Preview: counts + pending list, no network
  py mirror_images_to_public.py --apply     # Download missing + rewrite JSON when complete
  py mirror_images_to_public.py --apply --limit 20   # Partial fetch (rewrite deferred until complete)

Requires:
  pip install requests Pillow
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests
from PIL import Image

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from cdn_config import CDN_BASE, write_bytes_atomic, write_json_atomic  # noqa: E402

FRONTEND_DIR = SCRIPTS_DIR.parent
DATA_DIR = FRONTEND_DIR / "public" / "Data"
ASSETS_DIR = FRONTEND_DIR / "public" / "assets"
PUBLIC_PATH_PREFIX = "/assets"

ENCORE_RESOURCE_BASE = "https://api.encore.moe/resource/Data"
WEBP_QUALITY = 90

TARGET_FILES = ["Characters.json", "Weapons.json", "Echoes.json", "Fetters.json", "Stats.json"]

# UI-chrome images referenced straight from code (globals.css, components/forte/*, lib/paths.ts), not from the JSONs
# Those references point at the /assets/... path these produce, so keep both sides in sync when adding one
EXTRA_ASSETS = [
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillAHold.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillALockHold.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillANor.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillBNor.png",
    f"{CDN_BASE}/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png",
    f"{CDN_BASE}/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png",
    # Endstate Matrix score tiers in both sizes, where KingGold is the gold crown and KingColor the platinum one
    *[
        f"https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/UiActivity/Image/Activity32/MowingTower/ScoreLevel/ScoreLevel{size}/T_MowingTowerScore{size}{tier}.webp"
        for size in ("Larger", "Small")
        for tier in ("Empty", "B", "A", "S", "SS", "SSS", "KingGold", "KingColor")
    ],
]

# Only strings shaped like an image reference on a known host match, so descriptions and names are never touched
_ABSOLUTE_HOST_RE = re.compile(
    r"^https?://(?:files\.wuthery\.com|api\.encore\.moe)/.+\.(?:png|webp|jpe?g)$",
    re.IGNORECASE,
)
_RELATIVE_WUTHERY_RE = re.compile(r"^/d/.+\.(?:png|webp|jpe?g)$", re.IGNORECASE)
_LOCAL_ASSET_RE = re.compile(r"^/assets/.+\.webp$", re.IGNORECASE)
_IMAGE_SUFFIX_RE = re.compile(r"\.(?:png|webp|jpe?g)$", re.IGNORECASE)

# Frontend adapters derive some image paths at runtime by string replace instead of carrying a second URL field
# Those files never appear in the JSONs, so the mirror derives and fetches them the same way
# Only case so far is lib/character.ts adaptCDNCharacter turning iconRound's HeadCircle256 into the square Head256
DERIVED_VARIANTS = [(re.compile(r"HeadCircle256"), "Head256")]


def is_image_ref(value: str) -> bool:
    return bool(_ABSOLUTE_HOST_RE.match(value) or _RELATIVE_WUTHERY_RE.match(value))


def collect_image_refs(obj: Any, found: set[str], found_local: set[str]) -> None:
    if isinstance(obj, str):
        if is_image_ref(obj):
            found.add(obj)
        elif _LOCAL_ASSET_RE.match(obj):
            found_local.add(obj)
    elif isinstance(obj, dict):
        for value in obj.values():
            collect_image_refs(value, found, found_local)
    elif isinstance(obj, list):
        for value in obj:
            collect_image_refs(value, found, found_local)


def rewrite_image_refs(obj: Any, mapping: dict[str, str]) -> Any:
    if isinstance(obj, str):
        return mapping.get(obj, obj)
    if isinstance(obj, dict):
        return {k: rewrite_image_refs(v, mapping) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite_image_refs(v, mapping) for v in obj]
    return obj


def resolve_absolute(url: str) -> str:
    if url.startswith("/d/"):
        return f"{CDN_BASE}{url}"
    return url


def compute_key(absolute_url: str) -> str:
    """Normalize either host onto the game's own resource tree, so one asset is one file under /assets.

    Suffix is always .webp because every mirrored file is WebP
    Raises on an unrecognized path shape, so a new upstream tree gets added here deliberately
    """
    if absolute_url.startswith(CDN_BASE):
        path = absolute_url[len(CDN_BASE):].lstrip("/")
        # /d/ is Wuthery's raw tree, /p/ a processed variant of the same files
        for prefix in ("d/", "p/"):
            if path.startswith(prefix):
                path = path[len(prefix):]
                break
        marker = "GameData/"
    elif absolute_url.startswith(ENCORE_RESOURCE_BASE):
        path = absolute_url[len(ENCORE_RESOURCE_BASE):].lstrip("/")
        marker = "Game/Aki/UI/"
    else:
        raise ValueError(f"Unrecognized CDN host: {absolute_url!r}")
    if not path.startswith(marker):
        raise ValueError(f"Unexpected upstream path shape (extend compute_key): {absolute_url!r}")
    return _IMAGE_SUFFIX_RE.sub(".webp", path[len(marker):])


def local_path_for_key(key: str) -> Path:
    """Resolve a key below ASSETS_DIR, rejecting path traversal."""
    root = ASSETS_DIR.resolve()
    candidate = (root / key).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError(f"Unsafe key escapes assets directory: {key!r}")
    return candidate


def encore_fallback_url(absolute_url: str) -> str | None:
    """Encore's WebP mirror of the same UIResources path, the fallback when Wuthery will not serve a file."""
    marker = "GameData/UIResources/"
    if absolute_url.startswith(CDN_BASE) and marker in absolute_url:
        rest = absolute_url.split(marker, 1)[1]
        return f"{ENCORE_RESOURCE_BASE}/Game/Aki/UI/UIResources/{_IMAGE_SUFFIX_RE.sub('.webp', rest)}"
    return None


FETCH_ATTEMPTS = 4
RETRY_BACKOFF_SECONDS = 1.5


def _with_retry(fn):
    """Retry a fetch, because Wuthery throttles under concurrent load rather than failing cleanly.

    Evidence for the throttling is in docs/sync-sources.md
    A real 404 fails every attempt identically, so retrying only costs the backoff
    """
    last_error: Exception | None = None
    for attempt in range(FETCH_ATTEMPTS):
        try:
            return fn()
        except Exception as error:
            last_error = error
            if attempt + 1 < FETCH_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
    raise last_error


def _is_webp(data: bytes) -> bool:
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"


def to_webp(data: bytes) -> bytes:
    """Pass WebP through untouched, re-encode anything else at quality 90.

    Passing through avoids generational loss on Encore's already-WebP files
    Decoding doubles as an integrity check, since a truncated download or an HTML error body never decodes
    """
    if _is_webp(data):
        return data
    img = Image.open(io.BytesIO(data))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    out = io.BytesIO()
    img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    return out.getvalue()


def fetch_webp(session: requests.Session, absolute: str) -> bytes:
    def do_get(url: str):
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        return to_webp(resp.content)

    try:
        return _with_retry(lambda: do_get(absolute))
    except Exception:
        fallback = encore_fallback_url(absolute)
        if fallback is None:
            raise
        return _with_retry(lambda: do_get(fallback))


def mirror_one(session: requests.Session, original_url: str, absolute: str, local_path: Path) -> dict:
    data = fetch_webp(session, absolute)
    write_bytes_atomic(local_path, data)
    return {"url": original_url, "path": str(local_path), "bytes": len(data)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Mirror game-data images into public/assets/ as WebP")
    parser.add_argument("--apply", action="store_true", help="Download+rewrite; default is a no-network preview")
    parser.add_argument("--workers", type=int, default=12, help="Kept conservative — Wuthery throttles under concurrent load")
    parser.add_argument("--limit", type=int, default=None, help="Only fetch the first N not-yet-downloaded URLs")
    args = parser.parse_args()

    loaded: dict[str, Any] = {}
    all_refs: set[str] = set(EXTRA_ASSETS)
    local_refs: set[str] = set()
    for name in TARGET_FILES:
        path = DATA_DIR / name
        data = json.loads(path.read_text(encoding="utf-8"))
        loaded[name] = data
        collect_image_refs(data, all_refs, local_refs)

    # Derived variants ride along with their source ref in whichever form the JSON currently holds
    # Upstream URL derives an upstream URL, a rewritten /assets/ ref derives a local key plus a Wuthery source URL
    # So a re-run heals a missing derived file in either state
    for ref in sorted(all_refs):
        for pattern, replacement in DERIVED_VARIANTS:
            if pattern.search(ref):
                all_refs.add(pattern.sub(replacement, ref))
    derived_local: dict[str, str] = {}
    for ref in sorted(local_refs):
        for pattern, replacement in DERIVED_VARIANTS:
            if pattern.search(ref):
                key = pattern.sub(replacement, ref)[len(PUBLIC_PATH_PREFIX) + 1:]
                derived_local[key] = f"{CDN_BASE}/d/GameData/{_IMAGE_SUFFIX_RE.sub('.png', key)}"

    # Resolving key and local path up front serves as both the rewrite mapping and the on-disk resumability check
    ref_info = {}
    for url in all_refs:
        absolute = resolve_absolute(url)
        key = compute_key(absolute)
        ref_info[url] = {"absolute": absolute, "key": key, "local_path": local_path_for_key(key)}
    for key, upstream in derived_local.items():
        local_ref = f"{PUBLIC_PATH_PREFIX}/{key}"
        ref_info.setdefault(local_ref, {"absolute": upstream, "key": key, "local_path": local_path_for_key(key)})

    pending = sorted(url for url, info in ref_info.items() if not info["local_path"].exists())
    already = len(ref_info) - len(pending)
    if args.limit:
        pending = pending[: args.limit]

    print(
        f"{len(ref_info)} unique image references ({len(TARGET_FILES)} data files + {len(EXTRA_ASSETS)} UI-chrome assets + derived variants), "
        f"{already} already on disk, {len(pending)} selected to fetch this run"
    )

    if not args.apply:
        for url in pending[:20]:
            print(f"  pending: {url}")
        if len(pending) > 20:
            print(f"  ... and {len(pending) - 20} more")
        print("Preview only — nothing downloaded, no JSON rewritten. Re-run with --apply.")
        return 0

    session = requests.Session()
    failed: list[str] = []
    total_bytes = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(mirror_one, session, url, ref_info[url]["absolute"], ref_info[url]["local_path"]): url
            for url in pending
        }
        for i, future in enumerate(as_completed(futures), 1):
            url = futures[future]
            try:
                result = future.result()
                total_bytes += result["bytes"]
                print(f"  [{i}/{len(pending)}] OK   {url} ({result['bytes'] / 1024:.1f} KB)")
            except Exception as error:
                failed.append(url)
                print(f"  [{i}/{len(pending)}] FAIL {url} ({error})")

    print(f"\n{len(pending) - len(failed)} downloaded ({total_bytes / 1e6:.1f} MB), {len(failed)} failed")

    # Rewrite is gated on the whole mirror, not this run's batch, so --limit and failures never leave dead refs
    missing = sorted(url for url, info in ref_info.items() if not info["local_path"].exists())
    if missing:
        print(f"{len(missing)} references still unmirrored; JSON rewrite deferred until all are on disk.")
        for url in missing[:10]:
            print(f"  missing: {url}")
        return 1 if failed else 0

    full_mapping = {url: f"{PUBLIC_PATH_PREFIX}/{info['key']}" for url, info in ref_info.items()}
    for name in TARGET_FILES:
        rewritten = rewrite_image_refs(loaded[name], full_mapping)
        write_json_atomic(DATA_DIR / name, rewritten, separators=(",", ":"), ensure_ascii=False)
        print(f"  Rewrote {name}")

    print(f"\nDone: mirror complete, rewrote {len(TARGET_FILES)} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
