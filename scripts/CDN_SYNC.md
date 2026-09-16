# CDN Data Sync

These scripts pull game data into `public/Data`, then derive the backend OCR data and the LB
calculator data from it. Wuthery is the default source. Encore is a mode flag for the days a new
patch lands before Wuthery's dump catches up.

Why Wuthery is the default, and where each source falls short, is in
[`../docs/sync-sources.md`](../docs/sync-sources.md). This file is the operator's reference: what
each script does, its flags, and the transforms that are not obvious from the JSON.

## Sources

Wuthery (`cdn_config.CDN_BASE`) is an AList/OpenList file server over grouped JSON dumps:

```
Base:     https://files.wuthery.com
List:     POST /api/fs/list   body {"path": "/GameData/Grouped/{Character|Weapon|Phantom}"}
Download: GET  /d/GameData/Grouped/{Character|Weapon|Phantom}/{id}.json
Index:    GET  /d/GameData/Grouped/LocalizationIndex/{PhantomFetters|PhantomFetterGroups|PropertyIndexs}.json
Config:   GET  /d/GameData/ConfigDBParsed/{PhantomFetter|RoleInfo}.json
Images:   GET  /d/<UE asset path>.png
```

Encore is a REST API with one response per language, served by two interchangeable hosts:

```
Base v2:  https://api-v2.encore.moe/api
Base v1:  https://api.encore.moe            (same routes, no /api prefix)
```

Every Encore call goes through `cdn_config.encore_request_json`, which walks `ENCORE_API_BASES` and
caches the first host that answers. Its routes, payload-shape differences and outage history are in
`../docs/sync-sources.md`, along with the patch catch-up procedure.

## Pipeline

`sync_all.py` runs everything in order:

1. `sync_characters.py --fetch`
2. `sync_weapons.py --fetch`
3. `sync_echoes.py --fetch`
4. `sync_fetters.py`
5. `stat_translations.py`
6. `sync_terms.py`
7. `mirror_images_to_public.py --apply`
8. `sync_backend.py`
9. `sync_lb.py`

`--encore` collapses steps 1 to 4 into one `sync_encore.py` run. The tail is identical either way.

Three ordering constraints, each with a reason:

- `sync_terms.py` follows the entity syncs because it scopes the glossary to the term ids the
  shipped JSON links.
- `mirror_images_to_public.py` precedes `sync_backend.py` because backend echo templates read the
  mirrored file on disk once the icon URL has been rewritten to a local `/assets/` path.
- `sync_lb.py` is last because it reads the finished `public/Data` JSON.

`sync_all.py --dry-run` means preview everywhere, so it withholds the mirror's `--apply` and nothing
is written. It routes `--dry-run` / `--pretty` only to children that declare them, and the backend
template flags only to `sync_backend.py`. Unknown flags fail before any child process runs.

Two modules in this directory are shared rather than run: `cdn_config.py` holds the bases, bounded
retries, Encore host failover, casing-tolerant reads and atomic writes, and `game_text.py` holds the
game-text sanitizer and the Encore markup normalizer.

Every script needs `requests`. `mirror_images_to_public.py` also needs Pillow for PNG-to-WebP.
`sync_backend.py` needs `opencv-python` and `numpy` only when a non-WebP source has to be re-encoded.
The quarantined R2 helper `migrate_r2_png_to_jpg.py` (preview by default) needs boto3,
python-dotenv and Pillow.

## Usage

All commands run from `wuwabuilds/scripts`.

```bash
py sync_characters.py [--fetch] [--id 1205] [--individual] [--include-skills] [--workers N] [--output DIR]
py sync_weapons.py    --fetch [--id 21010015] [--individual] [--workers N] [--output DIR]
py sync_echoes.py     --fetch [--id 60000425] [--workers N]
py sync_fetters.py
py stat_translations.py
py sync_terms.py [--lang en]                 # --lang repeats
py mirror_images_to_public.py --apply [--limit N] [--workers N]
py sync_backend.py [--skip-echo-icons] [--force-echo-icons]   # same pair for element/character/weapon
py sync_lb.py [--weapons-only]
py sync_all.py [--encore] [--skip-*-icons] [--force-*-icons]
```

`--id` on an entity sync fetches that one record and merges it into the combined JSON, so a targeted
fetch never truncates the file.

`--fetch` is what makes the three entity syncs hit Wuthery. Weapons and echoes refuse to run without
it. Characters instead re-parses the existing `Characters.json` in place, re-sanitizing text and
re-deriving chain bonuses, inherent bonuses and `preferredStats`, which is how a change to those
derivations gets applied without a full re-fetch.

