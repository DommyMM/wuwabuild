// Rank-tier letter derived from top-percentile on a leaderboard board.
// Thresholds are guesses for the initial cut; revisit once board distributions land.

export type RankTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface RankTierStyle {
  letter: RankTier;
  color: string;
  glow?: string;
}

const RANK_TIERS: RankTierStyle[] = [
  { letter: 'S', color: '#BFAD7D', glow: 'rgba(166,150,98,0.5)' },
  { letter: 'A', color: '#C4C7CB' },
  { letter: 'B', color: '#B7895C' },
  { letter: 'C', color: 'rgba(224,224,224,0.65)' },
  { letter: 'D', color: 'rgba(224,224,224,0.40)' },
];

export const getRankTier = (topPercent: number): RankTierStyle => {
  if (topPercent <= 1) return RANK_TIERS[0];
  if (topPercent <= 10) return RANK_TIERS[1];
  if (topPercent <= 25) return RANK_TIERS[2];
  if (topPercent <= 50) return RANK_TIERS[3];
  return RANK_TIERS[4];
};

export const computeTopPercent = (rank: number, total: number): number => {
  if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 0 || rank <= 0) return 100;
  return Math.min(100, Math.max(0.01, (rank / total) * 100));
};
