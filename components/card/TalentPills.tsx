'use client';

import React from 'react';
import { ForteState } from '@/lib/build';

interface TalentPillsProps {
  forte: ForteState;
  /** Optional max level for the "max" highlight; defaults to 10. */
  maxLevel?: number;
}

interface PillSpec {
  glyph: string;
  label: string;
}

// Canonical column order: Normal · Skill · Circuit · Liberation · Intro.
const PILL_SPECS: readonly PillSpec[] = [
  { glyph: 'NA', label: 'Normal' },
  { glyph: 'SK', label: 'Skill' },
  { glyph: 'FC', label: 'Circuit' },
  { glyph: 'LB', label: 'Lib.' },
  { glyph: 'IN', label: 'Intro' },
];

export const TalentPills: React.FC<TalentPillsProps> = ({ forte, maxLevel = 10 }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {PILL_SPECS.map((spec, idx) => {
      const level = forte[idx]?.[0] ?? 1;
      const isMax = level >= maxLevel;
      return (
        <div
          key={spec.glyph}
          className={`inline-flex h-6.5 items-center gap-1.5 border py-1 pr-2 pl-1.5 transition-colors ${
            isMax ? 'border-accent/30' : 'border-border'
          } bg-white/2`}
        >
          <span className="grid h-4 w-4 place-items-center border border-border bg-white/5 font-mono text-[9px] tracking-tight text-text-primary/40">
            {spec.glyph}
          </span>
          <span className="font-ropa text-[11px] text-text-primary/65">{spec.label}</span>
          <span
            className={`font-gowun text-[13px] tabular-nums ${isMax ? 'text-accent-hover' : 'text-text-primary'}`}
          >
            {level}
          </span>
        </div>
      );
    })}
  </div>
);
