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
  10002: 'HP%',
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

// A set's 2-piece tier is a bare stat line and reaches the panel through addProp
// above. Every 3- and 5-piece clause lives in free text instead, and nearly all of
// them need an in-combat action (casting, dealing, inflicting, gaining a shield),
// so they belong to the damage engine and not to a panel read out of combat. The
// few that need nothing are declared by hand in scripts/sync_fetters.py's
// DISPLAY_BONUSES and arrive on the tier as `displayBonuses`.
//
// `requires` carries the character gate as data so this file needs no notion of
// Resonance Energy: Dream of the Lost's "Holding 0 Resonance Energy" is
// permanently true for the two characters who hold 0 max energy, and durably true
// for nobody else. lb asserts that list against its own engine-side gate.
const getDisplayBonuses = (
  fetter: CDNFetter,
  pieceCount: number,
  characterId: string | undefined
): SetBonusEntry[] => {
  const tiers = fetter.pieceEffects;
  if (!tiers) return [];

  // Unlike addProp this reads every tier the piece count reaches, not just the
  // activation tier: Tidebreaking Courage activates at 2 pieces but its
  // unconditional ATK clause sits on the 5-piece tier.
  return Object.entries(tiers).flatMap(([tier, pieceEffect]) => {
    const tierCount = Number(tier);
    if (!Number.isFinite(tierCount) || pieceCount < tierCount) return [];

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
