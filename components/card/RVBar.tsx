'use client';

import React, { useMemo } from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat, BASE_STATS } from '@/lib/constants/statMappings';
import { calculateOverallRV } from '@/lib/calculations/rollValues';
import { formatFlatStat, formatPercentStat } from '@/components/leaderboards/formatters';

interface SubstatSummary {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
  isPriority: boolean;
}

interface RVBarProps {
  echoPanels: EchoPanelState[];
  preferredStats?: readonly string[];
  className?: string;
}

const BASE_STATS_SET = new Set<string>(BASE_STATS);

const normalize = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildPriorityKeys = (preferred: readonly string[] | undefined): Set<string> => {
  const set = new Set<string>();
  if (!preferred) return set;
  for (const stat of preferred) {
    const key = normalize(stat);
    if (!key) continue;
    set.add(key);
    if (key.endsWith('%')) set.add(key.slice(0, -1));
    else set.add(`${key}%`);
  }
  return set;
};

export const RVBar: React.FC<RVBarProps> = ({ echoPanels, preferredStats, className }) => {
  const { getSubstatValues, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  const priorityKeys = useMemo(() => buildPriorityKeys(preferredStats), [preferredStats]);

  const summary = useMemo<SubstatSummary[]>(() => {
    const map = new Map<string, SubstatSummary>();
    for (const panel of echoPanels) {
      for (const sub of panel.stats.subStats) {
        const key = normalize(sub.type);
        if (!key || sub.value == null) continue;
        const existing = map.get(key);
        if (existing) {
          existing.total += Number(sub.value);
          existing.count += 1;
          continue;
        }
        map.set(key, {
          type: key,
          total: Number(sub.value),
          count: 1,
          icon: statIcons?.[key] ?? statIcons?.[key.replace('%', '')] ?? '',
          isPercent: isPercentStat(key),
          isPriority: priorityKeys.has(key),
        });
      }
    }

    // Stable order: priority first, then crits, then by stat-translations order, then flats.
    const order: string[] = [];
    const seen = new Set<string>();
    const pushOnce = (k: string) => {
      if (!seen.has(k) && map.has(k)) {
        order.push(k);
        seen.add(k);
      }
    };

    for (const k of map.keys()) {
      if (priorityKeys.has(k)) pushOnce(k);
    }
    pushOnce('Crit Rate');
    pushOnce('Crit DMG');
    if (statTranslations) {
      for (const rawKey of Object.keys(statTranslations)) pushOnce(rawKey);
    }
    for (const k of map.keys()) {
      if (!BASE_STATS_SET.has(k)) pushOnce(k);
    }
    for (const k of map.keys()) pushOnce(k);

    return order.map((k) => map.get(k)!).filter(Boolean);
  }, [echoPanels, priorityKeys, statIcons, statTranslations]);

  const { rvPct, priorityCount } = useMemo(() => {
    if (priorityKeys.size === 0) return { rvPct: 0, priorityCount: 0 };
    const selected = new Map<string, { total: number; count: number }>();
    let priorityRollCount = 0;
    for (const entry of summary) {
      if (!entry.isPriority) continue;
      selected.set(entry.type, { total: entry.total, count: entry.count });
      priorityRollCount += entry.count;
    }
    if (priorityRollCount === 0) return { rvPct: 0, priorityCount: 0 };
    return {
      rvPct: calculateOverallRV(selected, getSubstatValues),
      priorityCount: priorityRollCount,
    };
  }, [summary, priorityKeys, getSubstatValues]);

  if (summary.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-stretch gap-2 border border-border bg-background-secondary/60 px-3 py-2.5 ${className ?? ''}`}
    >
      {summary.map((entry) => {
        const formattedTotal = entry.isPercent
          ? formatPercentStat(entry.total)
          : formatFlatStat(entry.total);
        const label = statTranslations?.[entry.type] ? t(statTranslations[entry.type]) : entry.type;
        return (
          <span
            key={entry.type}
            className={`inline-flex items-center gap-1.5 border px-2 py-1 transition-colors ${
              entry.isPriority
                ? 'border-accent/45 bg-accent/10'
                : 'border-border bg-black/25'
            }`}
            title={label}
          >
            <span
              className={`font-ropa text-[10px] uppercase tracking-[0.04em] ${
                entry.isPriority ? 'text-accent' : 'text-text-primary/40'
              }`}
            >
              ×{entry.count}
            </span>
            {entry.icon ? (
              <img
                src={entry.icon}
                alt=""
                className={`h-3.5 w-3.5 object-contain ${entry.isPriority ? '' : 'opacity-65'}`}
              />
            ) : null}
            <span
              className={`font-gowun text-[12px] tabular-nums ${
                entry.isPriority ? 'text-accent-hover' : 'text-text-primary/65'
              }`}
            >
              {label} {formattedTotal}
            </span>
          </span>
        );
      })}

      <span className="ml-auto inline-flex items-center gap-2 border border-accent/45 bg-accent/8 px-2.5 py-1">
        <span className="font-ropa text-[10px] uppercase tracking-[0.22em] text-text-primary/40">
          ×{priorityCount} · RV
        </span>
        <span className="font-gowun text-[13px] font-bold tabular-nums text-accent-hover">
          {rvPct > 0 ? `${rvPct.toFixed(1)}%` : '—'}
        </span>
      </span>
    </div>
  );
};
