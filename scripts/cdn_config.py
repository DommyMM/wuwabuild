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


# Wuthery's dumper has migrated field names to camelCase in stages: Grouped/*
# flipped first, LocalizationIndex and the nested `arrayString` / `isRatio` leaves
# later. Reads go through `pick` so a sync survives the next stage instead of
# silently emitting empty values; writes always use the camelCase spelling.
def pick(node: Any, *names: str, default: Any = None) -> Any:
    """First present key among ``names``, tolerating the source's casing drift."""
    if not isinstance(node, dict):
        return default
    for name in names:
        if name in node:
            return node[name]
    lowered = {key.lower(): value for key, value in node.items()}
    for name in names:
        if name.lower() in lowered:
            return lowered[name.lower()]
    return default


# Wuthery's dumper stopped emitting Ukrainian, and Encore never had it, but the
# site still offers `uk` and we hold 30 character + 83 weapon names for it from
# older dumps. A record replaced wholesale would silently drop them, so every
# sync backfills language keys the incoming payload no longer carries.
LANGUAGE_KEYS = frozenset({
    "de", "en", "es", "fr", "id", "ja", "ko", "pt",
    "ru", "th", "vi", "uk", "zh-Hans", "zh-Hant",
})


def _is_i18n_dict(node: Any) -> bool:
    """A dict of language code -> string.

    Sibling metadata is tolerated (``Stats.json`` hangs an ``icon`` URL off the
    same object), but every language-named key must still hold text.
    """
    if not isinstance(node, dict) or not isinstance(node.get("en"), str):
        return False
    languages = [key for key in node if key in LANGUAGE_KEYS]
    if len(languages) < 2:
        return False
    return all(node[key] is None or isinstance(node[key], str) for key in languages)


def _align_lists(old: list, new: list) -> list[tuple[Any, Any]]:
    """Pair list entries by `id` when both sides carry one, else positionally."""
    def keyed(items: list) -> dict[Any, Any] | None:
        if items and all(isinstance(i, dict) and i.get("id") is not None for i in items):
            return {str(i["id"]): i for i in items}
        return None

    old_keyed, new_keyed = keyed(old), keyed(new)
    if old_keyed is not None and new_keyed is not None:
        return [(old_keyed[k], v) for k, v in new_keyed.items() if k in old_keyed]
    return list(zip(old, new))


def preserve_i18n_fallbacks(old: Any, new: Any) -> Any:
    """Fill language keys that ``new`` lost but ``old`` still has.

    Only empty-or-absent leaves are touched: a language the source still
    provides always wins, so this never resurrects stale translations.
    """
    if _is_i18n_dict(new) and _is_i18n_dict(old):
        merged = dict(new)
        for lang in LANGUAGE_KEYS:
            text = old.get(lang)
            if text and not (merged.get(lang) or "").strip():
                merged[lang] = text
        return merged
    if isinstance(new, dict) and isinstance(old, dict):
        return {
            key: preserve_i18n_fallbacks(old[key], value) if key in old else value
            for key, value in new.items()
        }
    if isinstance(new, list) and isinstance(old, list):
        rebuilt = {id(n): preserve_i18n_fallbacks(o, n) for o, n in _align_lists(old, new)}
        return [rebuilt.get(id(entry), entry) for entry in new]
    return new


def write_mapping_atomic(path: Path, mapping: dict[str, Any], **json_kwargs: Any) -> None:
    """Write a key-keyed mapping, keeping language keys the source dropped."""
    previous: Any = None
    if path.exists():
        try:
            previous = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = None
    if isinstance(previous, dict):
        mapping = {
            key: preserve_i18n_fallbacks(previous[key], value) if key in previous else value
            for key, value in mapping.items()
        }
    write_json_atomic(path, mapping, **json_kwargs)


def write_records_atomic(path: Path, records: list[dict[str, Any]], **json_kwargs: Any) -> None:
    """Write an id-keyed record list, keeping language keys the source dropped.

    A full sync replaces every record, so without this pass a language the
    dumper stopped emitting (``uk``) disappears from the shipped data even
    though nothing upstream said it was wrong.
    """
    previous: Any = None
    if path.exists():
        try:
            previous = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = None

    if isinstance(previous, list):
        old_by_id = {
            str(record["id"]): record
            for record in previous
            if isinstance(record, dict) and record.get("id") is not None
        }
        records = [
            preserve_i18n_fallbacks(old_by_id[str(record["id"])], record)
            if isinstance(record, dict) and str(record.get("id")) in old_by_id
            else record
            for record in records
        ]

    write_json_atomic(path, records, **json_kwargs)


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
            key = str(record["id"])
            if source == "update" and key in merged:
                record = preserve_i18n_fallbacks(merged[key], record)
            merged[key] = record
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
