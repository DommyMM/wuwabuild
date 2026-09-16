"""Generate LB base-data from local synced game data.

Inputs are all from frontend public/Data/: Characters, Weapons, Echoes, EchoStats, Fetters,
CharacterCurve and LevelCurve.

Outputs land in lb/internal/calc/data/:
  character_bases.json
  weapon_bases.json    lv1 ATK and secondary, effect_en, params_r1 and params_r5
  echo_bases.json
  fetter_bases.json    piece_effects carry the parsed `effects` arrays and hand-declared `display_bonuses`
  character_curve.json
  level_curve.json
  echo_stats.json
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata

_MARKUP_RE = re.compile(r"<[^>]+>")
from pathlib import Path
from typing import Any
from cdn_config import pick, write_bytes_atomic, write_json_atomic

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
ECHO_STATS_JSON = DATA_DIR / "EchoStats.json"
LEGACY_ECHOES_JSON = SCRIPTS_DIR.parent / "lib" / "data" / "legacyEchoes.json"
LEGACY_WEAPONS_JSON = SCRIPTS_DIR.parent / "lib" / "data" / "legacyWeapons.json"

CHARACTER_BASES_JSON = DATA_OUTPUT_DIR / "character_bases.json"
WEAPON_BASES_JSON = DATA_OUTPUT_DIR / "weapon_bases.json"
ECHO_BASES_JSON = DATA_OUTPUT_DIR / "echo_bases.json"
FETTER_BASES_JSON = DATA_OUTPUT_DIR / "fetter_bases.json"
CHARACTER_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "character_curve.json"
LEVEL_CURVE_OUT_JSON = DATA_OUTPUT_DIR / "level_curve.json"
ECHO_STATS_OUT_JSON = DATA_OUTPUT_DIR / "echo_stats.json"

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
    30: "QuietSnow", 31: "Memories", 32: "Adam", 33: "Feathered",
    34: "EvilPurge", 35: "Nether",
}


NAME_TOKEN_ALIASES = {
    "baby": "young",      # Baby Roseshroom (current) vs Young Roseshroom (legacy)
    "reminiscence": "",   # Reminiscence prefixes are absent in some legacy labels
}


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_name(name: str) -> str:
    # Normalize diacritics ("Jué" -> "Jue"), punctuation and known wording drift
    folded = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(ch for ch in folded if not unicodedata.combining(ch))
    tokens = re.findall(r"[a-z]+|\d+", ascii_name.lower())
    normalized_tokens: list[str] = []
    for token in tokens:
        # Treat a possessive "'s" split as noise
        if token == "s":
            continue
        if token in NAME_TOKEN_ALIASES:
            token = NAME_TOKEN_ALIASES[token]
        if token == "":
            continue
        # Smooth the singular and plural spellings the legacy catalogs disagree on
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
    json_kwargs = (
        {"ensure_ascii": False, "indent": 2, "sort_keys": True}
        if pretty
        else {"ensure_ascii": False, "separators": (",", ":"), "sort_keys": True}
    )
    write_json_atomic(path, data, **json_kwargs)
    print(f"Wrote {path}")


def _copy_file(src: Path, dst: Path, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would copy {src} -> {dst}")
        return
    write_bytes_atomic(dst, src.read_bytes())
    print(f"Copied {src} -> {dst}")


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


# Fetter effect_en parser: turns 5pc and 3pc free text into `effects` arrays the Go engine consumes directly
#
# Each effect carries three keys:
#   trigger   the condition that activates the buff, verbatim from the source ("releasing Intro Skill")
#             empty means passive, active for the whole rotation
#   buffs     one {stat, value} per stat granted, value in display units (10.0 for 10%)
#             stat uses the canonical names character_bases stats and echo_bases bonuses use
#   duration  seconds the buff lasts, or null when the effect names none, which reads as the full rotation
#
# Two more when relevant:
#   max_stacks  maximum stack count for an accumulating buff
#   per_stack   true when `value` is per-stack, so the total at full stacks is value * max_stacks
#
# The original effect_en travels alongside `effects` so a human can audit what the parser produced.
#
# Canonical stat names, matching character_bases.json and echo_bases bonuses:
#   ATK, DEF, HP, Crit Rate, Crit DMG, Energy Regen, Healing Bonus
#   Aero DMG, Glacio DMG, Fusion DMG, Electro DMG, Havoc DMG, Spectro DMG
#   Basic Attack DMG Bonus, Heavy Attack DMG Bonus, Resonance Skill DMG Bonus, Resonance Liberation DMG Bonus
#   Echo Skill DMG Bonus, Outro Skill DMG, Coordinated Attack DMG (non-substat extras)

# (canonical_name, regex_fragment) pairs, longer entries first so a short one never claims a partial match
# "Resonance Skill DMG Bonus" has to precede "Resonance Skill DMG"
_STAT_NAMES: list[tuple[str, str]] = [
    # Move-type DMG bonuses, most specific first
    ("Resonance Liberation DMG Bonus", r"Resonance Liberation DMG Bonus"),
    ("Resonance Skill DMG Bonus",      r"Resonance Skill DMG Bonus"),
    ("Basic Attack DMG Bonus",         r"Basic Attack DMG Bonus"),
    ("Heavy Attack DMG Bonus",         r"Heavy Attack DMG Bonus"),
    # Generic all-move-type bonus with no move prefix, e.g. Red Spring's forte trigger
    ("Basic DMG Bonus",                r"Basic DMG Bonus"),
    # Non-substat DMG types, kept for future engine support
    ("Echo Skill DMG Bonus",           r"Echo Skill DMG Bonus"),
    ("Echo Skill DMG",                 r"Echo Skill DMG(?! Bonus)"),
    ("Coordinated Attack DMG",         r"Coordinated Attack DMG"),
    ("Outro Skill DMG",                r"Outro Skill DMG(?! Bonus)"),
    # Move-type DMG without the "Bonus" suffix, less common, so checked after the Bonus variants
    ("Resonance Liberation DMG",       r"Resonance Liberation DMG(?! Bonus)"),
    ("Resonance Skill DMG",            r"Resonance Skill DMG(?! Bonus)"),
    ("Basic Attack DMG",               r"Basic Attack DMG(?! Bonus)"),
    ("Heavy Attack DMG",               r"Heavy Attack DMG(?! Bonus)"),
    # Elemental DMG, where effect_en's occasional "Aero DMG Bonus" is the same stat, the suffix being stylistic
    ("Aero DMG",     r"Aero DMG(?:\s+Bonus)?"),
    ("Glacio DMG",   r"Glacio DMG(?:\s+Bonus)?"),
    ("Fusion DMG",   r"Fusion DMG(?:\s+Bonus)?"),
    ("Electro DMG",  r"Electro DMG(?:\s+Bonus)?"),
    ("Havoc DMG",    r"Havoc DMG(?:\s+Bonus)?"),
    ("Spectro DMG",  r"Spectro DMG(?:\s+Bonus)?"),
    # "all Attribute DMG" and "Attribute DMG" both mean the generic all-element bonus
    ("All Attribute DMG", r"(?:[Aa]ll[-\s])?[Aa]ttribute DMG(?:\s+Bonus)?"),
    # Generic "DMG Boost", e.g. Bell-Borne Geochelone's team-wide 10%
    ("DMG Boost", r"DMG Boost"),
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
    """Combined alternation over _STAT_NAMES, named s0, s1, ... so a match recovers its canonical name by index."""
    parts = [f"(?P<s{i}>{pat})" for i, (_, pat) in enumerate(_STAT_NAMES)]
    return re.compile("|".join(parts))


_STAT_RE = _build_stat_regex()

# Numeric value, duration and stacking extraction
_RE_PCT       = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_RE_DURATION  = re.compile(
    r"(?:"
    r"(?:lasting\s+for|lasting|for|lasts?|each\s+stack\s+lasts?)\s+(\d+(?:\.\d+)?)"
    r"(?:\s*%?\s*s\b|(?=\s*[,.]|\s*$))"
    r"|"
    r"(\d+(?:\.\d+)?)\s*%?\s*s?\s+(?:after|upon|while|during|within)\b"
    r")",
    re.I
)
_RE_STACKS    = re.compile(r"stack(?:ing|s)?\s+up\s+to\s+(\d+)(?:\s+times?)?|max\s+(\d+)\s+stacks?", re.I)
_RE_PER_STACK = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+every\s+\d", re.I)  # "5% every 1.5s"

_ELEMENT_AMP_TO_CODE = {
    "glacio": "Glacio",
    "fusion": "Fusion",
    "electro": "Electro",
    "aero": "Aero",
    "havoc": "Havoc",
    "spectro": "Spectro",
}

_STATUS_DMG_AMP_TO_MOVE_TYPE = {
    "glacio chafe": "glacio_bite",
    "spectro frazzle": "frazzle",
    "aero erosion": "erosion",
}

# Trigger-condition prefixes that start a clause
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
    return m.group(0)  # fall back to the raw matched text


# Damage the effect deals, as opposed to a stat bonus it grants
# The elemental stat patterns accept a bare "Havoc DMG", so "deal additional 480% Havoc DMG" would read as a buff
# The verb is the only thing telling the two apart
_DAMAGE_INSTANCE_RE = re.compile(
    r"\bdeal(?:s|ing)?\s+(?:an?\s+)?(?:additional\s+)?\d+(?:\.\d+)?\s*%\s+"
    r"(?:Havoc|Spectro|Glacio|Fusion|Electro|Aero)\s+DMG\b",
    re.I,
)


def _extract_buffs(text: str) -> list[dict]:
    """Find every (stat, value) buff pair in the text.

    Three orderings occur:
      "30% Aero DMG Bonus"     value then stat
      "Aero DMG + 10%"         stat then value, separated by +
      "increases ATK by 15%"   stat then value, separated by "by"
    """
    buffs: list[dict] = []
    used: list[tuple[int, int]] = []  # (start, end) spans already claimed

    def _overlaps(s: int, e: int) -> bool:
        return any(a < e and b > s for a, b in used)

    # Pass 0 claims damage instances before anything can read them as buffs
    # Nothing is emitted, the span is reserved purely so later passes skip it
    for dmg_m in _DAMAGE_INSTANCE_RE.finditer(text):
        used.append(dmg_m.span())

    # Pass B2 handles scoped DEF and RES penetration, "MOVETYPE DMG ignores X% DEF and Y% Element RES on targets"
    # Runs before Pass A so it claims those spans ahead of the generic value+stat pass
    _MOVE_TYPE_TO_CODE = {
        "basic attack":         "basic_attack",
        "heavy attack":         "heavy_attack",
        "resonance skill":      "resonance_skill",
        "resonance liberation": "resonance_liberation",
        "echo skill":           "echo",
    }
    move_def_res_m = re.search(
        r"\b(Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Echo Skill)"
        r"\s+DMG\s+ignores?\s+(\d+(?:\.\d+)?)\s*%\s+"
        r"(?:of\s+(?:the\s+)?(?:target'?s?\s+)?)?"
        r"DEF"
        r"(?:\s+and\s+(\d+(?:\.\d+)?)\s*%\s+(Havoc|Spectro|Glacio|Fusion|Electro|Aero)\s+RES)?",
        text, re.I,
    )
    if move_def_res_m:
        mt_key = _MOVE_TYPE_TO_CODE.get(move_def_res_m.group(1).lower(), "")
        span = move_def_res_m.span()
        if mt_key and not _overlaps(*span):
            buffs.append({"stat": "DEF Ignore", "move_type": mt_key, "value": float(move_def_res_m.group(2))})
            used.append(span)
            if move_def_res_m.group(3) and move_def_res_m.group(4):
                buffs.append({
                    "stat": "RES Ignore",
                    "element": move_def_res_m.group(4).capitalize(),
                    "move_type": mt_key,
                    "value": -float(move_def_res_m.group(3)),
                })

    # Pass A is move-specific amplification, Frazzle included
    # Runs before the generic "% StatName" matcher, so "24% Heavy Attack DMG Amplification" is not truncated to a buff
    for elem_amp_m in re.finditer(
        r"\b(Glacio|Fusion|Electro|Aero|Havoc|Spectro)\s+DMG\s+(?:is\s+)?"
        r"[Aa]mplified\s+by\s+(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    ):
        span = elem_amp_m.span()
        if not _overlaps(*span):
            element = _ELEMENT_AMP_TO_CODE.get(elem_amp_m.group(1).lower(), "")
            buffs.append({
                "stat": "DMG Amplification",
                "element": element,
                "value": float(elem_amp_m.group(2)),
            })
            used.append(span)

    for status_amp_m in re.finditer(
        r"\b(Glacio\s+Chafe|Spectro\s+Frazzle|Aero\s+Erosion)\s+DMG\b"
        r"[^.]{0,100}\b[Aa]mplified\s+by\s+(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    ):
        span = status_amp_m.span()
        if not _overlaps(*span):
            move_type = _STATUS_DMG_AMP_TO_MOVE_TYPE.get(
                re.sub(r"\s+", " ", status_amp_m.group(1).strip().lower()),
                "",
            )
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": move_type,
                "value": float(status_amp_m.group(2)),
            })
            used.append(span)

    # Verb form, "Amplif[y/ies] [the] [Element] Frazzle DMG [intervening text] by X%"
    frazzle_amp_m = re.search(
        r"\bAmplif(?:y|ies)\s+(?:the\s+)?(?:[A-Za-z]+\s+)?[Ff]razzle\s+DMG\b[^.]{0,80}\bby\s+(\d+(?:\.\d+)?)\s*%",
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
    # Noun form, "X% [Element] Frazzle DMG Amplification"
    noun_frazzle_m = re.search(
        r"(\d+(?:\.\d+)?)\s*%\s+(?:[A-Za-z]+\s+)?[Ff]razzle\s+DMG\s+Amplification\b",
        text,
        re.I,
    )
    if noun_frazzle_m:
        span = noun_frazzle_m.span()
        if not _overlaps(*span):
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": "frazzle",
                "value": float(noun_frazzle_m.group(1)),
            })
            used.append(span)

    move_type_map = {
        "basic attack": "basic_attack",
        "heavy attack": "heavy_attack",
        "resonance skill": "resonance_skill",
        "resonance liberation": "resonance_liberation",
        "echo skill": "echo",
    }
    # Noun form "X% MOVETYPE DMG Amplification" is the canonical wording, value first
    # Runs before the verb form below, whose trailing ".*?\d+%" can otherwise latch onto a later clause's number
    # "32% Echo Skill DMG Amplification, and ignore 8% of the target's DEF" would parse 8 and starve the DEF pass
    move_amp_noun_m = re.search(
        r"(\d+(?:\.\d+)?)\s*%\s+"
        r"(Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Echo Skill)\s+DMG\s+Amplification\b",
        text,
        re.I,
    )
    if move_amp_noun_m:
        move_type = move_type_map.get(move_amp_noun_m.group(2).strip().lower())
        span = move_amp_noun_m.span()
        if move_type and not _overlaps(*span):
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": move_type,
                "value": float(move_amp_noun_m.group(1)),
            })
            used.append(span)
    # Verb form, value trailing: "MOVETYPE DMG Amplification ... X%"
    move_amp_m = re.search(
        r"\b(Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Echo Skill)\s+DMG\s+Amplification\b.*?\b(\d+(?:\.\d+)?)\s*%",
        text,
        re.I,
    )
    if move_amp_m:
        move_type = move_type_map.get(move_amp_m.group(1).strip().lower())
        span = move_amp_m.span()
        if move_type and not _overlaps(*span):
            buffs.append({
                "stat": "DMG Amplification",
                "move_type": move_type,
                "value": float(move_amp_m.group(2)),
            })
            used.append(span)

    # Pass A3 is move-type-scoped Crit Rate and Crit DMG
    # "Dealing Echo Skill DMG increases Heavy Attack Crit. Rate by 20%" applies to Heavy Attack hits only
    # Emitting it unscoped gave Flamewing's Shadow both its clauses on every hit, +40 instead of +20
    # Runs before Passes B and C so the generic "<stat> by <value>%" matcher cannot truncate it to a bare "Crit Rate"
    # The move type must sit immediately before "Crit", since the trigger clause usually names another move type
    _CRIT_STAT_NAME = {"rate": "Crit Rate", "dmg": "Crit DMG"}
    _MOVE_TYPE_ALT = "Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Echo Skill"
    for scoped_crit_m in re.finditer(
        rf"\b({_MOVE_TYPE_ALT})\s+Crit\.?\s*(Rate|DMG)\b"
        r"(?:[^.]{0,40}?\bby\b)?\s*(\d+(?:\.\d+)?)\s*%",
        text, re.I,
    ):
        move_type = move_type_map.get(scoped_crit_m.group(1).strip().lower())
        span = scoped_crit_m.span()
        if move_type and not _overlaps(*span):
            buffs.append({
                "stat": _CRIT_STAT_NAME[scoped_crit_m.group(2).lower()],
                "move_type": move_type,
                "value": float(scoped_crit_m.group(3)),
            })
            used.append(span)
    # Value-first wording, "grants 20% Heavy Attack Crit. Rate"
    for scoped_crit_pre_m in re.finditer(
        rf"(\d+(?:\.\d+)?)\s*%\s+({_MOVE_TYPE_ALT})\s+Crit\.?\s*(Rate|DMG)\b",
        text, re.I,
    ):
        move_type = move_type_map.get(scoped_crit_pre_m.group(2).strip().lower())
        span = scoped_crit_pre_m.span()
        if move_type and not _overlaps(*span):
            buffs.append({
                "stat": _CRIT_STAT_NAME[scoped_crit_pre_m.group(3).lower()],
                "move_type": move_type,
                "value": float(scoped_crit_pre_m.group(1)),
            })
            used.append(span)

    # Pass B is "X% StatName", value before stat
    for pct_m in _RE_PCT.finditer(text):
        val = float(pct_m.group(1))
        increase_after = text[pct_m.end():pct_m.end() + 90].lstrip()
        increase_m = re.match(r"(?:increase|increased)\s+in\s+", increase_after, re.I)
        if increase_m:
            stat_m = _STAT_RE.match(increase_after[increase_m.end():])
            if stat_m:
                span_end = pct_m.end() + len(text[pct_m.end():pct_m.end() + 90]) - len(increase_after) + increase_m.end() + stat_m.end()
                if not _overlaps(pct_m.start(), span_end):
                    buffs.append({"stat": _stat_name_for_match(stat_m), "value": val})
                    used.append((pct_m.start(), span_end))
                    continue
        # A deal-verb right before the value means combat damage, as in "dealing 2.5% Electro DMG each hit"
        # Buff phrasings never put the value straight after the verb, and "deal 15% more Havoc DMG" fails on "more"
        before = text[max(0, pct_m.start() - 16):pct_m.start()]
        if re.search(r"\bdeal(?:s|ing|t)?\s+$", before, re.I):
            continue
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
                # In "X% StatA and StatB" the value covers both, as in Adam Smasher 1pc
                # Only fires when StatB has no value of its own, so "20% ATK and 10% Crit Rate" fails the stat match
                stat_pos = text.find(stat_m.group(0), after_start)
                if stat_pos >= 0:
                    cont_start = stat_pos + len(stat_m.group(0))
                    and_m = re.match(r"\s+and\s+", text[cont_start:])
                    if and_m:
                        stat2_start = cont_start + and_m.end()
                        stat2_m = _STAT_RE.match(text[stat2_start:])
                        if stat2_m and not _overlaps(stat2_start, stat2_start + stat2_m.end()):
                            buffs.append({"stat": _stat_name_for_match(stat2_m), "value": val})
                            used.append((cont_start, stat2_start + stat2_m.end()))

    # Pass C is "ignore(s) X% of the target's DEF"
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

    # Pass D is "StatName + X%" or "StatName ... by X%", stat before value
    # The window is 80 chars wide to reach the value in wordy constructions like Pact
    # A stat name sitting between this stat and the value means "A increases B by X%", where B is the buffed one
    for stat_m in _STAT_RE.finditer(text):
        stat = _stat_name_for_match(stat_m)
        immediate = text[stat_m.end():stat_m.end() + 24]
        immediate_m = re.match(r"\s+(?:Bonus\s+)?(\d+(?:\.\d+)?)\s*%", immediate, re.I)
        if immediate_m:
            span_end = stat_m.end() + immediate_m.end()
            if not _overlaps(stat_m.start(), span_end):
                buffs.append({"stat": stat, "value": float(immediate_m.group(1))})
                used.append((stat_m.start(), span_end))
                continue
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

    # Pass E is the generic "the DMG taken ... is Amplified by X%"
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


def _stack_count(match: re.Match[str]) -> int:
    return int(match.group(1) or match.group(2))


def _extract_trigger(text: str) -> str:
    """Extract the condition/trigger clause from an effect sentence.

    Looks for:
    1. A leading condition phrase ("Hitting …", "Upon using …", "While …", …)
       up to the first comma or buff verb.
    2. A trailing "after/upon releasing MOVE" clause after the stat+value.
    Falls back to "" (passive / always-active) if neither is found.
    """
    # Pattern 1, clause starts with a known trigger keyword
    cond_m = re.match(
        r"^((?:Hitting|Casting|Using|While|Upon|After|When|Dealing|Inflicting|Performing|"
        r"Holding|Reaching|Every\s+time)\b.+?)"
        r"(?:,\s*|\s+(?:increases?|grants?|gains?))",
        text, re.I,
    )
    if cond_m:
        return cond_m.group(1).strip().rstrip(",")

    # Pattern 2, "STAT + X% after/upon TRIGGER"
    after_m = re.search(
        r"\b(?:after|upon)\b\s+(?:releasing\s+)?(.+?)(?:\.|,|$)", text, re.I
    )
    if after_m:
        return after_m.group(1).strip().rstrip(".,")

    return ""


# " and " followed immediately by a trigger-start keyword
# _split_compound_and uses it to separate two differently triggered clauses joined by "and" in one sentence
# "Casting Resonance Skill grants X for 15s and casting Resonance Liberation increases Y by Z%"
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


# Canonical trigger-move keys, matching weapon_effects.go TriggerMove values
_TRIGGER_MOVE_PATTERNS: list[tuple[str, str]] = [
    (r"tune\s+break",                              "Passive"),
    (r"tune\s+rupture",                            "Passive"),
    # DOT-applier kits keep the debuff up across nearly every move in the wielder's rotation, so Passive
    (r"applies\s+(?:glacio\s+chafe|havoc\s+bane|aero\s+erosion|spectro\s+frazzle)", "Passive"),
    (r"while\s+the\s+wielder\s+is\s+on\s+the\s+field", "Passive"),
    (r"while\s+both\s+effects?\s+are\s+active",    "Passive"),
    (r"(?:targets?|enemies?)\s+with\s+spectro\s+frazzle", "Passive"),
    (r"negative\s+statuses",                       "Passive"),
    # FB and Strain appliers (Forged Dwarf Star, Glint of Clouds) keep the debuff up the same way, so Passive
    # Tooltips use both "inflicts" and "inflicting", and matching only the "-s" form dropped Glint of Clouds entirely
    (r"inflict(?:s|ing)?\s+fusion\s+burst",        "Passive"),
    (r"inflict(?:s|ing)?\s+tune\s+strain",         "Passive"),
    (r"concerto\s+energy",                         "forte"),
    (r"\becho\s+skill\b",                          "echoSkill"),
    (r"\boutro\s+skill\b",                         "outro"),
    (r"\bintro\s+skill\b",                         "intro"),
    (r"\bresonance\s+liberation\b",                "liberation"),
    (r"\bresonance\s+skill\b",                     "skill"),
    (r"\bheavy\s+attacks?\b",                      "heavy"),
    (r"\bbasic\s+attacks?\b",                      "basic"),
    (r"\bhitting\s+a\s+target\b",                  "basic"),
    (r"\bdealing\s+heavy\s+attack\s+dmg",          "heavy"),
    (r"\bdealing\s+basic\s+attack\s+dmg",          "basic"),
]

# Stat name → (go_type, element, moveType), None meaning the stat is unsupported and gets skipped
_STAT_TO_GO_EFFECT: dict[str, tuple[str, str, str]] = {
    "ATK":                              ("atkPercentage", "", ""),
    "Crit Rate":                        ("critRate",      "", ""),
    "Crit DMG":                         ("critDMG",       "", ""),
    "DEF Ignore":                       ("defIgnore",     "", ""),
    "RES Ignore":                       ("resPen",        "", ""),  # element supplied by buff dict
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
    "Echo Skill DMG":                   ("moveTypeDMG",   "", "echo"),
    "Aero DMG":     ("elementalDMG", "Aero",    ""),
    "Glacio DMG":   ("elementalDMG", "Glacio",  ""),
    "Fusion DMG":   ("elementalDMG", "Fusion",  ""),
    "Electro DMG":  ("elementalDMG", "Electro", ""),
    "Havoc DMG":    ("elementalDMG", "Havoc",   ""),
    "Spectro DMG":  ("elementalDMG", "Spectro", ""),
}


def _trigger_to_move_keys(trigger: str) -> list[str]:
    """Normalize raw trigger text to a list of canonical trigger-move keys.

    A compound trigger splits, so "Casting Intro Skill or Resonance Liberation" gives ["intro", "liberation"]
    An unrecognisable trigger gives []
    An empty trigger also gives [], because passive_bonuses already covers it and emitting it would double-count
    An explicitly team-triggered effect like "tune break" gives ["Passive"]
    """
    if not trigger.strip():
        return []  # unconditional: already in passive_bonuses, don't emit weapon_effect
    # Split on literal " or " for multi-trigger phrases, but only where each side names a recognisable move
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


# Fields identifying which effect an entry is, as opposed to how strong it is at a given refinement
# Same signature at the same list position means the same effect at R1 and R5, so the values pair as endpoints
# Duration is excluded because it scales rather than identifies, as Autumntrace shows by differing per rank
_GO_EFFECT_STRUCTURAL_KEYS = (
    "type", "triggerMove", "element", "moveType", "maxStacks", "stacking",
)


def _go_effect_signature(entry: dict) -> tuple:
    """Structural identity of one Go-ready weapon effect entry."""
    return tuple(entry.get(key, "") for key in _GO_EFFECT_STRUCTURAL_KEYS)


def _derive_go_weapon_effects_at_rank(effects: list[dict]) -> list[dict]:
    """Produce Go-ready weapon effect dicts from one parsed effects_rN list.

    Each output dict has keys: type, triggerMove, value, and optionally
    element, moveType, duration, maxStacks, stacking.

    Skips effects whose stat maps to None (amplify, defIgnore, unsupported).
    Skips effects containing "amplif" in the trigger text (DMG Amplification).
    """
    out: list[dict] = []
    for eff in effects:
        trigger = eff.get("trigger", "")
        # DMG Amplification is handled by hand, so skip it here
        if re.search(r"amplif", trigger, re.I):
            continue
        move_keys = _trigger_to_move_keys(trigger)
        if not move_keys:
            continue

        max_stacks: int = eff.get("max_stacks", 0)
        per_stack: bool = eff.get("per_stack", False)
        stacking = "accumulate" if (max_stacks > 0 and per_stack) else ""
        duration = eff.get("duration")

        # Only the first recognised trigger key is used per entry
        # An "X or Y" trigger fires once and cannot stack with itself, so two identical entries would be wrong
        move_key = move_keys[0]

        for buff in eff.get("buffs", []):
            stat = buff.get("stat", "")
            value = buff.get("value", 0.0)
            type_info = _STAT_TO_GO_EFFECT.get(stat)
            if type_info is None:
                continue  # DEF, HP, Energy Regen and the rest have no Go effect
            go_type, element, move_type = type_info
            buff_move_type = str(buff.get("move_type", "") or "").strip()
            if buff_move_type:
                move_type = buff_move_type
            buff_element = str(buff.get("element", "") or "").strip()
            if buff_element:
                element = buff_element

            entry: dict = {
                "type":        go_type,
                "triggerMove": move_key,
                "value":       value,
            }
            if element:
                entry["element"] = element
            if move_type:
                entry["moveType"] = move_type
            # A missing duration on a non-Passive trigger emits -1, meaning the full rotation
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


def _derive_go_weapon_effects(
    effects_r1: list[dict],
    effects_r5: list[dict],
    rarity: str,
) -> list[dict]:
    """Produce Go-ready weapon effects carrying both refinement endpoints.

    Each entry keeps the baked `value` and `duration`, read at R5 for 4-star weapons and R1 for everything else
    It adds `valueR1` and `valueR5`, plus `durationR1` and `durationR5` where a duration parsed
    The Go loader interpolates linearly in four equal steps, so a weapon at its standard rank reproduces the bake
    When the R1 and R5 parses do not line up structurally, the standard-rank value goes to both endpoints
    That weapon then does not scale, which beats pairing unrelated clauses
    The same flat fallback covers 3-star weapons, whose bake rank and Go StandardWeaponRank disagree
    Honest endpoints would double the "of Night" starters' Intro ATK buff and move stored board scores
    They stay flat until that mismatch is fixed deliberately with a recalc
    """
    entries_r1 = _derive_go_weapon_effects_at_rank(effects_r1)
    entries_r5 = _derive_go_weapon_effects_at_rank(effects_r5)
    baked_from_r5 = rarity == "4-star"
    standard_rank_is_r5 = rarity != "5-star"
    standard = entries_r5 if baked_from_r5 else entries_r1

    aligned = (
        baked_from_r5 == standard_rank_is_r5
        and len(entries_r1) == len(entries_r5)
        and all(
            _go_effect_signature(a) == _go_effect_signature(b)
            for a, b in zip(entries_r1, entries_r5)
        )
    )

    out: list[dict] = []
    for idx, entry in enumerate(standard):
        low = entries_r1[idx] if aligned else entry
        high = entries_r5[idx] if aligned else entry
        merged = dict(entry)
        merged["valueR1"] = low.get("value", 0.0)
        merged["valueR5"] = high.get("value", 0.0)
        if "duration" in entry:
            merged["durationR1"] = low.get("duration", entry["duration"])
            merged["durationR5"] = high.get("duration", entry["duration"])
        out.append(merged)
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

    effect_en = re.sub(r"<br\s*/?>", ". ", effect_en, flags=re.I)
    effect_en = _MARKUP_RE.sub("", effect_en)
    effect_en = re.sub(r"\{[^}]+\}", "", effect_en)

    # Normalise in-word abbreviations holding ". " so they do not trigger false sentence splits
    text = re.sub(r"\bCrit\.\s+", "Crit ", effect_en)
    text = re.sub(r"\bRegen\.\s+", "Regen ", text)

    # Meta-sentences like "This effect stacks up to N times" are kept for now, so the pre-pass can read them
    _META_RE = re.compile(
        r"^(?:this effect|effects? of the same name|cd\s*:)", re.I
    )
    sentences = [s.strip() for s in re.split(r"\.\s+", text.rstrip(".")) if s.strip()]

    # Stacking and duration come off the meta-sentences first, so a buff whose stacking sentence was split off
    # (Attack set: "ATK +5% every 1.5s." then "This effect stacks up to 4 times.") still gets them
    global_stacks = 0
    global_duration: float | None = None
    for s in sentences:
        if _META_RE.match(s):
            m = _RE_STACKS.search(s)
            if m:
                global_stacks = _stack_count(m)
            d = _extract_duration(s)
            if d is not None:
                global_duration = d

    sentences = [s for s in sentences if not _META_RE.match(s)]

    # Expand compound "and [TriggerKeyword]" clauses so each trigger gets its own entry
    # A simple conjunction inside one clause ("Basic Attack or Heavy Attack") is untouched
    sentences = [part for s in sentences for part in _split_compound_and(s)]

    results: list[dict] = []

    for sentence in sentences:
        lower_sentence = sentence.lower()
        # Trigger comes first so threshold values inside it are not read as buffs
        # "Reaching 250% Energy Regen" must not emit a 250 buff
        trigger  = _extract_trigger(sentence)
        if not trigger and results and sentence.strip().lower().startswith("if "):
            # Some tooltips split one triggered effect across two sentences, the second opening with "If the target"
            # Inherit the previous trigger window instead of dropping that clause as passive
            trigger = str(results[-1].get("trigger", "") or "")
        if "for every" in lower_sentence and any(phrase in lower_sentence for phrase in _PARTY_SCOPE_PHRASES):
            buffs = []
        else:
            buffs = [
                b for b in _extract_buffs(sentence)
                if trigger == "" or b["stat"] not in trigger
            ]
            # Clauses buffing the incoming Resonator go, since `effects` is the wielder-facing list
            # Those bonuses still reach the team through _parse_party_scoped_buffs
            for b in _incoming_scoped_clause_buffs(sentence):
                if b in buffs:
                    buffs.remove(b)
        if not buffs:
            continue

        duration = _extract_duration(sentence)

        # Stacking annotations are informational, the Go engine decides how to apply them
        stacks_m    = _RE_STACKS.search(sentence)
        per_stack_m = _RE_PER_STACK.search(sentence)

        entry: dict = {"trigger": trigger, "buffs": buffs, "duration": duration}
        if stacks_m:
            entry["max_stacks"] = _stack_count(stacks_m)
            entry["per_stack"] = True  # "stacking up to N times" always means accumulate
        elif per_stack_m and global_stacks > 0:
            # Stacking info was in a separate meta-sentence, so attach it here
            entry["max_stacks"] = global_stacks
            entry["per_stack"] = True

        results.append(entry)

    # global_stacks goes to the last triggered clause with no inline stacks yet
    # "Stat +X% after TriggerA. Stat +Y% after TriggerB. This effect stacks up to N times." is the shape
    # Reverse iteration is right because a trailing meta-sentence belongs to the most recent triggered entry
    # Frosty Resolve is the case, where "stacks up to 2 times" refers to its RS DMG effect
    if global_stacks > 0:
        for entry in reversed(results):
            if "max_stacks" not in entry and entry.get("trigger"):
                entry["max_stacks"] = global_stacks
                entry["per_stack"] = True
                break

    # global_duration goes to triggered entries with no duration, since "This effect lasts for Xs" refers back
    if global_duration is not None:
        for entry in results:
            if entry.get("trigger") and entry.get("duration") is None:
                entry["duration"] = global_duration

    return results


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
            raw_val = float(pick(first, "value", "Value", default=0) or 0)
            is_ratio = bool(pick(first, "isRatio", "IsRatio", default=False))
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
    """Chain (sequence) data for the lb JSON: id, English name, English description, params and bonus."""
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
            if _skip_sequence_bonus(char, chain, i, bonus):
                continue
            bonuses.append({
                "minSequence": i + 1,
                "stat": bonus["stat"],
                "value": float(bonus["value"])
            })
    return bonuses


def _extract_inherent_bonuses(char: dict) -> list[dict]:
    """Always-on inherent-skill stat bonuses, as sync_characters.parse_inherent_bonuses wrote them.

    Passed through verbatim, since the canonical stat names already match applyStatString
    """
    raw = char.get("inherentBonuses")
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for bonus in raw:
        if isinstance(bonus, dict) and bonus.get("stat") and bonus.get("value") is not None:
            out.append({"stat": bonus["stat"], "value": float(bonus["value"])})
    return out


def _skip_sequence_bonus(char: dict, chain: dict, index: int, bonus: dict) -> bool:
    """Drop chain.bonus entries whose value disagrees with the chain's first param.

    By CDN convention `bonus.value` mirrors the magnitude of `param[0]`, the unconditional headline bonus
    A disagreement means the bonus was authored against a different param, usually a later conditional clause
    Such a bonus cannot be applied flat
    """
    try:
        value = float(bonus.get("value"))
    except (TypeError, ValueError):
        return False

    params = chain.get("param") or []
    if not params:
        return True

    raw = params[0]
    if not isinstance(raw, str):
        return True

    try:
        param_value = float(raw.replace("%", "").replace(",", ".").strip())
    except ValueError:
        return True

    return param_value != value


# The "up to Y%" cap that scaling party buffs carry
_RE_UP_TO_CAP = re.compile(r"up\s+to\s+(\d+(?:\.\d+)?)\s*%", re.I)
_RE_UP_TO_POINTS = re.compile(r"up\s+to\s+(\d+(?:\.\d+)?)\s+points?", re.I)

# Phrases marking a buff as reaching party members, not just the caster
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

# Echo active skill party phrases, a superset of _PARTY_SCOPE_PHRASES
_ECHO_PARTY_SCOPE_PHRASES = _PARTY_SCOPE_PHRASES + [
    "all team members",
    "current team members",
    "next character",
    "next resonator",
]

# Generic damage boost an echo skill grants, e.g. Impermanence Heron
_RE_ECHO_DMG_BOOST = re.compile(
    r"damage\s+(?:dealt\s+)?(?:will\s+be\s+)?(?:boosted|increased)\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
# Echo and support "increase the DMG Bonus ... by X%", as Hyvatia phrases it for the next Resonator on stage
# Distinct from _RE_ECHO_DMG_BOOST, which requires the word "damage"
_RE_ECHO_DMG_BONUS_BOOST = re.compile(
    r"increase[sd]?\s+(?:the\s+)?DMG\s+Bonus\b[^.]{0,80}\bby\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
# Party-scoped "increases/increased DMG dealt by X%", as in Lynae Liberation 24% or Spectrum Blaster 8% per stack
# Group 1 is the value in "increases the DMG dealt ... by X%", group 2 in "DMG dealt ... is increased by X%"
_RE_PARTY_DMG_INCREASE = re.compile(
    r"(?:increase[sd]?\s+the\s+DMG\s+dealt\b[^.]{0,100}\bby\s+(\d+(?:\.\d+)?)\s*%"
    r"|DMG\s+dealt\b[^.]{0,100}\bis\s+increased\s+by\s+(\d+(?:\.\d+)?)\s*%)",
    re.I,
)

# ATK% with an optional "bonus" in between, as Fallacy writes "10% bonus ATK for 20s"
_RE_ECHO_BONUS_ATK = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+(?:bonus\s+)?ATK\b", re.I)

# Amplify patterns, "[Qualifier ]DMG [is ]Amplified by X%", where the optional qualifier is an element or move type
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
    r"(All|Glacio|Fusion|Electro|Aero|Havoc|Spectro"
    r"|Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation)?"
    # Hyphen-joined variants occur in skill text, as in Aemeath's "10% All-DMG Amplification"
    r"[\s\-]*DMG\s+Amplification",
    re.I,
)
# Frazzle amplify verb form, "[Element ]Frazzle DMG [of...] by X%", tolerating up to 80 chars in between
# Weapon outro passives put qualifiers and an audience phrase between DMG and "by"
_AMPLIFY_FRAZZLE_RE = re.compile(
    r"(?:[A-Za-z]+\s+)?[Ff]razzle\s+DMG\b[^.)]{0,80}\bby\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)
# Frazzle amplify noun form, "X% [Element] Frazzle DMG Amplification", as Phoebe's Attentive Heart writes it
_AMPLIFY_FRAZZLE_NOUN_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s+(?:[A-Za-z]+\s+)?[Ff]razzle\s+DMG\s+Amplification\b",
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

    # An unknown label is slugged rather than dropped, so "Coordinated Attack" becomes "coordinated_attack"
    return re.sub(r"[^a-z0-9]+", "_", label).strip("_")


def _extract_move_damage_types(description: str) -> list[str]:
    """Extract damage-classification tags from a move description.

    The source move `type` gives the skill bucket: basic, skill, liberation, intro or forte
    A description can then reclassify the damage itself, "This instance of DMG is considered Basic Attack DMG"
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
        for noun_m in _AMPLIFY_FRAZZLE_NOUN_RE.finditer(text):
            entry = {"type": "amplify", "move_type": "frazzle", "value": float(noun_m.group(1))}
            if entry not in out:
                out.append(entry)

    return out


