const SUBSTAT_ROLL_TIER_COLORS = [
  '#A65A17',
  '#FF8C00',
  '#B8860B',
  '#E6B800',
  '#4CAF50',
  '#00FFFF',
  '#FF00FF',
  '#CC0000',
] as const;

const SUBSTAT_ROLL_TIER_LABELS = [
  'Low',
  'Low',
  'Decent',
  'Decent',
  'High',
  'Excellent',
  'Perfect',
  'MAX',
] as const;

const toFiniteSortedValues = (rollValues: number[] | null | undefined): number[] => (
  Array.isArray(rollValues)
    ? rollValues.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b)
    : []
);

const getSubstatTierIndex = (
  value: number,
  rollValues: number[] | null | undefined,
): number | null => {
  const sorted = toFiniteSortedValues(rollValues);
  if (sorted.length === 0) return null;

  let closestIndex = 0;
  let bestDelta = Infinity;
  sorted.forEach((rollValue, index) => {
    const delta = Math.abs(rollValue - value);
    if (delta < bestDelta) {
      bestDelta = delta;
      closestIndex = index;
    }
  });

  if (sorted.length === 1) return SUBSTAT_ROLL_TIER_COLORS.length;
  return Math.round((closestIndex / (sorted.length - 1)) * (SUBSTAT_ROLL_TIER_COLORS.length - 1)) + 1;
};

const getRollTierColor = (index: number): string | null => {
  if (!Number.isInteger(index)) return null;
  return SUBSTAT_ROLL_TIER_COLORS[index - 1] ?? null;
};

const getRollTierLabel = (index: number): string | null => {
  if (!Number.isInteger(index)) return null;
  return SUBSTAT_ROLL_TIER_LABELS[index - 1] ?? null;
};

export interface SubstatTierInfo {
  index: number;
  label: string;
  color: string;
  isMax: boolean;
}

export const getSubstatTierInfo = (
  value: number,
  rollValues: number[] | null | undefined,
): SubstatTierInfo | null => {
  const index = getSubstatTierIndex(value, rollValues);
  if (index == null) return null;
  const color = getRollTierColor(index);
  const label = getRollTierLabel(index);
  if (!color || !label) return null;

  return {
    index,
    label,
    color,
    isMax: index === SUBSTAT_ROLL_TIER_COLORS.length,
  };
};
