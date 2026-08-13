'use client';

import React, { useMemo } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateSelectedStatsRV } from '@/lib/calculations/rollValues';
import { LB_SUMMARY_ICON, LB_SUMMARY_ICON_EMPTY, LB_SUMMARY_PILL, LB_SUMMARY_ROW, LB_SUMMARY_RV, LB_SUMMARY_VAL } from '@/components/leaderboards/constants';
import { formatFlatStat, formatPercentStat } from '@/components/leaderboards/formatters';
import { buildSubstatSummary, SubstatSummaryEntry } from '@/components/leaderboards/substatSummary';

interface SubstatSummaryRowProps {
  selectedSubstats: ReadonlySet<string>;
  onToggleSubstat: (type: string) => void;
}

/**
 * Renders the per-stat substat tally pills + total RV. Lives inside the BuildProvider
 * scope so it reads `state.echoPanels` directly. Designed to sit inside the cardRef
 * capture area so it gets included in the downloaded PNG (Akasha-style).
 *
 * The owning profile card passes the same selection to this row and the echo panels,
 * so the interaction stays local to the one surface that exposes these controls.
 */
export const SubstatSummaryRow: React.FC<SubstatSummaryRowProps> = ({
  selectedSubstats,
  onToggleSubstat,
}) => {
  const { state } = useBuild();
  const { getSubstatValues, statTranslations, statIcons } = useGameData();
  const hasSelectedSubstats = selectedSubstats.size > 0;

  const detailSubstatSummary = useMemo<SubstatSummaryEntry[]>(() => (
    buildSubstatSummary(state.echoPanels, statIcons, statTranslations)
  ), [state.echoPanels, statIcons, statTranslations]);

  const totalSelectedRolls = useMemo(() => (
    detailSubstatSummary
      .filter((s) => selectedSubstats.has(s.type))
      .reduce((sum, s) => sum + s.count, 0)
  ), [selectedSubstats, detailSubstatSummary]);

  const overallRV = useMemo(() => {
    if (selectedSubstats.size === 0 || detailSubstatSummary.length === 0) return 0;
    const selectedMap = new Map<string, { total: number; count: number }>();
    for (const s of detailSubstatSummary) {
      if (selectedSubstats.has(s.type)) selectedMap.set(s.type, { total: s.total, count: s.count });
    }
    return calculateSelectedStatsRV(selectedMap, getSubstatValues);
  }, [selectedSubstats, detailSubstatSummary, getSubstatValues]);

  if (detailSubstatSummary.length === 0) return null;

  return (
    <div className={LB_SUMMARY_ROW}>
      {detailSubstatSummary.map((summary) => {
        const isSelected = selectedSubstats.has(summary.type);
        const isDimmed = hasSelectedSubstats && !isSelected;
        const totalText = summary.isPercent
          ? formatPercentStat(summary.total)
          : formatFlatStat(summary.total);
        return (
          <button
            key={`summary-${summary.type}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggleSubstat(summary.type)}
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
