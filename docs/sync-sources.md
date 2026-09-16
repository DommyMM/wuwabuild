# Sync Data Sources: Wuthery vs Encore

Game-data sync (characters, weapons, echoes, fetters) defaults to Wuthery's CDN, an AList/OpenList
file server in front of grouped JSON dumps. Encore's API v2 is the faster early-patch source, used
when Wuthery is still catching up.

This file is the why. The script-level reference is [`scripts/CDN_SYNC.md`](../scripts/CDN_SYNC.md).

## Verdict

Wuthery is the source of record for entity text. Encore does two narrow jobs: `/new` as the freshness
trigger, and `/term` as the glossary, which Wuthery cannot serve at all.

Freshness is close enough to a tie that the choice comes down to text shape. On the same game
version, a fresh sanitize of Wuthery's raw text matched Encore on 345 of 372 chain strings, with all
27 exceptions above a 0.965 similarity ratio, which is wording noise rather than content.

| | Wuthery | Encore |
|---|---|---|
| Languages the game actually translates | 10 | 10, with `id`/`ru`/`vi` returning `"???"` and `uk` a 400 |
| Ukrainian | names only, from older dumps | none |
| Text form | `{0}` templates plus a param array | pre-substituted, templates must be regex-reconstructed |
| Highlights | semantic `<color=Highlight>` | inline hex spans |
| Section structure | blank-line breaks | no newlines at all |
| Markup validity | balanced | stray `</span>` in most long strings |
| Glossary | `TermConfig.json` ids only, no resolved text | `/{lang}/term`, every row localized |
| Sonata sets | structured `addProp` | free text only |
| Version signal | none | `/{lang}/new` |

Text shape is not cosmetic. Raw Encore text lands a character with zero parseable description
sections in `lb/internal/calc/data/character_bases.json`, where Wuthery-sourced characters have 5 to
28, because `move_types.go` splits sections on blank lines that Encore's text does not have. It also
renders with no highlight colour, since the frontend palette only understands `<color=Name>`.
`game_text.normalize_encore_markup` exists to close both gaps, rewriting Encore's HTML into the
game's conventions (`<br>` to newlines, hex spans to semantic colour names, surplus closers dropped),
which is what keeps `--encore` usable for catch-up.

## Why Encore is a mode flag, not a fallback

There is no automatic source selection. `sync_all.py --encore` swaps the four Wuthery entity syncs
for one `sync_encore.py` run, and the operator decides. Nothing retries Wuthery-then-Encore per
entity, because the two produce different text shapes and which source wrote a record has to be a
deliberate choice, not the result of a timeout.

Speed and reliability both run the other way, which is why the flag exists at all. Wuthery list calls
take 10 to 17 seconds and have timed out outright, and a parallel full fetch has died mid-stream with
`ProtocolError: Response ended prematurely`. Encore answers a single call in roughly 0.2 to 0.4
seconds with no observed flakiness. Its cost is the per-language fan-out, one request per language
instead of one polyglot document, which is why the delta path below caps concurrency.

## Encore host failover

Encore publishes its host list at `GET https://api.encore.moe/` as `apiList` entries ordered by `P`,
and the site carries the same pair as `apiDataPrimaryUrl` / `apiDataFallbackUrls` in its Nuxt config.
Both hosts serve the same routes and payload shapes. Only the path prefix differs, plus two list
routes:

| | api-v2 (`P=1`) | api (`P=2`) |
|---|---|---|
| Base | `https://api-v2.encore.moe/api` | `https://api.encore.moe` |
| Echo list | bare array | `{"Echo": [...]}` |
| `/new` | object | 2-element array (`[{GameVer…}, {character: […]…}]`) |

`cdn_config.encore_request_json` walks `ENCORE_API_BASES` in order and caches the first host that
answers, so a dead primary costs one round of retries per process instead of per call. Every Encore
caller goes through it, and the callers normalize both list shapes. This is not theoretical: api-v2
has returned `502` on every route for hours at a stretch while the legacy host stayed healthy, and a
whole patch sync ran off `https://api.encore.moe`.

## Encore endpoints

```
Routes (all require {lang}):
  /{lang}                    route catalogue
  /{lang}/character          list (roleList[])
  /{lang}/character/{id}     detail
  /{lang}/weapon             list (weapons[])
  /{lang}/weapon/{id}        detail
  /{lang}/echo               list (phantomsList[])
  /{lang}/echo/{id}          detail
  /{lang}/term               glossary, all rows localized
  /{lang}/new                {GameVer, ResVer, Changelist, character[], weapon[], echo[], info[], item[]}
Languages: en, zh-Hans, zh-Hant, ja, ko, de, es, fr, id, pt, ru, th, vi   (13, no uk)
Images:    detail fields are often absolute https://api.encore.moe/resource/Data/... URLs.
           A raw /Game/Aki/... path resolves as https://api.encore.moe/resource/Data<path>.
           Preserve the .webp suffix, because rewriting it to .png returns 404.
```

