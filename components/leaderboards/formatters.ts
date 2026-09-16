import { isLBPercentStatSortKey, LBSortKey } from '@/lib/lb';
import { REGION_BADGES, RegionBadge } from './constants';

// Re-exported under its old name for the leaderboard components that reach for it here
export { getLBSortLabel as getSortLabel } from '@/lib/lb';

/** Rounded, thousands-separated flat stat, the one home for HP, ATK and DEF figures on every surface */
export function formatFlatStat(value: number): string {
  return Math.round(Number(value)).toLocaleString();
}

/** Rounded, thousands-separated score or damage figure */
export function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Canonical substat key, null when the slot is unset
 *
 * - Every surface that buckets substats goes through here, since the types arrive from stored builds, OCR imports and references
 */
export function normalizeSubstatKey(type: string | null | undefined): string | null {
  const trimmed = type?.trim();
  return trimmed ? trimmed : null;
}

export function formatPercentStat(value: number): string {
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`;
}

export function formatStatByKey(key: LBSortKey, value: number): string {
  if (isLBPercentStatSortKey(key)) return `${Number(value).toFixed(1)}%`;
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

/** Locale short date like "Mar 4, 2026" from an RFC3339 timestamp, null when it does not parse */
export function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatReignSinceDate(reignSince: string): string {
  return formatDateLabel(reignSince) ?? '';
}