`--dry-run` and `--pretty` work on everything above except `sync_backend.py`, which takes `--dry-run`
only, and `mirror_images_to_public.py`, which previews by default and writes only with `--apply`.

The Encore path:

```bash
py sync_encore.py [--only all|characters|weapons|echoes|fetters] [--new-only] [--merge]
                  [--id N] [--character-ids ...] [--weapon-ids ...] [--echo-ids ...]
                  [--workers N] [--lang-workers N]
py sync_characters_encore.py --id 1608 --compare    # single-character diff against current Characters.json
```

`--new-only`, `--id` and any explicit id list all imply `--merge`. `sync_characters_encore.py` is a
prototype for diffing one character, not a replacement for `sync_characters.py`, and it also takes
`--output PATH` to write the transformed record somewhere for inspection.

## Outputs

`public/Data` holds the canonical frontend JSON: `Characters.json`, `Weapons.json`, `Echoes.json`,
`Fetters.json`, `Stats.json`, `Terms.json`. `--individual` writes per-entity files under
`Characters/` and `Weapons/` instead of the combined file.

Three files in `public/Data` are hand-maintained inputs rather than sync outputs: `EchoStats.json`
(echo main-stat ranges and substat roll tables), `CharacterCurve.json` and `LevelCurve.json`.
`stat_translations.py` reads `EchoStats.json` to decide which stats to localize, `sync_backend.py`
copies it to the backend unchanged, and `sync_lb.py` copies the curves onward.

`sync_backend.py` is the single source of truth for `backend/Data`: the OCR JSON schema plus every
SIFT template, id-keyed. Element templates come from Encore FetterGroup icons keyed by group id,
characters from the Encore `FormationRoleCard` splash, weapons from the Encore weapon `Icon`, and
echoes from whatever `public/Data/Echoes.json` points at (the mirrored local file after the image
mirror has run, a CDN URL before it). Character and weapon templates load WebP only, so those are
always written as WebP. Element and echo loaders accept PNG or WebP.

`sync_lb.py` is the single source of truth for `lb/internal/calc/data`, built from
`public/Data/{Characters,Weapons,Echoes,Fetters,EchoStats,CharacterCurve,LevelCurve}.json`.

## Terminology

The dumps call sonata sets "PhantomFetters" and "PhantomFetterGroups". The game UI and this codebase
call them sonata sets or element sets. Each echo's `fetter` field is an array of FetterGroup ids, and
`FETTER_MAP` in `lib/echo.ts` turns those ids into set names. `Fetters.json` is keyed on the same
ids, so the three stay aligned by construction.

The numeric `element` array on an echo is the monster's own element and is carried through raw.
Nothing reads it: the frontend derives an echo's legal elements from `fetter` through `FETTER_MAP`
(`adaptCDNEcho` in `lib/echo.ts`).

## Source casing and lost languages

Two things about Wuthery have bitten every sync in this directory.

Field names migrate to camelCase in stages. `Grouped/*` flipped first, then `LocalizationIndex/*`,
`stats.Life`, `value[].IsRatio`, `arrayString` and `PropertyIndexs`. A read of the old spelling does
not error, it silently yields `None`, which is how forte-node values quietly became `0` and
`Stats.json` became `{}`. All reads therefore go through `cdn_config.pick`, which accepts either
spelling. Writes always emit camelCase.

The dumper stopped emitting Ukrainian. A full sync replaces every record, so without help `uk`
disappears even though nothing upstream said it was wrong. `write_records_atomic` (id-keyed lists)
and `write_mapping_atomic` (`Stats.json`) backfill language keys the incoming payload no longer
carries. Only empty-or-absent leaves are touched, so a language the source still provides always wins.

## Game text

Every description we ship goes through `game_text.sanitize_game_text`, which resolves the game's own
control tokens and keeps the markup the frontend can render.

| In the source | Shipped as | Why |
|---|---|---|
| `{0}` | `{0}` | Paired with the entry's `param` array so the frontend can highlight resolved values |
| `<color=Highlight>` | kept | Maps onto our palette in `lib/text/gameText.tsx` |
| `<te href=850008>` | kept | The id is a `TermConfig` row, so it opens the glossary card |
| `{Cus:Ipt,…PC=Press…}` | `Press` | Platform-input token, and dropping it loses the verb |
| `{Cus:Sap,S=point P=points SapTag=0}` | `points` | Singular/plural noun, count taken from the matching `<SapTag=0>` wrapper. Tags are usually numeric, so the pattern must accept `\w+`, not `[A-Za-z]+` |
| `<SapTag=…>`, `<size=…>` | dropped | Layout and control only |