_RES_PEN_RE = re.compile(
    r"(?:reduce|reduces|reducing)\s+"
    r"(?:(?:their|the\s+target'?s?|targets'?|enemy'?s?|the)\s+)?"
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro)\s+RES\b"
    r"[^.]{0,60}\bby\s+(\d+(?:\.\d+)?)\s*%",
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
    text = re.sub(r"<br\s*/?>", ". ", text, flags=re.I)
    text = _MARKUP_RE.sub("", text)
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
    if stat in ("All Attribute DMG", "DMG Boost"):
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
    """Extract team-facing debuffs and unconditional amplify effects from any text.

    These are always party-facing by definition regardless of scope phrases:
    - Elemental RES reduction on enemies (benefits any team member dealing that element)
    - Frazzle DMG Amplification granted to/applied for the active resonator
    - Aero Erosion DMG amplify
    """
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
    # Frazzle DMG Amplification, verb form "Amplifies [the] Frazzle DMG ... by X%"
    lower = text.lower()
    if "frazzle" in lower:
        for m in _AMPLIFY_FRAZZLE_RE.finditer(text):
            # "Frazzle DMG dealt by [CharName]" with no team-scope indicator benefits that character alone
            ctx = text[max(0, m.start() - 120):m.end()].lower()
            if "dealt by" in ctx and not any(p in ctx for p in (
                "other resonator", "resonators in the team", "all resonators", "incoming resonator",
            )):
                continue
            _append_unique_party_buff(out, {
                "type": "amplify",
                "move_type": "frazzle",
                "value": float(m.group(1)),
            })
        # Noun form, "X% [Element] Frazzle DMG Amplification"
        for m in _AMPLIFY_FRAZZLE_NOUN_RE.finditer(text):
            _append_unique_party_buff(out, {
                "type": "amplify",
                "move_type": "frazzle",
                "value": float(m.group(1)),
            })
    return out


