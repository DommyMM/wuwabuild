'use client';

import React from 'react';
import { ForteState } from '@/lib/build';

interface TalentPillsProps {
  forte: ForteState;
  /** Max level for the "max" highlight; defaults to 10. */
  maxLevel?: number;
}

// Canonical column order: Normal · Skill · Circuit · Liberation · Intro.
const PILL_GLYPHS: readonly string[] = ['NA', 'SK', 'FC', 'LB', 'IN'];

export const TalentPills: React.FC<TalentPillsProps> = ({ forte, maxLevel = 10 }) => (
  <div className="flex items-center gap-1.5">
    {PILL_GLYPHS.map((glyph, idx) => {
      const level = forte[idx]?.[0] ?? 1;
      const isMax = level >= maxLevel;
      return (
        <div
          key={glyph}
          className={`inline-flex h-5.5 items-center gap-1 border bg-white/3 px-1.5 ${
            isMax ? 'border-accent/30' : 'border-border'
          }`}
        >
          <span className="font-ropa text-[9px] tracking-tight text-text-primary/40 uppercase">
            {glyph}
          </span>
          <span
            className={`font-gowun text-[12px] leading-none tabular-nums ${
              isMax ? 'text-accent-hover' : 'text-text-primary'
            }`}
          >
            {level}
          </span>
        </div>
      );
    })}
  </div>
);
