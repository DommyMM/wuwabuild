# Build Card — Current Spec

The shareable card rendered on `/edit` (editor card) and on profile build rows (profile card). One skeleton, two variants. The profile variant's rank module is the product differentiator: competitor cards (wuwaflex) are pure aesthetics with no verified rank.

Last full revision: 2026-06-10. Earlier phased plans ("Build Card v2") are superseded; surviving backlog items are listed at the bottom.

## Skeleton

`components/edit/BuildCard.tsx` is the single card frame. Both surfaces render it; the only structural difference is the `forteSection` slot:

| Surface | Orchestrator | `forteSection` slot |
|---|---|---|
| Editor (`/edit`) | `components/edit/BuildEditor.tsx` | default `<ForteCardSection/>` (full node grid, hover-reactive) |
| Profile build row | `components/profile/ProfileCard.tsx` | `<ProfileRankSection/>` = `<TalentPills/>` + `<RankModule/>` |

Layout inside the frame (aspect 2.4/1 upper card, echo strip below):

```
+---------------+--+---------------------------+---------------+
|               |  |  char header (NameGroup)  |               |
|   character   |se|  weapon (WeaponGroup)     |   stat list   |
|   art panel   |q.|  forteSection slot        |  (StatsTable) |
|               |  |  CV + sonata (ActiveSets) |               |
+---------------+--+---------------------------+---------------+
|  echo row, 5-up (EchoSection)                                |
+---------------------------------------------------------------+
```

Module map:

| Module | Code |
|---|---|
| Art panel | [components/card/CharacterPanel.tsx](../components/card/CharacterPanel.tsx) |
| Sequence rail | [components/card/SequenceStrip.tsx](../components/card/SequenceStrip.tsx) |
| Char header | [components/card/NameGroup.tsx](../components/card/NameGroup.tsx) |
| Weapon block | [components/card/WeaponGroup.tsx](../components/card/WeaponGroup.tsx) |
| Forte grid (editor) | [components/card/ForteCardSection.tsx](../components/card/ForteCardSection.tsx) |
| Talent pills (profile) | [components/card/TalentPills.tsx](../components/card/TalentPills.tsx) |
| Rank module (profile) | [components/card/RankModule.tsx](../components/card/RankModule.tsx) |
| CV + sonata | [components/card/ActiveSetsSection.tsx](../components/card/ActiveSetsSection.tsx) |
| Stat list | [components/card/StatsTableSection.tsx](../components/card/StatsTableSection.tsx) |
| Echo cards | [components/card/EchoSection.tsx](../components/card/EchoSection.tsx) |

## Art panel

The panel art defaults to the character's **splash** (the full illustration, like the reference bot cards), resolved client-side by `resolveSplashCardArt` in [lib/splashArt.ts](../lib/splashArt.ts): walks local `/images/splash/` URL candidates, applies the per-character `SPLASH_ART_TRANSFORMS` framing offset (or an auto-scale for short images), and falls back to the banner cutout when no splash file exists. **Both the editor and profile cards share this resolver and behavior**; the editor additionally lets the user toggle splash off (`splashDisabledIds`), upload custom art, and drag/zoom it (`CardArtTransform`, persisted per character while editing). On the profile card, removing the art opts that character out for the session and the banner sticks.

Rover splash candidates try legacy-id and gendered filenames first; see `getSplashUrlCandidates`.

## Rank module (profile cards)

An 80px strip, three groups separated by spacing (no divider lines), reading grade then board then conditions:

```
TOP              [wpn]  HYPERCARRY      [head]  [head]
2.18%                   [S6] 110% ER     S2      S0
#35 / 1.6k                              [icons] [icons]
```

| Group | Contents | Spec |
|---|---|---|
| Grade | `TOP` kicker, percentile, `#rank / total` | Percentile `font-gowun 700 25px` in tier color with glow, the only quality signal on the card. Total abbreviates at five digits (`formatTotal`: "1.6k", "95.7k") so the line survives boards growing 100x. Percentile stays the hero because it scales; absolute rank decays in meaning as boards grow. |
| Board | Weapon icon (hover card on web), track label, sequence pill + ER bracket underneath | Track label Ropa 13px / 0.08em / `text-primary/90`, the second-strongest text in the module, on its own row because future track labels have unknown length. `S{n}` pill below it (`LB_SEQ_BADGE_COLORS`), always shown since S0 vs S2 vs S6 changes what the rank means; `{n}% ER` joins that row when the board is ER-bracketed. |
| Conditions | Support avatars (lead omitted), corner S badges, up to 3 loadout icons each | Badges and gear sit ON the portrait: the S badge is inset at the top-right with a solid dark backing ring (translucent tier tints dissolve into bright character art otherwise), and the 16px loadout icons overlap the portrait's bottom edge. Gear hangs off the avatar, not off the module, keeping the stack compact and clear of the container border. Legibility survives export (2.67x upsample). |

Tier colors (`lib/calculations/rankTier.ts`): S = gold w/ glow at top 1%, A = silver at 10%, B = bronze at 25%, then neutral steps. Revisit the S threshold if boards reach six figures.

Deliberately absent: **damage**. Cross-board damage is incomparable (a 9M S6 hypercarry next to a 1.6M S0 run reads as an error, not a flex); the tier-colored percentile is the normalized score. Akasha's card reaches the same conclusion. `RankBoard.damage` stays in the type for non-card consumers.

### Canonical board

The card always shows the rank for the **equipped weapon**: `standings.find(s => s.weaponId === state.weaponId)`, falling back to the first ranked standing. Without this anchor, standings sorted by rank ascending surface phantom boards, because `damage_map` carries values for every weapon variant the LB tracks. `AdjustRankingButton` in the action bar switches the active board; the RV substat summary row renders below the card in `ProfileBuildExpanded`, not inside the frame (one readout, not two).

## Export

`html-to-image` `toBlob` with `pixelRatio = EXPORT_CARD_WIDTH / FIXED_CARD_PREVIEW_WIDTH` (3840 / 1440 = 2.67). The card lays out at a fixed 1440px regardless of viewport (`CardScaler` shrinks the preview visually). The profile download wraps the card and the substat row in one capture. Implication for design: anything legible at the 1440 preview is more than legible in the file; optimize hierarchy for the Discord-embed first glance, not for export pixel size.

## Data flow

- Profile standings fetch on row expand via `/leaderboard/{characterId}/build/{buildId}/standings` (one request, all boards). `ProfileCard` owns the fetch so the action bar can switch boards without remounting the card.
- The editor's "where would this rank" lives **under** the card (`SimulateRankPanel`, on-demand `POST /leaderboard/{characterId}/simulate`), keeping the editor export clean of unverified ranks.

## Backlog (carried over)

- **Rank on row payload**: extend `/profile/{uid}/builds` rows with `bestRank` / `allRanks` so profile grids can rank-sort without N standings calls.
- **RV ranking**: `preferred_rv` column + index, `rvRank` row field; the card stays damage-rank only until then.
- Open call: whether the editor card should ever show the *simulated* rank module on its export. Today it does not, by design (verified ranks only on shareable cards).
