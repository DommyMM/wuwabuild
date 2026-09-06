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
from pathlib import Path
from typing import Any

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


def _fetch_language(session: requests.Session, lang: str) -> dict[int, dict[str, str]]:
    payload = encore_request_json(session, lang, "term")
    rows = payload.get("termList") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError(f"Unexpected /term payload for {lang}: {type(payload).__name__}")
    out: dict[int, dict[str, str]] = {}
    for row in rows:
        if not isinstance(row, dict) or row.get("Id") is None:
            continue
        title = str(row.get("TermTitle") or "").strip()
        description = str(row.get("TermDesc") or "").strip()
        # Untranslated rows come back as literal "???" rather than blank.
        if title in ("", "???") and description in ("", "???"):
            continue
        out[int(row["Id"])] = {
            "title": "" if title == "???" else title,
            "description": "" if description == "???" else normalize_encore_markup(description),
        }
    return out


def build(languages: tuple[str, ...]) -> list[dict[str, Any]]:
    session = requests.Session()
    by_lang: dict[str, dict[int, dict[str, str]]] = {}
    for lang in languages:
        by_lang[lang] = _fetch_language(session, lang)
        print(f"  {lang}: {len(by_lang[lang])} terms")

    wanted = _linked_term_ids()
    print(f"Linked from shipped data: {len(wanted)} terms")

    # A term's own body links further terms; keep following until it closes.
    english = by_lang.get("en", {})
    frontier = set(wanted)
    while frontier:
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
        print(f"  WARNING: {len(missing)} linked ids absent from Encore: {missing[:10]}")

    records: list[dict[str, Any]] = []
    for term_id in sorted(wanted & set(english)):
        title = {lang: rows[term_id]["title"] for lang, rows in by_lang.items() if term_id in rows}
        description = {
            lang: rows[term_id]["description"]
            for lang, rows in by_lang.items() if term_id in rows
        }
        records.append({"id": term_id, "name": title, "description": description})
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
