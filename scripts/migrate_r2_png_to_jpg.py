"""
Maintenance helper: copy supported R2 images to JPEG q90 keys.

Usage:
  python scripts/migrate_r2_png_to_jpg.py             # Safe preview: local download/conversion only
  python scripts/migrate_r2_png_to_jpg.py --apply     # Upload JPEG copies; originals are preserved

Requires:
  pip install boto3 python-dotenv Pillow
"""

from __future__ import annotations

import argparse
import io
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from dotenv import load_dotenv
from PIL import Image

SCRIPTS_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = SCRIPTS_DIR.parent        # wuwabuilds/
REPO_ROOT = FRONTEND_DIR.parent          # Wuwabuilds/ (sibling of wuwabuilds, backend, lb)
LOCAL_DIR = REPO_ROOT / "r2-backup"

load_dotenv(FRONTEND_DIR / ".env")

BUCKET = os.environ.get("R2_BUCKET_NAME")
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID")
SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")

WORKERS = 40
JPEG_QUALITY = 90
SUPPORTED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def local_path_for_key(key: str) -> Path:
    """Resolve an object key below LOCAL_DIR, rejecting path traversal."""
    root = LOCAL_DIR.resolve()
    candidate = (root / key).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError(f"Unsafe object key escapes the backup directory: {key!r}")
    return candidate


def is_supported_image_key(key: str) -> bool:
    return Path(key).suffix.lower() in SUPPORTED_IMAGE_SUFFIXES


def jpeg_key_for(key: str) -> str:
    return key.rsplit(".", 1)[0] + ".jpg"


def get_s3_client():
    missing = [
        name
        for name, value in (
            ("R2_BUCKET_NAME", BUCKET),
            ("CLOUDFLARE_ACCOUNT_ID", ACCOUNT_ID),
            ("R2_ACCESS_KEY_ID", ACCESS_KEY),
            ("R2_SECRET_ACCESS_KEY", SECRET_KEY),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing required R2 environment variables: {', '.join(missing)}")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
    )


def is_jpeg(data: bytes) -> bool:
    return len(data) >= 3 and data[0] == 0xFF and data[1] == 0xD8 and data[2] == 0xFF


def to_jpeg(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=JPEG_QUALITY)
    return buf.getvalue()


def list_all_keys(s3) -> list[str]:
    keys: list[str] = []
    continuation_token = None
    while True:
        kwargs: dict = {"Bucket": BUCKET}
        if continuation_token:
            kwargs["ContinuationToken"] = continuation_token
        resp = s3.list_objects_v2(**kwargs)
        for obj in resp.get("Contents", []):
            keys.append(obj["Key"])
        continuation_token = resp.get("NextContinuationToken")
        if not continuation_token:
            break
    return keys


def download_object(key: str) -> dict:
    """Download-only mode: save raw bytes as-is, always overwrite."""
    local_path = local_path_for_key(key)
    local_path.parent.mkdir(parents=True, exist_ok=True)

    s3 = get_s3_client()
    data = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
    local_path.write_bytes(data)

    return {"key": key, "kb": len(data) / 1024}


def process_object(key: str, dry_run: bool) -> dict:
    if not is_supported_image_key(key):
        return {
            "key": key,
            "new_key": key,
            "status": "unsupported",
            "original_kb": 0.0,
            "final_kb": 0.0,
        }
    new_key = jpeg_key_for(key)
    local_path = local_path_for_key(new_key)

    # Skip entirely if already processed locally
    if key.endswith(".jpg") and local_path.exists():
        size_kb = local_path.stat().st_size / 1024
        return {
            "key": key,
            "new_key": new_key,
            "status": "skipped",
            "original_kb": size_kb,
            "final_kb": size_kb,
        }

    # Each thread gets its own client (not thread-safe)
    s3 = get_s3_client()

    data = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
    original_kb = len(data) / 1024

    already_jpeg = is_jpeg(data)
    jpeg_data = data if already_jpeg else to_jpeg(data)
    final_kb = len(jpeg_data) / 1024

    # Save locally
    local_path.write_bytes(jpeg_data)

    if key.endswith(".jpg") and already_jpeg:
        return {
            "key": key,
            "new_key": new_key,
            "status": "already_jpg",
            "original_kb": original_kb,
            "final_kb": final_kb,
        }

    if not dry_run:
        s3.put_object(
            Bucket=BUCKET,
            Key=new_key,
            Body=jpeg_data,
            ContentType="image/jpeg",
        )
        # Preserve the original. Deleting/rewriting keys requires a coordinated
        # reference migration for reports and database rows and is intentionally
        # outside this maintenance helper.

    return {
        "key": key,
        "new_key": new_key,
        "status": "migrated",
        "original_kb": original_kb,
        "final_kb": final_kb,
    }


def download_all():
    """Download every R2 object as-is to LOCAL_DIR, always overwriting."""
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Saving all files to: {LOCAL_DIR}")
    print(f"Workers: {WORKERS}\n=== DOWNLOAD ONLY ===\n")

    s3 = get_s3_client()
    keys = list_all_keys(s3)
    print(f"Found {len(keys)} objects in '{BUCKET}'\n")

    total_kb = 0.0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(download_object, key): key for key in keys}
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            total_kb += result["kb"]
            print(f"  [{i}/{len(keys)}] {result['key']} ({result['kb']:.0f} KB)")

    print(f"\nDone! {len(keys)} files, {total_kb / 1024:.1f} MB → {LOCAL_DIR}")


