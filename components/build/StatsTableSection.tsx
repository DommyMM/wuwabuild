'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';

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

interface StatsTableSectionProps { className?: string; }

export const StatsTableSection: React.FC<StatsTableSectionProps> = ({ className = '' }) => {
  const { stats } = useStats();
  const { statIcons } = useGameData();
  const values = stats.values;

  const statRows = [
    ...CORE_STATS.map(s => ({ key: s, value: values[s] ?? 0 })),
    ...BONUS_STATS
      .map(s => ({ key: s, value: values[s] ?? 0 }))
      .filter(r => r.value > 0),
  ];

  const formatValue = (key: string, value: number) =>
    FLAT_STATS.has(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;

  const mid = Math.ceil(statRows.length / 2);
  const leftCol = statRows.slice(0, mid);
  const rightCol = statRows.slice(mid);

  return (
    <div className={`flex gap-3 h-full ${className}`}>
      {[leftCol, rightCol].map((col, ci) => (
        <div key={ci} className="flex flex-col justify-around flex-1 min-w-0">
          {col.map(({ key, value }) => {
            const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
            return (
              <div key={key} className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {icon && <img src={icon} alt={key} className="h-4 w-4 object-contain shrink-0" />}
                  <span className="text-white/60 text-[11px] leading-none truncate">
                    {LABEL[key] ?? key}
                  </span>
                </div>
                <span className="text-white/95 text-[11px] font-semibold leading-none shrink-0 ml-1">
                  {formatValue(key, value)}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