<https://encore.moe/new?lang=en> is the browsable form of `/{lang}/new`, with the same version fields
and id arrays but names and icons attached, so you can tell which listed id is the character that
actually released. The page is client-rendered, so scripts read the API route rather than scrape it.

## Field coverage: characters

Everything we sync is reachable from Encore, but rarely 1:1. The right column is what to read.

| `Characters.json` field | Encore source |
|---|---|
| `id` | `Id` |
| `name` (i18n dict) | `Name.Content` per language, so this is the field that forces the fan-out |
| `rarity` | `QualityId`, plus `QualityName` / `QualityIcon` |
| `element.icon` / `elementIcon` | `ElementIcon`, `ElementIcon6` |
| `weapon` (type + icon) | `WeaponType`, `WeaponTypeName`, `WeaponTypeIcon` |
| `icon.iconRound` | `RoleHeadIconCircle` |
| `icon.banner` | `Card`, or `RolePortrait` / `FormationRoleCard` |
| `skins` | `Skins[]` |
| `stats` (base values) | `Properties[].BaseValue` keyed by `Properties[].Name` |
| `stats` scaling per level | `Properties[].GrowthValues[]`, pre-baked, and could replace `LevelCurve.json` |
| `tags` | `Tag[]` (numeric ids) and `Tags[]` (`TagName` / `TagDesc` / `TagIcon`) |
| `skillTrees` | `SkillTree[]`, 8 entries with `Id` / `PropertyNodeTitle` / `PropertyNodeDescribe` / `PropertyNodeIcon` |
| `skillIcons` | `Skills[].Icon` keyed by `Skills[].SkillType` |
| `chains` | `ResonantChain[]`, 6 entries |
| `legacyId` | regex on the icon path, same as Wuthery |
| `preferredStats` | derived locally from tags plus forte node names, same logic either way |
| `sequenceIcon` | `SpilloverItem[].Key` → `/{lang}/item/{id}.Icon` |

The Wuthery path resolves `sequenceIcon` from `ConfigDBParsed/RoleInfo.json`, where each active
character's `SpilloverItem` key is the grouped Item id whose icon we want. Do not infer the item as
`1000<character id>` or keep Rover exceptions: several Rover variants share items or use ids that
break that convention. `Grouped/Character` drops the relationship even though `RoleInfo.json` keeps it.

Where Encore falls short on characters:

- Forte node `coordinate` and `parentNodes` have to be derived. Encore's `SkillTree[]` order is
  inconsistent between characters and the nodes carry no positional metadata, so `transform_skill_trees`
  sorts the 8 nodes by `Id`: the four lowest are coordinate 1 / branches `[1,2,3,6]`, the four highest
  coordinate 2 / branches `[9,10,11,12]`. That reproduces Wuthery's values for every character.
  `skillTrees[].value[].Id` is aligned to Wuthery's stat ids through `STAT_ID_BY_NODE_NAME`.
- `valueText` is not returned. Wuthery gives `["1.20%"]` directly, Encore buries the number inside
  `PropertyNodeDescribe` ("Crit. Rate increased by 1.20%."), so it is extracted by regex.
- Chain bonuses parse from inline values. Wuthery keeps `{0}` placeholders with the value in `param[]`,
  Encore pre-substitutes and strips the spacing. `parse_chain_bonus` accepts either form, splits
  sentences on a period followed by an uppercase letter so Encore's run-together clauses separate, and
  treats only a preceding same-line clause as a scoping conditional. Both sources yield the same 18
  sequence bonuses across 14 characters.
- Rover gender variants are two ids per element (Aero `1406`+`1408`, Spectro `1501`+`1502`, Havoc
  `1604`+`1605`) but Encore attaches `SkillTree` / `Skills` to only one of each pair.
  `_backfill_rover_skill_data` copies `skillTrees` / `skillIcons` / `moves` from the populated sibling,
  because the M/F kits are identical, and re-derives `preferredStats`. Each variant keeps its own
  name, icon, `legacyId`, chains, stats and tags.
- Move sub-value names differ but stay LB-compatible. Encore adds attack-category prefixes, spells
  `Mid-air` where Wuthery has `Mid-Air`, and renames a few outright. The LB's `FindMoveValue` is a
  case-insensitive substring match, so prefixes and casing do not matter and only real renames need
  attention: across all LB character configs only `hiyuki.go` was affected, and its three lookups now
  list both spellings. Where the multipliers themselves differ, Encore carries the rebalanced values
  and the local Wuthery cache is the stale one.
