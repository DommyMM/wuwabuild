'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CORE_STATS = ['HP', 'ATK', 'DEF', 'Energy Regen', 'Crit Rate', 'Crit DMG'] as const;
const BONUS_STATS = [
  'Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG',
  'Basic Attack DMG Bonus', 'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus', 'Resonance Liberation DMG Bonus',
  'Healing Bonus',
] as const;

const LABEL: Record<string, string> = {
  'HP': 'HP',
  'ATK': 'ATK',
  'DEF': 'DEF',
  'Energy Regen': 'Energy Regen',
  'Crit Rate': 'Crit Rate',
  'Crit DMG': 'Crit DMG',
  'Aero DMG': 'Aero DMG',
  'Glacio DMG': 'Glacio DMG',
  'Fusion DMG': 'Fusion DMG',
  'Electro DMG': 'Electro DMG',
  'Havoc DMG': 'Havoc DMG',
  'Spectro DMG': 'Spectro DMG',
  'Basic Attack DMG Bonus': 'Basic ATK DMG',
  'Heavy Attack DMG Bonus': 'Heavy ATK DMG',
  'Resonance Skill DMG Bonus': 'Res. Skill DMG',
  'Resonance Liberation DMG Bonus': 'Res. Liberation DMG',
  'Healing Bonus': 'Healing Bonus',
};

const FLAT_STATS = new Set(['HP', 'ATK', 'DEF']);

interface StatsTableSectionProps {
  layout?: 'double' | 'single';
}

export const StatsTableSection: React.FC<StatsTableSectionProps> = ({ layout = 'double' }) => {
  const { stats } = useStats();
  const { statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const values = stats.values;

  const statRows = [
    ...CORE_STATS.map(s => ({ key: s, value: values[s] ?? 0 })),
    ...BONUS_STATS
      .map(s => ({ key: s, value: values[s] ?? 0 }))
      .filter(r => r.value > 0),
  ];

  const formatValue = (key: string, value: number) =>
    FLAT_STATS.has(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;
  const formatLabel = (key: string) =>
    statTranslations?.[key] ? t(statTranslations[key]) : (LABEL[key] ?? key);

  const renderStatRow = (key: string, value: number, singleColumn: boolean) => {
    const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
    if (singleColumn) {
      return (
        <div key={key} className="flex items-center justify-between gap-2 py-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <img src={icon} alt={key} className="h-[18px] w-[18px] shrink-0 object-contain" />}
            <span className="truncate text-[12px] leading-none text-white/64">
              {formatLabel(key)}
            </span>
          </div>
          <span className="ml-1 shrink-0 text-[12px] font-medium leading-none text-white/95">
            {formatValue(key, value)}
          </span>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {icon && <img src={icon} alt={key} className="h-4 w-4 shrink-0 object-contain" />}
          <span className="truncate text-[11px] leading-none text-white/60">
            {formatLabel(key)}
          </span>
        </div>
        <span className="ml-1 shrink-0 text-[11px] font-semibold leading-none text-white/95">
          {formatValue(key, value)}
        </span>
      </div>
    );
  };

  if (layout === 'single') {
    return (
      <div className="flex h-full w-full min-w-0 flex-col justify-around gap-1">
        {statRows.map(({ key, value }) => renderStatRow(key, value, true))}
      </div>
    );
  }

  const splitIndex = Math.ceil(statRows.length / 2);
  const leftColumn = statRows.slice(0, splitIndex);
  const rightColumn = statRows.slice(splitIndex);

  return (
    <div className="flex h-full min-w-0 gap-4">
      {[leftColumn, rightColumn].map((rows, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col justify-around">
          {rows.map(({ key, value }) => {
            return renderStatRow(key, value, false);
          })}
        </div>
      ))}
    </div>
  );
};
