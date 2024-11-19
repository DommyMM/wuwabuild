import React, { useState, useEffect } from 'react';
import { useMain } from '../hooks/useMain';
import { useSubstats } from '../hooks/useSub';
import { StatsState } from '../types/stats';

type SubstatValue = number;

interface StatsTabProps {
  cost: number | null;
  level: number;
  panelId: string;
  onStatsChange: (stats: StatsState) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({ cost, level, panelId, onStatsChange }) => {
  const { mainStatsData, calculateValue } = useMain();
  const { substatsData, selectStatForPanel, unselectStatForPanel, isStatAvailableForPanel } = useSubstats();

  const [stats, setStats] = useState<StatsState>({
    mainStat: { type: null, value: null },
    subStats: Array(5).fill({ type: null, value: null })
  });

  useEffect(() => {
    if (!cost) {
      const resetStats = {
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
      };
      resetStats.subStats.forEach(substat => {
        if (substat.type) unselectStatForPanel(panelId, substat.type);
      });

      setStats(resetStats);
      onStatsChange(resetStats);
    }
  }, [cost, panelId, unselectStatForPanel, onStatsChange]);

  useEffect(() => {
    if (!stats.mainStat.type || !cost || !mainStatsData) return;

    const [min, max] = mainStatsData[`${cost}cost`].mainStats[stats.mainStat.type];
    const value = calculateValue(min, max, level);
    
    setStats(prev => {
      const newStats = {
        ...prev,
        mainStat: { ...prev.mainStat, value }
      };
      onStatsChange(newStats);
      return newStats;
    });
  }, [
    level, 
    cost, 
    mainStatsData, 
    stats.mainStat.type, 
    calculateValue, 
    onStatsChange
  ]);

  const handleMainStatChange = (type: string | null) => {
    if (!type || !mainStatsData || !cost) {
      const newStats = { ...stats, mainStat: { type: null, value: null } };
      setStats(newStats);
      onStatsChange(newStats);
      return;
    }

    const [min, max] = mainStatsData[`${cost}cost`].mainStats[type];
    const newStats = {
      ...stats,
      mainStat: { type, value: calculateValue(min, max, level) }
    };
    setStats(newStats);
    onStatsChange(newStats);
  };

  const handleSubStatChange = (index: number, type: string | null, value: number | null) => {
    const oldType = stats.subStats[index].type;
    if (oldType) unselectStatForPanel(panelId, oldType);
    if (type) selectStatForPanel(panelId, type, oldType || undefined);

    const newSubStats = [...stats.subStats];
    newSubStats[index] = { type, value };
    const newStats = { ...stats, subStats: newSubStats };
    setStats(newStats);
    onStatsChange(newStats);
  };

  return (
    <div className="stats-tab">
      <div className="stat-slot main-stat">
        <select 
          value={stats.mainStat.type || ''}
          onChange={(e) => handleMainStatChange(e.target.value || null)}
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
      
      {Array(5).fill(null).map((_, index) => (
        <div key={index} className="stat-slot">
          <select
            className="stat-select"
            value={stats.subStats[index].type || ''}
            onChange={(e) => handleSubStatChange(index, e.target.value || null, null)}
          >
            <option value="">Substat {index + 1}</option>
            {substatsData && Object.keys(substatsData).map(stat => (
              <option
                key={stat}
                value={stat}
                disabled={!isStatAvailableForPanel(panelId, stat, stats.subStats[index].type || undefined)}
              >
                {stat}
              </option>
            ))}
          </select>
          
          <select 
            className="stat-value"
            disabled={!stats.subStats[index].type}
            value={stats.subStats[index].value?.toString() || ''}
            onChange={(e) => handleSubStatChange(
              index,
              stats.subStats[index].type,
              e.target.value ? Number(e.target.value) : null
            )}
          >
            <option value="">Select</option>
            {stats.subStats[index].type && substatsData && (
              (() => {
                const statType = stats.subStats[index].type as keyof typeof substatsData;
                return substatsData[statType].map((value: SubstatValue) => (
                  <option key={value} value={value}>
                    {['ATK', 'HP', 'DEF'].includes(String(statType)) 
                      ? value 
                      : `${value}%`}
                  </option>
                ));
              })()
            )}
          </select>
        </div>
      ))}
    </div>
  );
};