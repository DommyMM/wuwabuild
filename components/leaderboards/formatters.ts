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

export function formatReignHoldLabel(reignSince: string): string | null {
  const date = new Date(reignSince);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.max(0, Math.floor((currentDay - startDay) / 86_400_000));
  if (days < 7) return 'New';
  if (days >= 1000) {
    const years = days / 365;
    return `${years.toFixed(years >= 10 ? 0 : 1)}y`;
  }
  return `${days}d`;
}

export function formatReignSinceDate(reignSince: string): string {
  const date = new Date(reignSince);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