Characters, weapons, echoes and fetters all run it. Without it those files ship raw `{Cus:…}` tokens,
and `renderGameTemplateWithHighlights` only resolves `{N}` placeholders, so the token shows up
verbatim in the UI.

## Glossary scope

`sync_terms.py` writes only the terms the shipped data reaches: every `<te href=N>` id our JSON
links, plus ids linked from those terms' own bodies. That is 223 rows today, out of a table that is
mostly lore nothing on the site points at.

Encore is the only usable source. Wuthery dumps the table at `ConfigDBParsed/TermConfig.json`, but
only with its Chinese key, and no TextMap resolves the title or body. Encore's `/{lang}/term` returns
every row localized in one call per language, and `game_text.normalize_encore_markup` rewrites its
HTML back into the game's own markup before it is stored.

Languages are the nine the site offers that the game actually translates. The game has no Ukrainian
glossary, and the frontend's `t()` falls back to English.

## Character transforms

### Forte stat nodes

`skillTrees` is the 8 forte stat nodes flattened by `simplify_skill_trees` (2 per branch, skipping
tree3/Forte Circuit, which has no stat nodes). Each node carries the exact bonus type, value and
icon, so nothing downstream has to guess that a character has Crit Rate plus ATK.

- `coordinate` 1 is the middle node, 2 is the top node.
- `parentNodes[0]` identifies the branch, decoded by `PARENT_TO_TREE` in `lib/character.ts`.
- `value[0].IsRatio` false means base points (Crit Rate, Crit DMG), true means percent (ATK%, HP%, DEF%).
- `icon` is a complete URL, usable in the UI as-is.

### Skill icons

`extract_skill_icons` reads `skill.<id>.params.icon` for every non-tree skill entry and keys it by
the CDN `type` field, so the frontend reads `character.skillIcons[key]` instead of constructing a URL
from name tables and per-character special cases. Type 4 is the two inherent passives, split into
`inherent-1` and `inherent-2` by sort order. Tune break (type 12) resolves to one of five shared
weapon-type icons, not a per-character one.

### preferredStats

`get_preferred_substats` derives the recommended echo substats from tags, forte node names and kit
text, so no character needs hand curation. The rules:

- Crit Rate and Crit DMG for everyone, healers and supports included.
- The scaling stat comes from the forte node names (`HP+`, `ATK+`, `DEF+`).
- The damage-type bonus comes from the priority-2 tag: 4 basic, 5 heavy, 6 skill, 7 liberation. With
  no priority-2 damage tag it falls back to explicit English kit text like "considered Heavy Attack
  DMG". For support and healer kits, sequence text can name the nuke action instead, such as
  Mornye's `Resonance Liberation - Critical Protocol`.
- Energy Regen for everyone outside `ENERGYLESS_CHARACTER_IDS`, which is the characters the game
  gives no energy system.

The list is substat-only by construction: the only stats that can enter are crits, HP/ATK/DEF, one
damage-type bonus and Energy Regen, so main-stat-only stats like elemental DMG and Healing Bonus
never appear.

### Stat scaling

Base stats are Lv1 values. Scaling comes from `LevelCurve.json`: ATK multiplies by `ATK_CURVE[level]`,
every other base stat by `STAT_CURVE[level]` (`GameDataContext`). The CDN's own `statsLevel` field is
redundant, because our curve scaling matches it exactly, so it is not synced.

### Icon URLs

The CDN ships complete image URLs, so no path is constructed from element or stat names.

| Usage | Field |
|---|---|
| Character face (circle) | `icon.iconRound` |
| Character card or banner | `icon.banner` |
| Alt skin banner | the entry chosen from `skins[].icon.banner` (default duplicates pruned) |
| Element icon (round / shine) | `element.icon["1"]` / `element.icon["7"]` |
| Forte stat node icon | `skillTrees[n].icon` |
| Chain icon | `chains[n].icon` |
| Skill icons | `skillIcons[key]` |
| Skill multiplier data | `skill[id].params`, only with `--include-skills` |

After `mirror_images_to_public.py --apply` these are all site-relative `/assets/...` paths instead.
See [`../docs/data-pipeline.md`](../docs/data-pipeline.md).

### chains

`chains` is the 6 resonance chains S1 to S6, each with localized `name` and `description`, an `icon`,
and a `param` array of strings that fill the description's `{0}`, `{1}` placeholders.

## Echo transforms

`sync_echoes.py` reads Wuthery `Grouped/Phantom` and keeps `phantomType == 1` and `rarity.id == 5`,
deduplicated by English name. It prints the resulting unique, cost and phantom counts rather than
pinning a snapshot that goes stale each patch.

