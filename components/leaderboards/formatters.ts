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

// Rank-1 reign helpers. Duration is relative to now, so callers that render on the
// server (the collapsed row) must compute it client-side to avoid a hydration mismatch.
// Estimated reigns were backfill-seeded from post time, so they can't claim a precise
// duration and read "since posted" instead.

export function reignElapsedDays(reignSince: string): number | null {
  const start = new Date(reignSince).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.floor((Date.now() - start) / 86_400_000);
}

export function formatReignSinceDate(reignSince: string): string {
  const d = new Date(reignSince);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatReignLabel(reignSince: string, estimated: boolean): string | null {
  if (estimated) return '#1 since posted';
  const start = new Date(reignSince).getTime();
  if (!Number.isFinite(start)) return null;
  const ms = Date.now() - start;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `#1 for ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `#1 for ${hours} hour${hours === 1 ? '' : 's'}`;
  return '#1 holder';
}
