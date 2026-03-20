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
        return entity_id

    key = _normalize_name(name)
    if not key:
        return entity_id

    candidate_legacy_ids = legacy_name_index.get(key, [])
    if len(candidate_legacy_ids) == 1:
        return candidate_legacy_ids[0]
    if not candidate_legacy_ids:
        return entity_id

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
    # Move-type DMG bonuses, most specific first
    ("Resonance Liberation DMG Bonus", r"Resonance Liberation DMG Bonus"),
    ("Resonance Skill DMG Bonus",      r"Resonance Skill DMG Bonus"),
    ("Basic Attack DMG Bonus",         r"Basic Attack DMG Bonus"),
    ("Heavy Attack DMG Bonus",         r"Heavy Attack DMG Bonus"),
    # Generic all-move-type bonus (no specific move type prefix); e.g. Red Spring forte trigger
    ("Basic DMG Bonus",                r"Basic DMG Bonus"),
    # Non-substat DMG types (keep as-is for future engine support)
    ("Echo Skill DMG Bonus",           r"Echo Skill DMG Bonus"),
    ("Coordinated Attack DMG",         r"Coordinated Attack DMG"),
    ("Outro Skill DMG",                r"Outro Skill DMG(?! Bonus)"),
    # Move-type DMG without "Bonus" suffix (less common, check after Bonus variants)
    ("Resonance Liberation DMG",       r"Resonance Liberation DMG(?! Bonus)"),
    ("Resonance Skill DMG",            r"Resonance Skill DMG(?! Bonus)"),
    ("Basic Attack DMG",               r"Basic Attack DMG(?! Bonus)"),
    ("Heavy Attack DMG",               r"Heavy Attack DMG(?! Bonus)"),
    # Elemental DMG, effect_en sometimes writes "Aero DMG Bonus", which maps
    # to the same canonical "Aero DMG" stat (the "Bonus" suffix is stylistic).
    ("Aero DMG",     r"Aero DMG(?:\s+Bonus)?"),
    ("Glacio DMG",   r"Glacio DMG(?:\s+Bonus)?"),
    ("Fusion DMG",   r"Fusion DMG(?:\s+Bonus)?"),
    ("Electro DMG",  r"Electro DMG(?:\s+Bonus)?"),
    ("Havoc DMG",    r"Havoc DMG(?:\s+Bonus)?"),
    ("Spectro DMG",  r"Spectro DMG(?:\s+Bonus)?"),
    # "all Attribute DMG" / "Attribute DMG" → generic all-element bonus
    ("All Attribute DMG", r"(?:[Aa]ll[-\s])?[Aa]ttribute DMG(?:\s+Bonus)?"),
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
    r"(?:"
    r"(?:lasting\s+for|for|lasts?|each\s+stack\s+lasts?)\s+(\d+(?:\.\d+)?)"
    r"(?:\s*s\b|(?=\s*[,.]|\s*$))"
    r"|"
    r"(\d+(?:\.\d+)?)\s*s?\s+(?:after|upon|while|during|within)\b"
    r")",
    re.I
)
_RE_STACKS    = re.compile(r"stack(?:ing|s)?\s+up\s+to\s+(\d+)(?:\s+times?)?", re.I)
_RE_PER_STACK = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+every\s+\d", re.I)  # "5% every 1.5s"

