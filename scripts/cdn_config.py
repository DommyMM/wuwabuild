"""Shared primitives for the game-data sync scripts."""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any


CDN_BASE = "https://files.wuthery.com"
DEFAULT_FETCH_ATTEMPTS = 3
DEFAULT_RETRY_BACKOFF_SECONDS = 0.75

# Encore publishes its own host list at ``GET https://api.encore.moe/`` as
# ``apiList`` entries ordered by ``P``. Both hosts serve the same ``/{lang}/...``
# routes and the same payload shapes; only the path prefix differs (v2 mounts
# them under ``/api``). api-v2 is the faster primary but has been observed
# returning 502 for hours at a time, so every Encore call falls over to the
# legacy host instead of failing the sync.
ENCORE_API_BASES = (
    "https://api-v2.encore.moe/api",  # apiList P=1
    "https://api.encore.moe",         # apiList P=2
)

_encore_base_lock = threading.Lock()
_encore_active_base = ENCORE_API_BASES[0]


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


def encore_active_base() -> str:
    """Return the Encore host that most recently answered successfully."""
    with _encore_base_lock:
        return _encore_active_base


def encore_url(lang: str, route: str, base: str | None = None) -> str:
    """Build an Encore route URL against the active (or given) host."""
    return f"{base or encore_active_base()}/{lang}/{route.lstrip('/')}"


def encore_request_json(
    session: Any,
    lang: str,
    route: str,
    *,
    attempts: int = DEFAULT_FETCH_ATTEMPTS,
    timeout: float = 45,
    **request_kwargs: Any,
) -> Any:
    """Fetch an Encore ``/{lang}/{route}`` payload, failing over between hosts.

    The first host that answers becomes the active one for later calls, so a
    dead primary costs one round of retries per process rather than per call.
    """
    global _encore_active_base

    active = encore_active_base()
    ordered = [active] + [base for base in ENCORE_API_BASES if base != active]
    last_error: Exception | None = None
    for base in ordered:
        url = encore_url(lang, route, base)
        try:
            data = request_json_with_retry(
                session,
                "get",
                url,
                attempts=attempts,
                timeout=timeout,
                **request_kwargs,
            )
        except Exception as error:  # Host-level failure: try the next host.
            last_error = error
            continue
        if base != active:
            with _encore_base_lock:
                _encore_active_base = base
        return data

    raise RuntimeError(
        f"Failed to fetch Encore route {lang}/{route.lstrip('/')} from any host: "
        f"{', '.join(ENCORE_API_BASES)}"
    ) from last_error
