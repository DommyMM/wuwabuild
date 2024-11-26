import React from 'react';
import { useMain } from '../hooks/useMain';
import { useSubstats } from '../hooks/useSub';
import { StatsState } from '../types/stats';

type SubstatValue = number;

interface StatsTabProps {
  panelId: string;
  cost: number | null;
  level: number;
  stats: StatsState; 
  onMainStatChange: (type: string | null) => void;
  onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  cost,
  level,
  panelId,
  stats,
  onMainStatChange,
  onSubStatChange
}) => {
  const { mainStatsData } = useMain();
  const { substatsData, selectStatForPanel, unselectStatForPanel, isStatAvailableForPanel } = useSubstats();

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
      
      {Array(5).fill(null).map((_, index) => {
        const substatType = stats.subStats[index].type;
        
        return (
          <div key={index} className="stat-slot">
            <select
              className="stat-select"
              value={substatType || ''}
              onChange={(e) => {
                const oldType = substatType;
                if (oldType) unselectStatForPanel(panelId, oldType);
                if (e.target.value) selectStatForPanel(panelId, e.target.value);
                onSubStatChange(index, e.target.value || null, null);
              }}
            >
              <option value="">Substat {index + 1}</option>
              {substatsData && Object.keys(substatsData).map(stat => (
                <option
                  key={stat}
                  value={stat}
                  disabled={!isStatAvailableForPanel(panelId, stat, substatType || undefined)}
                >
                  {stat}
                </option>
              ))}
            </select>
            
            <select
              className="stat-value"
              disabled={!substatType}
              value={stats.subStats[index].value?.toString() || ''}
              onChange={(e) => onSubStatChange(
                index,
                substatType,
                e.target.value ? Number(e.target.value) : null
              )}
            >
              <option value="">Select</option>
              {substatType && substatsData && substatsData[substatType as keyof typeof substatsData]?.map((value: SubstatValue) => (
                <option key={value} value={value}>
                  {['ATK', 'HP', 'DEF'].includes(substatType) 
                    ? value 
                    : `${value}%`}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
};