'use client';

import React from 'react';

interface ProfileBuildsViewSwitchProps {
  showAll: boolean;
  counts: { best: number; all: number } | null; // null until the first response
  onChange: (showAll: boolean) => void;
}

const SEGMENT_CLASS = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

/** Best builds or every upload, each labelled with its row count so the hidden share shows before a click */
export const ProfileBuildsViewSwitch: React.FC<ProfileBuildsViewSwitchProps> = ({ showAll, counts, onChange }) => {
  const segments = [
    { label: 'Best builds', count: counts?.best, active: !showAll, value: false },
    { label: 'All builds', count: counts?.all, active: showAll, value: true },
  ];

  return (
    <div role="group" aria-label="Builds shown" className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs font-medium">
      {segments.map((segment) => (
        <button
          key={segment.label}
          type="button"
          aria-pressed={segment.active}
          onClick={() => { if (!segment.active) onChange(segment.value); }}
          className={`${SEGMENT_CLASS} ${
            segment.active
              ? 'bg-accent/12 text-accent'
              : 'cursor-pointer text-text-primary/65 hover:bg-background-secondary/80 hover:text-text-primary'
          }`}
        >
          <span className="whitespace-nowrap">{segment.label}</span>
          {segment.count !== undefined && (
            <span className={`tabular-nums ${segment.active ? 'text-accent/70' : 'text-text-primary/40'}`}>
              {segment.count.toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
