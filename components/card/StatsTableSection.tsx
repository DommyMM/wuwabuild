'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';

const FLAT_STAT_KEYS = ['HP', 'ATK', 'DEF'] as const;
type FlatStatKey = (typeof FLAT_STAT_KEYS)[number];

const ELEMENT_TO_STAT_KEY: Readonly<Record<string, string>> = {
  Aero: 'Aero DMG',
  Glacio: 'Glacio DMG',
  Fusion: 'Fusion DMG',
  Electro: 'Electro DMG',
  Havoc: 'Havoc DMG',
  Spectro: 'Spectro DMG',
};
const ELEMENTAL_DMG_KEYS = new Set(Object.values(ELEMENT_TO_STAT_KEY));

const isFlatStatKey = (key: string): key is FlatStatKey => FLAT_STAT_KEYS.some((flatStatKey) => flatStatKey === key);

interface StatsTableSectionProps {
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

export const StatsTableSection: React.FC<StatsTableSectionProps> = ({
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { stats } = useStats();
  const { statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();
  const values = stats.values;
  const selectedElementStatKey = selected?.element ? ELEMENT_TO_STAT_KEY[selected.element] : null;

  const orderedStatKeys = React.useMemo(() => {
    const valuesByKey = values as Record<string, number>;
    const sourceKeys = Object.keys(statTranslations ?? {});
    const seen = new Set<string>();
    const ordered: string[] = [];

    // Keep natural order but collapse percent variants (HP% -> HP)
    for (const rawKey of sourceKeys) {
      const normalizedKey = rawKey.endsWith('%') ? rawKey.slice(0, -1) : rawKey;
      if (seen.has(normalizedKey)) continue;
      if (!Object.prototype.hasOwnProperty.call(valuesByKey, normalizedKey)) continue;
      seen.add(normalizedKey);
      ordered.push(normalizedKey);
    }

    // Append any context stats that are not in Stats.json as a safe fallback
    for (const key of Object.keys(valuesByKey)) {
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }

    return ordered;
  }, [statTranslations, values]);

  const statRows = orderedStatKeys
    .map((key) => ({ key, value: (values as Record<string, number>)[key] ?? 0 }))
    .filter(({ key, value }) => {
      if (value === 0) return false;
      if (!ELEMENTAL_DMG_KEYS.has(key)) return true;
      if (!selectedElementStatKey) return true;
      return key === selectedElementStatKey;
    });

  const formatValue = (key: string, value: number) =>
    isFlatStatKey(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;
  const formatFlat = (value: number) => Math.round(value).toLocaleString();

  const formatLabel = (key: string) =>
    statTranslations?.[key] ? t(statTranslations[key]) : key;

  const renderStatRow = (key: string, value: number) => {
    const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
    const elementalIconFilter = ELEMENT_ICON_FILTERS[key];
    const isFlatStat = isFlatStatKey(key);
    const base = isFlatStat ? Math.round(stats.baseValues[key] ?? 0) : 0;
    const bonus = isFlatStat ? Math.max(0, Math.round(value) - base) : 0;
    const hoverKey = normalizeStatHoverKey(key);
    const hasActiveHover = Boolean(activeHoverStat);
    const isMatch = Boolean(activeHoverStat && hoverKey && activeHoverStat === hoverKey);
    const interactionClass = !hasActiveHover
      ? ''
      : isMatch
        ? 'opacity-100 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.24)]'
        : 'opacity-45 brightness-90';

    return (
      <div
        key={key}
        className={`flex items-center justify-between gap-2 rounded-md font-medium transition-all duration-200 ${isFlatStat ? 'h-9' : 'h-8.5'} ${interactionClass}`}
        onMouseEnter={hoverKey ? () => onHoverStatChange?.(hoverKey) : undefined}
        onMouseLeave={hoverKey ? () => onHoverStatChange?.(null) : undefined}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <img
              src={icon}
              alt={key}
              className="h-6 w-6 shrink-0 object-contain"
              style={elementalIconFilter ? { filter: elementalIconFilter } : undefined}
            />
          )}
          <span className="text-lg">
            {formatLabel(key)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg text-white/95 leading-tight">
            {formatValue(key, value)}
          </span>
          {isFlatStat && bonus > 0 && (
            <span className="text-[10px] text-white/72">
              {formatFlat(base)}{' '}
              <span className="text-emerald-300">
                +{formatFlat(bonus)}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col justify-center px-8 pl-2 pt-4">
      {statRows.map(({ key, value }) => renderStatRow(key, value))}
    </div>
  );
};
