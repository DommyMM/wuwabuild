# Sync Data Sources — Wuthery vs Encore

Game-data sync (characters, weapons, echoes, fetters) currently fetches from **Wuthery's CDN** (an AList/OpenList file server in front of grouped JSON dumps). This doc captures what we know about an alternative source — **encore.moe's API v2** — and the trade-offs that motivate dual-mode/fallback support.

The script-level reference is [`scripts/CDN_SYNC.md`](../scripts/CDN_SYNC.md). This file is the *why*; that file is the *how*.

## TL;DR

- Wuthery is one polyglot JSON per entity (all 14 languages in a single file) but slow and flaky — list calls take 10–17s and parallel fetches drop connections mid-stream.
- Encore is a real REST API: tiny per-language responses, ~200–400ms per call, no observed flakiness, exposes a `/new` changelog endpoint with `GameVer` / `ResVer` / list of newly-added IDs.
- Both sources track the same game version today (3.3.0, character 1608 Phrolova, weapon 21050104). The premise that one is "more up to date" hasn't held up in measurements — it's about reliability and speed, not freshness.
- Schemas differ enough that we need a transformer layer; field coverage on Encore is a superset of what we currently consume.
- Wuthery can still have per-field localization gaps even when it has the new entity. Example: echo item `60001995` has blank `name.en` in Wuthery, while Encore exposes the English name through its echo list/detail keyed by `MonsterId`.

## Empirical Comparison

Measured on 2026-04-30 from a Windows dev machine, `requests` with 20–40 parallel workers.

| Operation | Wuthery | Encore |
|---|---|---|
| List all characters | 17.0s (one run) / timed out (next run) | 0.19s |
| Single character detail (1608) | 2.95s | 0.36s |
| Full sync, en-only (53 characters) | benchmark **failed** — `ProtocolError: Response ended prematurely` mid-stream | 0.88s |
| Full sync, 13 languages (689 requests) | n/a (single fetch covers all langs) | 37.7s, 689/689 OK |
| Latest character | 1608 Phrolova | 1608 Phrolova |
| Latest weapon | (timed out before completing) | 21050104 Radiant Dawn |
| Version signal | none | `/{lang}/new` → `GameVer 3.3.0`, `ResVer 3.3.6`, `Changelist 7196844`, plus arrays of newly-added `character`/`weapon`/`echo`/`item` IDs |

Wuthery's reliability problem is the headline finding. Encore's per-language fan-out (13× requests vs 1) is the real cost — but in absolute terms a clean from-scratch run is still under 40s, and incremental syncs driven by `/new` are a few seconds.

## Source Endpoints

### Wuthery (current)

```
Base:     https://files.wuthery.com
List:     POST /api/fs/list  body: {"path": "/GameData/Grouped/{Character|Weapon|Phantom|LocalizationIndex}"}
Download: GET  /d/GameData/Grouped/{Character|Weapon|Phantom}/{id}.json
LocIdx:   GET  /d/GameData/Grouped/LocalizationIndex/{PhantomFetterGroups|PhantomFetters}.json
Images:   served at /d/<UE asset path>.png
```

### Encore (alternative)

```
Base v2:  https://api-v2.encore.moe/api      (Nuxt backend)
Base v1:  https://api.encore.moe              (legacy fallback)
Routes (require {lang}):
  /{lang}                    route catalogue
  /{lang}/character          list (roleList[])
  /{lang}/character/{id}     detail
  /{lang}/weapon             list (weapons[])
  /{lang}/weapon/{id}        detail
  /{lang}/echo               list (phantomsList[])
  /{lang}/echo/{id}          detail
  /{lang}/new                {GameVer, ResVer, Changelist, character[], weapon[], echo[], info[], item[]}
Languages: en, zh-Hans, zh-Hant, ja, ko, de, es, fr, id, pt, ru, th, vi  (13 — no `uk` yet)
Images:   many detail fields are already absolute `https://api.encore.moe/resource/Data/...` URLs.
          Raw `/Game/Aki/...` paths should be resolved as `https://api.encore.moe/resource/Data<path>`.
          Preserve Encore's `.webp` suffix; changing these URLs to `.png` returns 404.
