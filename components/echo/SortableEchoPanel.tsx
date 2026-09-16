'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { EchoPanel } from './EchoPanel';
import { EchoPanelState } from '@/lib/echo';

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
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  // Drag props go on the handle alone, so the rest of the panel stays interactive
  const dragHandleProps = {
    ...attributes,
    ...listeners,
    role: 'button',
    tabIndex: 0,
    'aria-describedby': `drag-handle-${id}`
  } as const;

  // Transition only while dragging, so a dropped panel lands without animating back
  const style: React.CSSProperties | undefined = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: isDragging ? transition : 'none',
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-999 opacity-80' : ''}`}
      data-dragging={isDragging}
    >
      <div className={isDragging ? '[&>div]:shadow-[0_0_20px_rgba(0,0,0,0.3)]' : ''}>
        <EchoPanel
          index={index}
          panelState={panelState}
          dragHandleProps={dragHandleProps}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
};
