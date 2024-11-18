import React, { useState, useEffect, useRef } from 'react';
import { useMain } from '../hooks/useMain';
import { useSubstats } from '../hooks/useSub';
import { StatValue, StatsState, MainStatData } from '../types/stats';

interface StatsTabProps {
  cost: number | null;
  level: number;
  panelId: string;
  onStatsChange: (stats: StatsState) => void;
}

const MainStatSelect: React.FC<{
  cost: number | null;
  mainStatsData: MainStatData | null;
  selectedStat: StatValue;
  onChange: (type: string | null) => void;
}> = ({ cost, mainStatsData, selectedStat, onChange }) => {
  const { getAllMainStats, getMainStatsByCost } = useMain();
  const allStats = getAllMainStats();
  const availableStats = getMainStatsByCost(cost);

  return (
    <div className="stat-slot main-stat">
      <select 
        value={selectedStat.type || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="stat-select"
      >
        <option value="">Main Stat</option>
        {Object.keys(allStats).map(stat => (
          <option 
            key={stat} 
            value={stat}
            disabled={!availableStats[stat]}
          >
            {stat}
          </option>
        ))}
      </select>
      <div className="main-stat-value">
        {selectedStat.value ? `${selectedStat.value.toFixed(1)}%` : '0'}
      </div>
    </div>
  );
};

export const StatsTab: React.FC<StatsTabProps> = ({ cost, level, panelId, onStatsChange }) => {
  const { mainStatsData, calculateValue } = useMain();
  const { substatsData, selectStatForPanel, unselectStatForPanel, isStatAvailableForPanel } = useSubstats();
  const sliderRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<StatsState>({
    mainStat: { type: null, value: null },
    subStats: Array(5).fill({ type: null, value: null })
  });

  useEffect(() => {
    if (!cost) {
      stats.subStats.forEach(substat => {
        if (substat.type) {
          unselectStatForPanel(panelId, substat.type);
        }
      });

      setStats({
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
      });
      onStatsChange({
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
      });

      if (sliderRef.current) {
        sliderRef.current.style.background = `linear-gradient(to right, #ffd700 0%, #ff8c00 0%, #d3d3d3 0%)`;
      }
    }
  }, [cost, panelId, unselectStatForPanel]);

  const handleMainStatChange = (type: string | null) => {
    if (!type || !mainStatsData || !cost) {
      const newStats = {
        ...stats,
        mainStat: { type: null, value: null }
      };
      setStats(newStats);
      onStatsChange(newStats);
      return;
    }

    const [min, max] = mainStatsData[`${cost}cost`].mainStats[type];
    const value = calculateValue(min, max, level);
    const newStats = {
      ...stats,
      mainStat: { type, value }
    };
    setStats(newStats);
    onStatsChange(newStats);
  };

  useEffect(() => {
    if (stats.mainStat.type && cost && mainStatsData) {
      const [min, max] = mainStatsData[`${cost}cost`].mainStats[stats.mainStat.type];
      const value = calculateValue(min, max, level);
      setStats(prev => ({
        ...prev,
        mainStat: { ...prev.mainStat, value }
      }));
    }
  }, [level, cost, mainStatsData, stats.mainStat.type]);

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
          {cost && mainStatsData && Object.entries(mainStatsData[`${cost}cost`].mainStats).map(([statName, [min, max]]) => (
            <option key={statName} value={statName}>
              {statName}
            </option>
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
            onChange={(e) => {
              const newType = e.target.value || null;
              handleSubStatChange(index, newType, null);
            }}
          >
            <option value="">Substat {index + 1}</option>
            {substatsData && Object.keys(substatsData).map(stat => (
              <option
                key={stat}
                value={stat}
                disabled={!isStatAvailableForPanel(
                  panelId, 
                  stat, 
                  stats.subStats[index].type || undefined
                )}
              >
                {stat}
              </option>
            ))}
          </select>
          
          <select 
            className="stat-value"
            disabled={!stats.subStats[index].type}
            value={stats.subStats[index].value?.toString() || ''}
            onChange={(e) => {
              const newValue = e.target.value ? Number(e.target.value) : null;
              handleSubStatChange(index, stats.subStats[index].type, newValue);
            }}
          >
            <option value="">Select</option>
            {stats.subStats[index].type && substatsData && 
              (substatsData[stats.subStats[index].type as string] || []).map((value: number) => (
                <option key={value} value={value}>
                  {['ATK', 'HP', 'DEF'].includes(stats.subStats[index].type as string) 
                    ? value 
                    : `${value}%`}
                </option>
              ))
            }
          </select>
        </div>
      ))}
    </div>
  );
};