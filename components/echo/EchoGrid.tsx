'use client';

import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { SortableEchoPanel } from './SortableEchoPanel';
import { SetBonusDisplay } from './SetBonusDisplay';
import { getTotalEchoCost } from '@/lib/calculations/echoes';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface EchoGridProps {
  className?: string;
}

const ECHO_COST_LIMIT = 12;

export const EchoGrid: React.FC<EchoGridProps> = ({ className = '' }) => {
  const { state, reorderEchoPanels } = useBuild();
  const { getEcho } = useGameData();

  // DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Require 8px movement before starting drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Calculate total cost
  const totalCost = useMemo(() => {
    return getTotalEchoCost(state.echoPanels, getEcho);
  }, [state.echoPanels, getEcho]);

  // Check if cost is valid
  const isCostValid = totalCost <= ECHO_COST_LIMIT;
  const isCostComplete = totalCost === ECHO_COST_LIMIT;

  // Generate unique IDs for sortable items
  const panelIds = useMemo(() => {
    return state.echoPanels.map((_, index) => `echo-panel-${index}`);
  }, [state.echoPanels]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = panelIds.indexOf(active.id as string);
      const newIndex = panelIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderEchoPanels(oldIndex, newIndex);
      }
    }
  }, [panelIds, reorderEchoPanels]);

  // Calculate active set bonuses
  const activeSets = useMemo(() => {
    const elementCounts: Record<string, number> = {};

    state.echoPanels.forEach(panel => {
      if (panel.id && panel.selectedElement) {
        elementCounts[panel.selectedElement] = (elementCounts[panel.selectedElement] || 0) + 1;
      }
    });

    return Object.entries(elementCounts)
      .filter(([_, count]) => count >= 2)
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count);
  }, [state.echoPanels]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header with cost display */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Echoes</h2>

        {/* Cost Display */}
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
          isCostComplete
            ? 'border-green-500/50 bg-green-500/10'
            : isCostValid
            ? 'border-border bg-background-secondary'
            : 'border-red-500/50 bg-red-500/10'
        }`}>
          {isCostComplete ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : !isCostValid ? (
            <AlertTriangle size={16} className="text-red-500" />
          ) : null}
          <span className={`text-sm font-medium ${
            isCostComplete
              ? 'text-green-500'
              : isCostValid
              ? 'text-text-primary'
              : 'text-red-500'
          }`}>
            Cost: {totalCost} / {ECHO_COST_LIMIT}
          </span>
        </div>
      </div>

      {/* Set Bonuses */}
      {activeSets.length > 0 && (
        <SetBonusDisplay sets={activeSets} />
      )}

      {/* Echo Panels Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={panelIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {state.echoPanels.map((panel, index) => (
              <SortableEchoPanel
                key={panelIds[index]}
                id={panelIds[index]}
                index={index}
                panelState={panel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Cost warning/info */}
      {!isCostValid && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span className="text-sm text-red-400">
            Total echo cost exceeds the limit of {ECHO_COST_LIMIT}. Remove or change echoes to fix.
          </span>
        </div>
      )}

      {isCostValid && totalCost > 0 && totalCost < ECHO_COST_LIMIT && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2">
          <span className="text-sm text-text-primary/60">
            You can still equip {ECHO_COST_LIMIT - totalCost} more cost worth of echoes.
          </span>
        </div>
      )}
    </div>
  );
};

export default EchoGrid;
