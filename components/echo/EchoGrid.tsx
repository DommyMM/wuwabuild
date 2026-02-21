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
import { getTotalEchoCost } from '@/lib/calculations/echoes';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface EchoGridProps {
  className?: string;
}

interface EchoCostBadgeProps {
  className?: string;
}

export const EchoCostBadge: React.FC<EchoCostBadgeProps> = ({ className = '' }) => {
  const { state } = useBuild();
  const { getEcho } = useGameData();

  const totalCost = useMemo(() => {
    return getTotalEchoCost(state.echoPanels, getEcho);
  }, [state.echoPanels, getEcho]);

  const isCostValid = totalCost <= 12;
  const isCostComplete = totalCost === 12;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-border bg-background p-2 ${className}`}
    >
      {isCostComplete ? (
        <CheckCircle size={20} className="text-green-500" />
      ) : !isCostValid ? (
        <AlertTriangle size={20} className="text-red-500" />
      ) : null}
      <span
        className={`text-2xl font-medium ${isCostComplete
          ? 'text-green-500'
          : isCostValid
            ? 'text-text-primary/50'
            : 'text-red-500'
          }`}
      >
        Cost {totalCost} / 12
      </span>
    </div>
  );
};


export const EchoGrid: React.FC<EchoGridProps> = ({ className = '' }) => {
  const { state, reorderEchoPanels } = useBuild();
  const { getEcho } = useGameData();

  // Replicate frontend sensor setup exactly
  // Added distance activation constraint so clicks on child elements don't trigger drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Stable panel IDs that match the frontend pattern: `panel-${index}`
  const panelIds = useMemo(() => {
    return state.echoPanels.map((_, index) => `panel-${index}`);
  }, [state.echoPanels]);

  // Replicate frontend's handleDragEnd: parse index from ID, call reorder
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().split('-')[1]);
      const newIndex = parseInt(over.id.toString().split('-')[1]);

      reorderEchoPanels(oldIndex, newIndex);
    }
  }, [reorderEchoPanels]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>

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
    </div>
  );
};