_SELF_SCOPE_RE = re.compile(
    r"\b(?:to|for)\s+the\s+wielder\b|\bwielder'?s\b|\bwielder\s+gains?\b", re.I,
)


def _self_scoped_clause_buffs(sentence: str) -> list[dict]:
    """Collect buffs from sub-clauses explicitly scoped to the wielder.

    A party-scoped sentence can mix self and team clauses, as Skull Thrasher does
    The wielder clause's stats must not land on the party
    """
    excluded: list[dict] = []
    for clause in re.split(r",\s+(?:and\s+)?|;\s*", sentence):
        lower = clause.lower()
        if not _SELF_SCOPE_RE.search(clause):
            continue
        if any(p in lower for p in _PARTY_SCOPE_PHRASES):
            continue
        for b in _extract_buffs(clause):
            excluded.extend(_stat_to_party_buffs(b["stat"], b["value"]))
    return excluded


_INCOMING_SCOPE_RE = re.compile(r"\b(?:incoming|next)\s+Resonator\b", re.I)


def _incoming_scoped_clause_buffs(sentence: str) -> list[dict]:
    """Collect buffs from sub-clauses granted to the incoming Resonator.

    Mirror of _self_scoped_clause_buffs, for buffs belonging to whoever swaps in rather than the wielder
    They are already emitted through `party_buffs`, so leaving them in `effects` too would double-count
    Moonlit Clouds' "increases the ATK of the next Resonator by 22.5%" would hand the wearer a phantom +22.5%
    """
    excluded: list[dict] = []
    for clause in re.split(r",\s+(?:and\s+)?|;\s*", sentence):
        if not _INCOMING_SCOPE_RE.search(clause):
            continue
        excluded.extend(_extract_buffs(clause))
    return excluded


