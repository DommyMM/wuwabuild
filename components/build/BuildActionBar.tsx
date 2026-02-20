'use client';

import React from 'react';
import { RotateCcw, Save } from 'lucide-react';

interface BuildActionBarProps {
  isDirty: boolean;
  compact?: boolean;
  onSave: () => void;
  onReset: () => void;
  containerRef?: React.Ref<HTMLDivElement>;
}

type ActionItem = {
  key: 'save' | 'reset';
  label: string;
  icon: typeof Save;
  onClick: () => void;
  variant: 'accent' | 'danger';
};

export const BuildActionBar: React.FC<BuildActionBarProps> = ({
  isDirty,
  compact = false,
  onSave,
  onReset,
  containerRef,
}) => {
  const actions: ActionItem[] = [
    { key: 'save', label: 'Save', icon: Save, onClick: onSave, variant: 'accent' },
    { key: 'reset', label: 'Reset', icon: RotateCcw, onClick: onReset, variant: 'danger' },
  ];

  return (
    <div className={compact
      ? 'flex items-center gap-1 md:gap-1.5'
      : 'flex flex-wrap items-center gap-2 self-end rounded-lg border border-border bg-background-secondary p-3'}
      ref={containerRef}
    >
      {isDirty && (
        <span className={compact
          ? 'hidden md:inline rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400'
          : 'rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400'}
        >
          Unsaved
        </span>
      )}

      <div className={compact ? 'flex items-center gap-1' : 'flex items-center gap-1.5 md:gap-2'}>
        {actions.map(({ key, label, icon: Icon, onClick, variant }) => (
          <button
            key={key}
            onClick={onClick}
            className={compact
              ? variant === 'accent'
                ? 'flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 p-1.5 text-xs font-medium text-accent cursor-pointer transition-colors hover:bg-accent/20 md:px-3 md:py-1.5'
                : 'flex items-center gap-1.5 rounded-md border border-red-500/50 bg-red-500/10 p-1.5 text-xs font-medium text-red-400 cursor-pointer transition-colors hover:bg-red-500/20 md:px-3 md:py-1.5'
              : variant === 'accent'
                ? 'flex items-center gap-2 rounded-lg border border-accent bg-accent/10 p-2 text-sm font-medium text-accent cursor-pointer transition-colors hover:bg-accent/20 md:px-4 md:py-2'
                : 'flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm font-medium text-red-400 cursor-pointer transition-colors hover:bg-red-500/20 md:px-4 md:py-2'}
          >
            <Icon size={compact ? 14 : 16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BuildActionBar;
