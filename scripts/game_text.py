"""Shared sanitizer for Kuro's in-game rich text.

Every sync script writes the same shape of string: description text carrying control tokens (``{Cus:...}``),
layout tags (``<size=...>``), semantic colour tags (``<color=Highlight>``) and glossary links (``<te href=850008>``).

What survives into ``public/Data``:

``{0}`` placeholders, paired with the entry's own ``param`` array, so the frontend can highlight resolved values
``<color=...>``, because the renderer maps the semantic name onto our palette
``<te href=N>``, because ``N`` is a TermConfig id and that is what opens a keyword's glossary card

What is resolved away:

``{Cus:Ipt,...}`` becomes its PC label and ``{Cus:Sap,...}`` the singular or plural noun
``<size=...>`` and ``<SapTag=...>`` wrappers are dropped once read
Anything else in braces is a control token with no player-facing meaning

Plain-text consumers (``sync_lb``, matching heuristics) strip every tag anyway.
"""

from __future__ import annotations

import re
from typing import Any

NUMBER_TOKEN_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")
PLACEHOLDER_PATTERN = re.compile(r"\{\d+\}")
NON_PARAM_BRACE_TOKEN_PATTERN = re.compile(r"\{(?!\d+\})[^{}]+\}")
# Platform-input token {Cus:Ipt,Touch=Tap PC=Press ...}, keep the PC label so the verb stays in the sentence
INPUT_TOKEN_PATTERN = re.compile(r"\{Cus:Ipt[^{}]*?PC=([^,}\s]+)[^{}]*\}", re.IGNORECASE)
SIZE_TAG_PATTERN = re.compile(r"</?size(?:=[^>]+)?>", re.IGNORECASE)
SAP_TAG_PATTERN = re.compile(r"</?SapTag[^>]*>", re.IGNORECASE)
# Singular/plural token {Cus:Sap,S=stack P=stacks SapTag=A}, deciding count wrapped nearby as <SapTag=A>1</SapTag>
# Dropping the token leaves the noun out of the sentence ("1 of Swordlight Ward"), so resolve it instead
# Tags are usually numeric (SapTag=0) and occasionally alphabetic, so \w has to match both
SAP_COUNT_PATTERN = re.compile(r"<SapTag=(\w+)>(.*?)</SapTag>", re.IGNORECASE | re.DOTALL)
SAP_TOKEN_PATTERN = re.compile(
    r"\{Cus:Sap,\s*S=(.*?)\s+P=(.*?)\s+SapTag=(\w+)\s*\}",
    re.IGNORECASE,
)
# Glossary link, e.g. <te href=850008>Spectro Frazzle</te>
TERM_LINK_PATTERN = re.compile(r"<te\s+href=(\d+)\s*>(.*?)</te>", re.IGNORECASE | re.DOTALL)
TERM_ID_PATTERN = re.compile(r"<te\s+href=(\d+)", re.IGNORECASE)


def _resolve_sap_tokens(value: str) -> str:
    """Replace {Cus:Sap,...} tokens with the singular or plural noun.

    Form comes from the count the token points at: `<SapTag=A>1</SapTag>` is singular, anything else plural
    Some source strings already spell the noun out after the token, so a word that would repeat is dropped
    """
    if "{Cus:Sap" not in value:
        return value

    # Wrapper usually holds a placeholder rather than a literal (`<SapTag=1>{1}</SapTag>`)
    # Stripping only control tokens leaves the index behind, and `{1}` would read as one and pick the singular
    # So placeholders go too, letting an unresolved count fall through to the plural
    counts = {
        tag.upper(): re.sub(
            r"[^0-9.]", "",
            PLACEHOLDER_PATTERN.sub("", NON_PARAM_BRACE_TOKEN_PATTERN.sub("", count)),
        )
        for tag, count in SAP_COUNT_PATTERN.findall(value)
    }

    out: list[str] = []
    position = 0
    for match in SAP_TOKEN_PATTERN.finditer(value):
        singular, plural, tag = (group.strip() for group in match.groups())
        word = singular if counts.get(tag.upper()) == "1" else plural
        out.append(value[position:match.start()])
        following = value[match.end():]
        if not re.match(rf"\s*{re.escape(word)}\b", following, re.IGNORECASE):
            out.append(word)
        position = match.end()
    out.append(value[position:])
    return "".join(out)


