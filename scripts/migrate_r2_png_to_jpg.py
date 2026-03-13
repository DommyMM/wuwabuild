"""
Migrate R2 bucket: download all images, convert to JPEG q90, re-upload.

Usage:
  python scripts/migrate_r2_png_to_jpg.py --dry-run   # Downloads + converts locally only
  python scripts/migrate_r2_png_to_jpg.py             # Downloads + converts + migrates R2

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
ROOT_DIR = SCRIPTS_DIR.parent
LOCAL_DIR = ROOT_DIR / "r2-backup"

load_dotenv(ROOT_DIR / ".env")

BUCKET = os.environ["R2_BUCKET_NAME"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
ACCESS_KEY = os.environ["R2_ACCESS_KEY_ID"]
SECRET_KEY = os.environ["R2_SECRET_ACCESS_KEY"]

WORKERS = 40
JPEG_QUALITY = 90


def get_s3_client():
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


def process_object(key: str, dry_run: bool) -> dict:
    new_key = key.rsplit(".", 1)[0] + ".jpg"
    local_path = LOCAL_DIR / new_key

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
        if new_key != key:
            s3.delete_object(Bucket=BUCKET, Key=key)

    return {
        "key": key,
        "new_key": new_key,
        "status": "migrated",
        "original_kb": original_kb,
        "final_kb": final_kb,
    }


def migrate(dry_run: bool):
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Saving all files to: {LOCAL_DIR}")
    print(f"Workers: {WORKERS}")
    print("=== DRY RUN ===\n" if dry_run else "=== LIVE RUN ===\n")

    s3 = get_s3_client()
    keys = list_all_keys(s3)
    print(f"Found {len(keys)} objects in '{BUCKET}'\n")

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
  {"(dry run — R2 was not modified)" if dry_run else ""}
""")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run", action="store_true", help="Download + convert locally only"
    )
    args = parser.parse_args()
    migrate(args.dry_run)