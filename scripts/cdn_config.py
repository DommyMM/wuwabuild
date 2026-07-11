"""Shared primitives for the game-data sync scripts."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any


CDN_BASE = "https://files.wuthery.com"
DEFAULT_FETCH_ATTEMPTS = 3
DEFAULT_RETRY_BACKOFF_SECONDS = 0.75


def request_json_with_retry(
    session: Any,
    method: str,
    url: str,
    *,
    attempts: int = DEFAULT_FETCH_ATTEMPTS,
    timeout: float = 30,
    **request_kwargs: Any,
) -> Any:
    """Request JSON with bounded retries and HTTP-status validation."""
    if attempts < 1:
        raise ValueError("attempts must be at least 1")

    request = getattr(session, method.lower())
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = request(url, timeout=timeout, **request_kwargs)
            response.raise_for_status()
            return response.json()
        except Exception as error:  # Network/HTTP/JSON failures are all retryable here.
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(DEFAULT_RETRY_BACKOFF_SECONDS * (attempt + 1))

    raise RuntimeError(
        f"Failed to fetch JSON after {attempts} attempts: {url}"
    ) from last_error


def write_json_atomic(path: Path, data: Any, **json_kwargs: Any) -> None:
    """Serialize JSON beside its destination, then atomically replace it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(data, handle, **json_kwargs)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        temp_path.unlink(missing_ok=True)


def write_bytes_atomic(path: Path, data: bytes) -> None:
    """Write bytes beside their destination, then atomically replace it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temp_path.open("wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        temp_path.unlink(missing_ok=True)


def merge_records_by_id(
    existing: list[dict[str, Any]],
    updates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Replace matching records by ``id`` while preserving all other records."""
    merged: dict[str, dict[str, Any]] = {}
    for source, records in (("existing", existing), ("update", updates)):
        for record in records:
            if not isinstance(record, dict) or record.get("id") is None:
                raise ValueError(f"{source} record is missing an id: {record!r}")
            merged[str(record["id"])] = record
    return list(merged.values())
