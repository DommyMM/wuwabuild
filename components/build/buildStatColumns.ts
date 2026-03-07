import { Character } from '@/lib/character';
import { LBStatCode, LBSortKey } from '@/lib/lb';
import { BASE_STAT_FALLBACK_ORDER, ELEMENT_STAT_KEYS, OFFENSIVE_BONUS_KEYS, STAT_OPTION_KEYS } from './buildConstants';
import { StatSortKey } from './types';

export function resolvePrimaryScalingStatKey(baseScaling: string | undefined): StatSortKey {
  if (baseScaling === 'HP') return 'H';
  if (baseScaling === 'DEF') return 'D';
  return 'A';
}

export function resolveCharacterBaseScaling(character: Character | null): 'ATK' | 'HP' | 'DEF' {
  if (character?.Bonus2 === 'ATK' || character?.Bonus2 === 'HP' || character?.Bonus2 === 'DEF') {
    return character.Bonus2;
  }
  const forteName = character?.forteNodes?.['tree2.middle']?.name ?? '';
  if (/HP/i.test(forteName)) return 'HP';
  if (/DEF/i.test(forteName)) return 'DEF';
  if (/ATK/i.test(forteName)) return 'ATK';
  return 'ATK';
}

export function resolveElementStatKey(characterElement: string | undefined): StatSortKey | null {
  if (characterElement === 'Aero') return 'AD';
  if (characterElement === 'Glacio') return 'GD';
  if (characterElement === 'Fusion') return 'FD';
  if (characterElement === 'Electro') return 'ED';
  if (characterElement === 'Havoc') return 'HD';
  if (characterElement === 'Spectro') return 'SD';
  return null;
}

export function pickHighestStatKey(
  candidateKeys: readonly StatSortKey[],
  stats: Record<LBStatCode, number>,
  excluded: ReadonlySet<StatSortKey>,
): StatSortKey | null {
  let selected: StatSortKey | null = null;
  let selectedValue = Number.NEGATIVE_INFINITY;
  for (const key of candidateKeys) {
    if (excluded.has(key)) continue;
    const value = Number(stats[key] ?? 0);
    if (value > selectedValue) {
      selected = key;
      selectedValue = value;
    }
  }
  return selected;
}

export function resolveBuildRowStatKeys(
  baseScaling: string | undefined,
  characterElement: string | undefined,
  sort: LBSortKey,
  stats: Record<LBStatCode, number>,
): StatSortKey[] {
  const keys: StatSortKey[] = [];
  const pushUnique = (key: StatSortKey) => {
    if (keys.includes(key)) return;
    keys.push(key);
  };

  if (STAT_OPTION_KEYS.includes(sort as StatSortKey)) {
    pushUnique(sort as StatSortKey);
  }
  pushUnique(resolvePrimaryScalingStatKey(baseScaling));

  const preferredElement = resolveElementStatKey(characterElement);
  const preferredElementValue = preferredElement ? Number(stats[preferredElement] ?? 0) : 0;
  if (preferredElement && preferredElementValue > 0) {
    pushUnique(preferredElement);
  } else {
    const highestElement = pickHighestStatKey(ELEMENT_STAT_KEYS, stats, new Set(keys));
    if (highestElement) pushUnique(highestElement);
  }

  pushUnique('ER');

  const bestOffensiveBonus = pickHighestStatKey(OFFENSIVE_BONUS_KEYS, stats, new Set(keys));
  if (bestOffensiveBonus) pushUnique(bestOffensiveBonus);

  if (keys.length < 4) {
    const highestElement = pickHighestStatKey(ELEMENT_STAT_KEYS, stats, new Set(keys));
    if (highestElement) pushUnique(highestElement);
  }

  BASE_STAT_FALLBACK_ORDER.forEach(pushUnique);
  OFFENSIVE_BONUS_KEYS.forEach(pushUnique);
  ELEMENT_STAT_KEYS.forEach(pushUnique);

  return keys.slice(0, 4);
}