### Encore name fallback

If a 5-star Wuthery echo has a blank English name, the script fetches Encore's English echo list and
fills only that name, matching Wuthery `monsterId` to Encore list `Id`. It refuses to write rather
than ship a blank name. This is source-derived, not a per-id hardcode: Wuthery periodically has the
echo and its skill data with no English display name, as it did for item `60001995` / monster
`6000199`.

### Phantom skin merging

Phantom skins ("Phantom: X") are cosmetic variants with different icons but identical stats and
skills, so they merge into their base echo as `phantomIcon` instead of becoming separate entries.
Matching strips the `Phantom: ` prefix and looks up the English name, retrying with the source's
naming inconsistencies normalized: `Nightmare ` and `Reminiscence ` to their colon forms, and ` - `
to `: `. An unmatched skin is reported as orphaned rather than dropped silently.

Nightmare echoes ("Nightmare: X") are different echoes with their own stats, skills and elements, so
they stay separate and can carry their own phantom skins.

### Main-slot bonuses

Eligible echoes have their first-panel bonuses extracted from the skill description, so no hardcoded
bonus table is needed. `extract_main_slot_bonuses` scans only sentences that describe equipping the
Echo in the main slot, then resolves each `{N}` from `skill.levelDescriptionStrArray[0].arrayString`.
Inside that scope `DMG` and `DMG Bonus` are equivalent, which is what lets Thousand-Puppet Pavilion's
"12% Havoc DMG" parse without an active-skill damage placeholder elsewhere in the text being read as
a permanent stat.

Only the permanent part of a main-slot sentence counts. `_trim_timed_extra_clause` cuts a trailing
", and additionally gains {2} X for {3}s when …" clause before extraction, because that second bonus
is trigger-gated and duration-limited, so it is not a first-panel stat. Calamity Effigy (`60002215`)
is the case this exists for: its two clauses carry the same stat and the same value, so without the
trim it publishes as a permanent 20% Aero DMG that is indistinguishable downstream from the real 10%
(`sync_lb._append_unique_echo_bonus` dedupes identical entries, so the frontend and the LB would have
disagreed).

A bonus restricted to named characters gets a `characterCondition`, recognized from three phrasings:
"…main slot by Aemeath", "When Resonator: Aero or Cartethyia equips this Echo", and "When Lucy or
Rebecca has this Echo equipped". Generic "the Resonator with this Echo equipped" is unconditional.
`sync_lb._parse_echo_main_slot_bonuses`, the LB-side fallback parser that works on resolved text,
mirrors the same detection so it never emits an unconditional duplicate of a restricted bonus. The LB
engine then gates them through `echoBonusConditionMatches` in `lb/internal/calc/standardize.go`.

### Icon URLs

`icon` and `phantomIcon` may be a Wuthery `/d/` path or an absolute Encore URL. `toImageUrl` in
`lib/echo.ts` passes absolute URLs through and prefixes the right base onto a relative `/d/` or
`/Game/` path.

## Fetters

`sync_fetters.py` merges three Wuthery files into `Fetters.json`, one entry per sonata set:

```
/d/GameData/Grouped/LocalizationIndex/PhantomFetters.json
/d/GameData/Grouped/LocalizationIndex/PhantomFetterGroups.json
/d/GameData/ConfigDBParsed/PhantomFetter.json
```

Each entry's `id` is the FetterGroup id, the same value echoes carry in `fetter[]` and `FETTER_MAP`
keys on. All activation tiers live under `pieceEffects`, keyed by piece count. The top-level
`pieceCount` / `fetterId` / `addProp` / `effectDescription` fields duplicate the smallest tier, which
is 1, 2 or 3 depending on the set, for consumers that predate `pieceEffects`.

`icon` is the set icon and `fetterIcon` the element icon, both complete CDN URLs. `color` is the
source's `RRGGBBAA` string, which is `FFFFFF00` for every set and unused in the UI.

A tier's `displayBonuses` is the one hand-authored piece: the panel-visible stat clauses of a set
bonus, declared in `DISPLAY_BONUSES`. The set text's conditions and bullet structure are not reliably
parseable, the same reason move typing stays hand-authored. `requires` holds character ids when a
clause is unconditional only for them, or null when it is unconditional for everyone, which keeps the
frontend from needing any concept of max Resonance Energy. Values are copied from the set text rather
than derived, and lb's `TestEchoSetDisplayBonusesMatchEngine` asserts each one still matches the
parsed effect it came from, so a CDN value change cannot silently desync the two.
