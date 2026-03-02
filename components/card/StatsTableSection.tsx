'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PINNED_ORDER = ['HP', 'ATK', 'DEF', 'Energy Regen', 'Crit Rate', 'Crit DMG'] as const;
const PINNED_SET = new Set<string>(PINNED_ORDER);
const ALWAYS_VISIBLE = new Set<string>(PINNED_ORDER);
const ELEMENT_ICON_FILTERS: Record<string, string> = {
  'Aero DMG': 'brightness(0) saturate(100%) invert(81%) sepia(40%) saturate(904%) hue-rotate(93deg) brightness(104%) contrast(103%)',
  'Glacio DMG': 'brightness(0) saturate(100%) invert(68%) sepia(39%) saturate(2707%) hue-rotate(176deg) brightness(102%) contrast(97%)',
  'Fusion DMG': 'brightness(0) saturate(100%) invert(62%) sepia(74%) saturate(2505%) hue-rotate(328deg) brightness(98%) contrast(93%)',
  'Electro DMG': 'brightness(0) saturate(100%) invert(63%) sepia(39%) saturate(1470%) hue-rotate(227deg) brightness(103%) contrast(101%)',
  'Havoc DMG': 'brightness(0) saturate(100%) invert(53%) sepia(40%) saturate(1418%) hue-rotate(296deg) brightness(98%) contrast(96%)',
  'Spectro DMG': 'brightness(0) saturate(100%) invert(83%) sepia(34%) saturate(1178%) hue-rotate(359deg) brightness(102%) contrast(94%)',
};

const FLAT_STATS = new Set(['HP', 'ATK', 'DEF']);

export const StatsTableSection: React.FC = () => {
  const { stats } = useStats();
  const { statIcons, statTranslations, fettersByElement } = useGameData();
  const { t } = useLanguage();
  const values = stats.values;

  const pinnedRows = PINNED_ORDER
    .filter(key => Object.prototype.hasOwnProperty.call(values, key))
    .map(key => ({ key, value: values[key] ?? 0 }));

  const dynamicRows = Object.entries(values)
    .filter(([key]) => !PINNED_SET.has(key))
    .map(([key, value]) => ({ key, value: value ?? 0 }));

  const statRows = [...pinnedRows, ...dynamicRows]
    .filter(({ key, value }) => ALWAYS_VISIBLE.has(key) || value > 0);

  const formatValue = (key: string, value: number) =>
    FLAT_STATS.has(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;

  const formatLabel = (key: string) =>
    statTranslations?.[key] ? t(statTranslations[key]) : key;

  const getPieceLabel = (count: number, threshold: number): string => {
    if (threshold === 3) return '3';
    return count >= 5 ? '5' : '2';
  };

  const renderStatRow = (key: string, value: number) => {
    const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
    const elementalIconFilter = ELEMENT_ICON_FILTERS[key];

    return (
      <div key={key} className="flex items-center justify-between gap-2 font-medium">
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
        <span className="text-lg">
          {formatValue(key, value)}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col space-y-2 px-8">
      {statRows.map(({ key, value }) => renderStatRow(key, value))}

      {stats.activeSets.length > 0 && (
        <div className="pb-2">
          <div className="flex justify-between">
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
