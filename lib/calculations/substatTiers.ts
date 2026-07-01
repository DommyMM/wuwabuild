import { getQualityTier } from '@/lib/calculations/rollValues';

const maxRoll = (rollValues: number[] | null | undefined): number | null => {
  if (!Array.isArray(rollValues) || rollValues.length === 0) return null;
  const max = Math.max(...rollValues.filter((value) => Number.isFinite(value)));
  return Number.isFinite(max) && max > 0 ? max : null;
};

const getSubstatTierIndex = (
  value: number,
  rollValues: number[] | null | undefined,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | null => {
  const max = maxRoll(rollValues);
  if (max == null) return null;
  const tier = getQualityTier((Number(value) / max) * 100);
  switch (tier.label) {
    case 'MAX': return 7;
    case 'Perfect': return 6;
    case 'Excellent': return 5;
    case 'High': return 4;
    case 'Decent': return 3;
    case 'Passable': return 2;
    default: return 1;
  }
};

export const getSubstatTierColor = (
  _statType: string,
  value: number,
  rollValues: number[] | null | undefined,
): string | null => {
  const max = maxRoll(rollValues);
  if (max == null) return null;
  return getQualityTier((Number(value) / max) * 100).color;
};

export interface SubstatTierInfo {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  color: string;
}

export const getSubstatTierInfo = (
  value: number,
  rollValues: number[] | null | undefined,
): SubstatTierInfo | null => {
  const max = maxRoll(rollValues);
  if (max == null) return null;
  const tier = getQualityTier((Number(value) / max) * 100);
  const index = getSubstatTierIndex(value, rollValues);
  if (index == null) return null;
  return { index, label: tier.label, color: tier.color };
};