# Trigger-condition prefixes that appear at the start of a clause.
_TRIGGER_STARTS = re.compile(
    r"^(Hitting|Casting|Using|While|Upon|After|When|Dealing|Inflicting|Performing|"
    r"Holding|Reaching|At\b|With\b|Every\s+time)",
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
        after = re.sub(r"^(?:additional|extra)\s+", "", after, flags=re.I)
        stat_m = _STAT_RE.match(after)
        if stat_m:
            stat = _stat_name_for_match(stat_m)
            span_end = after_start + after.find(stat_m.group(0)) + len(stat_m.group(0))
            if not _overlaps(pct_m.start(), span_end):
                buffs.append({"stat": stat, "value": val})
                used.append((pct_m.start(), span_end))

    # Pass B - "ignore(s) X% of the target's DEF".
    def_ignore_m = re.search(
        r"\bignores?\s+(\d+(?:\.\d+)?)\s*%\s+of\s+(?:(?:the\s+target'?s|their)\s+)?DEF\b",
        text,
        re.I,
    )
    if def_ignore_m:
        span = def_ignore_m.span()
        if not _overlaps(*span):
            buffs.append({"stat": "DEF Ignore", "value": float(def_ignore_m.group(1))})
            used.append(span)

    # Pass C - move-specific amplification, including Frazzle.
    frazzle_amp_m = re.search(
        r"\bAmplif(?:y|ies)\s+Spectro\s+Frazzle\s+DMG(?:\s+dealt)?\s+by\s+(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    )
    if frazzle_amp_m:
        span = frazzle_amp_m.span()
        if not _overlaps(*span):
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": "frazzle",
                "value": float(frazzle_amp_m.group(1)),
            })
            used.append(span)

    move_amp_m = re.search(
        r"\b(Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Echo Skill)\s+DMG\s+Amplification\b.*?\b(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    )
    if move_amp_m:
        move_type_map = {
            "basic attack": "basic_attack",
            "heavy attack": "heavy_attack",
            "resonance skill": "resonance_skill",
            "resonance liberation": "resonance_liberation",
            "echo skill": "echo",
        }
        move_type = move_type_map.get(move_amp_m.group(1).strip().lower())
        span = move_amp_m.span()
        if move_type and not _overlaps(*span):
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": move_type,
                "value": float(move_amp_m.group(2)),
            })
            used.append(span)

    # Pass D – "StatName + X%" or "StatName … by X%" (stat precedes value).
    # Uses a wider 80-char window to handle wordy constructions like Pact.
    # Rejects the match when another stat name appears in the text between
    # this stat and the value, that indicates "A increases B by X%" where
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

    # Pass E - generic "the DMG taken ... is Amplified by X%".
    dmg_amp_m = re.search(
        r"\bDMG\s+taken\b.*?\bAmplified\s+by\s+(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    )
    if dmg_amp_m:
        span = dmg_amp_m.span()
        if not _overlaps(*span):
            buffs.append({"stat": "DMG Amplification", "value": float(dmg_amp_m.group(1))})
            used.append(span)

    return buffs


def _extract_duration(text: str) -> float | None:
    """Return the explicit duration in seconds, or None if absent."""
    m = _RE_DURATION.search(text)
    if not m:
        return None
    value = m.group(1) or m.group(2)
    return float(value) if value else None


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
        r"^((?:Hitting|Casting|Using|While|Upon|After|When|Dealing|Inflicting|Performing|"
        r"Holding|Reaching|Every\s+time)\b.+?)"
        r"(?:,\s*|\s+(?:increases?|grants?|gains?))",
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


# Regex that matches " and " followed immediately by a trigger-start keyword.
# Used by _split_compound_and to separate clauses with distinct triggers joined
# by "and" in a single sentence, e.g.:
#   "Casting Resonance Skill grants X for 15s and casting Resonance Liberation
#    increases Y by Z%, lasting for 5s"
_AND_TRIGGER_RE = re.compile(
    r"\s+and\s+(?=(?:Hitting|Casting|Using|While|Upon|After|When|Dealing|Performing|"
    r"Inflicting|Holding|Reaching|Every\s+time)\b)",
    re.I,
)


def _split_compound_and(sentence: str) -> list[str]:
    """Split a sentence at ' and [TriggerKeyword]' into sub-clauses.

    Only splits where the word after 'and' is a recognised trigger keyword,
    so ordinary "and" conjunctions inside a single clause are left intact.
    Returns the original sentence in a one-element list when no split occurs.
    """
    parts = _AND_TRIGGER_RE.split(sentence)
    return [p.strip() for p in parts if p.strip()]


# Canonical trigger-move keys (matching weapon_effects.go TriggerMove values)
_TRIGGER_MOVE_PATTERNS: list[tuple[str, str]] = [
    (r"tune\s+break",                              "Passive"),
    (r"while\s+the\s+wielder\s+is\s+on\s+the\s+field", "Passive"),
    (r"(?:targets?|enemies?)\s+with\s+spectro\s+frazzle", "Passive"),
    (r"negative\s+statuses",                       "Passive"),
    (r"concerto\s+energy",                         "forte"),
    (r"\becho\s+skill\b",                          "echoSkill"),
    (r"\boutro\s+skill\b",                         "outro"),
    (r"\bintro\s+skill\b",                         "intro"),
    (r"\bresonance\s+liberation\b",                "liberation"),
    (r"\bresonance\s+skill\b",                     "skill"),
    (r"\bheavy\s+attacks?\b",                      "basic"),
    (r"\bbasic\s+attacks?\b",                      "basic"),
    (r"\bhitting\s+a\s+target\b",                  "basic"),
    (r"\bdealing\s+(?:basic|heavy)\s+attack\s+dmg","basic"),
]

# Stat name → (go_type, element, moveType). None means skip (unsupported/complex).
_STAT_TO_GO_EFFECT: dict[str, tuple[str, str, str]] = {
    "ATK":                              ("atkPercentage", "", ""),
    "Crit Rate":                        ("critRate",      "", ""),
    "Crit DMG":                         ("critDMG",       "", ""),
    "DEF Ignore":                       ("defIgnore",     "", ""),
    "DMG Amplification":                ("amplify",       "", ""),
    "All Attribute DMG":                ("elementalDMG",  "", ""),
    "Basic DMG Bonus":                  ("moveTypeDMG",   "", ""),            # generic (all move types)
    "Basic Attack DMG Bonus":           ("moveTypeDMG",   "", "basic_attack"),
    "Basic Attack DMG":                 ("moveTypeDMG",   "", "basic_attack"),
    "Heavy Attack DMG Bonus":           ("moveTypeDMG",   "", "heavy_attack"),
    "Heavy Attack DMG":                 ("moveTypeDMG",   "", "heavy_attack"),
    "Resonance Skill DMG Bonus":        ("moveTypeDMG",   "", "resonance_skill"),
    "Resonance Skill DMG":              ("moveTypeDMG",   "", "resonance_skill"),
    "Resonance Liberation DMG Bonus":   ("moveTypeDMG",   "", "resonance_liberation"),
    "Resonance Liberation DMG":         ("moveTypeDMG",   "", "resonance_liberation"),
    "Echo Skill DMG Bonus":             ("moveTypeDMG",   "", "echo"),
    "Aero DMG":     ("elementalDMG", "Aero",    ""),
    "Glacio DMG":   ("elementalDMG", "Glacio",  ""),
    "Fusion DMG":   ("elementalDMG", "Fusion",  ""),
    "Electro DMG":  ("elementalDMG", "Electro", ""),
    "Havoc DMG":    ("elementalDMG", "Havoc",   ""),
    "Spectro DMG":  ("elementalDMG", "Spectro", ""),
}


def _trigger_to_move_keys(trigger: str) -> list[str]:
    """Normalize raw trigger text to a list of canonical trigger-move keys.

    Handles compound triggers: "Casting Intro Skill or Resonance Liberation"
    produces ["intro", "liberation"].  Returns [] for unrecognisable triggers.

    Empty trigger → [] (unconditional/passive — already covered by passive_bonuses;
    skip to avoid double-counting in weapon_effects).
    Explicitly team-triggered effects like "tune break" → ["Passive"].
    """
    if not trigger.strip():
        return []  # unconditional: already in passive_bonuses, don't emit weapon_effect
    # Split on literal " or " to handle multi-trigger phrases, but only where
    # each side contains a recognisable move keyword.
    parts = re.split(r"\s+or\s+", trigger, flags=re.I)
    keys: list[str] = []
    for part in parts:
        p = part.lower()
        for pattern, key in _TRIGGER_MOVE_PATTERNS:
            if re.search(pattern, p, re.I):
                if key not in keys:
                    keys.append(key)
                break
    return keys


def _derive_go_weapon_effects(
    effects: list[dict],
    rarity: str,
) -> list[dict]:
    """Produce Go-ready weapon effect dicts from parsed effects_r1/r5 data.

    Each output dict has keys: type, triggerMove, value, and optionally
    element, moveType, duration, maxStacks, stacking.

    Skips effects whose stat maps to None (amplify, defIgnore, unsupported).
    Skips effects containing "amplif" in the trigger text (DMG Amplification).
    Uses R5 values for 4-star weapons (caller should pass effects_r5 when rarity="4-star").
    """
    out: list[dict] = []
    for eff in effects:
        trigger = eff.get("trigger", "")
        # Skip effects involving DMG Amplification (amplify type — handled manually)
        if re.search(r"amplif", trigger, re.I):
            continue
        move_keys = _trigger_to_move_keys(trigger)
        if not move_keys:
            continue

        max_stacks: int = eff.get("max_stacks", 0)
        per_stack: bool = eff.get("per_stack", False)
        stacking = "accumulate" if (max_stacks > 0 and per_stack) else ""
        duration = eff.get("duration")

        for buff in eff.get("buffs", []):
            stat = buff.get("stat", "")
            value = buff.get("value", 0.0)
            type_info = _STAT_TO_GO_EFFECT.get(stat)
            if type_info is None:
                continue  # DEF, HP, Energy Regen, etc. — skip
            go_type, element, move_type = type_info
            buff_move_type = str(buff.get("move_type", "") or "").strip()
            if buff_move_type:
                move_type = buff_move_type

            for move_key in move_keys:
                entry: dict = {
                    "type":        go_type,
                    "triggerMove": move_key,
                    "value":       value,
                }
                if element:
                    entry["element"] = element
                if move_type:
                    entry["moveType"] = move_type
                # Duration handling: None and non-Passive → emit -1 (full rotation)
                if duration is not None:
                    entry["duration"] = duration
                elif move_key != "Passive":
                    entry["duration"] = -1
                if max_stacks > 0:
                    entry["maxStacks"] = max_stacks
                if stacking:
                    entry["stacking"] = stacking
                out.append(entry)
    return out


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

    effect_en = _MARKUP_RE.sub("", effect_en)
    effect_en = re.sub(r"\{[^}]+\}", "", effect_en)

    # Normalise in-word abbreviations that contain ". " so they don't
    # trigger false sentence splits (e.g. "Crit. Rate" → "Crit Rate").
    text = re.sub(r"\bCrit\.\s+", "Crit ", effect_en)
    text = re.sub(r"\bRegen\.\s+", "Regen ", text)

    # Split into sentences. Keep meta-sentences (e.g. "This effect stacks up to
    # N times.") temporarily so we can extract global stacking info before
    # dropping them from the main results.
    _META_RE = re.compile(
        r"^(?:this effect|effects? of the same name|cd\s*:)", re.I
    )
    sentences = [s.strip() for s in re.split(r"\.\s+", text.rstrip(".")) if s.strip()]

    # Pre-pass: extract stacking info and duration from meta-sentences so they
    # can be attached to per-stack buff entries whose stacking sentence was
    # split off separately (e.g. Attack set: "ATK +5% every 1.5s." then
    # "This effect stacks up to 4 times.").
    global_stacks = 0
    global_duration: float | None = None
    for s in sentences:
        if _META_RE.match(s):
            m = _RE_STACKS.search(s)
            if m:
                global_stacks = int(m.group(1))
            d = _extract_duration(s)
            if d is not None:
                global_duration = d

    sentences = [s for s in sentences if not _META_RE.match(s)]

    # Expand compound "and [TriggerKeyword]" clauses so each distinct trigger
    # gets its own entry.  Simple conjunctions inside a single clause (e.g.
    # "Basic Attack or Heavy Attack") are not affected.
    sentences = [part for s in sentences for part in _split_compound_and(s)]

    results: list[dict] = []

    for sentence in sentences:
        # Extract trigger first so we can filter out threshold-condition
        # values that appear in the trigger clause but aren't actual buffs
        # (e.g. "Reaching 250% Energy Regen" → 250 should not be a buff).
        trigger  = _extract_trigger(sentence)
        if not trigger and results and sentence.strip().lower().startswith("if "):
            # Some weapon/tooltips split a triggered effect across two sentences,
            # e.g. "After casting Intro Skill..., ignore DEF. If the target...
            # DMG taken is Amplified..." In those cases, inherit the prior
            # trigger window instead of dropping the second clause as passive.
            trigger = str(results[-1].get("trigger", "") or "")
        buffs = [
            b for b in _extract_buffs(sentence)
            if trigger == "" or b["stat"] not in trigger
        ]
        if not buffs:
            continue

        duration = _extract_duration(sentence)

        # Stacking annotations (informational – Go engine decides how to apply)
        stacks_m    = _RE_STACKS.search(sentence)
        per_stack_m = _RE_PER_STACK.search(sentence)

        entry: dict = {"trigger": trigger, "buffs": buffs, "duration": duration}
        if stacks_m:
            entry["max_stacks"] = int(stacks_m.group(1))
            entry["per_stack"] = True  # "stacking up to N times" always means accumulate
        elif per_stack_m and global_stacks > 0:
            # Stacking info was in a separate meta-sentence; attach it here.
            entry["max_stacks"] = global_stacks
            entry["per_stack"] = True

        results.append(entry)

    # Post-pass: attach global_stacks to the first triggered clause that has no
    # inline stacks yet.  This handles patterns like:
    #   "Stat +X% after Trigger.  This effect stacks up to N times."
    # Forward iteration is correct when the meta-sentence appears between two
    # distinct effects (e.g. Red Spring) — the stacking belongs to the effect
    # mentioned just before the meta-sentence, i.e. the first eligible entry.
    if global_stacks > 0:
        for entry in results:
            if "max_stacks" not in entry and entry.get("trigger"):
                entry["max_stacks"] = global_stacks
                entry["per_stack"] = True
                break

    # Post-pass: attach global_duration to entries missing explicit duration
    # when a trigger is present (meta-sentences like "This effect lasts for Xs"
    # refer to the triggered effects listed before them).
    if global_duration is not None:
        for entry in results:
            if entry.get("trigger") and entry.get("duration") is None:
                entry["duration"] = global_duration

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
        damage_types = _extract_move_damage_types(desc_en)

        values = []
        for v in move.get("values") or []:
            if not isinstance(v, dict):
                continue
            sub_name_field = v.get("name", {})
            sub_name_en = sub_name_field.get("en", "") if isinstance(sub_name_field, dict) else str(sub_name_field)
            all_vals = v.get("values") or []
            values.append({
                "id": v.get("id"),
                "name": sub_name_en,
                "values": [all_vals[-1]] if all_vals else [],
            })

        result.append({
            "id": move.get("id"),
            "type": move.get("type"),
            "sort": move.get("sort"),
            "name": name_en,
            "description": desc_en,
            "description_params": desc_params,
            "damage_types": damage_types,
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


# Regex for the "up to Y%" cap pattern used in scaling party buffs.
_RE_UP_TO_CAP = re.compile(r"up\s+to\s+(\d+(?:\.\d+)?)\s*%", re.I)
_RE_UP_TO_POINTS = re.compile(r"up\s+to\s+(\d+(?:\.\d+)?)\s+points?", re.I)

# Phrases indicating the buff applies to party members (not just the caster).
_PARTY_SCOPE_PHRASES = [
    "party member",
    "nearby party",
    "next resonator",
    "resonators on the team",
    "resonators on nearby teams",
    "resonators in the team",
    "incoming resonator",
    "all team members",
    "all resonators in the team",
    "all characters on teams nearby",
    "all nearby resonators in the team",
]

# Echo active skill party phrases (superset of _PARTY_SCOPE_PHRASES).
_ECHO_PARTY_SCOPE_PHRASES = _PARTY_SCOPE_PHRASES + [
    "all team members",
    "next character",
    "next resonator",
]

# Generic damage boost pattern used by echo skills (e.g. Impermanence Heron).
_RE_ECHO_DMG_BOOST = re.compile(
    r"damage\s+(?:dealt\s+)?(?:will\s+be\s+)?(?:boosted|increased)\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)

# ATK% with optional intermediate word "bonus" (e.g. Fallacy: "10% bonus ATK for 20s").
_RE_ECHO_BONUS_ATK = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+(?:bonus\s+)?ATK\b", re.I)

# Amplify patterns: "[Qualifier ]DMG [is ]Amplified by X%"
# Optional qualifier may be an element or move-type keyword.
_AMPLIFY_RE = re.compile(
    r"(?:(Glacio|Fusion|Electro|Aero|Havoc|Spectro"
    r"|Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation)"
    r"\s+)?DMG\s+(?:is\s+)?[Aa]mplified\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
_AMPLIFY_BY_RE = re.compile(
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro"
    r"|Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation)"
    r"\s+DMG\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
_AMPLIFY_NOUN_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s+"
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro"
    r"|Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation)"
    r"\s+DMG\s+Amplification",
    re.I,
)
# Frazzle amplify: "[Element ]Frazzle DMG [of...] by X%" (allows intervening text up to 80 chars).
# Handles weapon outro passives like "Casting Outro Skill Amplifies the Spectro Frazzle DMG of all
# Resonators on the team by 30%" where qualifiers and audience phrases sit between DMG and "by".
_AMPLIFY_FRAZZLE_RE = re.compile(
    r"(?:[A-Za-z]+\s+)?[Ff]razzle\s+DMG\b[^.]{0,80}\bby\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)

_ELEMENT_TO_CODE = {
    "glacio": "Glacio", "fusion": "Fusion", "electro": "Electro",
    "aero": "Aero", "havoc": "Havoc", "spectro": "Spectro",
}
_MOVE_TYPE_TO_CODE = {
    "basic attack": "basic_attack",
    "heavy attack": "heavy_attack",
    "resonance skill": "resonance_skill",
    "resonance liberation": "resonance_liberation",
    "echo skill": "echo",
    "aero erosion": "erosion",
}

_CONSIDERED_DMG_RE = re.compile(
    r"considered(?:\s+as)?\s+([A-Za-z][A-Za-z\s-]*?)"
    r"\s+DMG",
    re.I,
)


def _normalize_damage_type_label(label: str) -> str:
    label = re.sub(r"\s+", " ", (label or "").strip().lower())
    if not label:
        return ""

    if label in _MOVE_TYPE_TO_CODE:
        return _MOVE_TYPE_TO_CODE[label]

    # Keep future labels instead of dropping them outright.
    # Example: "Coordinated Attack" -> "coordinated_attack"
    return re.sub(r"[^a-z0-9]+", "_", label).strip("_")


def _extract_move_damage_types(description: str) -> list[str]:
    """Extract damage-classification tags from a move description.

    The source move `type` tells us which skill bucket the move belongs to
    (basic / skill / liberation / intro / forte). Some descriptions then add a
    separate rule for how the damage should actually be classified, e.g.
    "This instance of DMG is considered Basic Attack DMG."
    """
    if not description:
        return []

    out: list[str] = []
    for m in _CONSIDERED_DMG_RE.finditer(description):
        code = _normalize_damage_type_label(m.group(1))
        if code and code not in out:
            out.append(code)
    return out


def _append_amplify_entry(out: list[dict], qualifier: str, value: float) -> None:
    qualifier = (qualifier or "").strip().lower()
    entry: dict = {"type": "amplify", "value": value}
    if qualifier in _ELEMENT_TO_CODE:
        entry["element"] = _ELEMENT_TO_CODE[qualifier]
    elif qualifier in _MOVE_TYPE_TO_CODE:
        entry["move_type"] = _MOVE_TYPE_TO_CODE[qualifier]
    if entry not in out:
        out.append(entry)


def _extract_amplify_buffs(text: str) -> list[dict]:
    """Extract amplify buffs across the common wording variants used in LB text."""
    out: list[dict] = []

    for amp_m in _AMPLIFY_RE.finditer(text):
        _append_amplify_entry(out, amp_m.group(1) or "", float(amp_m.group(2)))

    lower = text.lower()
    if "amplif" in lower:
        for amp_m in _AMPLIFY_BY_RE.finditer(text):
            _append_amplify_entry(out, amp_m.group(1), float(amp_m.group(2)))
        for amp_m in _AMPLIFY_NOUN_RE.finditer(text):
            _append_amplify_entry(out, amp_m.group(2), float(amp_m.group(1)))

    if "frazzle" in lower:
        for fraz_m in _AMPLIFY_FRAZZLE_RE.finditer(text):
            entry = {"type": "amplify", "move_type": "frazzle", "value": float(fraz_m.group(1))}
            if entry not in out:
                out.append(entry)

    return out


_RES_PEN_RE = re.compile(
    r"(?:reduce|reduces|reducing)\s+(?:their|the target'?s?|targets'?|enemy'?s?)?\s*"
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro)\s+RES\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
_AERO_EROSION_AMP_RE = re.compile(
    r"aero erosion dmg.*?amplified by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)


def _append_unique_party_buff(out: list[dict], entry: dict) -> None:
    if entry not in out:
        out.append(entry)


def _split_buff_sentences(text: str) -> list[str]:
    text = re.sub(r"\bCrit\.\s+", "Crit ", text)
    text = re.sub(r"\bRegen\.\s+", "Regen ", text)
    return [s.strip() for s in re.split(r"(?:\.\s+|\.\n+|\n+)", text) if s.strip()]


def _stat_to_party_buffs(stat: str, value: float) -> list[dict]:
    if stat == "Crit Rate":
        return [{"type": "critRate", "value": value}]
    if stat == "Crit DMG":
        return [{"type": "critDMG", "value": value}]
    if stat in ("ATK", "ATK%"):
        return [{"type": "atkPercentage", "value": value}]
    if stat == "All Attribute DMG":
        return [{"type": "elementalDMG", "value": value}]
    if stat in ("Aero DMG", "Glacio DMG", "Fusion DMG", "Electro DMG", "Havoc DMG", "Spectro DMG"):
        return [{"type": "elementalDMG", "element": stat.replace(" DMG", ""), "value": value}]
    if stat in ("Basic DMG Bonus",):
        return [{"type": "moveTypeDMG", "value": value}]
    if stat in ("Basic Attack DMG Bonus", "Basic Attack DMG"):
        return [{"type": "moveTypeDMG", "move_type": "basic_attack", "value": value}]
    if stat in ("Heavy Attack DMG Bonus", "Heavy Attack DMG"):
        return [{"type": "moveTypeDMG", "move_type": "heavy_attack", "value": value}]
    if stat in ("Resonance Skill DMG Bonus", "Resonance Skill DMG"):
        return [{"type": "moveTypeDMG", "move_type": "resonance_skill", "value": value}]
    if stat in ("Resonance Liberation DMG Bonus", "Resonance Liberation DMG"):
        return [{"type": "moveTypeDMG", "move_type": "resonance_liberation", "value": value}]
    if stat == "Echo Skill DMG Bonus":
        return [{"type": "moveTypeDMG", "move_type": "echo", "value": value}]
    return []


def _extract_team_debuff_buffs(text: str) -> list[dict]:
    out: list[dict] = []
    for m in _RES_PEN_RE.finditer(text):
        _append_unique_party_buff(out, {
            "type": "resPen",
            "element": _ELEMENT_TO_CODE[m.group(1).lower()],
            "value": -float(m.group(2)),
        })
    for m in _AERO_EROSION_AMP_RE.finditer(text):
        _append_unique_party_buff(out, {
            "type": "amplify",
            "move_type": "erosion",
            "value": float(m.group(1)),
        })
    return out


def _parse_party_scoped_buffs(text: str) -> list[dict]:
    out: list[dict] = []
    for sentence in _split_buff_sentences(text):
        lower = sentence.lower()
        if not any(phrase in lower for phrase in _PARTY_SCOPE_PHRASES):
            continue
        emitted_types: set[tuple[str, str, str]] = set()

        for cap_m in _RE_UP_TO_CAP.finditer(sentence):
            cap_val = float(cap_m.group(1))
            after_cap = sentence[cap_m.end():cap_m.end() + 60].lstrip()
            stat_m = _STAT_RE.match(after_cap)
            if stat_m:
                for entry in _stat_to_party_buffs(_stat_name_for_match(stat_m), cap_val):
                    _append_unique_party_buff(out, entry)
                    emitted_types.add((entry.get("type", ""), entry.get("element", ""), entry.get("move_type", "")))
                continue

            before_cap = sentence[max(0, cap_m.start() - 60):cap_m.start()]
            stat_back_m = None
            for sm in _STAT_RE.finditer(before_cap):
                stat_back_m = sm
            if stat_back_m:
                for entry in _stat_to_party_buffs(_stat_name_for_match(stat_back_m), cap_val):
                    _append_unique_party_buff(out, entry)
                    emitted_types.add((entry.get("type", ""), entry.get("element", ""), entry.get("move_type", "")))

        for cap_m in _RE_UP_TO_POINTS.finditer(sentence):
            cap_val = float(cap_m.group(1))
            before_cap = sentence[max(0, cap_m.start() - 80):cap_m.start()]
            stat_back_m = None
            for sm in _STAT_RE.finditer(before_cap):
                stat_back_m = sm
            if stat_back_m and _stat_name_for_match(stat_back_m) == "ATK":
                entry = {"type": "atkFlat", "value": cap_val}
                _append_unique_party_buff(out, entry)
                emitted_types.add((entry["type"], "", ""))

        for b in _extract_buffs(sentence):
            for entry in _stat_to_party_buffs(b["stat"], b["value"]):
                key = (entry.get("type", ""), entry.get("element", ""), entry.get("move_type", ""))
                if key in emitted_types:
                    continue
                _append_unique_party_buff(out, entry)

        for entry in _extract_amplify_buffs(sentence):
            _append_unique_party_buff(out, entry)

    return out


def _parse_support_text_buffs(text: str) -> list[dict]:
    out = _parse_party_scoped_buffs(text)
    for entry in _extract_team_debuff_buffs(text):
        _append_unique_party_buff(out, entry)
    # Weapon outro Frazzle amplify: enemy-scoped ("on targets around active Resonator")
    # but team-facing — any Frazzle DMG by any team member benefits, like RES shred.
    for fraz_m in _AMPLIFY_FRAZZLE_RE.finditer(text):
        _append_unique_party_buff(out, {"type": "amplify", "move_type": "frazzle", "value": float(fraz_m.group(1))})
    return out


def _parse_echo_party_buffs(effect_en: str) -> list[dict]:
    """Parse party-scoped buffs from an echo's active skill description.

    Handles phrases like "all team members X% bonus ATK" and "next character's
    damage dealt will be boosted by X%".  Returns a list of buff dicts in the
    same shape as CharPartyBuff: {"type": ..., "value": ...} plus optional
    "element" / "move_type" for amplify entries.
    """
    if not effect_en:
        return []

    party_buffs: list[dict] = []
    # Split on sentence boundaries (period + whitespace or end-of-string).
    sentences = [s.strip() for s in re.split(r"\.(?:\s+|$)", effect_en) if s.strip()]

    for sentence in sentences:
        lower = sentence.lower()
        if not any(phrase in lower for phrase in _ECHO_PARTY_SCOPE_PHRASES):
            continue

        # ATK%, handles "10% bonus ATK" and plain "ATK +10%" forms.
        for m in _RE_ECHO_BONUS_ATK.finditer(sentence):
            party_buffs.append({"type": "atkPercentage", "value": float(m.group(1))})

        # Other named stats (Crit Rate, Crit DMG, etc.) via shared extractor.
        for b in _extract_buffs(sentence):
            stat = b["stat"]
            val = b["value"]
            if stat == "Crit Rate":
                party_buffs.append({"type": "critRate", "value": val})
            elif stat == "Crit DMG":
                party_buffs.append({"type": "critDMG", "value": val})

        # Generic damage boost ("damage dealt will be boosted by X%").
        for m in _RE_ECHO_DMG_BOOST.finditer(sentence):
            party_buffs.append({"type": "moveTypeDMG", "value": float(m.group(1))})

        # Amplify patterns.
        for entry in _extract_amplify_buffs(sentence):
            party_buffs.append(entry)

    return party_buffs


def _parse_char_kit_party_buffs(char: dict) -> list[dict]:
    """Parse party-scoped buffs from a character's move descriptions at S0.

    Chains are excluded because they are sequence-locked (at S0 no chains active).
    Returns a list of buff dicts, each with at least {"type": ..., "value": ...}.
    amplify buffs may also have "element" or "move_type".
    """
    moves = char.get("moves") or []
    party_buffs: list[dict] = []

    for move in moves:
        if not isinstance(move, dict):
            continue

        desc_field = move.get("description", {})
        desc_en = desc_field.get("en", "") if isinstance(desc_field, dict) else str(desc_field or "")
        desc_en = _MARKUP_RE.sub("", desc_en).strip()
        desc_params = [str(v) for v in (move.get("descriptionParams") or [])]

        if not desc_en:
            continue

        # Resolve {N} placeholders in the description text.
        resolved = _resolve_effect_placeholders(desc_en, [], desc_params)

        # Check if this move is party-scoped.
        lower = resolved.lower()
        if any(phrase in lower for phrase in _PARTY_SCOPE_PHRASES):
            for cap_m in _RE_UP_TO_CAP.finditer(resolved):
                cap_val = float(cap_m.group(1))
                after_cap = resolved[cap_m.end():cap_m.end() + 60].lstrip()
                stat_m = _STAT_RE.match(after_cap)
                if stat_m:
                    stat_name = _stat_name_for_match(stat_m)
                    if stat_name == "Crit Rate":
                        party_buffs.append({"type": "critRate", "value": cap_val})
                        continue
                    if stat_name == "Crit DMG":
                        party_buffs.append({"type": "critDMG", "value": cap_val})
                        continue

                before_cap = resolved[max(0, cap_m.start() - 60):cap_m.start()]
                stat_back_m = None
                for sm in _STAT_RE.finditer(before_cap):
                    stat_back_m = sm
                if stat_back_m:
                    stat_name = _stat_name_for_match(stat_back_m)
                    if stat_name == "Crit Rate":
                        party_buffs.append({"type": "critRate", "value": cap_val})
                    elif stat_name == "Crit DMG":
                        party_buffs.append({"type": "critDMG", "value": cap_val})

            for cap_m in _RE_UP_TO_POINTS.finditer(resolved):
                cap_val = float(cap_m.group(1))
                before_cap = resolved[max(0, cap_m.start() - 80):cap_m.start()]
                stat_back_m = None
                for sm in _STAT_RE.finditer(before_cap):
                    stat_back_m = sm
                if stat_back_m and _stat_name_for_match(stat_back_m) == "ATK":
                    party_buffs.append({"type": "atkFlat", "value": cap_val})

            for b in _extract_buffs(resolved):
                stat = b["stat"]
                val = b["value"]
                if stat == "Crit Rate":
                    if not any(pb["type"] == "critRate" for pb in party_buffs):
                        party_buffs.append({"type": "critRate", "value": val})
                elif stat == "Crit DMG":
                    if not any(pb["type"] == "critDMG" for pb in party_buffs):
                        party_buffs.append({"type": "critDMG", "value": val})
                elif stat in ("ATK", "ATK%"):
                    party_buffs.append({"type": "atkPercentage", "value": val})

            for entry in _extract_amplify_buffs(resolved):
                party_buffs.append(entry)

            # Explicit team-scoped elemental DMG wording like Ciaccona Solo Concert.
            for sentence in _split_buff_sentences(resolved):
                sentence_lower = sentence.lower()
                if not (
                    "dmg bonus to all nearby resonators in the team" in sentence_lower or
                    "dmg for all resonators in the team by" in sentence_lower or
                    "grants all resonators in the team" in sentence_lower or
                    "grant the incoming resonator" in sentence_lower
                ):
                    continue
                for b in _extract_buffs(sentence):
                    if b["stat"] in ("Aero DMG", "Glacio DMG", "Fusion DMG", "Electro DMG", "Havoc DMG", "Spectro DMG", "All Attribute DMG"):
                        for entry in _stat_to_party_buffs(b["stat"], b["value"]):
                            _append_unique_party_buff(party_buffs, entry)

        for entry in _extract_team_debuff_buffs(resolved):
            _append_unique_party_buff(party_buffs, entry)

        # Support-side target-state enabling like Chisa's Thread of Bane.
        # We treat this as party-facing because teammate loadouts are modeled
        # as fully-achievable support shells during the DPS window.
        if "thread of bane" in lower:
            for m in _RE_DEF_IGNORE.finditer(resolved):
                _append_unique_party_buff(party_buffs, {"type": "defIgnore", "value": float(m.group(1))})

    return party_buffs


def _parse_weapon_party_buffs_by_rank(weapon: dict) -> list[list[dict]]:
    out: list[list[dict]] = []
    effect_en = (weapon.get("effect") or {}).get("en", "")
    for rank in range(1, 6):
        resolved = _resolve_effect_placeholders(effect_en, [], _params_for_rank(weapon, rank))
        resolved = _MARKUP_RE.sub("", resolved).strip()
        buffs = _parse_support_text_buffs(resolved)
        out.append(buffs)
    return out

_RE_DEF_IGNORE = re.compile(
    r"\bignore\s+(\d+(?:\.\d+)?)\s*%\s+of\s+(?:(?:the\s+target'?s|their)\s+)?DEF\b",
    re.I,
)

_RE_INHERENT_ELEM_GAIN = re.compile(
    r"\bgain(?:s)?\s+(\d+(?:\.\d+)?)\s*%\s+"
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro)\s+DMG\s+Bonus\b",
    re.I,
)

_RE_INHERENT_MOVE_GAIN = re.compile(
    r"\bgain(?:s)?\s+(\d+(?:\.\d+)?)\s*%\s+"
    r"(Basic|Heavy|Resonance Skill|Resonance Liberation)\s+DMG\s+Bonus\b",
    re.I,
)

_RE_INHERENT_INTRO_MV = re.compile(
    r"DMG\s+Multiplier\s+of\s+Intro\s+Skill\b.*?\bis\s+increased\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)

def _parse_char_inherent_self_buffs(char: dict) -> list[dict]:
    """Parse self-scoped buffs from a character's inherent skills (type=4 moves) at S0.

    These are typically always-on personal passives like:
      - "Jinhsi gains 20% Spectro DMG Bonus."
      - "Gain 15% Basic DMG Bonus."
      - "DMG Multiplier of Intro Skill ... is increased by 50%."

    Returns a list of buff dicts in the same shape as CharPartyBuff.
    NOTE: This intentionally does NOT try to model conditional/stacking mechanics.
    """
    moves = char.get("moves") or []
    out: list[dict] = []

    for move in moves:
        if not isinstance(move, dict):
            continue
        if move.get("type") != 4:
            continue

        desc_field = move.get("description", {})
        desc_en = desc_field.get("en", "") if isinstance(desc_field, dict) else str(desc_field or "")
        desc_en = _MARKUP_RE.sub("", desc_en).strip()
        if not desc_en:
            continue
        desc_params = [str(v) for v in (move.get("descriptionParams") or [])]
        resolved = _resolve_effect_placeholders(desc_en, [], desc_params)
        if not resolved:
            continue

        # Skip anything party-scoped (rare for inherents, but safe).
        lower = resolved.lower()
        if any(phrase in lower for phrase in _PARTY_SCOPE_PHRASES):
            continue

        # Elemental DMG bonus (always-on).
        for m in _RE_INHERENT_ELEM_GAIN.finditer(resolved):
            out.append({"type": "elementalDMG", "element": m.group(2).title(), "value": float(m.group(1))})

        # Move-type DMG bonus (Basic/Heavy/RS/RL).
        for m in _RE_INHERENT_MOVE_GAIN.finditer(resolved):
            kind = m.group(2).strip().lower()
            mt = None
            if kind == "basic":
                mt = "basic_attack"
            elif kind == "heavy":
                mt = "heavy_attack"
            elif kind == "resonance skill":
                mt = "resonance_skill"
            elif kind == "resonance liberation":
                mt = "resonance_liberation"
            if mt:
                out.append({"type": "moveTypeDMG", "move_type": mt, "value": float(m.group(1))})

        # Intro MV multiplier (applies only to intro moves).
        mv_m = _RE_INHERENT_INTRO_MV.search(resolved)
        if mv_m:
            out.append({"type": "mvMultiplier", "move_type": "intro", "value": float(mv_m.group(1))})

    # De-dupe exact entries while preserving order.
    uniq: list[dict] = []
    for e in out:
        if e not in uniq:
            uniq.append(e)
    return uniq

def _build_character_bases(
    full_chars: list[dict]
) -> dict[str, dict]:
    out: dict[str, dict] = {}

    for char in full_chars:
        cdn_id = str(char.get("id"))
        name = (char.get("name") or {}).get("en", "")
        element = ((char.get("element") or {}).get("name") or {}).get("en", "") or "Spectro"
        weapon_type = ((char.get("weapon") or {}).get("name") or {}).get("en", "Sword")
        legacy_id = str(char.get("legacyId", "") or "").strip() or cdn_id

        stats = char.get("stats", {})
        hp = int(round(float(stats.get("Life", 0) or 0)))
        atk = int(round(float(stats.get("Atk", 0) or 0)))
        defense = int(round(float(stats.get("Def", 0) or 0)))

        forte_nodes = _extract_forte_nodes(char)
        sequence_bonuses = _extract_sequence_bonuses(char)
        chains = _extract_chains_lb(char)
        moves = _extract_moves_lb(char)
        party_buffs_s0 = _parse_char_kit_party_buffs(char)
        self_buffs_s0 = _parse_char_inherent_self_buffs(char)

        out[cdn_id] = {
            "name": name,
            "element": element,
            "weaponType": weapon_type,
            "legacyId": legacy_id,
            "forte_nodes": forte_nodes,
            "sequence_bonuses": sequence_bonuses,
            "chains": chains,
            "moves": moves,
            "party_buffs_s0": party_buffs_s0,
            "self_buffs_s0": self_buffs_s0,
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

        resolved_r1 = _resolve_effect_placeholders(effect_en, [], params_r1)
        resolved_r5 = _resolve_effect_placeholders(effect_en, [], params_r5)
        effects_r1 = _parse_effect_en(resolved_r1)
        effects_r5 = _parse_effect_en(resolved_r5)

        # For 4-star weapons, use R5 values in the Go effects (easier to obtain at R5).
        go_effects_source = effects_r5 if rarity_str == "4-star" else effects_r1
        weapon_effects = _derive_go_weapon_effects(go_effects_source, rarity_str)
        party_buffs_by_rank = _parse_weapon_party_buffs_by_rank(w)

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
            "effects_r1": effects_r1,
            "effects_r5": effects_r5,
            "party_buffs_by_rank": party_buffs_by_rank,
            "weapon_effects": weapon_effects,
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
            "party_buffs": _parse_echo_party_buffs(effect_en),
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
                "party_buffs": _parse_support_text_buffs(effect_en),
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