# Named states handed to the whole team, as Firstlight's Herald grants "Kingfisher" then buffs ATK by token
# The granting sentence is party-scoped but carries no number
# The sentence carrying the number names its audience by token, not by any of _PARTY_SCOPE_PHRASES
# Without linking the two the payload is dropped entirely
_RE_TOKEN_GRANT_TRAILING = re.compile(
    r"grants?\s+(?:all\s+)?(?:nearby\s+)?(?:party members|Resonators)"
    r"(?:\s+(?:in|on)\s+(?:the\s+)?team)?\s+"
    r"([A-Z][A-Za-z']*(?:\s+[A-Z][A-Za-z']*)*)"
)
_RE_TOKEN_GRANT_LEADING = re.compile(
    r"[Gg]rants?\s+([A-Z][A-Za-z']*(?:\s+[A-Z][A-Za-z']*)*)\s+to\s+"
    r"(?:all\s+)?(?:nearby\s+)?(?:party members|Resonators)"
)


def _party_buff_tokens(text: str) -> list[str]:
    """Collect names of buff states this text grants to the whole team."""
    tokens: list[str] = []
    for pattern in (_RE_TOKEN_GRANT_TRAILING, _RE_TOKEN_GRANT_LEADING):
        for m in pattern.finditer(text):
            token = m.group(1).strip()
            if token and token not in tokens:
                tokens.append(token)
    return tokens


