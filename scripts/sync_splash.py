"""Pull character splash art from a community Google Drive into public/images/splash and frame new files.

The Drive holds one folder per character with "<Name> Splash.jpg" and "<Name> [Outfit ]Skin Splash.jpg" at 4K,
plus mobile crops and promo art that are ignored. Each splash lands as <id>.webp or <id>-skin.webp at the
1080p WebP q80 budget in docs/build-card.md, with Rover variants sharing Rover.webp.

A new file gets a SPLASH_ART_TRANSFORMS entry at the x splash_framing.py suggests, y 0 and scale 1, to tune in the
editor. Existing entries are hand-tuned and never rewritten. A bundled file is replaced only when its art changed.

Usage:
  py sync_splash.py                     # Pull splashes that have no bundled file
  py sync_splash.py --refresh           # Also re-check bundled ones and replace those whose art changed
  py sync_splash.py --only 1108-skin    # Re-check just these stems
  py sync_splash.py --dry-run           # Report only, no writes
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
import requests
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import splash_framing as framing  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SPLASH_DIR = ROOT / "public/images/splash"
SPLASH_TS = ROOT / "lib/splashArt.ts"
CHARACTERS_JSON = ROOT / "public/Data/Characters.json"

DRIVE_ROOT_ID = "1HR5lL2zi11ag1B_Ct_ZyLYBM7q8Vriuy"
# Public folders list without an API key through the embed view, which is undocumented but stable for years
LIST_URL = "https://drive.google.com/embeddedfolderview?id={id}"
DOWNLOAD_URL = "https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t"
ENTRY_RE = re.compile(r'<div class="flip-entry" id="entry-([\w-]+)".*?<div class="flip-entry-title">(.*?)</div>', re.S)
# "Mobile" crops end in "Splash Mobile.jpg", so anchoring on "Splash.<ext>" already drops them
SPLASH_RE = re.compile(r"^(?P<name>.+?)(?P<skin>(?: [\w'-]+)*? Skin)? Splash\.(?:jpe?g|png|webp)$", re.I)

OUT_HEIGHT = 1080
WEBP_QUALITY = 80
# Mean abs RGB diff at 160x90: the same art at another encode scores <= 1, different art >= 46
SAME_ART_MAX_DIFF = 3.0
TRANSFORMS_OPEN = "const SPLASH_ART_TRANSFORMS: Record<string, CardArtTransform> = {"
ENTRY_LINE_RE = re.compile(r"^  '([\w-]+)': \{ x: -?[\d.]+, y: -?[\d.]+, scale: [\d.]+ \},$")


def normalize(name: str) -> str:
    """Lowercase words only, so "The Shorekeeper" and "Yangyang: Xuanling" match the Drive's file names"""
    words = re.sub(r"[^a-z0-9]+", " ", name.lower()).split()
    return " ".join(words[1:] if words[:1] == ["the"] else words)


def stem_index() -> tuple[dict[str, str], dict[str, set[str]]]:
    """Normalized English name to splash stem, plus first word to stems for short names like "Luuk" """
    characters = json.loads(CHARACTERS_JSON.read_text(encoding="utf-8"))
    exact: dict[str, str] = {}
    first_word: dict[str, set[str]] = {}
    for character in characters:
        name = character["name"]["en"]
        stem = "Rover" if name.startswith("Rover") else str(character["id"])
        key = normalize(name)
        exact[key] = stem
        first_word.setdefault(key.split()[0], set()).add(stem)
    return exact, first_word


def list_folder(session: requests.Session, folder_id: str) -> list[tuple[str, str]]:
    """(id, name) for every entry in a public Drive folder, folders and files alike"""
    response = session.get(LIST_URL.format(id=folder_id), timeout=30)
    response.raise_for_status()
    return [(entry_id, html.unescape(name)) for entry_id, name in ENTRY_RE.findall(response.text)]


def find_splashes(session: requests.Session) -> tuple[dict[str, tuple[str, str]], list[str]]:
    """Splash stem to (Drive file id, file name), plus problems to report"""
    exact, first_word = stem_index()
    found: dict[str, list[tuple[str, str]]] = {}
    problems: list[str] = []
    for folder_id, folder_name in list_folder(session, DRIVE_ROOT_ID):
        for file_id, file_name in list_folder(session, folder_id):
            match = SPLASH_RE.match(file_name)
            if not match:
                continue
            key = normalize(match["name"])
            base = exact.get(key)
            if base is None and len(first_word.get(key, ())) == 1:
                base = next(iter(first_word[key]))
            if base is None:
                problems.append(f"no character for {folder_name}/{file_name}")
                continue
            stem = f"{base}-skin" if match["skin"] else base
            found.setdefault(stem, []).append((file_id, file_name))

    splashes = {}
    for stem, files in sorted(found.items()):
        # One -skin slot per character, so a second outfit splash needs a decision rather than a silent pick
        if len(files) > 1:
            problems.append(f"{stem} has {len(files)} candidates ({', '.join(name for _, name in files)}), skipped")
            continue
        splashes[stem] = files[0]
    return splashes, problems


