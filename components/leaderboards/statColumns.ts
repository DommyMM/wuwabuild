import { Character } from '@/lib/character';
import { getLBStatCode, LBStatCode, LBStatSortKey, LBSortKey } from '@/lib/lb';
import { BASE_STAT_FALLBACK_ORDER, ELEMENT_STAT_KEYS, OFFENSIVE_BONUS_KEYS, STAT_OPTION_KEYS } from './constants';
import { StatSortKey } from './types';

const ELEMENT_STAT_KEY_SET = new Set<StatSortKey>(ELEMENT_STAT_KEYS);

const DISPLAY_STAT_CODE_MAP: Record<string, StatSortKey> = {
  ATK: 'atk',
  HP: 'hp',
  DEF: 'def',
  'Energy Regen': 'energy_regen',
  'Healing Bonus': 'healing_bonus',
  'Basic Attack DMG Bonus': 'basic_attack_dmg',
  'Heavy Attack DMG Bonus': 'heavy_attack_dmg',
  'Resonance Skill DMG Bonus': 'resonance_skill_dmg',
  'Resonance Liberation DMG Bonus': 'resonance_liberation_dmg',
  'Aero DMG': 'aero_dmg',
  'Glacio DMG': 'glacio_dmg',
  'Fusion DMG': 'fusion_dmg',
  'Electro DMG': 'electro_dmg',
  'Havoc DMG': 'havoc_dmg',
  'Spectro DMG': 'spectro_dmg',
};

function resolvePrimaryScalingStatKey(baseScaling: string | undefined): StatSortKey {
  if (baseScaling === 'HP') return 'hp';
  if (baseScaling === 'DEF') return 'def';
  return 'atk';
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

function resolveElementStatKey(characterElement: string | undefined): StatSortKey | null {
  if (characterElement === 'Aero') return 'aero_dmg';
  if (characterElement === 'Glacio') return 'glacio_dmg';
  if (characterElement === 'Fusion') return 'fusion_dmg';
  if (characterElement === 'Electro') return 'electro_dmg';
  if (characterElement === 'Havoc') return 'havoc_dmg';
  if (characterElement === 'Spectro') return 'spectro_dmg';
  return null;
}

function pickHighestStatKey(
  candidateKeys: readonly StatSortKey[],
  stats: Record<LBStatCode, number>,
  excluded: ReadonlySet<StatSortKey>,
): StatSortKey | null {
  let selected: StatSortKey | null = null;
  let selectedValue = Number.NEGATIVE_INFINITY;
  for (const key of candidateKeys) {
    if (excluded.has(key)) continue;
    const value = Number(stats[getLBStatCode(key)] ?? 0);
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
  if (mappedBonusKey === 'healing_bonus') {
    return 'healing_bonus';
  }

  const preferredElement = resolveElementStatKey(characterElement);
  if (preferredElement && Number(stats[getLBStatCode(preferredElement)] ?? 0) > 0) {
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
  pushUnique(keys, 'energy_regen');
  pushUnique(keys, 'healing_bonus');
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
  pushUnique(orderedKeys, 'energy_regen');

  appendFallbackStatKeys(orderedKeys, baseScaling, characterElement, bonusStat, stats);

  if (STAT_OPTION_KEYS.includes(sort as LBStatSortKey)) {
    const sortKey = sort as StatSortKey;
    return [sortKey, ...orderedKeys.filter((key) => key !== sortKey)].slice(0, 4);
  }

  return orderedKeys.slice(0, 4);
}
