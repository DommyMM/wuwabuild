import type { CDNFetter } from '@/lib/echo';
import { StatName } from '@/lib/constants/statMappings';

interface SetBonusEntry {
  stat: StatName;
  value: number;
}

// These IDs come from PhantomFetter AddProp and are stable across localized names.
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
  10007: 'ATK%',
};

const normalizeSetPropValue = (prop: { value: number; isRatio: boolean }): number => (
  // sync_fetters keeps non-ratio AddProp in x10 units (100 => 10.0%).
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

export const getSetBonusesFromFetter = (
  fetter: CDNFetter | null | undefined,
  pieceCount: number
): SetBonusEntry[] => {
  if (!fetter) return [];

  return getSetBonusesFromProps(getActivationTierProps(fetter, pieceCount));
};
