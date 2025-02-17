'use client';

import React, { useCallback } from 'react';
import { useMain } from '@/hooks/useMain';
import { useSubstats } from '@/hooks/useSub';
import { StatsState } from '@/types/stats';
import { SortableSub } from './SortableEchoPanel';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface StatsTabProps {
  panelId: string;
  cost: number | null;
  stats: StatsState;
  onMainStatChange: (type: string | null) => void;
  onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  cost,
  panelId,
  stats,
  onMainStatChange,
  onSubStatChange
}) => {
  const { mainStatsData } = useMain();
  const { substatsData, isStatAvailableForPanel } = useSubstats();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().split('-')[1]);
      const newIndex = parseInt(over.id.toString().split('-')[1]);
      
      const newSubStats = arrayMove(stats.subStats, oldIndex, newIndex);
      newSubStats.forEach((stat, index) => {
        onSubStatChange(index, stat.type, stat.value);
      });
    }
  }, [stats.subStats, onSubStatChange]);

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={Array(5).fill(null).map((_, i) => `substat-${i}`)} strategy={verticalListSortingStrategy}>
          <div className="substats-container">
            {stats.subStats.map((stat, index) => (
              <SortableSub key={`substat-${index}`} id={`substat-${index}`}>
                <div className="stat-slot">
                  <select className="stat-select" value={stat.type || ''} onChange={(e) => onSubStatChange(index, e.target.value || null, stat.value)} >
                    <option value="">Substat {index + 1}</option>
                    {substatsData && Object.keys(substatsData).map(statType => (
                      <option key={statType} value={statType} disabled={!isStatAvailableForPanel(panelId, statType)}>
                        {statType}
                      </option>
                    ))}
                  </select>
                  <select className="stat-value" disabled={!stat.type} value={stat.value?.toString() || ''} onChange={(e) => onSubStatChange(index, stat.type, e.target.value ? Number(e.target.value) : null)}>
                    <option value="" disabled>{stat.type ? 'Select Value' : 'Select'}</option>
                    {stat.type && substatsData && substatsData[stat.type]?.map(value => (
                      <option key={value} value={value}>
                        {['ATK', 'HP', 'DEF'].includes(stat.type as string) ? value : `${value}%`}
                      </option>
                    ))}
                  </select>
                </div>
              </SortableSub>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};