def _targets_party_token(sentence: str, tokens: list[str]) -> bool:
    """True when the sentence addresses holders of a team-granted buff token."""
    lower = sentence.lower()
    return any(
        f"resonator with {token.lower()}" in lower
        or f"resonators with {token.lower()}" in lower
        for token in tokens
    )


def _capped_party_dmg_value(text: str, match_end: int, value: float) -> float:
    """Resolve a "DMG dealt is increased by X%" figure to the buff's real ceiling.

    Two suffixes can follow the figure and they mean opposite things:
      "...by 0.2%, up to 12%"     0.2 is the per-unit rate, 12 is the buff
      "...by 8%, up to 3 stacks"  8 is per stack, so the buff is 8 x 3
    Without the first case an ER-scaled tier like Suisui's outro syncs as +0.2%
    """
    cap_m = _RE_UP_TO_CAP.match(text[match_end:].lstrip(" ,"))
    if cap_m:
        return float(cap_m.group(1))
    stack_m = re.search(r"up\s+to\s+(\d+)\s+stacks?", text, re.I)
    if stack_m:
        return value * int(stack_m.group(1))
    return value


def _parse_party_scoped_buffs(text: str) -> list[dict]:
    out: list[dict] = []
    tokens = _party_buff_tokens(text)
    for sentence in _split_buff_sentences(text):
        lower = sentence.lower()
        if not any(phrase in lower for phrase in _PARTY_SCOPE_PHRASES) and not _targets_party_token(
            sentence, tokens
        ):
            continue
        emitted_types: set[tuple[str, str, str]] = set()
        self_scoped = _self_scoped_clause_buffs(sentence)

        for cap_m in _RE_UP_TO_CAP.finditer(sentence):
            cap_val = float(cap_m.group(1))
            scaling_clause = sentence[max(0, cap_m.start() - 140):cap_m.end()]
            scaling_m = re.search(r"increase\s+in\s+(.+?)\s+to\s+.*?\bfor\s+every\b", scaling_clause, re.I)
            if scaling_m:
                stat_m = _STAT_RE.match(scaling_m.group(1).strip())
                if stat_m:
                    for entry in _stat_to_party_buffs(_stat_name_for_match(stat_m), cap_val):
                        _append_unique_party_buff(out, entry)
                        emitted_types.add((entry.get("type", ""), entry.get("element", ""), entry.get("move_type", "")))
                    continue
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
                if entry in self_scoped:
                    self_scoped.remove(entry)
                    continue
                _append_unique_party_buff(out, entry)

        for entry in _extract_amplify_buffs(sentence):
            _append_unique_party_buff(out, entry)

        # Generic "increases/increased DMG dealt by X%", as Spectrum Blaster and Lynae Liberation write it
        for m in _RE_PARTY_DMG_INCREASE.finditer(sentence):
            val = float(m.group(1) if m.group(1) is not None else m.group(2))
            val = _capped_party_dmg_value(sentence, m.end(), val)
            _append_unique_party_buff(out, {"type": "elementalDMG", "value": val})

    return out


