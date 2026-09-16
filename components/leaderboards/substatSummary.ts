import { isPercentStat, BASE_STATS } from '@/lib/constants/statMappings';
import { EchoPanelState } from '@/lib/echo';
import { normalizeSubstatKey } from './formatters';

const BASE_STATS_SET = new Set<string>(BASE_STATS);

export type SubstatSummaryEntry = {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
};

/**
 * Tallies every substat across a build's five echoes into one entry per stat, crits first, then the rest, then flat base stats
 *
 * - One implementation because the expanded row, the profile card and the benchmark blueprint must agree pill for pill
 * - The blueprint sits directly under the player's own row, so a different tally or order there reads as a real difference
 */
export function buildSubstatSummary(
  panels: EchoPanelState[],
  statIcons: Record<string, string> | null,
  statTranslations: Record<string, Record<string, string>> | null,
): SubstatSummaryEntry[] {
  const map = new Map<string, SubstatSummaryEntry>();
  for (const panel of panels) {
    for (const sub of panel.stats.subStats) {
      const key = normalizeSubstatKey(sub.type);
      if (!key || sub.value === null) continue;
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
        cur.total += Number(sub.value);
        continue;
      }
      map.set(key, {
        type: key,
        total: Number(sub.value),
        count: 1,
        icon: statIcons?.[key] ?? statIcons?.[key.replace('%', '')] ?? '',
        isPercent: isPercentStat(key),
      });
    }
  }

  // Registry order, so the row is stable across builds rather than following whichever echo rolled a stat first
  const statOrder: string[] = [];
  if (statTranslations) {
    const seen = new Set<string>();
    for (const rawKey of Object.keys(statTranslations)) {
      if (seen.has(rawKey) || !map.has(rawKey)) continue;
      statOrder.push(rawKey);
      seen.add(rawKey);
    }
  } else {
    statOrder.push(...map.keys());
  }

  const crits: string[] = [], flats: string[] = [], rest: string[] = [];
  for (const key of statOrder) {
    if (key === 'Crit Rate' || key === 'Crit DMG') crits.push(key);
    else if (BASE_STATS_SET.has(key)) flats.push(key);
    else rest.push(key);
  }
  return [...crits, ...rest, ...flats].map((key) => map.get(key)!);
}
