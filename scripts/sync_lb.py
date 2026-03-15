"""
Generate LB base-data from local synced game data.

Inputs (all from frontend public/Data/):
- Characters.json, Weapons.json, Echoes.json
- Fetters.json
- CharacterCurve.json, LevelCurve.json

Outputs:
- lb/internal/calc/data/character_bases.json
- lb/internal/calc/data/weapon_bases.json    (lv1 ATK + secondary, effect_en, params_r1/params_r5)
- lb/internal/calc/data/echo_bases.json
- lb/internal/calc/data/fetter_bases.json    (piece_effects include parsed `effects` arrays)
- lb/internal/calc/data/character_curve.json
- lb/internal/calc/data/level_curve.json
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata

_MARKUP_RE = re.compile(r"<[^>]+>")
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPTS_DIR.parent / "public" / "Data"
LB_REPO_DIR = SCRIPTS_DIR.parent.parent / "lb"
DATA_OUTPUT_DIR = LB_REPO_DIR / "internal" / "calc" / "data"

CHARACTERS_JSON = DATA_DIR / "Characters.json"
WEAPONS_JSON = DATA_DIR / "Weapons.json"
ECHOES_JSON = DATA_DIR / "Echoes.json"
FETTERS_JSON = DATA_DIR / "Fetters.json"
CHARACTER_CURVE_JSON = DATA_DIR / "CharacterCurve.json"
LEVEL_CURVE_JSON = DATA_DIR / "LevelCurve.json"
LEGACY_ECHOES_JSON = SCRIPTS_DIR.parent / "lib" / "data" / "legacyEchoes.json"
LEGACY_WEAPONS_JSON = SCRIPTS_DIR.parent / "lib" / "data" / "legacyWeapons.json"

CHARACTER_BASES_JSON = DATA_OUTPUT_DIR / "character_bases.json"
WEAPON_BASES_JSON = DATA_OUTPUT_DIR / "weapon_bases.json"
ECHO_BASES_JSON = DATA_OUTPUT_DIR / "echo_bases.json"
FETTER_BASES_JSON = DATA_OUTPUT_DIR / "fetter_bases.json"
CHARACTER_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "character_curve.json"
LEVEL_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "level_curve.json"

FORTE_PARENT_TO_TREE = {
    1: "tree1", 2: "tree2", 3: "tree4", 6: "tree5",
    9: "tree1", 10: "tree2", 11: "tree4", 12: "tree5",
}

FORTE_COORD_TO_POS = {1: "middle", 2: "top"}

MAIN_STAT_NORMALIZE = {
    "Crit. Rate": "Crit Rate",
    "Crit. DMG": "Crit DMG",
    "Energy Regen": "ER",
    "Energy Regen.": "ER",
    "Energy Regeneration": "ER",
}

WEAPON_ATTR_TO_MAIN_STAT = {
    "Atk": "ATK",
    "Crit": "Crit Rate",
    "CritRate": "Crit Rate",
    "CritDamage": "Crit DMG",
    "LifeMax": "HP",
    "Hp": "HP",
    "Def": "DEF",
    "EnergyEfficiency": "ER",
    "EnergyRecover": "ER",
}

WEAPON_RARITY_MAP = {1: "1-star", 2: "2-star", 3: "3-star", 4: "4-star", 5: "5-star"}

FETTER_ID_TO_SET_KEY = {
    1: "Glacio", 2: "Fusion", 3: "Electro", 4: "Aero", 5: "Spectro", 6: "Havoc",
    7: "Healing", 8: "ER", 9: "Attack", 10: "Frosty", 11: "Radiance", 12: "Midnight",
    13: "Empyrean", 14: "Tidebreaking", 16: "Gust", 17: "Windward", 18: "Flaming",
    19: "Dream", 20: "Crown", 21: "Law", 22: "Flamewing", 23: "Thread", 24: "Pact",
    25: "Halo", 26: "Rite", 27: "Trailblazing", 28: "Chromatic", 29: "Sound",
}


NAME_TOKEN_ALIASES = {
    "baby": "young",      # Baby Roseshroom (current) vs Young Roseshroom (legacy)
    "reminiscence": "",   # Reminiscence prefixes are absent in some legacy labels
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_name(name: str) -> str:
    # Normalize diacritics ("Jué" -> "Jue"), punctuation, and known wording drift.
    folded = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(ch for ch in folded if not unicodedata.combining(ch))
    tokens = re.findall(r"[a-z]+|\d+", ascii_name.lower())
    normalized_tokens: list[str] = []
    for token in tokens:
        # Treat possessive "'s" punctuation splits as noise.
        if token == "s":
            continue
        if token in NAME_TOKEN_ALIASES:
            token = NAME_TOKEN_ALIASES[token]
        if token == "":
            continue
        # Smooth common singular/plural diffs across legacy catalogs.
        if token.isalpha() and len(token) > 3 and token.endswith("s"):
            token = token[:-1]
        normalized_tokens.append(token)
    return "".join(normalized_tokens)


def _load_legacy_catalog(path: Path, label: str) -> list[dict]:
    if not path.exists():
        raise ValueError(f"Missing required {label} catalog: {path}")
    try:
        payload = _load_json(path)
    except Exception as exc:
        raise ValueError(f"Failed to load {label} catalog {path}: {exc}") from exc
    if not isinstance(payload, list):
        raise ValueError(f"{label} catalog must be a JSON array: {path}")

    catalog: list[dict] = []
    for i, entry in enumerate(payload):
        if not isinstance(entry, dict):
            raise ValueError(f"{label} catalog entry at index {i} is not an object: {path}")
        catalog.append(entry)
    return catalog


def _build_legacy_name_index(catalog: list[dict]) -> dict[str, list[str]]:
    name_to_ids: dict[str, list[str]] = {}
    for entry in catalog:
        legacy_id = str(entry.get("id", "") or "").strip()
        name = str(entry.get("name", "") or "").strip()
        key = _normalize_name(name)
        if not legacy_id or not key:
            continue
        bucket = name_to_ids.setdefault(key, [])
        if legacy_id not in bucket:
            bucket.append(legacy_id)
    return name_to_ids


def _resolve_required_legacy_id(
    *,
    entity: str,
    entity_id: str,
    name: str,
    legacy_name_index: dict[str, list[str]],
    errors: list[str],
) -> str:
    if not name:
        errors.append(f"{entity} id={entity_id}: missing english name")
        return ""

    key = _normalize_name(name)
    if not key:
        errors.append(f"{entity} id={entity_id} name={name!r}: normalized name is empty")
        return ""

    candidate_legacy_ids = legacy_name_index.get(key, [])
    if len(candidate_legacy_ids) == 1:
        return candidate_legacy_ids[0]
    if not candidate_legacy_ids:
        errors.append(f"{entity} id={entity_id} name={name!r}: no exact legacy name match")
        return ""

    joined = ", ".join(candidate_legacy_ids)
    errors.append(f"{entity} id={entity_id} name={name!r}: ambiguous legacy name match [{joined}]")
    return ""


def _print_error_report(title: str, errors: list[str], max_rows: int = 200) -> None:
    if not errors:
        return
    print(f"ERROR: {title} ({len(errors)})")
    for err in errors[:max_rows]:
        print(f"  - {err}")
    remaining = len(errors) - max_rows
    if remaining > 0:
        print(f"  ... and {remaining} more")


def _write_json(path: Path, data: Any, dry_run: bool, pretty: bool = False) -> None:
    if dry_run:
        print(f"[DRY RUN] Would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        payload = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
    else:
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    path.write_text(payload, encoding="utf-8")
    print(f"Wrote {path}")


def _fmt_effect_value(value: float) -> str:
    if value == int(value):
        return str(int(value))
    return f"{value:.4f}".rstrip("0").rstrip(".")


def _resolve_effect_placeholders(effect_en: str, add_prop: list[dict], effect_params: list[str] | None = None) -> str:
    if not effect_en:
        return ""
    values_from_params: list[str] = []
    if isinstance(effect_params, list):
        values_from_params = [str(v) for v in effect_params]

    values_from_add_prop = [_fmt_effect_value(float(p.get("value", 0))) for p in add_prop]

    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if idx < len(values_from_params):
            return values_from_params[idx]
        return values_from_add_prop[idx] if idx < len(values_from_add_prop) else match.group(0)

    return re.sub(r"\{(\d+)\}", repl, effect_en)


# ---------------------------------------------------------------------------
# Fetter effect_en parser
# ---------------------------------------------------------------------------
# Converts the natural-language effect_en strings from fetter 5pc/3pc tiers
# into structured `effects` arrays that the Go engine can consume directly
# instead of relying on hardcoded maps.
#
# Each parsed effect is a dict with three keys:
#   trigger  – str: the condition that activates the buff, exactly as written
#              in the source text (e.g. "releasing Intro Skill",
#              "Hitting a target with Aero Erosion").  Empty string means the
#              buff is passive / always-active for the rotation.
#   buffs    – list[{stat, value}]: one entry per stat granted.
#              `stat` uses the same canonical English names as character_bases
#              stats and echo_bases bonuses (e.g. "Crit Rate", "Aero DMG",
#              "Resonance Skill DMG Bonus").  `value` is a display-unit float
#              (e.g. 10.0 for 10%).
#   duration – float | None: seconds the buff lasts, or null when the effect
#              has no explicit duration (treat as covering the full rotation).
#
# Extra optional fields present when relevant:
#   max_stacks – int: maximum stack count for accumulating buffs.
#   per_stack  – bool: true when `value` is the per-stack amount (multiply by
#                max_stacks to get the effective total at full stacks).
#
# The original `effect_en` string is always preserved alongside `effects` so
# that humans can audit what the parser produced and spot mismatches easily.
#
# Canonical stat names (matching character_bases.json + echo_bases bonuses):
#   "ATK", "DEF", "HP", "Crit Rate", "Crit DMG", "Energy Regen",
#   "Healing Bonus",
#   "Aero DMG", "Glacio DMG", "Fusion DMG", "Electro DMG",
#   "Havoc DMG", "Spectro DMG",
#   "Basic Attack DMG Bonus", "Heavy Attack DMG Bonus",
#   "Resonance Skill DMG Bonus", "Resonance Liberation DMG Bonus",
#   "Echo Skill DMG Bonus", "Outro Skill DMG",     ← non-substat extras
#   "Coordinated Attack DMG"                         ← non-substat extras
# ---------------------------------------------------------------------------

# Ordered list of (canonical_name, regex_fragment) pairs.
# Longer/more-specific entries MUST come before shorter ones to prevent
# partial matches (e.g. "Resonance Skill DMG Bonus" before "Resonance Skill DMG").
_STAT_NAMES: list[tuple[str, str]] = [
    # Move-type DMG bonuses — most specific first
    ("Resonance Liberation DMG Bonus", r"Resonance Liberation DMG Bonus"),
    ("Resonance Skill DMG Bonus",      r"Resonance Skill DMG Bonus"),
    ("Basic Attack DMG Bonus",         r"Basic Attack DMG Bonus"),
    ("Heavy Attack DMG Bonus",         r"Heavy Attack DMG Bonus"),
    # Non-substat DMG types (keep as-is for future engine support)
    ("Echo Skill DMG Bonus",           r"Echo Skill DMG Bonus"),
    ("Coordinated Attack DMG",         r"Coordinated Attack DMG"),
    ("Outro Skill DMG",                r"Outro Skill DMG(?! Bonus)"),
    # Move-type DMG without "Bonus" suffix (less common, check after Bonus variants)
    ("Resonance Liberation DMG",       r"Resonance Liberation DMG(?! Bonus)"),
    ("Resonance Skill DMG",            r"Resonance Skill DMG(?! Bonus)"),
    ("Basic Attack DMG",               r"Basic Attack DMG(?! Bonus)"),
    ("Heavy Attack DMG",               r"Heavy Attack DMG(?! Bonus)"),
    # Elemental DMG — effect_en sometimes writes "Aero DMG Bonus", which maps
    # to the same canonical "Aero DMG" stat (the "Bonus" suffix is stylistic).
    ("Aero DMG",     r"Aero DMG(?:\s+Bonus)?"),
    ("Glacio DMG",   r"Glacio DMG(?:\s+Bonus)?"),
    ("Fusion DMG",   r"Fusion DMG(?:\s+Bonus)?"),
    ("Electro DMG",  r"Electro DMG(?:\s+Bonus)?"),
    ("Havoc DMG",    r"Havoc DMG(?:\s+Bonus)?"),
    ("Spectro DMG",  r"Spectro DMG(?:\s+Bonus)?"),
    # "all Attribute DMG" / "Attribute DMG" → generic all-element bonus
    ("All Attribute DMG", r"(?:all\s+)?[Aa]ttribute DMG(?:\s+Bonus)?"),
    # Base stats
    ("Crit Rate",     r"Crit\.?\s*Rate"),
    ("Crit DMG",      r"Crit\.?\s*DMG"),
    ("ATK",           r"\bATK\b"),
    ("DEF",           r"\bDEF\b"),
    ("HP",            r"\bHP\b"),
    ("Energy Regen",  r"Energy Regen(?:eration)?\.?"),
    ("Healing Bonus", r"Healing Bonus"),
]


def _build_stat_regex() -> re.Pattern[str]:
    """Build a combined alternation regex using named groups (s0, s1, …) so
    that the matched canonical name can be recovered from the group index."""
    parts = [f"(?P<s{i}>{pat})" for i, (_, pat) in enumerate(_STAT_NAMES)]
    return re.compile("|".join(parts))


_STAT_RE = _build_stat_regex()

# Regexes for numeric value / duration / stacking extraction.
_RE_PCT       = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_RE_DURATION  = re.compile(
    r"(?:lasting\s+for|for|lasts?|each\s+stack\s+lasts?)\s+(\d+(?:\.\d+)?)\s*s\b", re.I
)
_RE_STACKS    = re.compile(r"stack(?:s)?\s+up\s+to\s+(\d+)\s+times?", re.I)
_RE_PER_STACK = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+every\s+\d", re.I)  # "5% every 1.5s"

# Trigger-condition prefixes that appear at the start of a clause.
_TRIGGER_STARTS = re.compile(
    r"^(Hitting|Casting|Using|While|Upon|After|When|Dealing|Inflicting|"
    r"Holding|Reaching|At\b|With\b)",
    re.I,
)


def _stat_name_for_match(m: re.Match) -> str:
    """Return the canonical stat name for a _STAT_RE match."""
    for i, (name, _) in enumerate(_STAT_NAMES):
        if m.group(f"s{i}") is not None:
            return name
    return m.group(0)  # fallback: raw matched text


def _extract_buffs(text: str) -> list[dict]:
    """Find all (stat, value) buff pairs in *text*.

    Handles three common orderings:
      "30% Aero DMG Bonus"          – value then stat
      "Aero DMG + 10%"              – stat then value with + separator
      "increases ATK by 15%"        – stat then value with 'by' / 'increases by'
    """
    buffs: list[dict] = []
    used: list[tuple[int, int]] = []  # (start, end) spans already claimed

    def _overlaps(s: int, e: int) -> bool:
        return any(a < e and b > s for a, b in used)

    # Pass A – "X% StatName" (value precedes stat)
    for pct_m in _RE_PCT.finditer(text):
        val = float(pct_m.group(1))
        after_start = pct_m.end()
        after = text[after_start:after_start + 70].lstrip()
        stat_m = _STAT_RE.match(after)
        if stat_m:
            stat = _stat_name_for_match(stat_m)
            span_end = after_start + after.find(stat_m.group(0)) + len(stat_m.group(0))
            if not _overlaps(pct_m.start(), span_end):
                buffs.append({"stat": stat, "value": val})
                used.append((pct_m.start(), span_end))

    # Pass B – "StatName + X%" or "StatName … by X%" (stat precedes value).
    # Uses a wider 80-char window to handle wordy constructions like Pact.
    # Rejects the match when another stat name appears in the text between
    # this stat and the value — that indicates "A increases B by X%" where
    # B (not A) is the buffed stat.
    for stat_m in _STAT_RE.finditer(text):
        stat = _stat_name_for_match(stat_m)
        after = text[stat_m.end():stat_m.end() + 80]
        pct_m = re.search(
            r"(?:\+\s*|by\s+|increases?\s+by\s+)(\d+(?:\.\d+)?)\s*%",
            after, re.I,
        )
        if pct_m:
            between = after[: pct_m.start()]
            if _STAT_RE.search(between):
                continue  # another stat sits between this one and the value
            val = float(pct_m.group(1))
            span_end = stat_m.end() + pct_m.end()
            if not _overlaps(stat_m.start(), span_end):
                buffs.append({"stat": stat, "value": val})
                used.append((stat_m.start(), span_end))

    return buffs


def _extract_duration(text: str) -> float | None:
    """Return the explicit duration in seconds, or None if absent."""
    m = _RE_DURATION.search(text)
    return float(m.group(1)) if m else None


def _extract_trigger(text: str) -> str:
    """Extract the condition/trigger clause from an effect sentence.

    Looks for:
    1. A leading condition phrase ("Hitting …", "Upon using …", "While …", …)
       up to the first comma or buff verb.
    2. A trailing "after/upon releasing MOVE" clause after the stat+value.
    Falls back to "" (passive / always-active) if neither is found.
    """
    # Pattern 1 – clause starts with a known trigger keyword
    cond_m = re.match(
        r"^((?:Hitting|Casting|Using|While|Upon|After|When|Dealing|Inflicting|"
        r"Holding|Reaching)\b.+?)"
        r"(?:,\s*|\s+(?:increases?|grants?|gains?|deal))",
        text, re.I,
    )
    if cond_m:
        return cond_m.group(1).strip().rstrip(",")

    # Pattern 2 – "STAT + X% after/upon TRIGGER"
    after_m = re.search(
        r"\b(?:after|upon)\b\s+(?:releasing\s+)?(.+?)(?:\.|,|$)", text, re.I
    )
    if after_m:
        return after_m.group(1).strip().rstrip(".,")

    return ""


def _parse_effect_en(effect_en: str) -> list[dict]:
    """Parse a fetter piece effect_en into a list of structured effect dicts.

    Each dict has:
      trigger  – str (empty = passive/always-active)
      buffs    – list[{stat, value}]
      duration – float | None (seconds; None = no explicit duration)

    Optional fields when present:
      max_stacks – int
      per_stack  – bool (value is per-stack; multiply by max_stacks for total)

    The function splits multi-sentence effects and returns one dict per
    distinct buff clause.  Pure stacking/meta sentences ("This effect stacks
    up to …", "Effects of the same name …") are dropped.
    """
    if not effect_en:
        return []

    # Normalise in-word abbreviations that contain ". " so they don't
    # trigger false sentence splits (e.g. "Crit. Rate" → "Crit Rate").
    text = re.sub(r"\bCrit\.\s+", "Crit ", effect_en)
    text = re.sub(r"\bRegen\.\s+", "Regen ", text)

    # Split into sentences; drop pure meta-sentences.
    _META_RE = re.compile(
        r"^(?:this effect|effects? of the same name|cd\s*:)", re.I
    )
    sentences = [s.strip() for s in re.split(r"\.\s+", text.rstrip(".")) if s.strip()]
    sentences = [s for s in sentences if not _META_RE.match(s)]

    results: list[dict] = []

    for sentence in sentences:
        # Extract trigger first so we can filter out threshold-condition
        # values that appear in the trigger clause but aren't actual buffs
        # (e.g. "Reaching 250% Energy Regen" → 250 should not be a buff).
        trigger  = _extract_trigger(sentence)
        buffs = [
            b for b in _extract_buffs(sentence)
            if trigger == "" or b["stat"] not in trigger
        ]
        if not buffs:
            continue

        duration = _extract_duration(sentence)

        # Stacking annotations (informational – Go engine decides how to apply)
        stacks_m     = _RE_STACKS.search(sentence)
        per_stack_m  = _RE_PER_STACK.search(sentence)

        entry: dict = {"trigger": trigger, "buffs": buffs, "duration": duration}
        if stacks_m:
            entry["max_stacks"] = int(stacks_m.group(1))
        if per_stack_m:
            entry["per_stack"] = True

        results.append(entry)

    return results


# ---------------------------------------------------------------------------
# Character bases
# ---------------------------------------------------------------------------

def _parse_forte_node_value(node: dict) -> float:
    value_text = node.get("valueText")
    if isinstance(value_text, list) and value_text:
        raw = str(value_text[0]).replace("%", "").strip()
        try:
            return round(float(raw), 4)
        except ValueError:
            pass

    value_arr = node.get("value")
    if isinstance(value_arr, list) and value_arr:
        first = value_arr[0]
        if isinstance(first, dict):
            raw_val = float(first.get("Value", 0) or 0)
            is_ratio = bool(first.get("IsRatio", False))
            return round((raw_val * 100) if is_ratio else (raw_val / 100), 4)
    return 0.0


def _extract_forte_nodes(char: dict) -> dict[str, dict]:
    nodes = char.get("skillTrees")
    if not isinstance(nodes, list):
        return {}

    forte_nodes: dict[str, dict] = {}
    for node in nodes:
        if not isinstance(node, dict):
            continue
        parents = node.get("parentNodes")
        parent = parents[0] if isinstance(parents, list) and parents else None
        tree = FORTE_PARENT_TO_TREE.get(parent)
        pos = FORTE_COORD_TO_POS.get(node.get("coordinate"))
        if not tree or not pos:
            continue

        value = _parse_forte_node_value(node)
        if value <= 0:
            continue
        key = f"{tree}.{pos}"
        forte_nodes[key] = {
            "name": str(node.get("name", "") or ""),
            "value": value,
        }
    return forte_nodes

def _extract_chains_lb(char: dict) -> list[dict]:
    """Extract chain (sequence) data for lb JSON: id, English name, English description, params, bonus."""
    chains = char.get("chains")
    if not isinstance(chains, list):
        return []

    result = []
    for chain in chains:
        if not isinstance(chain, dict):
            continue
        name_field = chain.get("name", {})
        name_en = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field)
        desc_field = chain.get("description", {})
        desc_en = desc_field.get("en", "") if isinstance(desc_field, dict) else str(desc_field)
        desc_en = _MARKUP_RE.sub("", desc_en).strip()
        entry: dict = {
            "id": chain.get("id"),
            "name": name_en,
            "description": desc_en,
            "param": chain.get("param") or [],
        }
        bonus = chain.get("bonus")
        if isinstance(bonus, dict):
            entry["bonus"] = bonus
        result.append(entry)

    return result


def _extract_moves_lb(char: dict) -> list[dict]:
    """Extract move data for lb JSON with English description and typed level values."""
    moves = char.get("moves")
    if not isinstance(moves, list):
        return []

    result = []
    for move in moves:
        if not isinstance(move, dict):
            continue
        name_field = move.get("name", {})
        name_en = name_field.get("en", "") if isinstance(name_field, dict) else str(name_field)
        desc_field = move.get("description", {})
        desc_en = desc_field.get("en", "") if isinstance(desc_field, dict) else str(desc_field)
        desc_en = _MARKUP_RE.sub("", desc_en).strip()
        desc_params = [str(v) for v in (move.get("descriptionParams") or [])]

        values = []
        for v in move.get("values") or []:
            if not isinstance(v, dict):
                continue
            sub_name_field = v.get("name", {})
            sub_name_en = sub_name_field.get("en", "") if isinstance(sub_name_field, dict) else str(sub_name_field)
            values.append({
                "id": v.get("id"),
                "name": sub_name_en,
                "values": v.get("values") or [],
            })

        result.append({
            "id": move.get("id"),
            "type": move.get("type"),
            "sort": move.get("sort"),
            "name": name_en,
            "description": desc_en,
            "description_params": desc_params,
            "max_level": move.get("maxLevel") or 0,
            "values": values,
        })

    return result


def _extract_sequence_bonuses(char: dict) -> list[dict]:
    chains = char.get("chains")
    if not isinstance(chains, list):
        return []

    bonuses: list[dict] = []
    for i, chain in enumerate(chains):
        if not isinstance(chain, dict):
            continue
        bonus = chain.get("bonus")
        if isinstance(bonus, dict) and bonus.get("stat") and bonus.get("value") is not None:
            bonuses.append({
                "minSequence": i + 1,
                "stat": bonus["stat"],
                "value": float(bonus["value"])
            })
    return bonuses

def _build_character_bases(
    full_chars: list[dict]
) -> dict[str, dict]:
    out: dict[str, dict] = {}

    for char in full_chars:
        cdn_id = str(char.get("id"))
        name = (char.get("name") or {}).get("en", "")
        element = ((char.get("element") or {}).get("name") or {}).get("en", "") or "Spectro"
        weapon_type = ((char.get("weapon") or {}).get("name") or {}).get("en", "Sword")
        legacy_id = str(char.get("legacyId", "") or "").strip()

        stats = char.get("stats", {})
        hp = int(round(float(stats.get("Life", 0) or 0)))
        atk = int(round(float(stats.get("Atk", 0) or 0)))
        defense = int(round(float(stats.get("Def", 0) or 0)))

        forte_nodes = _extract_forte_nodes(char)
        sequence_bonuses = _extract_sequence_bonuses(char)
        chains = _extract_chains_lb(char)
        moves = _extract_moves_lb(char)

        out[cdn_id] = {
            "name": name,
            "element": element,
            "weaponType": weapon_type,
            "legacyId": legacy_id,
            "forte_nodes": forte_nodes,
            "sequence_bonuses": sequence_bonuses,
            "chains": chains,
            "moves": moves,
            "stats": {
                "HP": hp, "ATK": atk, "DEF": defense,
                "Crit Rate": 5, "Crit DMG": 150, "Energy Regen": 100,
                "Healing Bonus": 0,
                "Aero DMG": 0, "Glacio DMG": 0, "Fusion DMG": 0,
                "Electro DMG": 0, "Havoc DMG": 0, "Spectro DMG": 0,
                "Basic Attack DMG Bonus": 0, "Heavy Attack DMG Bonus": 0,
                "Resonance Skill DMG Bonus": 0, "Resonance Liberation DMG Bonus": 0,
            },
        }

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}
    return out


# ---------------------------------------------------------------------------
# Weapon bases
# ---------------------------------------------------------------------------

def _weapon_secondary_stat(second: dict) -> tuple[str, float]:
    """Return (stat_name, base_main_as_percent) from stats.second.

    Conversion rules (matching frontend stats.ts):
      isRatio=true  → value is a raw decimal ratio (0.081 → 8.1%)   multiply by 100
      isRatio=false → value is in internal units   (1080  → 10.8%)  divide by 100

    For "Atk" attribute with isRatio=true the stat is ATK% (percent of base ATK).
    """
    attribute = second.get("attribute", "")
    value = float(second.get("value", 0))
    is_ratio = bool(second.get("isRatio", False))

    # Normalize to percent
    base_main = (value * 100) if is_ratio else (value / 100)

    # Derive stat name
    mapped_attr = WEAPON_ATTR_TO_MAIN_STAT.get(attribute)
    if mapped_attr:
        return mapped_attr, base_main

    name_en = (second.get("name") or {}).get("en", "")
    # First try the display name normalization table
    normalized = MAIN_STAT_NORMALIZE.get(name_en, "")
    if normalized:
        return normalized, base_main

    # Fall back to display name (may still need normalization)
    return name_en if name_en else attribute, base_main


def _params_for_rank(weapon: dict, rank: int) -> list[str]:
    """Return weapon effect parameters for rank R1..R5 (clamped per slot)."""
    idx = max(rank - 1, 0)
    params = weapon.get("params") or {}
    result = []
    for i in sorted(params.keys(), key=lambda x: int(x)):
        values = params[i]
        if isinstance(values, list) and values:
            result.append(str(values[min(idx, len(values) - 1)]))
    return result


def _params_r1(weapon: dict) -> list[str]:
    return _params_for_rank(weapon, 1)


def _params_r5(weapon: dict) -> list[str]:
    return _params_for_rank(weapon, 5)



def _passive_bonus_matrix(weapon: dict) -> dict[str, list[float]]:
    bonuses = weapon.get("unconditionalPassiveBonuses") or {}
    result: dict[str, list[float]] = {}
    for key, values in bonuses.items():
        if not isinstance(values, list) or not values:
            continue
        parsed = []
        for v in values[:5]:
            try:
                parsed.append(float(v))
            except (TypeError, ValueError):
                parsed.append(0.0)
        if parsed:
            result[key] = parsed
    return result


def _build_weapon_bases(
    full_weapons: list[dict],
    legacy_weapon_catalog: list[dict],
) -> tuple[dict[str, dict], list[str]]:
    """Build weapon_bases dict."""
    out: dict[str, dict] = {}
    errors: list[str] = []
    legacy_weapon_name_index = _build_legacy_name_index(legacy_weapon_catalog)

    for w in full_weapons:
        wid = str(w.get("id", ""))
        if not wid:
            continue
        name = (w.get("name") or {}).get("en", "")
        legacy_id = _resolve_required_legacy_id(
            entity="weapon",
            entity_id=wid,
            name=name,
            legacy_name_index=legacy_weapon_name_index,
            errors=errors,
        )

        type_name = ((w.get("type") or {}).get("name") or {}).get("en", "")
        rarity_id = (w.get("rarity") or {}).get("id", 0)
        rarity_str = WEAPON_RARITY_MAP.get(rarity_id, f"{rarity_id}-star")

        # Base ATK (level 1) from stats.first
        first = (w.get("stats") or {}).get("first", {})
        base_atk = float(first.get("value", 0))
        atk_lv1 = int(round(base_atk))

        # Secondary stat from stats.second (level 1 display units)
        second = (w.get("stats") or {}).get("second", {})
        main_stat, base_main = _weapon_secondary_stat(second)
        main_stat = MAIN_STAT_NORMALIZE.get(main_stat, main_stat)
        base_main_lv1 = round(base_main, 1)

        effect_en = (w.get("effect") or {}).get("en", "")
        params_r1 = _params_r1(w)
        params_r5 = _params_r5(w)
        passive_bonuses = _passive_bonus_matrix(w)

        out[wid] = {
            "name": name,
            "legacyId": legacy_id,
            "type": type_name,
            "rarity": rarity_str,
            "ATK": atk_lv1,
            "main_stat": main_stat,
            "base_main": base_main_lv1,
            "passive_bonuses": passive_bonuses,
            "effect_en": effect_en,
            "params_r1": params_r1,
            "params_r5": params_r5,
        }

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}

    return out, errors


# ---------------------------------------------------------------------------
# Echo bases
# ---------------------------------------------------------------------------

def _build_echo_bases(
    echoes: list[dict],
    legacy_echo_catalog: list[dict],
) -> tuple[dict[str, dict], list[str]]:
    out: dict[str, dict] = {}
    errors: list[str] = []
    legacy_echo_name_index = _build_legacy_name_index(legacy_echo_catalog)

    for echo in echoes:
        eid = str(echo.get("id"))
        if not eid:
            continue
        name = (echo.get("name") or {}).get("en", "")
        legacy_id = _resolve_required_legacy_id(
            entity="echo",
            entity_id=eid,
            name=name,
            legacy_name_index=legacy_echo_name_index,
            errors=errors,
        )

        cost = int(echo.get("cost", 0))
        raw_fetters = echo.get("fetter", []) if isinstance(echo.get("fetter"), list) else []
        raw_skill = echo.get("skill") if isinstance(echo.get("skill"), dict) else {}
        effect_en = (raw_skill.get("description") or "").strip()
        raw_skill_params = raw_skill.get("params") if isinstance(raw_skill, dict) else []
        effect_params: list[list[str]] = []
        if isinstance(raw_skill_params, list):
            for row in raw_skill_params:
                if isinstance(row, dict):
                    arr = row.get("ArrayString", [])
                elif isinstance(row, list):
                    arr = row
                else:
                    arr = []
                if isinstance(arr, list):
                    effect_params.append([str(v) for v in arr])
        raw_bonuses = echo.get("bonuses") if isinstance(echo.get("bonuses"), list) else []
        bonuses = []
        for bonus in raw_bonuses:
            if not isinstance(bonus, dict):
                continue
            stat = str(bonus.get("stat", "") or "").strip()
            if stat == "":
                continue
            value = float(bonus.get("value", 0) or 0)
            entry = {"stat": stat, "value": value}
            cond = bonus.get("characterCondition")
            if isinstance(cond, list):
                cleaned = [str(c).strip() for c in cond if str(c).strip()]
                if cleaned:
                    entry["characterCondition"] = cleaned
            bonuses.append(entry)
        out[eid] = {
            "name": name,
            "legacyId": legacy_id,
            "cost": cost,
            "fetter_ids": [f for f in raw_fetters if isinstance(f, int)],
            "effect_en": effect_en,
            "params": effect_params,
            "bonuses": bonuses,
        }

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}

    return out, errors


def _build_fetter_bases(fetters: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for fetter in fetters:
        group_id = fetter.get("id")
        if not isinstance(group_id, int):
            continue
        set_key = FETTER_ID_TO_SET_KEY.get(group_id)
        if not set_key:
            continue

        name_en = ((fetter.get("name") or {}).get("en") or "").strip()
        piece_effects_raw = fetter.get("pieceEffects")
        normalized_piece_effects: dict[str, dict] = {}

        if isinstance(piece_effects_raw, dict) and piece_effects_raw:
            items = sorted(piece_effects_raw.items(), key=lambda kv: int(kv[0]))
        else:
            # Backward-compatible fallback for older Fetters.json that only has one tier.
            fallback_piece = str(int(fetter.get("pieceCount", 2) or 2))
            items = [(fallback_piece, {
                "pieceCount": int(fetter.get("pieceCount", 2) or 2),
                "fetterId": fetter.get("fetterId"),
                "addProp": fetter.get("addProp", []),
                "buffIds": fetter.get("buffIds", []),
                "effectDescription": fetter.get("effectDescription", {}),
                "effectDescriptionParam": fetter.get("effectDescriptionParam", []),
            })]

        for piece_key, piece_data in items:
            if not isinstance(piece_data, dict):
                continue
            add_prop = piece_data.get("addProp", [])
            if not isinstance(add_prop, list):
                add_prop = []
            # effect_params used only for placeholder resolution; not written to output.
            effect_params = piece_data.get("effectDescriptionParam", [])
            if not isinstance(effect_params, list):
                effect_params = []
            effect_obj = piece_data.get("effectDescription", {})
            effect_en_raw = (effect_obj.get("en", "") if isinstance(effect_obj, dict) else "").strip()
            effect_en = _resolve_effect_placeholders(effect_en_raw, add_prop, effect_params)
            normalized_piece_effects[piece_key] = {
                "effect_en": effect_en,
                "add_prop": add_prop,
                "effects": _parse_effect_en(effect_en),
            }

        out[set_key] = {
            "group_id": group_id,
            "name": name_en,
            "piece_count": int(fetter.get("pieceCount", 2) or 2),
            "piece_effects": normalized_piece_effects,
        }

    return {k: out[k] for k in sorted(out)}


# ---------------------------------------------------------------------------
# Go code generation for weapon_buffs_gen.go
# ---------------------------------------------------------------------------

def _sync_weapons_only(dry_run: bool, pretty: bool) -> int:
    required = [WEAPONS_JSON]
    for path in required:
        if not path.exists():
            print(f"ERROR: Missing required input: {path}")
            return 1

    full_weapons = _load_json(WEAPONS_JSON)
    try:
        legacy_weapons = _load_legacy_catalog(LEGACY_WEAPONS_JSON, "legacy weapon")
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1
    weapon_bases, weapon_errors = _build_weapon_bases(full_weapons, legacy_weapons)
    if weapon_errors:
        _print_error_report("Unable to resolve legacy weapon IDs", weapon_errors)
        return 1

    _write_json(WEAPON_BASES_JSON, weapon_bases, dry_run, pretty=pretty)

    print("\nGenerated summary (weapons-only):")
    print(f"  Weapons:    {len(weapon_bases)}")
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate LB base-data from local synced game data")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON outputs")
    parser.add_argument(
        "--weapons-only",
        action="store_true",
        help="Regenerate weapon base data only",
    )
    args = parser.parse_args()

    if args.weapons_only:
        return _sync_weapons_only(args.dry_run, args.pretty)

    required = [CHARACTERS_JSON, WEAPONS_JSON, ECHOES_JSON, FETTERS_JSON, CHARACTER_CURVE_JSON, LEVEL_CURVE_JSON]
    for path in required:
        if not path.exists():
            print(f"ERROR: Missing required input: {path}")
            return 1

    full_chars = _load_json(CHARACTERS_JSON)
    full_weapons = _load_json(WEAPONS_JSON)
    full_echoes = _load_json(ECHOES_JSON)
    full_fetters = _load_json(FETTERS_JSON)
    character_curve = _load_json(CHARACTER_CURVE_JSON)
    level_curves = _load_json(LEVEL_CURVE_JSON)
    try:
        legacy_weapons = _load_legacy_catalog(LEGACY_WEAPONS_JSON, "legacy weapon")
        legacy_echoes = _load_legacy_catalog(LEGACY_ECHOES_JSON, "legacy echo")
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    character_bases = _build_character_bases(full_chars)
    weapon_bases, weapon_errors = _build_weapon_bases(full_weapons, legacy_weapons)
    echo_bases, echo_errors = _build_echo_bases(full_echoes, legacy_echoes)
    fetter_bases = _build_fetter_bases(full_fetters)
    if weapon_errors or echo_errors:
        _print_error_report("Unable to resolve legacy weapon IDs", weapon_errors)
        _print_error_report("Unable to resolve legacy echo IDs", echo_errors)
        return 1

    _write_json(CHARACTER_BASES_JSON, character_bases, args.dry_run, pretty=args.pretty)
    _write_json(WEAPON_BASES_JSON, weapon_bases, args.dry_run, pretty=args.pretty)
    _write_json(ECHO_BASES_JSON, echo_bases, args.dry_run, pretty=args.pretty)
    _write_json(FETTER_BASES_JSON, fetter_bases, args.dry_run, pretty=args.pretty)
    _write_json(CHARACTER_CURVE_OUT_JSON, character_curve, args.dry_run, pretty=args.pretty)
    _write_json(LEVEL_CURVE_OUT_JSON, level_curves, args.dry_run, pretty=args.pretty)

    print("\nGenerated summary:")
    print(f"  Characters: {len(character_bases)}")
    print(f"  Weapons:    {len(weapon_bases)}")
    print(f"  Echoes:     {len(echo_bases)}")
    print(f"  Fetters:    {len(fetter_bases)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
