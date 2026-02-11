import { EchoPanelState } from '@/types/echo';
import { sumMainStats, sumSubStats } from './echoes';

/**
 * Calculate Critical Value (CV) from echo panels.
 * CV = 2 * Crit Rate + Crit DMG
 */
export const calculateCV = (echoPanels: EchoPanelState[]): number => {
  const critRate = sumMainStats('Crit Rate', echoPanels) + sumSubStats('Crit Rate', echoPanels);
  const critDmg = sumMainStats('Crit DMG', echoPanels) + sumSubStats('Crit DMG', echoPanels);
  return 2 * critRate + critDmg;
};

/**
 * CV rating thresholds
 */
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

/**
 * Get a CV rating string based on the CV value.
 */
export const getCVRating = (cv: number): CVRating => {
  if (cv >= CV_RATINGS.GODLIKE) return 'Godlike';
  if (cv >= CV_RATINGS.EXCELLENT) return 'Excellent';
  if (cv >= CV_RATINGS.GREAT) return 'Great';
  if (cv >= CV_RATINGS.GOOD) return 'Good';
  if (cv >= CV_RATINGS.AVERAGE) return 'Average';
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return 'Below Average';
  return 'Needs Work';
};

/**
 * Get CV rating color for display.
 */
export const getCVRatingColor = (cv: number): string => {
  if (cv >= CV_RATINGS.GODLIKE) return '#ff6b6b';      // Red/Orange for godlike
  if (cv >= CV_RATINGS.EXCELLENT) return '#ffd93d';    // Gold for excellent
  if (cv >= CV_RATINGS.GREAT) return '#6bcb77';        // Green for great
  if (cv >= CV_RATINGS.GOOD) return '#4d96ff';         // Blue for good
  if (cv >= CV_RATINGS.AVERAGE) return '#a8a8a8';      // Gray for average
  if (cv >= CV_RATINGS.BELOW_AVERAGE) return '#888888'; // Darker gray
  return '#666666';                                      // Dark gray for needs work
};

/**
 * Calculate individual echo CV.
 */
export const calculateEchoCV = (panel: EchoPanelState): number => {
  let critRate = 0;
  let critDmg = 0;

  // Check main stat
  if (panel.stats.mainStat.type === 'Crit Rate' && panel.stats.mainStat.value) {
    critRate += panel.stats.mainStat.value;
  }
  if (panel.stats.mainStat.type === 'Crit DMG' && panel.stats.mainStat.value) {
    critDmg += panel.stats.mainStat.value;
  }

  // Check substats
  panel.stats.subStats.forEach(stat => {
    if (stat.type === 'Crit Rate' && stat.value) {
      critRate += stat.value;
    }
    if (stat.type === 'Crit DMG' && stat.value) {
      critDmg += stat.value;
    }
  });

  return 2 * critRate + critDmg;
};

/**
 * Calculate average CV per echo.
 */
export const calculateAverageCV = (echoPanels: EchoPanelState[]): number => {
  const equippedPanels = echoPanels.filter(panel => panel.id !== null);
  if (equippedPanels.length === 0) return 0;

  const totalCV = calculateCV(echoPanels);
  return Number((totalCV / equippedPanels.length).toFixed(1));
};

/**
 * Get CV breakdown by echo.
 */
export const getCVBreakdown = (echoPanels: EchoPanelState[]): { index: number; cv: number }[] => {
  return echoPanels.map((panel, index) => ({
    index,
    cv: panel.id ? calculateEchoCV(panel) : 0
  }));
};
