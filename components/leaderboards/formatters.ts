import { LBSortKey } from '@/lib/lb';
import { PERCENT_STAT_KEYS, REGION_BADGES, RegionBadge, SORT_OPTIONS } from './constants';

export function formatFlatStat(value: number): string {
  return Number(value).toFixed(0);
}

export function formatPercentStat(value: number): string {
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`;
}

export function getSortLabel(key: LBSortKey): string {
  return SORT_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function formatStatByKey(key: LBSortKey, value: number): string {
  if (PERCENT_STAT_KEYS.has(key)) return `${Number(value).toFixed(1)}%`;
  return formatFlatStat(value);
}

export function resolveRegionBadge(uid: string | undefined): RegionBadge | null {
  if (!uid) return null;
  const prefix = uid.trim()[0];
  return REGION_BADGES[prefix] ?? null;
}
