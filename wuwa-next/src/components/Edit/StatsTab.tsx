'use client';

import React from 'react';
import { useMain } from '@/hooks/useMain';
import { useSubstats } from '@/hooks/useSub';
import { StatsState } from '@/types/stats';

interface StatsTabProps {
  panelId: string;
  cost: number | null;
  level: number;
  stats: StatsState; 
  onMainStatChange: (type: string | null) => void;
  onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
}

interface SubstatSlotProps {
  index: number;
  type: string | null;
  value: number | null;
  substatsData: Record<string, number[]> | null;
  isAvailable: (stat: string) => boolean;
  onTypeChange: (type: string | null) => void;
  onValueChange: (value: number | null) => void;
}

const SubstatSlot = ({
  index,
  type,
  value,
  substatsData,
  isAvailable,
  onTypeChange,
  onValueChange
}: SubstatSlotProps) => (
  <div className="stat-slot">
    <select
      className="stat-select"
      value={type || ''}
      onChange={(e) => onTypeChange(e.target.value || null)}
    >
      <option value="">Substat {index + 1}</option>
      {substatsData && Object.keys(substatsData).map(stat => (
        <option
          key={stat}
          value={stat}
          disabled={!isAvailable(stat)}
        >
          {stat}
        </option>
      ))}
    </select>
    <select
      className="stat-value"
      disabled={!type}
      value={value?.toString() || ''}
      onChange={(e) => onValueChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="" disabled>{type ? 'Select Value' : 'Select'}</option>
      {type && substatsData && substatsData[type]?.map(value => (
        <option key={value} value={value}>
          {['ATK', 'HP', 'DEF'].includes(type) ? value : `${value}%`}
        </option>
      ))}
    </select>
  </div>
);

export const StatsTab: React.FC<StatsTabProps> = ({
  cost,
  level,
  panelId,
  stats,
  onMainStatChange,
  onSubStatChange
}) => {
  const { mainStatsData } = useMain();
  const { substatsData, isStatAvailableForPanel } = useSubstats();

  return (
    <div className="stats-tab">
      <div className="stat-slot main-stat">
        <select
          value={stats.mainStat.type || ''}
          onChange={(e) => onMainStatChange(e.target.value || null)}
          className="stat-select"
          disabled={!cost}
        >
          <option value="" disabled>Main Stat</option>
          {cost && mainStatsData && Object.entries(mainStatsData[`${cost}cost`].mainStats).map(([statName]) => (
            <option key={statName} value={statName}>{statName}</option>
          ))}
        </select>
        <div className="main-stat-value">
          {stats.mainStat.value ? `${stats.mainStat.value.toFixed(1)}%` : '0'}
        </div>
      </div>

      <div className="substats-container">
        {stats.subStats.map((stat, index) => (
          <SubstatSlot
            key={index}
            index={index}
            type={stat.type}
            value={stat.value}
            substatsData={substatsData}
            isAvailable={(stat) => isStatAvailableForPanel(panelId, stat)}
            onTypeChange={(type) => onSubStatChange(index, type, stat.value)}
            onValueChange={(value) => onSubStatChange(index, stat.type, value)}
          />
        ))}
      </div>
    </div>
  );
};