def download(session: requests.Session, file_id: str) -> Image.Image:
    """Decoded RGB image, failing on Drive's HTML pages for quota or permission blocks"""
    response = session.get(DOWNLOAD_URL.format(id=file_id), timeout=120)
    response.raise_for_status()
    if not response.headers.get("content-type", "").startswith("image/"):
        raise RuntimeError(f"Drive returned {response.headers.get('content-type')} instead of an image")
    return Image.open(io.BytesIO(response.content)).convert("RGB")


def to_budget(image: Image.Image) -> Image.Image:
    """Downscaled to the 1080p bundle height, never upscaled"""
    if image.height <= OUT_HEIGHT:
        return image
    return image.resize((round(image.width * OUT_HEIGHT / image.height), OUT_HEIGHT), Image.LANCZOS)


def art_diff(a: Image.Image, b: Image.Image) -> float:
    """Mean abs RGB difference on a thumbnail, small for the same art at different encodes"""
    size = (160, 90)
    return float(np.abs(
        np.asarray(a.resize(size, Image.BILINEAR), dtype=np.float32)
        - np.asarray(b.resize(size, Image.BILINEAR), dtype=np.float32)
    ).mean())


def suggest_x(session, image: Image.Image) -> int:
    """Card x from the character mask, or the hand-tuned median when the mask is not trusted"""
    if session is None:
        return framing.FALLBACK_X
    mask = framing.character_mask(session, image)
    area = float((mask > 0.5).mean())
    if not framing.MASK_AREA_RANGE[0] <= area <= framing.MASK_AREA_RANGE[1]:
        return framing.FALLBACK_X
    return framing.offset_for_center(framing.body_axis(mask), image.width, image.height, 1.0)


def add_transform_entries(entries: dict[str, int]) -> None:
    """Insert x-only entries into SPLASH_ART_TRANSFORMS in key order, leaving existing lines untouched"""
    lines = SPLASH_TS.read_text(encoding="utf-8").split("\n")
    start = lines.index(TRANSFORMS_OPEN) + 1
    end = lines.index("};", start)
    block = lines[start:end]
    for line in block:
        if not ENTRY_LINE_RE.match(line):
            raise RuntimeError(f"Unexpected line in SPLASH_ART_TRANSFORMS, add entries by hand: {line!r}")
    keyed = {ENTRY_LINE_RE.match(line)[1]: line for line in block}
    for stem, x in entries.items():
        keyed.setdefault(stem, f"  '{stem}': {{ x: {x}, y: 0, scale: 1 }},")
    lines[start:end] = [keyed[key] for key in sorted(keyed)]
    SPLASH_TS.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="Report only, no writes")
    parser.add_argument("--refresh", action="store_true", help="Re-check bundled splashes against the Drive")
    parser.add_argument("--only", nargs="+", metavar="STEM", help="Limit to these stems, re-checking bundled ones")
    args = parser.parse_args()

    http = requests.Session()
    print("Listing Drive folders...")
    splashes, problems = find_splashes(http)
    bundled = {path.stem for path in SPLASH_DIR.glob("*.webp")}
    stems = sorted(splashes)
    if args.only:
        unknown = sorted(set(args.only) - set(splashes))
        if unknown:
            problems.append(f"not on the Drive: {', '.join(unknown)}")
        stems = [stem for stem in stems if stem in args.only]
    elif not args.refresh:
        stems = [stem for stem in stems if stem not in bundled]

    print(f"  {len(splashes)} splashes on the Drive, {len(bundled)} bundled, {len(stems)} to check")
    new_entries: dict[str, int] = {}
    changed: list[str] = []
    model = None
    for stem in stems:
        file_id, file_name = splashes[stem]
        if args.dry_run and stem not in bundled:
            print(f"  new      {stem:10} {file_name}")
            continue
        image = to_budget(download(http, file_id))
        path = SPLASH_DIR / f"{stem}.webp"
        if stem in bundled:
            diff = art_diff(image, Image.open(path).convert("RGB"))
            if diff <= SAME_ART_MAX_DIFF:
                print(f"  same     {stem:10} {file_name} (diff {diff:.1f})")
                continue
            print(f"  changed  {stem:10} {file_name} (diff {diff:.1f}), framing kept, re-check it in the editor")
            changed.append(stem)
        else:
            if model is None:
                try:
                    model = framing.load_model()
                except ImportError:
                    print("  onnxruntime missing, new entries use the fallback x")
                    model = False
            new_entries[stem] = suggest_x(model or None, image)
            print(f"  new      {stem:10} {file_name}, x {new_entries[stem]}")
        if not args.dry_run:
            image.save(path, "WEBP", quality=WEBP_QUALITY, method=6)

    if new_entries and not args.dry_run:
        add_transform_entries(new_entries)
        print(f"  Framed {len(new_entries)} new splash(es) in lib/splashArt.ts, tune y and scale in the editor")
    for problem in problems:
        print(f"  ! {problem}")
    if not stems:
        print("  Nothing to pull")
    return 0


if __name__ == "__main__":
    sys.exit(main())
