// Substat roll quality tiers are derived from EchoStats.json roll arrays.
// Boundaries are the midpoints between quartile buckets.

// Tier colors: gold > purple > blue > green
const TIER_COLORS = ['#00FF00', '#4D96FF', '#B46BFF', '#E6B800'] as const;

const toFiniteSortedValues = (rollValues: number[] | null | undefined): number[] => (
  Array.isArray(rollValues)
    ? rollValues.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b)
    : []
);

const clampBoundaryLeftIndex = (length: number, fraction: number): number => {
  // For 8 rolls this yields 1,3,5; for 4 rolls this yields 0,1,2.
  const raw = Math.ceil(length * fraction) - 1;
  return Math.max(0, Math.min(length - 2, raw));
};

const deriveThresholds = (sortedValues: number[]): [number, number, number] | null => {
  if (sortedValues.length < 4) return null;

  const boundaries = [0.25, 0.5, 0.75].map((fraction) => {
    const leftIndex = clampBoundaryLeftIndex(sortedValues.length, fraction);
    return (sortedValues[leftIndex] + sortedValues[leftIndex + 1]) / 2;
  });

  return [boundaries[0], boundaries[1], boundaries[2]];
};

// Returns the hex color for a substat roll's quality tier
export const getSubstatTierColor = (
  _statType: string,
  value: number,
  rollValues: number[] | null | undefined
): string | null => {
  const tier = getSubstatTierIndex(value, rollValues);
  return tier == null ? null : TIER_COLORS[tier - 1];
};

// Returns the quartile rank (1 = bottom, 4 = top) for a substat roll, or null
// when there isn't enough data to bucket it. Used by the echo card's pip mode
// to render N-of-4 filled dots without re-deriving thresholds per row.
const getSubstatTierIndex = (
  value: number,
  rollValues: number[] | null | undefined
): 1 | 2 | 3 | 4 | null => {
  const thresholds = deriveThresholds(toFiniteSortedValues(rollValues));
  if (!thresholds) return null;

  const [t1, t2, t3] = thresholds;
  if (value >= t3) return 4;
  if (value >= t2) return 3;
  if (value >= t1) return 2;
  return 1;
};

// Quartile labels, index 0 = lowest tier.
const TIER_LABELS = ['Low', 'Fair', 'Good', 'High'] as const;

export interface SubstatTierInfo {
  /** Quartile rank, 1 (lowest rolls) to 4 (highest rolls). */
  index: 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

// Resolves a substat roll into a quartile label + color, or null when there
// isn't enough roll data to bucket it. Used by hover tooltips on echo panels.
export const getSubstatTierInfo = (
  value: number,
  rollValues: number[] | null | undefined
): SubstatTierInfo | null => {
  const index = getSubstatTierIndex(value, rollValues);
  if (index == null) return null;
  return { index, label: TIER_LABELS[index - 1], color: TIER_COLORS[index - 1] };
};