def _parse_support_text_buffs(text: str) -> list[dict]:
    out = _parse_party_scoped_buffs(text)
    for entry in _extract_team_debuff_buffs(text):
        _append_unique_party_buff(out, entry)
    # Weapon outro Frazzle amp is enemy-scoped but team-facing, so any member's Frazzle DMG benefits, like RES shred
    for fraz_m in _AMPLIFY_FRAZZLE_RE.finditer(text):
        _append_unique_party_buff(out, {"type": "amplify", "move_type": "frazzle", "value": float(fraz_m.group(1))})
    return out


def _parse_echo_party_buffs(effect_en: str) -> list[dict]:
    """Parse party-scoped buffs from an echo's active skill description.

    Handles "all team members X% bonus ATK" and "next character's damage dealt will be boosted by X%"
    Entries take the CharPartyBuff shape, {"type", "value"} plus "element" or "move_type" on an amplify
    """
    if not effect_en:
        return []

    party_buffs: list[dict] = []
    # Sentence boundary is a period followed by whitespace or end of string
    sentences = [s.strip() for s in re.split(r"\.(?:\s+|$)", effect_en) if s.strip()]

    for sentence in sentences:
        lower = sentence.lower()
        if not any(phrase in lower for phrase in _ECHO_PARTY_SCOPE_PHRASES):
            continue

        # ATK%, in both the "10% bonus ATK" and "ATK +10%" forms
        for m in _RE_ECHO_BONUS_ATK.finditer(sentence):
            party_buffs.append({"type": "atkPercentage", "value": float(m.group(1))})

        # Named stats through the shared extractor, so Crit Rate, Crit DMG, All Attribute DMG and the rest
        for b in _extract_buffs(sentence):
            for entry in _stat_to_party_buffs(b["stat"], b["value"]):
                if entry not in party_buffs:
                    party_buffs.append(entry)

        # Generic damage boost, "damage dealt will be boosted by X%"
        for m in _RE_ECHO_DMG_BOOST.finditer(sentence):
            party_buffs.append({"type": "moveTypeDMG", "value": float(m.group(1))})

        # "increase the DMG Bonus ... by X%", as in Hyvatia's next-resonator buff
        for m in _RE_ECHO_DMG_BONUS_BOOST.finditer(sentence):
            party_buffs.append({"type": "elementalDMG", "value": float(m.group(1))})

        # Amplify patterns
        for entry in _extract_amplify_buffs(sentence):
            party_buffs.append(entry)

    return party_buffs


def _append_unique_echo_bonus(out: list[dict], entry: dict) -> None:
    key = (
        entry.get("stat", ""),
        entry.get("value", 0),
        tuple(entry.get("characterCondition") or []),
    )
    for existing in out:
        if (
            existing.get("stat", ""),
            existing.get("value", 0),
            tuple(existing.get("characterCondition") or []),
        ) == key:
            return
    out.append(entry)


def _extract_echo_character_condition(sentence: str) -> list[str] | None:
    """Detect character-restricted main-slot bonuses (mirrors sync_echoes).

    Matches "When Lucy or Rebecca has this Echo equipped ..." and "When Resonator: Aero ... equips this Echo"
    A generic "the Resonator with this Echo equipped" is no condition
    """
    has_match = re.search(r"\bWhen\s+([A-Z].*?)\s+(?:has|have)\s+this\s+Echo\s+equipped", sentence)
    if has_match and "resonator" not in has_match.group(1).lower():
        tokens = [t.strip() for t in re.split(r"\s+or\s+|,", has_match.group(1)) if t.strip()]
        if tokens:
            return tokens
    by_match = re.search(r"\bby\s+([A-Z][A-Za-z]+)\b", sentence)
    if by_match:
        return [by_match.group(1)]
    resonator_match = re.search(r"\bResonator:\s*([^.]+?)\s+equips\b", sentence, re.I)
    if resonator_match:
        tokens = [t.strip() for t in re.split(r"\s+or\s+|,", resonator_match.group(1)) if t.strip()]
        if tokens:
            return tokens
    return None


