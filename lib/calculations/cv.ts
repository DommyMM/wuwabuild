import { EchoPanelState } from '@/lib/echo';

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

// CV rating thresholds
export const CV_RATINGS = {
  GODLIKE: 280,
  EXCELLENT: 240,
  GREAT: 200,
  GOOD: 160,
  AVERAGE: 120,
  BELOW_AVERAGE: 80
} as const;

export type CVRating =
  | 'Godlike'
  | 'Excellent'
  | 'Great'
  | 'Good'
  | 'Average'
  | 'Below Average'
  | 'Needs Work';

// Get a CV rating string based on the CV value.
export const getCVRating = (cv: number): CVRating => {
  if (cv >= CV_RATINGS.GODLIKE) return 'Godlike';
  if (cv >= CV_RATINGS.EXCELLENT) return 'Excellent';
  if (cv >= CV_RATINGS.GREAT) return 'Great';
  if (cv >= CV_RATINGS.GOOD) return 'Good';
  if (cv >= CV_RATINGS.AVERAGE) return 'Average';
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return 'Below Average';
  return 'Needs Work';
};

// Get CV rating color for display.
export const getCVRatingColor = (cv: number): string => {
  if (cv >= CV_RATINGS.GODLIKE) return '#ff6b6b';
  if (cv >= CV_RATINGS.EXCELLENT) return '#ffd93d';
  if (cv >= CV_RATINGS.GREAT) return '#6bcb77';
  if (cv >= CV_RATINGS.GOOD) return '#4d96ff';
  if (cv >= CV_RATINGS.AVERAGE) return '#a8a8a8';
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return '#888888';
  return '#666666';
};
