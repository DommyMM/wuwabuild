import { LB_STAT_ENTRIES, LBSortKey } from '@/lib/lb';
import { SORT_OPTIONS } from './buildConstants';

export function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFlatStat(value: number): string {
  return Number(value).toFixed(0);
}

export function formatPercentStat(value: number): string {
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`;
}

export function getElementDMGLabel(code: string): string {
  const stat = LB_STAT_ENTRIES.find((entry) => entry.code === code);
  return stat?.label ?? code;
}

export function getSortLabel(key: LBSortKey): string {
  return SORT_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
