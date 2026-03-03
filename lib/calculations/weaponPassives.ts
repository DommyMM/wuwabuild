import { Weapon, WeaponPassiveBonusesByRank, WeaponPassiveStatName } from '@/lib/weapon';

const clampWeaponRank = (weaponRank: number): number =>
  Math.min(5, Math.max(1, Math.floor(weaponRank || 1)));

export const getUnconditionalWeaponPassiveBonuses = (
  weapon: Weapon | null,
  weaponRank: number
): Partial<Record<WeaponPassiveStatName, number>> => {
  const bonusesByRank = weapon?.unconditionalPassiveBonuses;
  if (!bonusesByRank) return {};

  const rankIndex = clampWeaponRank(weaponRank) - 1;
  const result: Partial<Record<WeaponPassiveStatName, number>> = {};

  for (const [stat, values] of Object.entries(bonusesByRank) as Array<
    [WeaponPassiveStatName, WeaponPassiveBonusesByRank[WeaponPassiveStatName]]
  >) {
    if (!values || values.length === 0) continue;
    const rankValue = values[rankIndex];
    if (typeof rankValue !== 'number' || !Number.isFinite(rankValue) || rankValue === 0) continue;
    result[stat] = rankValue;
  }

  return result;
};
