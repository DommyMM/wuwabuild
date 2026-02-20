import { Character } from '@/lib/character';
import { Weapon } from '@/lib/weapon';
import { ForteState } from '@/lib/build';

/**
 * Character curve stats interface
 */
export interface CurveStats {
  HP: number;
  ATK: number;
  DEF: number;
}

/**
 * Character curve data structure
 */
export interface CharacterCurve {
  CHARACTER_CURVE: {
    [level: string]: CurveStats;
  };
}

/**
 * Level curve data structure for weapons
 */
export interface LevelCurves {
  ATK_CURVE: { [key: string]: number };
  STAT_CURVE: { [key: string]: number };
}

/**
 * Get the level key for curve lookup
 */
export const getLevelKey = (level: number): string => {
  if (level <= 20) {
    if (level === 1) return "1/20";
    return level === 20 ? "20/20" : level.toString();
  }

  if (level === 40) return "40/40";
  if (level === 50) return "50/50";
  if (level === 60) return "60/60";
  if (level === 70) return "70/70";
  if (level === 80) return "80/80";
  if (level === 90) return "90/90";

  if (level > 20 && level < 40) return level.toString();
  if (level > 40 && level < 50) return level.toString();
  if (level > 50 && level < 60) return level.toString();
  if (level > 60 && level < 70) return level.toString();
  if (level > 70 && level < 80) return level.toString();
  if (level > 80 && level < 90) return level.toString();
  return "90/90";
};

/**
 * Scale a character stat based on level using character curves.
 */
export const scaleCharacterStat = (
  baseStat: number,
  level: number,
  statType: keyof CurveStats,
  curves: CharacterCurve | null
): number => {
  if (!curves) return baseStat;
  if (level < 1 || level > 90) return baseStat;

  const levelKey = level === 20 || level === 40 || level === 50 || level === 60 || level === 70 || level === 80
    ? `${level}/${level}`
    : level.toString();
  const curve = curves.CHARACTER_CURVE[levelKey];
  if (!curve) return baseStat;

  return Math.floor(baseStat * (curve[statType] / 10000));
};

/**
 * Scale weapon ATK based on level using weapon curves.
 */
export const scaleWeaponAtk = (
  baseAtk: number,
  level: number,
  curves: LevelCurves | null
): number => {
  if (!curves) return baseAtk;
  const key = getLevelKey(level);
  return Math.floor(baseAtk * curves.ATK_CURVE[key]);
};

/**
 * Scale weapon stat based on level using weapon curves.
 */
export const scaleWeaponStat = (
  baseStat: number,
  level: number,
  curves: LevelCurves | null
): number => {
  if (!curves) return baseStat;
  const key = getLevelKey(level);
  return parseFloat((baseStat * curves.STAT_CURVE[key]).toFixed(1));
};

/**
 * Calculate scaled weapon stats (ATK + substat) at a given level.
 * Passive effect values are available directly via weapon.params[paramIndex][rank-1].
 */
export const calculateWeaponStats = (
  weapon: Weapon,
  level: number,
  curves: LevelCurves | null
): { scaledAtk: number; scaledMainStat: number } => ({
  scaledAtk: scaleWeaponAtk(weapon.ATK, level, curves),
  scaledMainStat: scaleWeaponStat(weapon.base_main, level, curves),
});

/**
 * Calculate forte bonus from tree nodes using CDN values.
 * forte: [[level, top, middle], ...] indexed 0–4 for tree1–tree5.
 */
export const calculateForteBonus = (
  character: Character,
  forte: ForteState
): { bonus1Total: number; bonus2Total: number; bonus1Type: string } => {
  const fn = character.forteNodes;
  let bonus1Total = 0;
  let bonus2Total = 0;

  // tree indices: 0=tree1, 1=tree2, 3=tree4, 4=tree5  (tree3 has no stat nodes)
  const treeMap: [number, string, boolean][] = [
    [0, 'tree1', true],   // Bonus1
    [1, 'tree2', false],  // Bonus2
    [3, 'tree4', false],  // Bonus2
    [4, 'tree5', true],   // Bonus1
  ];

  for (const [col, treeName, isBonus1] of treeMap) {
    const [, top, middle] = forte[col];
    if (top) {
      const val = fn?.[`${treeName}.top`]?.value ?? 0;
      if (isBonus1) bonus1Total += val; else bonus2Total += val;
    }
    if (middle) {
      const val = fn?.[`${treeName}.middle`]?.value ?? 0;
      if (isBonus1) bonus1Total += val; else bonus2Total += val;
    }
  }

  return { bonus1Total, bonus2Total, bonus1Type: character.Bonus1 };
};

/**
 * Calculate base stats with weapon contribution.
 */
export const calculateBaseStats = (
  character: Character,
  level: number,
  weaponAtk: number,
  scaleStat: (baseStat: number, level: number, statType: keyof CurveStats) => number
): { baseHP: number; baseATK: number; baseDEF: number } => {
  const characterAtk = scaleStat(character.ATK, level, 'ATK');

  return {
    baseHP: scaleStat(character.HP, level, 'HP'),
    baseATK: characterAtk + weaponAtk,
    baseDEF: scaleStat(character.DEF, level, 'DEF')
  };
};

/**
 * Calculate the final value of a flat stat (HP, ATK, DEF).
 */
export const calculateFlatStat = (
  baseValue: number,
  percentBonus: number,
  flatBonus: number,
  echoDefault: number
): number => {
  return Math.round(baseValue * (1 + percentBonus / 100)) + flatBonus + echoDefault;
};

/**
 * Calculate the final value of a percent stat.
 */
export const calculatePercentStat = (
  baseValue: number,
  bonus: number
): number => {
  return Number((baseValue + bonus).toFixed(1));
};
