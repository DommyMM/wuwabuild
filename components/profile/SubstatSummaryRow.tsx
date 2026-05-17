'use client';

import React, { useMemo, useState } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { calculateOverallRV, DEFAULT_PREFERRED_STATS } from '@/lib/calculations/rollValues';
import { isPercentStat, BASE_STATS } from '@/lib/constants/statMappings';
import {
  LB_SUMMARY_ICON,
  LB_SUMMARY_ICON_EMPTY,
  LB_SUMMARY_PILL,
  LB_SUMMARY_ROW,
  LB_SUMMARY_RV,
  LB_SUMMARY_VAL,
} from '@/components/leaderboards/constants';
import { formatFlatStat, formatPercentStat } from '@/components/leaderboards/formatters';

const BASE_STATS_SET = new Set<string>(BASE_STATS);

type SubstatSummaryEntry = {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
};

function getBasePercentVariant(stat: string): string | null {
  if (BASE_STATS_SET.has(stat)) return `${stat}%`;
  if (stat.endsWith('%') && BASE_STATS_SET.has(stat.slice(0, -1))) return stat.slice(0, -1);
  return null;
}

function normalizeSubstatKey(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Renders the per-stat substat tally pills + total RV. Lives inside the BuildProvider
 * scope so it reads `state.echoPanels` directly. Designed to sit inside the cardRef
 * capture area so it gets included in the downloaded PNG (Akasha-style).
 */
export const SubstatSummaryRow: React.FC = () => {
  const { state } = useBuild();
  const selected = useSelectedCharacter();
  const { getSubstatValues, statTranslations, statIcons } = useGameData();
  const [selectedSubstats, setSelectedSubstats] = useState<Set<string>>(new Set());
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false);

  const autoSelectedSubstats = useMemo(() => {
    const preferredStats = selected?.character.preferredStats ?? DEFAULT_PREFERRED_STATS;
    const availableStats = new Set<string>();
    for (const panel of state.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const key = normalizeSubstatKey(sub.type);
        if (key && sub.value !== null) availableStats.add(key);
      }
    }
    const toSelect = new Set<string>();
    for (const stat of preferredStats) {
      if (availableStats.has(stat)) toSelect.add(stat);
      const variant = getBasePercentVariant(stat);
      if (variant && availableStats.has(variant)) toSelect.add(variant);
    }
    return toSelect;
  }, [state.echoPanels, selected]);

  const detailSubstatSummary = useMemo<SubstatSummaryEntry[]>(() => {
    const map = new Map<string, SubstatSummaryEntry>();
    for (const panel of state.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const key = normalizeSubstatKey(sub.type);
        if (!key || sub.value === null) continue;
        const cur = map.get(key);
        if (cur) { cur.count += 1; cur.total += Number(sub.value); continue; }
        map.set(key, {
          type: key,
          total: Number(sub.value),
          count: 1,
          icon: statIcons?.[key] ?? statIcons?.[key.replace('%', '')] ?? '',
          isPercent: isPercentStat(key),
        });
      }
    }
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
  }, [state.echoPanels, statIcons, statTranslations]);

  const activeSelectedSubstats = hasManuallyInteracted ? selectedSubstats : autoSelectedSubstats;
  const hasSelectedSubstats = activeSelectedSubstats.size > 0;

  const toggleSubstat = (type: string) => {
    const key = normalizeSubstatKey(type);
    if (!key) return;
    setHasManuallyInteracted(true);
    setSelectedSubstats((prev) => {
      const base = hasManuallyInteracted ? prev : autoSelectedSubstats;
      const next = new Set(base);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const totalSelectedRolls = useMemo(() => (
    detailSubstatSummary
      .filter((s) => activeSelectedSubstats.has(s.type))
      .reduce((sum, s) => sum + s.count, 0)
  ), [activeSelectedSubstats, detailSubstatSummary]);

  const overallRV = useMemo(() => {
    if (activeSelectedSubstats.size === 0 || detailSubstatSummary.length === 0) return 0;
    const selectedMap = new Map<string, { total: number; count: number }>();
    for (const s of detailSubstatSummary) {
      if (activeSelectedSubstats.has(s.type)) selectedMap.set(s.type, { total: s.total, count: s.count });
    }
    return calculateOverallRV(selectedMap, getSubstatValues);
  }, [activeSelectedSubstats, detailSubstatSummary, getSubstatValues]);

  if (detailSubstatSummary.length === 0) return null;

  return (
    <div className={LB_SUMMARY_ROW}>
      {detailSubstatSummary.map((summary) => {
        const isSelected = activeSelectedSubstats.has(summary.type);
        const isDimmed = hasSelectedSubstats && !isSelected;
        const totalText = summary.isPercent
          ? formatPercentStat(summary.total)
          : formatFlatStat(summary.total);
        return (
          <button
            key={`summary-${summary.type}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleSubstat(summary.type)}
            className={`${LB_SUMMARY_PILL} ${
              isSelected
                ? 'border-amber-300/75 opacity-100'
                : isDimmed
                  ? 'border-amber-300/45 opacity-40'
                  : 'border-amber-300/45 opacity-100'
            }`}
            title={summary.type}
          >
            <span className="text-amber-300">x{summary.count}</span>
            {summary.icon ? (
              <img src={summary.icon} alt="" className={LB_SUMMARY_ICON} />
            ) : (
              <span className={LB_SUMMARY_ICON_EMPTY} />
            )}
            <span className={LB_SUMMARY_VAL}>{totalText}</span>
          </button>
        );
      })}

      <div
        className={`${LB_SUMMARY_RV} ${
          hasSelectedSubstats
            ? 'border border-amber-300/75 opacity-100'
            : 'border border-amber-300/45 opacity-70'
        }`}
      >
        <span className="text-amber-300">x{totalSelectedRolls}</span>
        <span>•</span>
        <span className="text-amber-300">RV</span>
        <span className={LB_SUMMARY_VAL}>{(totalSelectedRolls * overallRV).toFixed(1)}%</span>
      </div>
    </div>
  );
};