def migrate(dry_run: bool):
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Saving all files to: {LOCAL_DIR}")
    print(f"Workers: {WORKERS}")
    print("=== DRY RUN ===\n" if dry_run else "=== LIVE RUN ===\n")

    s3 = get_s3_client()
    all_keys = list_all_keys(s3)
    supported_keys = [key for key in all_keys if is_supported_image_key(key)]
    key_set = set(all_keys)
    conflicts = [
        key
        for key in supported_keys
        if jpeg_key_for(key) != key and jpeg_key_for(key) in key_set
    ]
    keys = [key for key in supported_keys if key not in set(conflicts)]
    print(
        f"Found {len(keys)} supported images in '{BUCKET}' "
        f"({len(all_keys) - len(supported_keys)} non-image objects excluded, "
        f"{len(conflicts)} target-key conflicts skipped)\n"
    )
    if conflicts:
        print("Conflicting source keys (existing .jpg target preserved):")
        for key in conflicts:
            print(f"  {key} -> {jpeg_key_for(key)}")

    migrated = 0
    already_jpg = 0
    skipped = 0
    total_original_mb = 0.0
    total_final_mb = 0.0

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {
            pool.submit(process_object, key, dry_run): key for key in keys
        }

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            total_original_mb += result["original_kb"] / 1024
            total_final_mb += result["final_kb"] / 1024

            if result["status"] == "skipped":
                skipped += 1
                print(
                    f"  [{i}/{len(keys)}] SKIP {result['key']} (cached locally)"
                )
            elif result["status"] == "already_jpg":
                already_jpg += 1
                print(
                    f"  [{i}/{len(keys)}] OK   {result['key']} "
                    f"({result['original_kb']:.0f} KB, already jpeg bytes)"
                )
            else:
                migrated += 1
                print(
                    f"  [{i}/{len(keys)}] CONV {result['key']} -> {result['new_key']} "
                    f"({result['original_kb']:.0f} KB -> {result['final_kb']:.0f} KB)"
                )

    print(f"""
Done!
  Total objects:    {len(keys)}
  Migrated:         {migrated}
  Already .jpg:     {already_jpg}
  Skipped (cached): {skipped}
  Size before:      {total_original_mb:.1f} MB
  Size after:       {total_final_mb:.1f} MB
  Saved:            {total_original_mb - total_final_mb:.1f} MB
  Local backup:     {LOCAL_DIR}
  {"(dry run, R2 was not modified)" if dry_run else ""}
""")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply", action="store_true", help="Upload JPEG copies (original keys are preserved)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Deprecated compatibility alias for the default safe preview"
    )
    parser.add_argument(
        "--download-only", action="store_true", help="Download raw files as-is, always overwrite"
    )
    args = parser.parse_args()
    if args.apply and args.dry_run:
        parser.error("--apply and --dry-run are mutually exclusive")
    if args.download_only:
        download_all()
    else:
        migrate(dry_run=not args.apply)