- Skill and chain markup is HTML-ish `<span>` / `<br>` with occasional game tags. The frontend's
  `stripGameMarkup` already handles generic HTML tags, and chain-bonus parsing strips `<[^>]+>`.
- Nothing consumes `stats.DamageChangeNormalSkill`, the Tune Break passive name (blank in Encore) or
  `skins[].color` (`{}` in Encore), so all three are left as they come. `isAlternateSkinVariant` keys
  on icons rather than colour.

## Field coverage: weapons

`sync_encore.py` reproduces the `Weapons.json` shape exactly, validated against Wuthery output on
passive bonuses, `stats` attribute and `isRatio`, and `legacyId`.

| `Weapons.json` field | Encore source |
|---|---|
| `id` / `name` | `ItemId` / `WeaponName` |
| `type` | `WeaponType` / `WeaponTypeName` / `TypeIcon` |
| `rarity` | `QualityId` |
| `icon` | `Icon` / `IconMiddle` / `IconSmall` |
| `effect` (template) | `Desc`, with `<span>`-wrapped values rewritten to `{i}` placeholders |
| `effectName` | `ResonName` |
| `params` (R1 to R5) | `DescParams[].ArrayString` |
| `stats.first` / `stats.second` | `FirstPropId` / `SecondPropId` through `PROP_ID_TO_ATTR` |
| `legacyId` | resolved by name through `legacyWeapons.json`, same as Wuthery |
| `unconditionalPassiveBonuses` | `extract_unconditional_passive_bonuses` on the rewritten effect |

Encore pre-substitutes values and wraps each `DescParams` value-group (slash-joined R1 to R5) in a
`<span>`. `_weapon_effect_to_placeholders` replaces each span with `{i}`, matching span content to its
`DescParams` index, which restores the template that `extract_unconditional_passive_bonuses` and
`sync_lb._resolve_effect_placeholders` expect.

## Field coverage: echoes

| `Echoes.json` field | Encore source |
|---|---|
| `id` | detail `ItemId` |
| `name` | detail `MonsterName` (i18n) |
| `cost` | `MainProp.RandGroupId` through `{501: 4, 502: 3, 503: 1}` |
| `element` | `ElementType` |
| `fetter` | `FetterGroup` |
| `icon` | `Icon`, absolute `.webp` |
| `phantomIcon` | `Phantom: X` skins merged onto base `X`, same normalization Wuthery needs |
| `bonuses` | `extract_main_slot_bonuses` on the rewritten description |
| `skill.description` | `Skill.DescriptionEx` rewritten to `{i}` placeholders |
| `skill.params` | `Skill.LevelDescStrArray` |

Cost has to come through `RandGroupId` because Encore exposes no cost field and the main-stat pool is
cost-specific. `Rarity` is not a substitute: rarity 2 spans cost 3 and cost 4.

Encore pre-substitutes the max-level values (`LevelDescStrArray[-1]`) and uses `<br>` where Wuthery
uses newlines. `_echo_desc_to_placeholders` converts `<br>` to newlines and replaces each value with
its `{i}` index, assigning placeholders in text order while consuming each value's indices in index
order, so repeated or out-of-order values map correctly. That keeps `extract_main_slot_bonuses`
source-agnostic and lets `sync_lb` re-resolve at the level it wants, which is `params[0]`. Without it
level-dependent echo party-buffs would use the wrong magnitude.

The rewrite has one limit: when a description names the same value more times than it appears in
`DescParams`, only the first occurrence becomes `{0}` and later ones stay as the max-level literal.
Cosmetic only, because `sync_lb` resolves at level 1 and nothing parses those later clauses.

Two gaps worth knowing:

- Sonata set structure. Encore's `FetterGroups` carry the set bonus mostly as free text with no
  structured `AddProp` or piece count, so the LB-critical 2pc/3pc stat bonuses have to come from
  Wuthery. Sets are a small, stable dataset that Wuthery serves as three index files, a cheap and
  reliable fetch rather than the flaky large-parallel pattern, so `sync_encore.py` starts from
  Wuthery's `fetch_and_build()` and only appends Encore-only groups while Wuthery is behind. Those
  temporary groups may carry small hand-synthesized `AddProp` entries for stable 2pc stats.
- Two Somnoire-event echoes cannot be sourced from Encore at all. `Cuddle Wuddle` (cost 3) and
  `Lottie Lost` (cost 1) are `PhantomType: 2` / `QualityId: 2` there, so they fall outside the
  `PhantomType==1 && QualityId==5` filter. `Cuddle Wuddle` has a 5-star `Phantom:` skin but no 5-star
  base, and `Lottie Lost` has no 5-star entry. Both must come from Wuthery.