def sanitize_game_text(value: str) -> str:
    """Remove control tokens like {Cus:Ipt,...} while keeping numeric placeholders."""
    if not value:
        return ""
    cleaned = INPUT_TOKEN_PATTERN.sub(r"\1", value)
    cleaned = _resolve_sap_tokens(cleaned)
    cleaned = NON_PARAM_BRACE_TOKEN_PATTERN.sub("", cleaned)
    cleaned = SIZE_TAG_PATTERN.sub("", cleaned)
    cleaned = SAP_TAG_PATTERN.sub("", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    return cleaned


def sanitize_i18n_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: sanitize_game_text(text) if isinstance(text, str) else text
            for key, text in value.items()
        }
    if isinstance(value, str):
        return sanitize_game_text(value)
    return value


def normalize_param_value(value: Any) -> str:
    text = sanitize_game_text(str(value))

    def repl(match: re.Match[str]) -> str:
        raw = match.group(0)
        try:
            rounded = round(float(raw), 2)
        except (TypeError, ValueError):
            return raw
        if float(rounded).is_integer():
            return str(int(rounded))
        return f"{rounded:.2f}".rstrip("0").rstrip(".")

    return NUMBER_TOKEN_PATTERN.sub(repl, text)


def collect_term_ids(node: Any, into: set[int] | None = None) -> set[int]:
    """Every TermConfig id linked from any string anywhere under ``node``."""
    found = into if into is not None else set()
    if isinstance(node, str):
        found.update(int(m) for m in TERM_ID_PATTERN.findall(node))
    elif isinstance(node, dict):
        for child in node.values():
            collect_term_ids(child, found)
    elif isinstance(node, list):
        for child in node:
            collect_term_ids(child, found)
    return found


def strip_term_links(value: str) -> str:
    """Drop the <te> wrapper but keep the keyword, for plain-text consumers."""
    return TERM_LINK_PATTERN.sub(r"\2", value or "")


_ENCORE_COLOR_NAMES = {
    "#ffd12f": "Highlight",
    "#f8e56cff": "Light",    # Spectro
    "#a2fbfc": "Ice",        # Glacio
    "#c7ffed": "Wind",       # Aero
    "#fbcaad": "Fire",       # Fusion
    "#fcc4db": "Dark",       # Havoc
    "#ebb0ff": "Thunder",    # Electro
    "aliceblue": "Title",
}
_ENCORE_TOKEN_PATTERN = re.compile(r"<[^<>]*>", re.DOTALL)
_ENCORE_BR_PATTERN = re.compile(r"<br\s*/?>", re.IGNORECASE)
_ENCORE_COLOR_VALUE_PATTERN = re.compile(r"color\s*:\s*([#\w]+)", re.IGNORECASE)
# Section headings arrive as an oversized span where the game marks them <color=Title>
_ENCORE_HEADING_PATTERN = re.compile(r"font-whitney|text-3xl", re.IGNORECASE)


def _encore_color_name(tag: str) -> str:
    if _ENCORE_HEADING_PATTERN.search(tag):
        return "Title"
    match = _ENCORE_COLOR_VALUE_PATTERN.search(tag)
    if match:
        return _ENCORE_COLOR_NAMES.get(match.group(1).lower(), "Highlight")
    return "Highlight"


def normalize_encore_markup(value: str) -> str:
    """Rewrite Encore's HTML back into the game's own markup, then sanitize.

    Encore pre-renders for its own site: `<br>` for newlines, inline hex spans for the game's colour names
    Left alone the frontend palette sees no `<color=Name>` and `sync_lb` finds no newlines to split buff text on
    """
    if not value:
        return ""

    text = _ENCORE_BR_PATTERN.sub("\n", value)
    out: list[str] = []
    open_colors: list[str] = []
    cursor = 0
    for match in _ENCORE_TOKEN_PATTERN.finditer(text):
        out.append(text[cursor:match.start()])
        cursor = match.end()
        tag = match.group(0)
        lowered = tag.lower()
        if lowered.startswith("<span"):
            name = _encore_color_name(tag)
            out.append(f"<color={name}>")
            open_colors.append(name)
        elif lowered.startswith("</span"):
            # Encore's template emits more closers than openers, so drop the surplus
            if open_colors:
                name = open_colors.pop()
                out.append("</color>")
                # Section headings own their line in the game's text, Encore folds them into the next paragraph
                if name == "Title":
                    out.append("\n")
        else:
            out.append(tag)
    out.append(text[cursor:])
    out.append("</color>" * len(open_colors))

    normalized = "".join(out)
    # A truncated payload can end mid-tag, which nothing downstream recognizes, so it would render as literal text
    normalized = re.sub(r"<[^<>]*$", "", normalized)
    normalized = re.sub(r"[ \t]*\n[ \t]*", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return sanitize_game_text(normalized).strip()
