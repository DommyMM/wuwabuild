import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { EchoPanel } from './EchoSection';
import type { ElementType, EchoPanelState as PanelData } from '@/types/echo';

interface SortablePanelProps {
    id: string;
    index: number;
    panelData: PanelData;
    onSelect: () => void;
    onReset: () => void;
    onLevelChange: (level: number) => void;
    onElementSelect: (element: ElementType | null) => void;
    onMainStatChange: (type: string | null) => void;
    onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
    onSave?: () => void;
    onLoad?: () => void;
    onPhantomChange: (value: boolean) => void;
}

export const SortableEchoPanel: React.FC<SortablePanelProps> = ({
    id,
    ...props
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const dragHandleProps = {
        ...attributes,
        ...listeners,
        role: 'button',
        tabIndex: 0,
        'aria-describedby': `drag-handle-${id}`
    } as const;

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: isDragging ? transition : 'none',
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} className="sortable-panel" data-dragging={isDragging}>
            <EchoPanel {...props} dragHandleProps={dragHandleProps} />
        </div>
    );
};

export const SortableSub = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: isDragging ? transition : 'none',
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} className="sortable-substat" data-dragging={isDragging} {...attributes} {...listeners}>
            {children}
        </div>
    );
};
