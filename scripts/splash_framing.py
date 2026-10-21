"""Suggest SPLASH_ART_TRANSFORMS x offsets from a character mask and flag hand-tuned entries that disagree.

An anime segmentation model (isnet-anime) masks the character, and the mask's column-weighted median is the
body axis the card panel should center on. Against the hand-tuned table that anchor lands within a median of
~23 card px, so it triages rather than replaces the editor: it prints suggestions and a review sheet of current
vs suggested crops, and never edits splashArt.ts.

A mask covering under 2% or over 30% of the image means the model missed the character or swallowed effects,
so those rows report no suggestion. Scale and y stay hand-tuned since nothing in the mask predicted them.

Usage:
  py scripts/splash_framing.py                  # Report + review sheet for flagged and untuned splashes
  py scripts/splash_framing.py --only 1212 1608 # Limit to these stems, always in the sheet
  py scripts/splash_framing.py --all            # Put every splash in the review sheet

Requires:
  pip install onnxruntime numpy Pillow
  Model downloads once to ~/.u2net/isnet-anime.onnx (176MB, same cache rembg uses)
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SPLASH_DIR = ROOT / "public/images/splash"
SPLASH_TS = ROOT / "lib/splashArt.ts"

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx"
MODEL_SHA256 = "f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99"
MODEL_PATH = Path.home() / ".u2net/isnet-anime.onnx"

# Card panel is 432x600 design px, image renders full panel height and centered, see CharacterPanel
PANEL_W, PANEL_H = 432, 600
MASK_AREA_RANGE = (0.02, 0.30)
FLAG_CARD_PX = 40
# Median hand-tuned framing at scale 1, used when the mask is not trusted
FALLBACK_X = -90

TRANSFORM_RE = re.compile(r"'([\w-]+)': \{ x: (-?[\d.]+), y: (-?[\d.]+), scale: ([\d.]+) \}")


def load_transforms() -> dict[str, tuple[float, float, float]]:
    """Parse SPLASH_ART_TRANSFORMS entries out of splashArt.ts"""
    src = SPLASH_TS.read_text(encoding="utf-8")
    block = src.split("SPLASH_ART_TRANSFORMS", 1)[1].split("};", 1)[0]
    return {k: (float(x), float(y), float(s)) for k, x, y, s in TRANSFORM_RE.findall(block)}


def load_model():
    import onnxruntime as ort

    if not MODEL_PATH.exists():
        print(f"Downloading {MODEL_URL} -> {MODEL_PATH}")
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    digest = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
    if digest != MODEL_SHA256:
        sys.exit(f"{MODEL_PATH} sha256 {digest} does not match the pinned model, delete it and re-run")
    return ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])


def character_mask(session, image: Image.Image) -> np.ndarray:
    """Soft 0-1 character mask at the image's own size"""
    # Preprocessing matches rembg's isnet-anime session: 1024 square, scaled to max 1, mean-shifted, std 1
    arr = np.asarray(image.resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    arr = arr / arr.max() - np.array([0.485, 0.456, 0.406], dtype=np.float32)
    pred = session.run(None, {session.get_inputs()[0].name: arr.transpose(2, 0, 1)[None]})[0][0, 0]
    pred = (pred - pred.min()) / (pred.max() - pred.min())
    mask = Image.fromarray((pred * 255).astype(np.uint8)).resize(image.size, Image.BILINEAR)
    return np.asarray(mask, dtype=np.float32) / 255


def body_axis(mask: np.ndarray) -> float:
    """Column where half the mask weight sits on each side"""
    cdf = np.cumsum(mask.sum(axis=0))
    return float(np.searchsorted(cdf, cdf[-1] / 2))


def offset_for_center(center_x: float, width: int, height: int, scale: float) -> int:
    """Card x that puts source column center_x on the panel's center line"""
    return round(-(center_x - width / 2) * scale * PANEL_H / height)


def panel_crop(image: Image.Image, x: float, y: float, scale: float) -> Image.Image:
    """What the card panel shows for a transform, scaled from the bottom-center origin like the CSS"""
    k = image.height / PANEL_H
    cx = image.width / 2 - x / scale * k
    half_w = PANEL_W / 2 / scale * k
    top = image.height - (PANEL_H + y) / scale * k
    bottom = image.height - y / scale * k
    crop = image.crop((round(cx - half_w), round(top), round(cx + half_w), round(bottom)))
    return crop.resize((PANEL_W // 2, PANEL_H // 2))


def review_tile(image: Image.Image, stem: str, current, suggested_x: int | None) -> Image.Image:
    x, y, scale = current
    panes = [("current", x)]
    if suggested_x is not None and suggested_x != x:
        panes.append(("suggested", suggested_x))
    tile = Image.new("RGB", (PANEL_W // 2 * len(panes), PANEL_H // 2 + 16), (20, 20, 20))
    draw = ImageDraw.Draw(tile)
    draw.text((4, 2), stem, fill=(255, 255, 0))
    for i, (label, px) in enumerate(panes):
        crop = panel_crop(image, px, y, scale)
        line = ImageDraw.Draw(crop)
        line.line([(crop.width // 2, 0), (crop.width // 2, crop.height)], fill=(255, 0, 255))
        tile.paste(crop, (i * PANEL_W // 2, 16))
        draw.text((i * PANEL_W // 2 + 60, 2), f"{label} x {px}", fill=(200, 200, 200))
    return tile


def save_sheet(tiles: list[Image.Image], path: Path) -> None:
    cols = 4
    cell_w = max(t.width for t in tiles)
    cell_h = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), (0, 0, 0))
    for i, tile in enumerate(tiles):
        sheet.paste(tile, ((i % cols) * cell_w, (i // cols) * cell_h))
    sheet.save(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", nargs="+", help="Splash stems to analyze, e.g. 1212 1107-skin")
    parser.add_argument("--all", action="store_true", help="Include every splash in the review sheet")
    parser.add_argument("--sheet", type=Path, default=Path(tempfile.gettempdir()) / "splash-framing-review.png")
    args = parser.parse_args()

    transforms = load_transforms()
    stems = sorted(p.stem for p in SPLASH_DIR.glob("*.webp"))
    if args.only:
        missing = set(args.only) - set(stems)
        if missing:
            sys.exit(f"No splash file for: {', '.join(sorted(missing))}")
        stems = args.only

    session = load_model()
    rows = []
    tiles = []
    for stem in stems:
        image = Image.open(SPLASH_DIR / f"{stem}.webp").convert("RGB")
        mask = character_mask(session, image)
        area = float((mask > 0.5).mean())
        current = transforms.get(stem)
        scale = current[2] if current else 1.0
        trusted = MASK_AREA_RANGE[0] <= area <= MASK_AREA_RANGE[1]
        suggested = offset_for_center(body_axis(mask), image.width, image.height, scale) if trusted else None
        delta = None if suggested is None or current is None else round(suggested - current[0])
        flagged = current is None or (delta is not None and abs(delta) >= FLAG_CARD_PX)
        rows.append((stem, current, suggested, delta, area, flagged))
        if flagged or args.all or args.only:
            fallback = current or (FALLBACK_X * scale, 0, scale)
            tiles.append(review_tile(image, stem, fallback, suggested))

    print(f"{'stem':10} {'current x':>9} {'suggest':>8} {'delta':>6} {'mask':>5}")
    for stem, current, suggested, delta, area, flagged in sorted(rows, key=lambda r: (not r[5], r[0])):
        cur = f"{current[0]:.0f}" if current else "-"
        sug = str(suggested) if suggested is not None else "-"
        dlt = f"{delta:+d}" if delta is not None else "-"
        note = "  untrusted mask" if suggested is None else ""
        print(f"{stem:10} {cur:>9} {sug:>8} {dlt:>6} {area:5.2f}{' *' if flagged else ''}{note}")

    untuned = [r for r in rows if r[1] is None]
    if untuned:
        print("\nNo SPLASH_ART_TRANSFORMS entry, starting points to tune in the editor:")
        for stem, _, suggested, _, _, _ in untuned:
            print(f"  '{stem}': {{ x: {suggested if suggested is not None else FALLBACK_X}, y: 0, scale: 1 }},")

    if tiles:
        save_sheet(tiles, args.sheet)
        print(f"\nReview sheet: {args.sheet}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
