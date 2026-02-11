'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EchoPanel } from './EchoPanel';
import { EchoPanelState } from '@/types/echo';
import { GripVertical } from 'lucide-react';

interface SortableEchoPanelProps {
  id: string;
  index: number;
  panelState: EchoPanelState;
}

export const SortableEchoPanel: React.FC<SortableEchoPanelProps> = ({
  id,
  index,
  panelState
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined
  };

  // Drag handle props to pass to EchoPanel
  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
    style: { touchAction: 'none' } as React.CSSProperties
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'shadow-2xl' : ''}`}
    >
      {/* Custom Drag Handle Overlay */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-2 z-10 flex h-8 w-6 cursor-grab items-center justify-center rounded-l-md bg-background-secondary border border-r-0 border-border opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        <GripVertical size={14} className="text-text-primary/50" />
      </div>

      <EchoPanel
        index={index}
        panelState={panelState}
        dragHandleProps={{
          className: 'cursor-grab active:cursor-grabbing',
          style: { touchAction: 'none' }
        }}
        className="group"
      />
    </div>
  );
};

export default SortableEchoPanel;
