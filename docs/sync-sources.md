# Sync Data Sources — Wuthery vs Encore

Game-data sync (characters, weapons, echoes, fetters) currently fetches from **Wuthery's CDN** (an AList/OpenList file server in front of grouped JSON dumps). This doc captures what we know about an alternative source — **encore.moe's API v2** — and the trade-offs that motivate dual-mode/fallback support.

The script-level reference is [`scripts/CDN_SYNC.md`](../scripts/CDN_SYNC.md). This file is the *why*; that file is the *how*.

## TL;DR

- Wuthery is one polyglot JSON per entity (all 14 languages in a single file) but slow and flaky — list calls take 10–17s and parallel fetches drop connections mid-stream.
- Encore is a real REST API: tiny per-language responses, ~200–400ms per call, no observed flakiness, exposes a `/new` changelog endpoint with `GameVer` / `ResVer` / list of newly-added IDs.
- Both sources track the same game version today (3.3.0, character 1608 Phrolova, weapon 21050104). The premise that one is "more up to date" hasn't held up in measurements — it's about reliability and speed, not freshness.
- Schemas differ enough that we need a transformer layer; field coverage on Encore is a superset of what we currently consume.

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

- **Skill-tree IDs can differ** between sources. For current Phrolova data both now use `585`–`592`, but treat this as non-contractual. The frontend keys forte display through `coordinate`/`parentNodes`/`name`, not raw node IDs.
- **`valueText` for forte nodes** is not directly returned. Today Wuthery gives `["1.20%"]`; Encore embeds the value inside `PropertyNodeDescribe` (`"Crit. Rate increased by 1.20%."`) — easy to extract with the same regex pipeline already used elsewhere in `sync_characters.py`.
- **Skill/chain description markup** uses HTML-ish `<span>`/`<br>` plus occasional game tags. Frontend `stripGameMarkup` already handles generic HTML tags; backend chain-bonus parsing should keep using generic `<[^>]+>` stripping.
- **Image paths may be mixed**: detail payloads often return absolute `.webp` URLs, while some nested fields return raw `/Game/Aki/...` paths. The prototype resolves raw paths through `https://api.encore.moe/resource/Data<path>` and preserves `.webp`.

## Character Prototype

`scripts/sync_characters_encore.py` is the first low-risk prototype. It does not replace `sync_characters.py`; it fetches one character from Encore and transforms it into the existing public `Characters.json` shape for diffing.

```bash
py scripts/sync_characters_encore.py --id 1608 --compare
py scripts/sync_characters_encore.py --id 1608 --output public/Data/Characters.encore.1608.json --pretty
```

Validation on 2026-04-30 for `1608`:

- Exact match for `id`, `legacyId`, `stats`, `preferredStats`, skill-tree node IDs/order/coordinates/parent nodes/names/valueText, move count, and chain count.
- Expected diffs for image URLs (`files.wuthery.com/d/GameData/...png` vs `api.encore.moe/resource/Data/Game/Aki/...webp`) and text payloads (Wuthery placeholder templates vs Encore HTML-ish text with values already substituted).
- Encore still has no `uk`; the prototype keeps the `uk` key and fills it with `""` for compatibility.

## Field Coverage — Echoes

| `Echoes.json` field | Encore source |
|---|---|
| `id` | `Id` |
| `name` | per-lang `Name` |
| `cost`, `rarity` | `Rarity`, `PhantomType` |
| `element` | `Element.Id` |
| `fetter` (FetterGroup IDs) | `FetterGroups[].Id` |
| `icon` | `Icon` |
| `phantomIcon` | merge logic same as today, applied across `phantomsList` results |
| `bonuses` (first-panel) | `Skill.DamageList[]` (skill description templates resolved) |
| `skill.description`, `skill.params` | `Skill` object |

The `FetterGroups[].Fetters[]` payload embedded in each echo is sufficient on its own — the separate `PhantomFetterGroups.json` / `PhantomFetters.json` localization-index fetches that today drive `sync_fetters.py` may become unnecessary if we sync from Encore.

## Strategy

Two reasonable shapes:

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
- Whether `lib/echo.ts`'s `FETTER_MAP` keys still align if we switch to fetter group IDs returned by Encore (likely identical — both come from the same game-data dump — but verify).
