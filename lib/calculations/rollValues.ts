import { EchoPanelState } from '@/lib/echo';

// Calculate roll value based on max possible roll and values
export function calculateSubstatRollPercentage(
  statType: string,
  value: number,
  substatValues: number[] | null
): number {
  if (!substatValues || substatValues.length === 0) {
    return 0;
  }

  const maxRoll = Math.max(...substatValues);
  if (maxRoll === 0) {
    return 0;
  }

  return (value / maxRoll) * 100;
}

// Calculate overall RV for selected substats.
//
// Formula: average over stat types of (avgRollValue / maxRollValue).
// Each selected stat type is weighted equally, 3x Crit Rate rolls don't
// outweigh 1x Crit DMG roll just because you have more of them. Both stats
// contribute one equal "slot" to the average.
//
// Result: 0–100% where 100% = every stat's average roll was the max-tier value.
export function calculateOverallRV(
  selectedSubstats: Map<string, { total: number; count: number }>,
  getSubstatValues: (stat: string) => number[] | null
): number {
  if (selectedSubstats.size === 0) return 0;

  let sumStatQuality = 0;
  let validStatCount = 0;

  for (const [statType, { total, count }] of selectedSubstats.entries()) {
    const substatValues = getSubstatValues(statType);
    if (!substatValues || substatValues.length === 0) continue;
    const maxRoll = Math.max(...substatValues);
    if (maxRoll === 0 || count === 0) continue;
    const avgRoll = total / count;
    sumStatQuality += avgRoll / maxRoll;
    validStatCount += 1;
  }

  if (validStatCount === 0) return 0;
  return (sumStatQuality / validStatCount) * 100;
}

// Default preferred substats for RV calculation
export const DEFAULT_PREFERRED_STATS = ["Crit Rate", "Crit DMG", "Energy Regen"];

// --- CV (Crit Value) calculations ---

// Calculate individual echo CV from substats only (no main stat).
// CV = 2 * Crit Rate + Crit DMG
export const calculateEchoSubstatCV = (panel: EchoPanelState): number => {
  let critRate = 0;
  let critDmg = 0;

  panel.stats.subStats.forEach(stat => {
    if (stat.type === 'Crit Rate' && stat.value) critRate += stat.value;
    if (stat.type === 'Crit DMG' && stat.value) critDmg += stat.value;
  });

  return 2 * critRate + critDmg;
};

// Calculate total CV across all echo panels (substats + main stats).
export const calculateCV = (echoPanels: EchoPanelState[]): number => {
  let cv = echoPanels.reduce((sum, panel) => sum + calculateEchoSubstatCV(panel), 0);

  echoPanels.forEach(panel => {
    const { type, value } = panel.stats.mainStat;
    if (type === 'Crit Rate' && value) cv += 2 * value;
    if (type === 'Crit DMG' && value) cv += value;
  });

  return cv;
};

// Per-echo CV tier (substats only)
// Combined range: 25.2 (both min) → 42.0 (both max), median ≈ 33.6
// Passable floor = 25.2 (minimum double-crit: both substats at lowest roll).
// Below means single or no crit
//
//   Perfect   ≥ 39.8  ~  5 %  of double-crit combinations
//   Excellent ≥ 36.0  ~ 28 %
//   High      ≥ 32.0  ~ 34 %
//   Decent    ≥ 28.0  ~ 22 %
//   Passable  ≥ 25.2   ~ 11 %  (minimum double-crit)
//   Bad        < 25.2          (single-crit or no crit)
export interface EchoCVTierStyle {
  color: string;    // hex for badge text and border tint
  bgColor?: string; // override background (e.g., inverted badge for MAX)
  label: string;
  isMax?: boolean;  // max CV of 42
}

export const getEchoCVTierStyle = (cv: number): EchoCVTierStyle => {
  if (cv >= 42.0) return { color: '#CC0000', bgColor: 'rgba(255,255,255,0.95)', label: 'MAX', isMax: true }; // inverted red
  if (cv >= 39.8) return { color: '#FF00FF', label: 'Perfect'  };              // hot pink
  if (cv >= 36.0) return { color: '#00FFFF', label: 'Excellent' };             // cyan
  if (cv >= 32.0) return { color: '#00FF00', label: 'High'     };              // green
  if (cv >= 28.0) return { color: '#E6B800', label: 'Decent'   };              // gold
  if (cv >= 25.2) return { color: '#FF8C00', label: 'Passable' };              // orange
  return               { color: '#888888',  label: 'Bad'      };              // gray
};

// Use CV-tier tint for the card frame, but keep weak echoes on the default amber
// so they still read as normal items instead of disabled states.
export const getEchoCVFrameColor = (cv: number): string => {
  const tier = getEchoCVTierStyle(cv);
  return tier.label === 'Bad' ? '#fbbf24' : tier.color;
};

export const CV_RATINGS = {
  IMPOSSIBLE: 254,      // theoretical max: 5 * 42 + 44
  PERFECT: 240,         // 5 * 39.8 + 44 ≈ 243
  EXCELLENT: 224,        // 5 * 36.0 + 44
  GREAT: 204,            // 5 * 32.0 + 44
  GOOD: 184,             // 5 * 28.0 + 44 
  AVERAGE: 170,          // 5 * 25.2 + 44 (min double-crit)
  BELOW_AVERAGE: 140,    // below min double-crit
} as const;

export type CVRating =
  | 'Impossible'
  | 'Perfect'
  | 'Excellent'
  | 'Great'
  | 'Good'
  | 'Average'
  | 'Below Average'
  | 'Needs Work';

// Get a CV rating string based on the CV value.
export const getCVRating = (cv: number): CVRating => {
  if (cv >= CV_RATINGS.IMPOSSIBLE) return 'Impossible';
  if (cv >= CV_RATINGS.PERFECT) return 'Perfect';
  if (cv >= CV_RATINGS.EXCELLENT) return 'Excellent';
  if (cv >= CV_RATINGS.GREAT) return 'Great';
  if (cv >= CV_RATINGS.GOOD) return 'Good';
  if (cv >= CV_RATINGS.AVERAGE) return 'Average';
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return 'Below Average';
  return 'Needs Work';
};

// Get CV rating color for display.
export const getCVRatingColor = (cv: number): string => {
  if (cv >= CV_RATINGS.IMPOSSIBLE) return '#CC0000';     // Impossible → deep red (theoretical max)
  if (cv >= CV_RATINGS.PERFECT) return '#FF00FF';        // Perfect → hot pink (echo "Perfect")
  if (cv >= CV_RATINGS.EXCELLENT) return '#00FFFF';      // Excellent → cyan (echo "Excellent")
  if (cv >= CV_RATINGS.GREAT) return '#00FF00';          // Great → green (echo "High")
  if (cv >= CV_RATINGS.GOOD) return '#00FF00';           // Good → green (echo "High")
  if (cv >= CV_RATINGS.AVERAGE) return '#E6B800';        // Average → gold (echo "Decent")
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return '#FF8C00';  // Below Average → orange (echo "Passable")
  return '#666666';                                      // Needs Work → darker gray
};