```

The OpenAPI spec for Encore is in [encore_api.json](../scripts/encore_api.json) for reference (vendored from `https://api-v2.encore.moe/api`).

## Field Coverage — Characters

Everything we currently sync is reachable from Encore. The mapping isn't always 1:1; the right column shows what to read.

| `Characters.json` field | Encore source |
|---|---|
| `id` | `Id` |
| `name` (i18n dict) | `Name.Content` from each per-lang request — must fan out |
| `rarity` | `QualityId` (+ `QualityName`, `QualityIcon`) |
| `element.icon` / `elementIcon` | `ElementIcon`, `ElementIcon6` |
| `weapon` (type + icon) | `WeaponType`, `WeaponTypeName`, `WeaponTypeIcon` |
| `icon.iconRound` | `RoleHeadIconCircle` |
| `icon.banner` | `Card` (or `RolePortrait` / `FormationRoleCard`) |
| `skins` | `Skins[]` |
| `stats` (HP/ATK/DEF/Crit/CritDMG, base values) | `Properties[].BaseValue` keyed by `Properties[].Name` |
| `stats` scaling per level | `Properties[].GrowthValues[]` (pre-baked — could replace `LevelCurve.json` entirely) |
| `tags` (role tags) | `Tag[]` (numeric IDs) and `Tags[]` (full `TagName`/`TagDesc`/`TagIcon`) |
| `skillTrees` (8 forte stat nodes) | `SkillTree[]` (8 entries with `Id`/`PropertyNodeTitle`/`PropertyNodeDescribe`/`PropertyNodeIcon`) |
| `skillIcons` (per-skill-type icon URLs) | `Skills[].Icon` keyed by `Skills[].SkillType` (`"Normal Attack"`, `"Skill"`, `"Liberation"`, `"Intro"`, `"Outro"`, `"Forte Circuit"`, `"Inherent Skill"`) |
| `chains` (S1–S6) | `ResonantChain[]` (6 entries with `Id`/`NodeName`/`AttributesDescription`/`AttributesDescriptionParams`/`NodeIcon`) |
| `legacyId` | derivable same as today (regex on icon path) |
| `preferredStats` | derived locally from tags + skill-tree node names — same logic, just different inputs |
| `sequenceIcon` | `SpilloverItem[].Key` → `/{lang}/item/{id}.Icon` |

### Caveats

