"""
Sync the in-game glossary (TermConfig) to public/Data/Terms.json.

Character, weapon and echo text links keywords as ``<te href=850008>Spectro
Frazzle</te>``. The id is a TermConfig row. Wuthery dumps the table
(``ConfigDBParsed/TermConfig.json``) but only with its Chinese key, and no
TextMap resolves the localized title and body, so Encore's ``/{lang}/term`` is
the only source that returns readable entries. Encore's own markup is rewritten
back into the game's conventions on the way in.

Scope is reachability, not the whole table: only terms our shipped text actually
links, plus anything those terms link in turn. That keeps sequences, weapons and
combat statuses and drops the ~550 lore entries nothing on the site points at.

Usage:
    python sync_terms.py                 # all site languages
    python sync_terms.py --lang en       # one language
    python sync_terms.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Iterable

import requests

from cdn_config import encore_request_json, write_json_atomic
from game_text import collect_term_ids, normalize_encore_markup

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "Data"
OUTPUT = DATA_DIR / "Terms.json"
# The languages the site offers. Encore has no `uk` (the game has no Ukrainian
# glossary), and the frontend's `t()` already falls back to English.
LANGUAGES = ("en", "ja", "ko", "zh-Hans", "zh-Hant", "de", "es", "fr", "th")
SOURCE_FILES = ("Characters.json", "Weapons.json", "Echoes.json", "Fetters.json")


def _linked_term_ids() -> set[int]:
    """Term ids linked from the data we ship."""
    found: set[int] = set()
    for name in SOURCE_FILES:
        path = DATA_DIR / name
        if not path.exists():
            print(f"  WARNING: {name} missing, skipping")
            continue
        collect_term_ids(json.loads(path.read_text(encoding="utf-8")), found)
    return found


def _term_entry(payload: Any) -> dict[str, str] | None:
    """One term's title and body, or None when the game has no translation."""
    if not isinstance(payload, dict):
        return None
    title = str(payload.get("TermTitle") or "").strip()
    description = str(payload.get("TermDesc") or "").strip()
    # Untranslated rows come back as literal "???" rather than blank.
    if title in ("", "???") and description in ("", "???"):
        return None
    return {
        "title": "" if title == "???" else title,
        "description": "" if description == "???" else normalize_encore_markup(description),
    }


def _fetch_term(session: requests.Session, lang: str, term_id: int) -> tuple[int, dict[str, str] | None]:
    """One term from the per-id route.

    The `/term` list route truncates every description mid-sentence (and often
    mid-tag, which is how a raw `<span ...` reached the UI), so the id-addressed
    route is the only complete source. That costs one request per term per
    language, which is why the reachable set is kept small.
    """
    try:
        return term_id, _term_entry(encore_request_json(session, lang, f"term/{term_id}"))
    except Exception as exc:  # a single missing term must not fail the sync
        print(f"  WARNING: {lang}/term/{term_id} failed: {exc}")
        return term_id, None


def _fetch_terms(session: requests.Session, lang: str, ids: Iterable[int]) -> dict[int, dict[str, str]]:
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = pool.map(lambda term_id: _fetch_term(session, lang, term_id), ids)
    return {term_id: entry for term_id, entry in results if entry is not None}


def build(languages: tuple[str, ...]) -> list[dict[str, Any]]:
    session = requests.Session()

    wanted = _linked_term_ids()
    print(f"Linked from shipped data: {len(wanted)} terms")

    # A term's own body links further terms, and only the full body shows them,
    # so the closure walks English details until it stops finding new ids.
    english: dict[int, dict[str, str]] = {}
    frontier = set(wanted)
    while frontier:
        english.update(_fetch_terms(session, "en", sorted(frontier)))
        nested: set[int] = set()
        for term_id in frontier:
            entry = english.get(term_id)
            if entry:
                collect_term_ids(entry["description"], nested)
        frontier = nested - wanted
        wanted |= frontier
    print(f"Including nested references: {len(wanted)} terms")

    missing = sorted(term_id for term_id in wanted if term_id not in english)
    if missing:
        print(f"  WARNING: {len(missing)} linked ids have no English entry: {missing[:10]}")

    keep = sorted(wanted & set(english))
    by_lang: dict[str, dict[int, dict[str, str]]] = {"en": english}
    for lang in languages:
        if lang == "en":
            continue
        by_lang[lang] = _fetch_terms(session, lang, keep)
        print(f"  {lang}: {len(by_lang[lang])} terms")

    records: list[dict[str, Any]] = []
    for term_id in keep:
        records.append({
            "id": term_id,
            "name": {lang: rows[term_id]["title"] for lang, rows in by_lang.items() if term_id in rows},
            "description": {
                lang: rows[term_id]["description"]
                for lang, rows in by_lang.items() if term_id in rows
            },
        })

    # Normalization should leave only the game's own markup. Anything else with
    # a "<" in it is a tag that survived, which is what a truncated source looks
    # like by the time it reaches the page.
    known_markup = re.compile(r"</?color(?:=[^>]+)?>|</?te(?:\s+href=\d+)?\s*>", re.IGNORECASE)
    broken = [
        r["id"] for r in records
        if any("<" in known_markup.sub("", text) for text in r["description"].values())
    ]
    if broken:
        raise ValueError(f"{len(broken)} terms still carry raw markup: {broken[:10]}")
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync the in-game glossary from Encore")
    parser.add_argument("--lang", action="append", help="Limit to one language (repeatable)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only (no writes)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()

    languages = tuple(args.lang) if args.lang else LANGUAGES
    records = build(languages)

    if args.dry_run:
        print(f"[dry-run] {len(records)} terms; sample:")
        print(json.dumps(records[:2], ensure_ascii=False, indent=1)[:1200])
        return 0

    kwargs: dict[str, Any] = {"ensure_ascii": False}
    if args.pretty:
        kwargs["indent"] = 2
    write_json_atomic(OUTPUT, records, **kwargs)
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nWrote {OUTPUT} [{size_kb:.1f} KB], {len(records)} terms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
