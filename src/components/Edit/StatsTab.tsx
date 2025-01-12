import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMain } from '../../hooks/useMain';
import { useSubstats } from '../../hooks/useSub';
import { StatsState } from '../../types/stats';

interface StatsTabProps {
  panelId: string;
  cost: number | null;
  level: number;
  stats: StatsState; 
  onMainStatChange: (type: string | null) => void;
  onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
}

const SortableSubstat = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'none',
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 999 : 'auto',
    cursor: 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export const StatsTab: React.FC<StatsTabProps> = ({
  cost,
  level,
  panelId,
  stats,
  onMainStatChange,
  onSubStatChange
}) => {
  const { mainStatsData } = useMain();
  const { 
    substatsData, 
    selectStatForPanel, 
    unselectStatForPanel, 
    isStatAvailableForPanel,
    getLowestValue 
  } = useSubstats();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('substat-', ''));
      const newIndex = parseInt(over.id.toString().replace('substat-', ''));
      
      const newSubStats = arrayMove(stats.subStats, oldIndex, newIndex);
      newSubStats.forEach((stat, index) => {
        onSubStatChange(index, stat.type, stat.value);
      });
    }
  };

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

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={Array(5).fill(null).map((_, i) => `substat-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="substats-container">
            {Array(5).fill(null).map((_, index) => {
              const substatType = stats.subStats[index].type;
              
              return (
                <SortableSubstat key={`substat-${index}`} id={`substat-${index}`}>
                  <div className="stat-slot">
                    <select
                      className="stat-select"
                      value={substatType || ''}
                      onChange={(e) => {
                        const oldType = substatType;
                        const newType = e.target.value;
                        
                        if (oldType) unselectStatForPanel(panelId, oldType);
                        if (newType) {
                          selectStatForPanel(panelId, newType);
                          const defaultValue = getLowestValue(newType);
                          onSubStatChange(index, newType, defaultValue);
                        } else {
                          onSubStatChange(index, null, null);
                        }
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
                      onChange={(e) => {
                        if (!substatType) return;
                        onSubStatChange(
                          index,
                          substatType,
                          e.target.value ? Number(e.target.value) : getLowestValue(substatType)
                        );
                      }}
                    >
                      <option value="" disabled>{substatType ? 'Select Value' : 'Select'}</option>
                      {substatType && substatsData && substatsData[substatType]?.map(value => (
                        <option key={value} value={value}>
                          {['ATK', 'HP', 'DEF'].includes(substatType) ? value : `${value}%`}
                        </option>
                      ))}
                    </select>
                  </div>
                </SortableSubstat>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};