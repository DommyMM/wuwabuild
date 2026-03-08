// Substat roll quality tiers are derived from Substats.json roll arrays.
// Boundaries are the midpoints between quartile buckets.

// Tier colors: gold > purple > blue > cyan
const TIER_COLORS = ['#00FFFF', '#4D96FF', '#B46BFF', '#E6B800'] as const;

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
  const thresholds = deriveThresholds(toFiniteSortedValues(rollValues));
  if (!thresholds) return null;

  const [t1, t2, t3] = thresholds;
  if (value >= t3) return TIER_COLORS[3]; // gold
  if (value >= t2) return TIER_COLORS[2]; // purple
  if (value >= t1) return TIER_COLORS[1]; // blue
  return TIER_COLORS[0];                  // cyan
};