- **Forte node `coordinate`/`parentNodes` are derived, not read.** Encore's `SkillTree[]` array order is inconsistent (some characters list the outer/coordinate-2 group first, others the inner/coordinate-1 group first) and the nodes carry no positional metadata. `transform_skill_trees` sorts the 8 nodes by `Id`: the four lowest-Id nodes are coordinate 1 / branches `[1,2,3,6]`, the four highest are coordinate 2 / branches `[9,10,11,12]`. This reproduces Wuthery's `coordinate`/`parentNodes` for every character (verified across all 53). `skillTrees[].value[].Id` is aligned to Wuthery's canonical stat IDs in `STAT_ID_BY_NODE_NAME`.
- **`valueText` for forte nodes** is not directly returned. Today Wuthery gives `["1.20%"]`; Encore embeds the value inside `PropertyNodeDescribe` (`"Crit. Rate increased by 1.20%."`) — extracted with the same regex pipeline used elsewhere in `sync_characters.py`.
- **Chain bonuses parse from inline values.** Wuthery descriptions keep `{0}` placeholders (the bonus value lives in `param[]`); Encore pre-substitutes the value into the text and strips the newlines/spacing Wuthery preserves. `parse_chain_bonus` now accepts either a `{N}` placeholder or an inline literal, splits sentences on a period followed by an uppercase letter (so Encore's run-together clauses separate), and only treats a *preceding* same-line clause as a scoping conditional. Both sources yield the same 18 sequence bonuses across 14 characters.
- **Rover gender variants.** Encore exposes two IDs per Rover element (Aero `1406`+`1408`, Spectro `1501`+`1502`, Havoc `1604`+`1605`) but attaches `SkillTree`/`Skills` to only one; the sibling returns them empty. `sync_encore.py` `_backfill_rover_skill_data` copies `skillTrees`/`skillIcons`/`moves` from the populated sibling (the M/F kits are identical) and re-derives `preferredStats`. Each variant keeps its own name/icon/`legacyId`/chains/stats/tags.
- **Move sub-value names differ but stay LB-compatible.** Encore spells some sub-values differently (added attack-category prefixes, `Mid-air` vs `Mid-Air`, and a few renames such as Hiyuki's `Blade Liberation Base DMG` vs Wuthery's `(0 Snowforged Blade)`). The LB's `FindMoveValue` is a case-insensitive *substring* match, so prefixes/casing don't matter; only genuine renames need attention. Across all 21 LB character configs only `hiyuki.go` had affected lookups — its three lookups now list both source spellings via a local fallback helper (level-10 values are identical across sources). Where multipliers themselves differ (e.g. Hiyuki's mid-air stages), Encore carries the current rebalanced values; the local Wuthery cache is stale.
- **Skill/chain description markup** uses HTML-ish `<span>`/`<br>` plus occasional game tags. Frontend `stripGameMarkup` already handles generic HTML tags; backend chain-bonus parsing keeps using generic `<[^>]+>` stripping.
- **Image paths may be mixed**: detail payloads often return absolute `.webp` URLs, while some nested fields return raw `/Game/Aki/...` paths. Raw paths resolve through `https://api.encore.moe/resource/Data<path>` and preserve `.webp`.
- **Not consumed downstream, so left as-is:** `stats.DamageChangeNormalSkill` (Encore reports a real value, Wuthery zeroes it — no LB reference), the Tune Break passive name (blank in Encore), and `skins[].color` (Encore returns `{}`; the frontend's `isAlternateSkinVariant` tolerates it and keys on icons).

## Character Prototype

`scripts/sync_characters_encore.py` is the original single-character prototype. It does not replace `sync_characters.py`; it fetches one character from Encore and transforms it into the existing public `Characters.json` shape for diffing.

```bash
py scripts/sync_characters_encore.py --id 1608 --compare
py scripts/sync_characters_encore.py --id 1608 --output public/Data/Characters.encore.1608.json --pretty
```

A combined `scripts/sync_encore.py` extends the prototype to cover characters, weapons, echoes, and fetters in one run, and is what `sync_all.py --encore` invokes (see [`scripts/CDN_SYNC.md`](../scripts/CDN_SYNC.md)). The Wuthery scripts remain the default pipeline.

Validation:

- Per-node parity (keyed on `coordinate`/`parentNodes`) for forte `skillTrees` — name, stat `Id`, `IsRatio`, `valueText` — across all 53 shared characters; `preferredStats` matches too. Array *order* differs (Encore's `SkillTree[]` order is arbitrary), but no consumer keys on order.
- Move sets match by `(type, name)`; the same 18 chain bonuses parse from both sources.
- Expected diffs for image URLs (`files.wuthery.com/d/GameData/...png` vs `api.encore.moe/resource/Data/Game/Aki/...webp`) and text payloads (Wuthery placeholder templates vs Encore HTML-ish text with values already substituted).
- Encore exposes characters the cached Wuthery `Characters.json` may lag on (e.g. Lucilla `1109`, Rebecca `1308`, Lucy `1511`) — the freshness win in practice.
- Encore still has no `uk`; the transform keeps the `uk` key and fills it with `""` for compatibility.

## Field Coverage — Weapons

`sync_encore.py` reproduces the `Weapons.json` shape exactly. Validated against the cached Wuthery output: weapon passive bonuses, `stats` attribute/`isRatio`, and `legacyId` all match (Encore tracks one weapon ahead — the freshness win).

| `Weapons.json` field | Encore source |
|---|---|
| `id` / `name` | `ItemId` / `WeaponName` |
| `type` (id/name/icon) | `WeaponType` / `WeaponTypeName` / `TypeIcon` |
| `rarity` | `QualityId` |
| `icon` | `Icon` / `IconMiddle` / `IconSmall` |
| `effect` (template) | `Desc` with `<span>`-wrapped values **rewritten to `{i}` placeholders** (see below) |
| `effectName` | `ResonName` |
| `params` (R1–R5 per placeholder) | `DescParams[].ArrayString` |
| `stats.first` / `stats.second` | `FirstPropId` / `SecondPropId` via `PROP_ID_TO_ATTR` (IDs `7,8,9,11,10002,10007,10010` → Atk/Crit/CritDamage/EnergyEfficiency/LifeMax/Atk/Def) |
| `legacyId` | resolved by name through `legacyWeapons.json` (same as Wuthery) |
| `unconditionalPassiveBonuses` | `extract_unconditional_passive_bonuses` on the placeholder-rewritten effect |

**Placeholder rewrite (weapons):** Encore pre-substitutes values and wraps each `DescParams` value-group (slash-joined R1–R5) in a `<span>`. `_weapon_effect_to_placeholders` replaces each span with `{i}` (matched by span content to its `DescParams` index), restoring the template that `extract_unconditional_passive_bonuses` and `sync_lb`'s per-rank resolver (`_resolve_effect_placeholders`) expect.

## Field Coverage — Echoes

`sync_encore.py` reproduces the `Echoes.json` shape. Validated against Wuthery: per-echo `bonuses` (30 echoes), `cost`, and `legacyId` all match, and `phantomIcon` merges to the same 35.

| `Echoes.json` field | Encore source |
|---|---|
| `id` | detail `ItemId` |
| `name` | detail `MonsterName` (i18n) |
| `cost` | `MainProp.RandGroupId` → `{501: 4, 502: 3, 503: 1}` (Encore exposes no direct cost; the main-stat pool is cost-specific — `Rarity` is **not** sufficient, e.g. Rarity 2 spans cost 3 and 4) |
| `element` | `ElementType` |
| `fetter` (FetterGroup IDs) | `FetterGroup` |
| `icon` | `Icon` (absolute `.webp`; frontend `toImageUrl` passes absolute URLs through) |
| `phantomIcon` | `Phantom: X` skins merged onto base `X`, with the same name normalization Wuthery uses (`Nightmare ` → `Nightmare: `, ` - ` → `: `) |
| `bonuses` (first-panel) | `extract_main_slot_bonuses` on the placeholder-rewritten description (values are level-independent) |
| `skill.description` (i18n) | `Skill.DescriptionEx` rewritten to `{i}` placeholders (see below) |
| `skill.params` | `Skill.LevelDescStrArray` |

**Placeholder rewrite (echoes):** Encore pre-substitutes the **max-level** values (`LevelDescStrArray[-1]`) and uses `<br>` where Wuthery uses newlines. `_echo_desc_to_placeholders` converts `<br>`→`\n` and replaces each value with its `{i}` index — assigning placeholders in text order while consuming each value's indices in index order, so repeated/out-of-order values (e.g. Nightmare echoes that bracket the main-slot bonus with the same multiplier) map correctly. This keeps `extract_main_slot_bonuses` source-agnostic and lets `sync_lb` re-resolve at the level it wants (it resolves with `params[0]`); without it, level-dependent echo party-buffs would use the wrong magnitude.

**Placeholder rewrite limitation:** when a description references the same param value more times than it appears in `DescParams` (e.g. Adam Smasher's Lucy press/hold bullets both say `273.60%` but the value is one param), only the first text occurrence becomes `{0}`; later occurrences stay as the literal max-level value. Cosmetic only — `sync_lb` resolves descriptions at `params[0]` (level 1), so such literals display the max-level number, but no bonus/buff parsing reads those clauses.

**Character-conditional main-slot bonuses:** `extract_main_slot_bonuses` attaches `characterCondition` for restricted bonuses. Recognized phrasings: `"...main slot by <Name>"` (Aemeath), `"When Resonator: Aero or Cartethyia equips this Echo"` (Fleurdelys — also matches Rover elements), and `"When Lucy or Rebecca has this Echo equipped"` (Adam Smasher). Generic `"the Resonator with this Echo equipped"` is unconditional. `sync_lb._parse_echo_main_slot_bonuses` (the LB-side fallback parser on resolved text) mirrors the same detection so it never emits an unconditional duplicate of a restricted bonus; the LB engine gates these via `echoBonusConditionMatches` (`lb/internal/calc/standardize.go`).

**Input-method tokens:** game text like `{Cus:Ipt,Touch=Tap PC=Press Gamepad=Press}` is rewritten to its PC label (`Press`) by `_sanitize_game_text` (`sync_characters.py`, shared by both sources) instead of being dropped, so sentences like "Press the Echo Skill button" keep their verb.

**Known Encore echo gap:** `Cuddle Wuddle` (cost 3) and `Lottie Lost` (cost 1) — the cute Somnoire-event echoes — are classified `PhantomType: 2` / `QualityId: 2` in Encore and so fall outside the `PhantomType==1 && QualityId==5` filter. `Cuddle Wuddle` has a 5-star `Phantom: Cuddle Wuddle` *skin* (ItemId `601…`) but no 5-star base; `Lottie Lost` has no 5-star entry at all. Result: Encore yields 161 base echoes vs Wuthery's 162 (net of the new `Reminiscence - Nightmare: Adam Smasher`). If these two are needed they must be backfilled from Wuthery — they cannot be sourced from Encore as canonical echoes.

**Fetters stay on Wuthery.** Encore's echo `FetterGroups` carry the set bonus only as free text, with no structured `AddProp`/`pieceCount`, so the LB-critical 2pc/3pc stat bonuses cannot be derived reliably from them (the value encoding differs per stat — elemental DMG `+10%` → `value: 100, isRatio: false`; `ATK +10%` → `value: 10, isRatio: true`). Sonata sets are a small, stable dataset served by Wuthery as three localization-index files (`PhantomFetters.json` / `PhantomFetterGroups.json` / `ConfigDBParsed/PhantomFetter.json`) — a cheap, reliable fetch, not the flaky large-parallel pattern. So `sync_encore.py`'s `sync_fetters` reuses Wuthery's `fetch_and_build()`; the result is byte-identical to the default pipeline's `Fetters.json` (`addProp`/`pieceCount` verified equal).

### Echo ID and Localization Notes

Wuthery's `Grouped/Phantom` rows are item/rarity rows. For the new Voidborne Construct echo:

- Wuthery has `60001992` through `60001995` for rarity tiers, all sharing `monsterId: 6000199`.
- The 5-star canonical row is `60001995`, which is the ID we keep in `public/Data/Echoes.json`, backend OCR templates, and LB data.
- Wuthery's `name.en` is blank for all four rows. Wuthery `Grouped/Monster/340000271.json` is also blank for English.
- Wuthery `Grouped/Monster/340000270.json` has `Aleph-1's Creation`, but that is the summoned unit name from the skill text, not the echo display name.
- Encore's echo list has `Id: 6000199`, `Name: "Reminiscence: Threnodian - Voidborne Construct"`.
- Encore's echo detail at `/api/en/echo/6000199` has `ItemId: 60001995`, `MonsterId: 6000199`, and `MonsterName: "Reminiscence: Threnodian - Voidborne Construct"`.

Current behavior in `sync_echoes.py`: Wuthery remains the primary source. If a 5-star Wuthery echo has no English name, the script fetches Encore's English echo list and fills the missing name by matching Wuthery `monsterId` to Encore list `Id`. This is source-derived fallback, not a per-ID hardcode.

## Strategy

Two reasonable shapes:

### 3.4 Delta Sync Path

For patch catch-up, prefer a targeted Encore merge over a full 13-language
full sync. Encore's individual requests are fast, but large nested fan-out
(`entities x 13 languages`) triggers server-side throttling. The observed
diagnostic shape was:

```text
1 lang request: ~0.26s
1 character x13 parallel languages: ~10s
12 characters with high outer concurrency: 50s+
```

The current script supports a small merge mode:

```powershell
py scripts\sync_encore.py --merge --only all `
  --character-ids 1109,1308,1511 `
  --weapon-ids 21030056,21030066,21050086 `
  --echo-ids 6000201,6010195,6020059 `
  --workers 2 --lang-workers 2
```

The same path can be driven by Encore's `/new` endpoint:

```powershell
py scripts\sync_encore.py --new-only --only all --workers 2 --lang-workers 2
```

On 2026-06-09, the explicit 3.4 delta command completed in about 14s and
produced:

```text
Characters.json: 56  (adds Lucilla 1109, Rebecca 1308, Lucy 1511)
Weapons.json:    118 (adds Spectral Trigger 21030056, Skull Thrasher 21030066, Freeze Frame 21050086)
Echoes.json:     163 (adds Reminiscence - Nightmare: Adam Smasher as item 60002015)
Fetters.json:    31  (appends Encore-only group 32, Shadow of Shattered Dreams)
```

Then run the downstream generated data steps:

```powershell
py scripts\sync_backend.py
py scripts\sync_lb.py
```

`sync_backend.py` is the single source of truth for `backend/Data`: it writes the OCR
JSON schema and fetches every SIFT template as id-keyed WebP. Characters (Encore
`FormationRoleCard` splash), weapons (Encore `Icon`), and elements (Encore
`Echo[].FetterGroups[].Icon`, so set group `32 -> Adam` gets `backend/Data/Elements/Adam.webp`)
come straight from Encore; echo icons follow the icon URL in the synced
`public/Data/Echoes.json` (Encore WebP passed through, a Wuthery PNG fallback re-encoded).
Each set has a `--skip-*-icons` / `--force-*-icons` flag. The character/weapon loader reads
WebP only; element/echo loaders accept PNG or WebP.

### Option A — Dual-mode with fallback (recommended)

Keep both sources. Add `--source={wuthery|encore|auto}` to each sync script. `auto` tries Encore first, falls back to Wuthery on failure. This gives us:

- Resilience against the failure mode we hit today (one source down).
- A diff path to validate Encore output against Wuthery output during rollout.
- Continued use of the existing `/scripts` pipeline (`sync_backend.py`, `sync_lb.py`) without changes — Encore output is transformed to the same `public/Data/*.json` shape downstream consumers expect.

### Option B — Encore-primary with incremental sync

Once Option A has soaked, drive day-to-day syncs off Encore's `/new` endpoint:

```
GET /api/en/new
→ {Changelist, character: [...newIds], weapon: [...newIds], echo: [...newIds], ...}
```

Only refetch the IDs in those arrays, write delta into the canonical JSON, run `sync_backend.py` / `sync_lb.py`. Full sync stays available as a flag for major patches.

Wuthery-only mode is retained as a break-glass for the case where Encore goes down or stops shipping a needed field.

## Open Questions

- Does Encore expose ascension/material data (`ascensions`)? Yes for character breach mats through `Breaches[]`; still decide whether to sync them now or leave current public shape untouched.
- Chain `param[]` arrays are available as `ResonantChain[].AttributesDescriptionParams`. `AttributesDescription` itself usually has values pre-substituted.
- Weapon refinement values per rank (`params`) — present in Wuthery; reachable in Encore via `WeaponDetail.SkillParam` (TBC, not in the abridged OpenAPI schema we have).
- Whether `lib/echo.ts`'s `FETTER_MAP` keys still align if we switch to fetter group IDs returned by Encore. Current 3.3 data verifies the new IDs `30 -> QuietSnow` and `31 -> Memories` across frontend, backend, and LB transforms.
