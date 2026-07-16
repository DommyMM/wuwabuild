"""
Mirror game-data images (Characters/Weapons/Echoes/Fetters/Stats icon URLs,
plus the UI-chrome assets hardcoded in components/CSS) from Wuthery/Encore
into public/assets/ as WebP, then rewrite public/Data/*.json to point at the
local, site-relative path instead. Removes the runtime dependency on either
upstream CDN being reachable — see docs/data-pipeline.md.

Local paths are host-agnostic: both upstreams mirror the game's own resource
tree, so /assets/UIResources/... is the game path, and the same asset
referenced from both hosts dedupes to one file on disk.

Everything lands as .webp:
  - Encore sources are already WebP and pass through byte-for-byte.
  - Wuthery PNGs are converted locally at quality 90. Measured against the
    same files: equal-or-better visible quality than Encore's own WebP
    (their encoder is rough on UI atlas art) at similar-or-smaller sizes.
  - A Wuthery URL that keeps failing after retries falls back to Encore's
    mirror of the same path (GameData/UIResources <-> Game/Aki/UI/UIResources).

No manifest needed: a file already present under public/assets/ *is*
"already mirrored," so re-runs (including after a fresh sync pass
reintroduces upstream URLs) only download what's missing. The JSON rewrite
only happens once EVERY reference resolves to a file on disk — a partial
mirror (failed downloads, --limit) never rewrites.

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

# UI-chrome images referenced directly from code rather than the data JSONs.
# The code references (globals.css, components/forte/*, lib/paths.ts) point at
# the /assets/... path these produce; keep both sides in sync when adding one.
EXTRA_ASSETS = [
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillAHold.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillALockHold.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillANor.png",
    f"{CDN_BASE}/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillBNor.png",
    f"{CDN_BASE}/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png",
    f"{CDN_BASE}/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png",
]

# Only strings shaped like an image reference on a known host are ever
# touched — text fields (descriptions, names) never match these.
_ABSOLUTE_HOST_RE = re.compile(
    r"^https?://(?:files\.wuthery\.com|api\.encore\.moe)/.+\.(?:png|webp|jpe?g)$",
    re.IGNORECASE,
)
_RELATIVE_WUTHERY_RE = re.compile(r"^/d/.+\.(?:png|webp|jpe?g)$", re.IGNORECASE)
_LOCAL_ASSET_RE = re.compile(r"^/assets/.+\.webp$", re.IGNORECASE)
_IMAGE_SUFFIX_RE = re.compile(r"\.(?:png|webp|jpe?g)$", re.IGNORECASE)

# Frontend adapters derive some image paths at runtime by string replace
# instead of carrying a second URL field — those derived files are referenced
# by the site without ever appearing in the JSONs, so the mirror must derive
# and fetch them the same way. Currently the only case is the square head
# portrait (lib/character.ts adaptCDNCharacter): iconRound
# .../IconRoleHeadCircle256/T_IconRoleHeadCircle256_N_UI -> Head256 variant.
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
    """Normalize both hosts onto the game's own resource tree (UIResources/...),
    so /assets paths are host-agnostic and the same asset referenced from both
    hosts dedupes to a single file. Always .webp — every mirrored file is WebP.

    Raises on a path shape it doesn't recognize rather than guessing — a new
    upstream tree should be added here deliberately, not silently mirrored
    into a surprise directory."""
    if absolute_url.startswith(CDN_BASE):
        path = absolute_url[len(CDN_BASE):].lstrip("/")
        # /d/ is Wuthery's raw tree, /p/ a processed variant of the same files.
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
    """Encore mirrors the game's UIResources tree, already as WebP — usable as
    a fallback source when Wuthery won't serve a file (verified mapping)."""
    marker = "GameData/UIResources/"
    if absolute_url.startswith(CDN_BASE) and marker in absolute_url:
        rest = absolute_url.split(marker, 1)[1]
        return f"{ENCORE_RESOURCE_BASE}/Game/Aki/UI/UIResources/{_IMAGE_SUFFIX_RE.sub('.webp', rest)}"
    return None


FETCH_ATTEMPTS = 4
RETRY_BACKOFF_SECONDS = 1.5


def _with_retry(fn):
    """Wuthery throttles under concurrent load (docs/sync-sources.md) rather
    than failing cleanly, so transient failures here are expected and worth
    retrying — unlike a real 404, which fails every attempt identically."""
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
    """Pass WebP through untouched (no generational loss on Encore files);
    decode-and-encode anything else at quality 90. Doubles as integrity
    validation — a truncated download or an HTML error body never decodes."""
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

    # Derived variants ride along with their source ref, whichever form the
    # JSON currently holds: an upstream URL derives an upstream URL, while an
    # already-rewritten /assets/ ref derives a local key plus a reconstructed
    # Wuthery source URL (fetch_webp's Encore fallback covers the rest) — so
    # a re-run heals a missing derived file in any state.
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

    # Resolving key + local path up front doubles as both the rewrite mapping
    # and the on-disk resumability check — no separate manifest to keep in sync.
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

    # The rewrite is gated on the WHOLE mirror being present — not just this
    # run's batch — so --limit runs and partial failures never leave the JSONs
    # pointing at files that don't exist. Re-run until complete.
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