Wuthery's own echo weakness is per-field localization: it can carry a new entity with a blank
`name.en`, and its `Grouped/Monster` row for the same monster can be blank too. It did this for the
whole `60001992`-`60001995` rarity family sharing `monsterId 6000199`. Encore's echo list keys the
real name on that same `MonsterId`, which is why `sync_echoes.py` fills blank English names from it
rather than hardcoding per id.

## Patch catch-up

For a new patch, prefer a targeted Encore merge over a full 13-language sync. Individual Encore
requests are fast, but a large nested fan-out of entities times languages trips server-side
throttling: one language request is about 0.26s, one character across 13 parallel languages about
10s, and a dozen characters at high outer concurrency 50s or more. Cap both concurrency knobs.

Start from `/new`, then run the delta and the downstream steps:

```powershell
py scripts\sync_encore.py --new-only --only all --workers 2 --lang-workers 2
py scripts\mirror_images_to_public.py --apply
py scripts\sync_backend.py
py scripts\sync_lb.py
```

The same path takes explicit ids when `/new` is not the right set:

```powershell
py scripts\sync_encore.py --merge --only all `
  --character-ids 1109,1308,1511 --weapon-ids 21030056,21030066,21050086 `
  --echo-ids 6000201,6010195,6020059 --workers 2 --lang-workers 2
```

Sync everything `/new` lists, then gate what has not released. `/new` covers the whole res version, so
a mid-patch sync routinely picks up the next phase's character and weapon. Keep the data everywhere,
in `public/Data`, in `backend/Data` with its SIFT templates, and in the LB calc data, and hide it only
in the pickers through `DISABLED_CHARACTER_IDS` / `DISABLED_WEAPON_IDS` in
`lib/constants/disabledEntries.ts`, whose only consumers are `CharacterSelector` and `WeaponSelector`.
Remove the id on release day. The OCR side never needs a second pass, because templates and mappings
are already there for whoever scans first.

Why that rule is worth following rather than cherry-picking:

- `sync_backend.py` builds character and weapon templates from the Encore list, not from our JSON, so
  it fetches a SIFT template for every id Encore lists. Cherry-picking a subset of `/new` into
  `public/Data` leaves stray templates for entities the JSON does not know about, and a SIFT hit on
  one of those resolves to an empty name. (Element templates are driven by our `Fetters.json` ids and
  echo templates by `Echoes.json`, so only characters and weapons have this failure mode.)

Two things the delta does not do:

- A new character has no LB board. That is hand-authored, see
  `lb/docs/character-implementation-guide.md`.
- `kurobot/data/name_id_lookup.json` is built from the live `wuwa.build` CDN, so run `sync_lookup.py`
  in `kurobot/` only after this deploys, or convene imports will not resolve the new names.

One result that looks like a bug and is not: a character whose second tag is a mechanic tag rather
than a damage-type tag (4 to 7) gets no damage-type substat, and with no "considered X DMG" clause in
the kit text either, lands on `["Crit Rate", "Crit DMG", "ATK", "Energy Regen"]`. That is correct per
the derivation in `scripts/CDN_SYNC.md`, even where the sequences lean on one attack type.

## Images do not reach production from either host

`scripts/mirror_images_to_public.py` runs inside `sync_all.py` right after the data sync on either
path. It downloads every referenced image into `public/assets/` as WebP and rewrites the URLs in
`public/Data/*.json` to site-relative `/assets/...` paths, whichever upstream produced them. So the
Wuthery-vs-Encore image-host distinction in the tables above matters only at sync time: an outage at
either host no longer breaks images on the live site, it only breaks a fresh sync during the outage.
See [data-pipeline.md](./data-pipeline.md).

## Character prototype

`scripts/sync_characters_encore.py` fetches one character from Encore and transforms it into the
`Characters.json` shape for diffing. It does not replace `sync_characters.py`.

```bash
py scripts/sync_characters_encore.py --id 1608 --compare
py scripts/sync_characters_encore.py --id 1608 --output public/Data/Characters.encore.1608.json --pretty
```

What a source swap has to re-establish before it ships:

- Per-node forte parity keyed on `coordinate`/`parentNodes`, covering name, stat `Id`, `IsRatio` and
  `valueText`, with `preferredStats` matching too.
- Move sets matching by `(type, name)`.
- The same chain bonuses parsing from both sources.

Array order differs, because Encore's `SkillTree[]` order is arbitrary, but no consumer keys on
order. Image URLs and text payloads differ by design. Encore has no `uk`, so the transform keeps the
key and fills it with `""`.
