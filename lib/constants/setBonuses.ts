import type { CDNFetter } from '@/lib/echo';
import { StatName } from '@/lib/constants/statMappings';

interface SetBonusEntry {
  stat: StatName;
  value: number;
}

/** Ids come from PhantomFetter AddProp, stable across localized names */
const PROP_ID_TO_STAT: Record<number, StatName> = {
  11: 'Energy Regen',
  14: 'Resonance Skill DMG Bonus',
  22: 'Glacio DMG',
  23: 'Fusion DMG',
  24: 'Electro DMG',
  25: 'Aero DMG',
  26: 'Spectro DMG',
  27: 'Havoc DMG',
  35: 'Healing Bonus',
  10002: 'HP%',
  10007: 'ATK%',
};

const normalizeSetPropValue = (prop: { value: number; isRatio: boolean }): number => (
  // sync_fetters keeps non-ratio AddProp in x10 units (100 => 10.0%)
  prop.isRatio ? prop.value : prop.value / 10
);

type SetAddProp = { id: number; value: number; isRatio: boolean };

const getSetBonusesFromProps = (
  props: SetAddProp[] | null | undefined
): SetBonusEntry[] => {
  if (!Array.isArray(props)) return [];

  return props
    .map((prop) => {
      const stat = PROP_ID_TO_STAT[prop.id];
      if (!stat) return null;
      return { stat, value: normalizeSetPropValue(prop) };
    })
    .filter((entry): entry is SetBonusEntry => entry !== null);
};

export const getSetBonusesFromPieceEffect = (
  pieceEffect: { addProp?: SetAddProp[] } | null | undefined
): SetBonusEntry[] => getSetBonusesFromProps(pieceEffect?.addProp);

const getActivationTierProps = (
  fetter: CDNFetter,
  pieceCount: number
): Array<{ id: number; value: number; isRatio: boolean }> => {
  const activationTier = fetter.pieceCount;
  if (pieceCount < activationTier) return [];

  const tierProps = fetter.pieceEffects?.[String(activationTier)]?.addProp;
  if (Array.isArray(tierProps)) return tierProps;

  return Array.isArray(fetter.addProp) ? fetter.addProp : [];
};

/**
 * Panel bonuses from tier text that needs no in-combat action
 *
 * Leaves out the 2-piece bare stat line, which reaches the panel through addProp
 */
const getDisplayBonuses = (
  fetter: CDNFetter,
  pieceCount: number,
  characterId: string | undefined
): SetBonusEntry[] => {
  const tiers = fetter.pieceEffects;
  if (!tiers) return [];

  // Every tier the piece count reaches, unlike addProp which reads the activation tier alone
  // Tidebreaking Courage activates at 2 pieces while its unconditional ATK clause sits on the 5-piece tier
  return Object.entries(tiers).flatMap(([tier, pieceEffect]) => {
    const tierCount = Number(tier);
    if (!Number.isFinite(tierCount) || pieceCount < tierCount) return [];

    // Free-text 3- and 5-piece clauses nearly all need an action, so they belong to the damage engine
    // The few that need nothing are hand-declared in scripts/sync_fetters.py and arrive as displayBonuses
    // `requires` carries the character gate as data, so this file needs no notion of Resonance Energy
    return (pieceEffect.displayBonuses ?? []).filter((bonus) => (
      !bonus.requires?.length || (characterId != null && bonus.requires.includes(characterId))
    ));
  });
};

export const getSetBonusesFromFetter = (
  fetter: CDNFetter | null | undefined,
  pieceCount: number,
  characterId?: string
): SetBonusEntry[] => {
  if (!fetter) return [];

  return [
    ...getSetBonusesFromProps(getActivationTierProps(fetter, pieceCount)),
    ...getDisplayBonuses(fetter, pieceCount, characterId),
  ];
};