def _parse_echo_main_slot_bonuses(effect_en: str) -> list[dict]:
    """Parse first-slot echo bonuses from main-slot-only description text."""
    if not effect_en:
        return []

    bonuses: list[dict] = []
    for sentence in _split_buff_sentences(effect_en):
        lower = sentence.lower()
        if not (
            "main slot" in lower
            or "echo equipped" in lower
            or "equipped in their main slot" in lower
            or "equipped in the main slot" in lower
        ):
            continue

        condition = _extract_echo_character_condition(sentence)
        for buff in _extract_buffs(sentence):
            stat = buff.get("stat", "")
            stat = {
                "Basic Attack DMG": "Basic Attack DMG Bonus",
                "Heavy Attack DMG": "Heavy Attack DMG Bonus",
                "Resonance Skill DMG": "Resonance Skill DMG Bonus",
                "Resonance Liberation DMG": "Resonance Liberation DMG Bonus",
            }.get(stat, stat)
            value = float(buff.get("value", 0) or 0)
            if stat and value:
                entry: dict = {"stat": stat, "value": value}
                if condition:
                    entry["characterCondition"] = condition
                _append_unique_echo_bonus(bonuses, entry)

    return bonuses


def _build_self_possessive_re(char: dict) -> "re.Pattern[str] | None":
    """Build a regex matching "<CharName>'s <Stat>" for the caster.

    Detects self-buff sentences masquerading as party buffs, returning None when no English name is usable
    """
    name_obj = char.get("name")
    char_name = ""
    if isinstance(name_obj, dict):
        char_name = (name_obj.get("en") or "").strip()
    elif isinstance(name_obj, str):
        char_name = name_obj.strip()
    if not char_name:
        return None

    # Stat alternation mirrors _STAT_NAMES, staying permissive on whitespace and the dotted "Crit." spelling
    stat_alt = (
        r"Crit\.?\s*Rate|Crit\.?\s*DMG|ATK|HP|DEF|"
        r"Resonance\s+(?:Skill|Liberation|Heavy\s+Attack|Basic\s+Attack)\s+DMG(?:\s+Bonus)?|"
        r"Healing\s+Bonus|Energy\s+Regen(?:eration)?|"
        r"All[-\s]?Attribute\s+DMG(?:\s+Bonus)?|"
        r"(?:Aero|Glacio|Fusion|Electro|Havoc|Spectro)\s+DMG(?:\s+Bonus)?"
    )
    # An increase-verb has to follow the possessive, so "Aemeath's Crit. DMG increases by 20%" counts
    # A scaling-input reference like "for every 0.2% of Shorekeeper's Energy Regen" does not
    increase_alt = (
        r"increases?(?:\s+by)?|"
        r"is\s+increased(?:\s+by)?|"
        r"gains?|gets?|"
        r"\+|"
        r"by\s+\d"
    )
    return re.compile(
        rf"\b{re.escape(char_name)}'s\s+(?:{stat_alt})\s+(?:{increase_alt})",
        re.I,
    )


def _parse_char_kit_party_buffs(char: dict) -> list[dict]:
    """Parse party-scoped buffs from a character's move descriptions at S0.

    Chains are excluded because they are sequence-locked and no chain is active at S0
    Each entry carries at least {"type", "value"}, and an amplify may add "element" or "move_type"
    """
    moves = char.get("moves") or []
    party_buffs: list[dict] = []

    # A sentence can carry a team-scope trigger phrase while the buff target is "<CharName>'s <Stat>"
    # That buff belongs to the caster, as in Aemeath's "Resonators in the team inflict ..., Aemeath's Crit. DMG"
    self_possessive_re = _build_self_possessive_re(char)

    for move in moves:
        if not isinstance(move, dict):
            continue

        desc_field = move.get("description", {})
        desc_en = desc_field.get("en", "") if isinstance(desc_field, dict) else str(desc_field or "")
        desc_en = _MARKUP_RE.sub("", desc_en).strip()
        desc_params = [str(v) for v in (move.get("descriptionParams") or [])]

        if not desc_en:
            continue

        # Resolve the {N} placeholders in the description text
        resolved = _resolve_effect_placeholders(desc_en, [], desc_params)

        # Check whether this move is party-scoped
        lower = resolved.lower()
        if any(phrase in lower for phrase in _PARTY_SCOPE_PHRASES):
            # Crit and ATK caps are read per sentence, so a party-scope phrase in one sentence cannot
            # promote a self-only buff in another, as it did for Mornye's ER-scaled self crit
            for sentence in _split_buff_sentences(resolved):
                if not any(phrase in sentence.lower() for phrase in _PARTY_SCOPE_PHRASES):
                    continue

                # A sentence buffing the caster's own stat is a self-buff triggered by a team action
                if self_possessive_re is not None and self_possessive_re.search(sentence):
                    continue

                # Sentences gated on team composition or enemy class are not universal, so they never auto-flow
                # Lupa's "If there are 3 Fusion Resonators in the team, ... against Overlord targets" is the case
                stripped = sentence.lstrip(" -•\t").lower()
                if stripped.startswith("if there are ") or stripped.startswith("if there is "):
                    continue

                # "..., up to X%" is the ceiling, while the bare percentage earlier in the sentence is the rate
                # The cap is emitted and its type recorded so the rate below does not also fire
                # Otherwise Suisui's "ATK is increased by 0.1%, up to 50%" lands as +0.1% instead of +50%
                emitted_types: set[tuple[str, str, str]] = set()

                for cap_m in _RE_UP_TO_CAP.finditer(sentence):
                    cap_val = float(cap_m.group(1))
                    after_cap = sentence[cap_m.end():cap_m.end() + 60].lstrip()
                    stat_m = _STAT_RE.match(after_cap)
                    if stat_m is None:
                        before_cap = sentence[max(0, cap_m.start() - 60):cap_m.start()]
                        for sm in _STAT_RE.finditer(before_cap):
                            stat_m = sm
                    if stat_m is None:
                        continue
                    for entry in _stat_to_party_buffs(_stat_name_for_match(stat_m), cap_val):
                        _append_unique_party_buff(party_buffs, entry)
                        emitted_types.add(
                            (entry.get("type", ""), entry.get("element", ""), entry.get("move_type", ""))
                        )

                for cap_m in _RE_UP_TO_POINTS.finditer(sentence):
                    cap_val = float(cap_m.group(1))
                    before_cap = sentence[max(0, cap_m.start() - 80):cap_m.start()]
                    stat_back_m = None
                    for sm in _STAT_RE.finditer(before_cap):
                        stat_back_m = sm
                    if stat_back_m and _stat_name_for_match(stat_back_m) == "ATK":
                        party_buffs.append({"type": "atkFlat", "value": cap_val})

                for b in _extract_buffs(sentence):
                    stat = b["stat"]
                    val = b["value"]
                    if any(
                        (e.get("type", ""), e.get("element", ""), e.get("move_type", "")) in emitted_types
                        for e in _stat_to_party_buffs(stat, val)
                    ):
                        continue
                    if stat == "Crit Rate":
                        if not any(pb["type"] == "critRate" for pb in party_buffs):
                            party_buffs.append({"type": "critRate", "value": val})
                    elif stat == "Crit DMG":
                        if not any(pb["type"] == "critDMG" for pb in party_buffs):
                            party_buffs.append({"type": "critDMG", "value": val})
                    elif stat in ("ATK", "ATK%"):
                        party_buffs.append({"type": "atkPercentage", "value": val})
                    elif stat in (
                        "Aero DMG", "Glacio DMG", "Fusion DMG", "Electro DMG",
                        "Havoc DMG", "Spectro DMG", "All Attribute DMG",
                    ):
                        # Elemental and all-attribute team buffs in stance or inherent text, as Denia grants
                        for entry in _stat_to_party_buffs(stat, val):
                            _append_unique_party_buff(party_buffs, entry)

                for entry in _extract_amplify_buffs(sentence):
                    _append_unique_party_buff(party_buffs, entry)

            # Explicit team-scoped elemental DMG wording, as Ciaccona's Solo Concert uses
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

            # Generic "increases/increased DMG dealt by X%", as in Lynae Liberation's +24%
            for m in _RE_PARTY_DMG_INCREASE.finditer(resolved):
                val = float(m.group(1) if m.group(1) is not None else m.group(2))
                val = _capped_party_dmg_value(resolved, m.end(), val)
                _append_unique_party_buff(party_buffs, {"type": "elementalDMG", "value": val})

        for entry in _extract_team_debuff_buffs(resolved):
            _append_unique_party_buff(party_buffs, entry)

        # Support-side target-state enabling like Chisa's Thread of Bane counts as party-facing
        # Teammate loadouts are modeled as fully-achievable support shells during the DPS window
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
    r"\b(?:gain(?:s)?|grants?)\s+(\d+(?:\.\d+)?)\s*%\s+"
    r"(Glacio|Fusion|Electro|Aero|Havoc|Spectro)\s+DMG\s+Bonus\b",
    re.I,
)

_RE_INHERENT_MOVE_GAIN = re.compile(
    r"\b(?:gain(?:s)?|grants?)\s+(\d+(?:\.\d+)?)\s*%\s+"
    r"(Basic|Heavy|Resonance Skill|Resonance Liberation)\s+DMG\s+Bonus\b",
    re.I,
)

