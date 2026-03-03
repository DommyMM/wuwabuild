'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
type FlatStatKey = 'HP' | 'ATK' | 'DEF';
const FLAT_STAT_KEYS: readonly FlatStatKey[] = ['HP', 'ATK', 'DEF'] as const;
const ELEMENT_ICON_FILTERS: Record<string, string> = {
  'Aero DMG': 'brightness(0) saturate(100%) invert(81%) sepia(40%) saturate(904%) hue-rotate(93deg) brightness(104%) contrast(103%)',
  'Glacio DMG': 'brightness(0) saturate(100%) invert(68%) sepia(39%) saturate(2707%) hue-rotate(176deg) brightness(102%) contrast(97%)',
  'Fusion DMG': 'brightness(0) saturate(100%) invert(62%) sepia(74%) saturate(2505%) hue-rotate(328deg) brightness(98%) contrast(93%)',
  'Electro DMG': 'brightness(0) saturate(100%) invert(63%) sepia(39%) saturate(1470%) hue-rotate(227deg) brightness(103%) contrast(101%)',
  'Havoc DMG': 'brightness(0) saturate(100%) invert(53%) sepia(40%) saturate(1418%) hue-rotate(296deg) brightness(98%) contrast(96%)',
  'Spectro DMG': 'brightness(0) saturate(100%) invert(83%) sepia(34%) saturate(1178%) hue-rotate(359deg) brightness(102%) contrast(94%)',
};

const FLAT_STATS = new Set<FlatStatKey>(FLAT_STAT_KEYS);
const isFlatStatKey = (key: string): key is FlatStatKey => FLAT_STATS.has(key as FlatStatKey);

export const StatsTableSection: React.FC = () => {
  const { stats } = useStats();
  const { statIcons, statTranslations, fettersByElement } = useGameData();
  const { t } = useLanguage();
  const values = stats.values;

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
    .filter(({ value }) => value !== 0);

  const formatValue = (key: string, value: number) =>
    isFlatStatKey(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;
  const formatFlat = (value: number) => Math.round(value).toLocaleString();

  const formatLabel = (key: string) =>
    statTranslations?.[key] ? t(statTranslations[key]) : key;

  const getPieceLabel = (count: number, threshold: number): string => {
    if (threshold === 3) return '3';
    return count >= 5 ? '5' : '2';
  };

  const renderStatRow = (key: string, value: number) => {
    const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
    const elementalIconFilter = ELEMENT_ICON_FILTERS[key];
    const isFlatStat = isFlatStatKey(key);
    const base = isFlatStat ? Math.round(stats.baseValues[key] ?? 0) : 0;
    const bonus = isFlatStat ? Math.max(0, Math.round(value) - base) : 0;

    return (
      <div key={key} className="flex items-start justify-between gap-2 font-medium">
        <div className="flex items-center gap-2">
          {icon && (
            <img
              src={icon}
              alt={key}
              className="h-6 w-6 shrink-0 object-contain"
              style={elementalIconFilter ? { filter: elementalIconFilter } : undefined}
            />
          )}
          <span className="text-lg leading-tight">
            {formatLabel(key)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-lg text-white/95 ${isFlatStat ? 'leading-tight' : ''}`}>
            {formatValue(key, value)}
          </span>
          {isFlatStat && bonus > 0 && (
            <span className="text-xs text-white/72 leading-none">
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
    <div className="flex h-full w-full flex-col space-y-2 px-8">
      {statRows.map(({ key, value }) => renderStatRow(key, value))}

      {stats.activeSets.length > 0 && (
        <div className="pb-2">
          <div className="flex justify-between px-4">
            {stats.activeSets.map(({ element, count, setName }) => {
              const fetter = fettersByElement[element];
              const threshold = fetter?.pieceCount ?? 2;
              const pieceLabel = getPieceLabel(count, threshold);
              const displayName = fetter ? t(fetter.name) : setName;
              const setIcon = fetter?.icon ?? '';

              return (
                <div
                  key={`${element}-${count}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-black/35 px-2 py-1.5"
                >
                  {setIcon && (
                    <img src={setIcon} alt="" className="h-5.5 w-5.5 object-contain" />
                  )}

                  <span className="text-base font-medium">
                    {displayName}
                  </span>

                  <span className="rounded-md border border-amber-300/55 bg-amber-300/18 px-1.5 text-sm">
                    {pieceLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
