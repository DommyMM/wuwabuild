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
