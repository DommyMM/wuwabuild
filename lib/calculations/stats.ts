import { Character } from '@/lib/character';
import { Weapon } from '@/lib/weapon';
import { ForteState } from '@/lib/build';

interface CurveStats {
  HP: number;
  ATK: number;
  DEF: number;
}

export interface CharacterCurve {
  CHARACTER_CURVE: {
    [level: string]: CurveStats;
  };
}

export interface LevelCurves {
  ATK_CURVE: { [key: string]: number };
  STAT_CURVE: { [key: string]: number };
}

/** Curve-table key for a level: ascension levels read as "60/60", every other level as the bare number */
const getLevelKey = (level: number): string => {
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

const scaleWeaponAtk = (
  baseAtk: number,
  level: number,
  curves: LevelCurves | null
): number => {
  if (!curves) return baseAtk;
  const key = getLevelKey(level);
  return Math.floor(baseAtk * curves.ATK_CURVE[key]);
};

const scaleWeaponStat = (
  baseStat: number,
  level: number,
  curves: LevelCurves | null
): number => {
  if (!curves) return baseStat;
  const key = getLevelKey(level);
  return parseFloat((baseStat * curves.STAT_CURVE[key]).toFixed(1));
};

export const calculateWeaponStats = (
  weapon: Weapon,
  level: number,
  curves: LevelCurves | null
): { scaledAtk: number; scaledMainStat: number } => ({
  scaledAtk: scaleWeaponAtk(weapon.ATK, level, curves),
  scaledMainStat: scaleWeaponStat(weapon.base_main, level, curves),
});

/** A `forte` row is [level, top, middle], rows 0-4 for tree1-tree5 */
export const calculateForteBonus = (
  character: Character,
  forte: ForteState
): { bonus1Total: number; bonus2Total: number } => {
  const fn = character.forteNodes;
  let bonus1Total = 0;
  let bonus2Total = 0;

  // tree3 has no stat nodes, so index 2 is skipped
  const treeMap: [number, string, boolean][] = [
    [0, 'tree1', true],
    [1, 'tree2', false],
    [3, 'tree4', false],
    [4, 'tree5', true],
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

  return { bonus1Total, bonus2Total };
};