_RE_INHERENT_INTRO_MV = re.compile(
    r"DMG\s+Multiplier\s+of\s+Intro\s+Skill\b.*?\bis\s+increased\s+by\s+(\d+(?:\.\d+)?)\s*%",
    re.I,
)

def _parse_char_inherent_self_buffs(char: dict) -> list[dict]:
    """Parse self-scoped buffs from a character's inherent skills (type=4 moves) at S0.

    Always-on personal passives, worded as "Jinhsi gains 20% Spectro DMG Bonus" or "Gain 15% Basic DMG Bonus"
    Entries take the CharPartyBuff shape
    Conditional and stacking mechanics are deliberately not modeled here
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

        # Inherent text mixes self-scoped and party-scoped sentences, as Chisa's "All Ends Here" does
        # Filtering per sentence keeps the self buffs
        for sentence in _split_buff_sentences(resolved):
            if any(phrase in sentence.lower() for phrase in _PARTY_SCOPE_PHRASES):
                continue

            # Always-on elemental DMG bonus
            for m in _RE_INHERENT_ELEM_GAIN.finditer(sentence):
                out.append({"type": "elementalDMG", "element": m.group(2).title(), "value": float(m.group(1))})

            # Move-type DMG bonus, basic, heavy, resonance skill or resonance liberation
            for m in _RE_INHERENT_MOVE_GAIN.finditer(sentence):
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

            # Intro MV multiplier, applying to intro moves only
            mv_m = _RE_INHERENT_INTRO_MV.search(sentence)
            if mv_m:
                out.append({"type": "mvMultiplier", "move_type": "intro", "value": float(mv_m.group(1))})

    # De-dupe exact entries while preserving order
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
        hp = int(round(float(pick(stats, "life", "Life", default=0) or 0)))
        atk = int(round(float(pick(stats, "atk", "Atk", default=0) or 0)))
        defense = int(round(float(pick(stats, "def", "Def", default=0) or 0)))
        # A renamed source key reads as 0 rather than failing, and 0 base HP or ATK scores 0 damage on every board
        # DEF is exempt because some unreleased entries really do ship with 0
        if not hp or not atk:
            raise ValueError(f"{name}: missing base stats in Characters.json (got {stats!r})")

        forte_nodes = _extract_forte_nodes(char)
        sequence_bonuses = _extract_sequence_bonuses(char)
        inherent_bonuses = _extract_inherent_bonuses(char)
        chains = _extract_chains_lb(char)
        moves = _extract_moves_lb(char)
        party_buffs_s0 = _parse_char_kit_party_buffs(char)
        self_buffs_s0 = _parse_char_inherent_self_buffs(char)

        entry = {
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
        # Only emitted when present, so the ~60 characters without one keep the field off
        if inherent_bonuses:
            entry["inherent_bonuses"] = inherent_bonuses
        out[cdn_id] = entry

    out = {k: out[k] for k in sorted(out, key=lambda x: int(x))}
    return out


def _weapon_secondary_stat(second: dict) -> tuple[str, float]:
    """Return (stat_name, base_main_as_percent) from stats.second.

    Conversion matches frontend stats.ts:
      isRatio=true   a raw decimal ratio, multiplied by 100 (0.081 is 8.1%)
      isRatio=false  internal units, divided by 100 (1080 is 10.8%)
    An "Atk" attribute with isRatio=true is ATK%, a percent of base ATK
    """
    attribute = second.get("attribute", "")
    value = float(second.get("value", 0))
    is_ratio = bool(second.get("isRatio", False))

    base_main = (value * 100) if is_ratio else (value / 100)

    mapped_attr = WEAPON_ATTR_TO_MAIN_STAT.get(attribute)
    if mapped_attr:
        return mapped_attr, base_main

    name_en = (second.get("name") or {}).get("en", "")
    # Try the display-name normalization table before falling back to the raw name
    normalized = MAIN_STAT_NORMALIZE.get(name_en, "")
    if normalized:
        return normalized, base_main

    return name_en if name_en else attribute, base_main


def _params_for_rank(weapon: dict, rank: int) -> list[str]:
    """Weapon effect parameters for one rank R1 to R5, clamped per slot when a slot has fewer values."""
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

        first = (w.get("stats") or {}).get("first", {})
        base_atk = float(first.get("value", 0))
        atk_lv1 = int(round(base_atk))

        second = (w.get("stats") or {}).get("second", {})
        main_stat, base_main = _weapon_secondary_stat(second)
        main_stat = MAIN_STAT_NORMALIZE.get(main_stat, main_stat)
        # Precision is kept for level scaling, since rounding before STAT_CURVE shifts final HP/ATK/DEF by dozens
        base_main_lv1 = round(base_main, 6)

        effect_en = (w.get("effect") or {}).get("en", "")
        params_r1 = _params_r1(w)
        params_r5 = _params_r5(w)
        passive_bonuses = _passive_bonus_matrix(w)

        resolved_r1 = _resolve_effect_placeholders(effect_en, [], params_r1)
        resolved_r5 = _resolve_effect_placeholders(effect_en, [], params_r5)
        effects_r1 = _parse_effect_en(resolved_r1)
        effects_r5 = _parse_effect_en(resolved_r5)

        # Go effects carry both refinement endpoints
        # `value` and `duration` keep the baked rank, R5 for 4-star weapons and R1 otherwise, so no stored score moves
        # valueR1 and valueR5 let the engine interpolate between refinements
        weapon_effects = _derive_go_weapon_effects(effects_r1, effects_r5, rarity_str)
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
        raw_desc = raw_skill.get("description") or ""
        if isinstance(raw_desc, dict):
            raw_desc = raw_desc.get("en") or ""
        effect_en = str(raw_desc).strip()
        raw_skill_params = raw_skill.get("params") if isinstance(raw_skill, dict) else []
        effect_params: list[list[str]] = []
        if isinstance(raw_skill_params, list):
            for row in raw_skill_params:
                if isinstance(row, dict):
                    arr = pick(row, "arrayString", "ArrayString", default=[])
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
            _append_unique_echo_bonus(bonuses, entry)
        for entry in _parse_echo_main_slot_bonuses(
            _resolve_effect_placeholders(effect_en, [], effect_params[0] if effect_params else [])
        ):
            _append_unique_echo_bonus(bonuses, entry)
        out[eid] = {
            "name": name,
            "legacyId": legacy_id,
            "cost": cost,
            "fetter_ids": [f for f in raw_fetters if isinstance(f, int)],
            "effect_en": effect_en,
            "params": effect_params,
            "bonuses": bonuses,
            "party_buffs": _parse_echo_party_buffs(
                _resolve_effect_placeholders(effect_en, [], effect_params[0] if effect_params else [])
            ),
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
            # Fallback for an older Fetters.json carrying only one tier
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
            # effect_params only resolves placeholders, it never reaches the output
            effect_params = piece_data.get("effectDescriptionParam", [])
            if not isinstance(effect_params, list):
                effect_params = []
            effect_obj = piece_data.get("effectDescription", {})
            effect_en_raw = (effect_obj.get("en", "") if isinstance(effect_obj, dict) else "").strip()
            effect_en = _resolve_effect_placeholders(effect_en_raw, add_prop, effect_params)
            normalized = {
                "effect_en": effect_en,
                "add_prop": add_prop,
                "party_buffs": _parse_support_text_buffs(effect_en),
                "effects": _parse_effect_en(effect_en),
            }
            # Panel-visible clauses are hand-declared in sync_fetters.py and carried through verbatim
            # DISPLAY_BONUSES there says why they cannot come from the parsed trigger field
            display_bonuses = piece_data.get("displayBonuses")
            if isinstance(display_bonuses, list) and display_bonuses:
                normalized["display_bonuses"] = display_bonuses
            normalized_piece_effects[piece_key] = normalized

        out[set_key] = {
            "group_id": group_id,
            "name": name_en,
            "piece_count": int(fetter.get("pieceCount", 2) or 2),
            "piece_effects": normalized_piece_effects,
        }

    return {k: out[k] for k in sorted(out)}


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

    required = [CHARACTERS_JSON, WEAPONS_JSON, ECHOES_JSON, ECHO_STATS_JSON, FETTERS_JSON, CHARACTER_CURVE_JSON, LEVEL_CURVE_JSON]
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
    _copy_file(ECHO_STATS_JSON, ECHO_STATS_OUT_JSON, args.dry_run)

    print("\nGenerated summary:")
    print(f"  Characters: {len(character_bases)}")
    print(f"  Weapons:    {len(weapon_bases)}")
    print(f"  Echoes:     {len(echo_bases)}")
    print(f"  Fetters:    {len(fetter_bases)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
