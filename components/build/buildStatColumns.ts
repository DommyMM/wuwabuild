import { Character } from '@/lib/character';
import { LBStatCode, LBSortKey } from '@/lib/lb';
import { BASE_STAT_FALLBACK_ORDER, ELEMENT_STAT_KEYS, OFFENSIVE_BONUS_KEYS, STAT_OPTION_KEYS } from './buildConstants';
import { StatSortKey } from './types';

const ELEMENT_STAT_KEY_SET = new Set<StatSortKey>(ELEMENT_STAT_KEYS);

const DISPLAY_STAT_CODE_MAP: Record<string, StatSortKey> = {
  ATK: 'A',
  HP: 'H',
  DEF: 'D',
  'Energy Regen': 'ER',
  'Healing Bonus': 'HB',
  'Basic Attack DMG Bonus': 'BA',
  'Heavy Attack DMG Bonus': 'HA',
  'Resonance Skill DMG Bonus': 'RS',
  'Resonance Liberation DMG Bonus': 'RL',
  'Aero DMG': 'AD',
  'Glacio DMG': 'GD',
  'Fusion DMG': 'FD',
  'Electro DMG': 'ED',
  'Havoc DMG': 'HD',
  'Spectro DMG': 'SD',
};

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

function pushUnique(keys: StatSortKey[], key: StatSortKey | null): void {
  if (!key || keys.includes(key)) return;
  keys.push(key);
}

function resolveMappedDisplayStatKey(stat: string | undefined): StatSortKey | null {
  if (!stat || stat === 'Crit Rate' || stat === 'Crit DMG') return null;
  return DISPLAY_STAT_CODE_MAP[stat] ?? null;
}

function resolveSecondaryDisplayStatKey(
  bonusStat: string | undefined,
  characterElement: string | undefined,
  stats: Record<LBStatCode, number>,
): StatSortKey | null {
  const mappedBonusKey = resolveMappedDisplayStatKey(bonusStat);
  if (mappedBonusKey === 'HB') {
    return 'HB';
  }

  const preferredElement = resolveElementStatKey(characterElement);
  if (preferredElement && Number(stats[preferredElement] ?? 0) > 0) {
    return preferredElement;
  }

  if (mappedBonusKey && ELEMENT_STAT_KEY_SET.has(mappedBonusKey)) {
    return mappedBonusKey;
  }

  return pickHighestStatKey(ELEMENT_STAT_KEYS, stats, new Set<StatSortKey>());
}

function resolvePreferredTertiaryStatKey(
  preferredStats: string[] | undefined,
  excluded: ReadonlySet<StatSortKey>,
): StatSortKey | null {
  if (!preferredStats?.length) return null;

  for (const stat of preferredStats) {
    if (stat === 'Crit Rate' || stat === 'Crit DMG' || stat === 'Energy Regen') continue;

    const mapped = resolveMappedDisplayStatKey(stat);
    if (!mapped || excluded.has(mapped)) continue;
    return mapped;
  }

  return null;
}

function appendFallbackStatKeys(
  keys: StatSortKey[],
  baseScaling: string | undefined,
  characterElement: string | undefined,
  bonusStat: string | undefined,
  stats: Record<LBStatCode, number>,
): void {
  pushUnique(keys, resolvePrimaryScalingStatKey(baseScaling));
  pushUnique(keys, resolveSecondaryDisplayStatKey(bonusStat, characterElement, stats));
  pushUnique(keys, pickHighestStatKey(OFFENSIVE_BONUS_KEYS, stats, new Set(keys)));
  pushUnique(keys, 'ER');
  pushUnique(keys, 'HB');
  pushUnique(keys, pickHighestStatKey(ELEMENT_STAT_KEYS, stats, new Set(keys)));

  BASE_STAT_FALLBACK_ORDER.forEach((key) => pushUnique(keys, key));
  OFFENSIVE_BONUS_KEYS.forEach((key) => pushUnique(keys, key));
  ELEMENT_STAT_KEYS.forEach((key) => pushUnique(keys, key));
}

export function resolveBuildRowStatKeys(
  baseScaling: string | undefined,
  characterElement: string | undefined,
  bonusStat: string | undefined,
  sort: LBSortKey,
  stats: Record<LBStatCode, number>,
  preferredStats?: string[],
): StatSortKey[] {
  const orderedKeys: StatSortKey[] = [];
  pushUnique(orderedKeys, resolvePrimaryScalingStatKey(baseScaling));
  pushUnique(orderedKeys, resolveSecondaryDisplayStatKey(bonusStat, characterElement, stats));
  pushUnique(
    orderedKeys,
    resolvePreferredTertiaryStatKey(preferredStats, new Set(orderedKeys))
      ?? pickHighestStatKey(OFFENSIVE_BONUS_KEYS, stats, new Set(orderedKeys)),
  );
  pushUnique(orderedKeys, 'ER');

  appendFallbackStatKeys(orderedKeys, baseScaling, characterElement, bonusStat, stats);

  if (STAT_OPTION_KEYS.includes(sort as StatSortKey)) {
    const sortKey = sort as StatSortKey;
    return [sortKey, ...orderedKeys.filter((key) => key !== sortKey)].slice(0, 4);
  }

  return orderedKeys.slice(0, 4);
}
