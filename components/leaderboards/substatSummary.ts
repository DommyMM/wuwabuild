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
 * Tally every substat across a build's five echoes into one `xN · total` entry
 * per stat, ordered crits → everything else → flat base stats.
 *
 * One implementation because three surfaces render this same row and they must
 * agree pill for pill: the expanded leaderboard row, the profile card, and the
 * reference benchmark's Echo blueprint. The blueprint is the reason it is worth
 * extracting — it sits directly under the player's own row, so a stat that
 * tallied or ordered differently between the two would read as a real
 * difference between the build and the reference.
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

  // Registry order first, so the row is stable across builds rather than
  // ordered by whichever echo happened to roll a stat first.
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
