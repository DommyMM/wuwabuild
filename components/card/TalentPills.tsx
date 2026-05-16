'use client';

import React from 'react';
import { ForteState } from '@/lib/build';
import { Character } from '@/lib/character';

interface TalentPillsProps {
  character: Character;
  forte: ForteState;
  /** Max level for the "max" highlight; defaults to 10. */
  maxLevel?: number;
}

// Canonical column order: Normal · Skill · Circuit · Liberation · Intro.
// Maps to character.skillIcons keys.
const SKILL_KEYS: readonly ['normal-attack', 'skill', 'circuit', 'liberation', 'intro'] = [
  'normal-attack',
  'skill',
  'circuit',
  'liberation',
  'intro',
];

const SKILL_LABEL_FALLBACK: Readonly<Record<string, string>> = {
  'normal-attack': 'NA',
  skill: 'SK',
  circuit: 'FC',
  liberation: 'LB',
  intro: 'IN',
};

export const TalentPills: React.FC<TalentPillsProps> = ({ character, forte, maxLevel = 10 }) => (
  <div className="flex items-center gap-1.5">
    {SKILL_KEYS.map((key, idx) => {
      const level = forte[idx]?.[0] ?? 1;
      const isMax = level >= maxLevel;
      const icon = character.skillIcons?.[key] ?? character.elementIcon ?? '';
      return (
        <div
          key={key}
          className={`inline-flex h-6.5 items-center gap-1 border bg-black/35 pr-1.5 pl-0.5 ${
            isMax ? 'border-accent/35' : 'border-white/12'
          }`}
        >
          {icon ? (
            <img
              src={icon}
              alt={SKILL_LABEL_FALLBACK[key]}
              className={`h-5 w-5 object-contain ${isMax ? '' : 'opacity-80'}`}
            />
          ) : (
            <span className="grid h-4 w-4 place-items-center text-[9px] text-text-primary/40">
              {SKILL_LABEL_FALLBACK[key]}
            </span>
          )}
          <span
            className={`font-gowun text-[13px] leading-none tabular-nums ${
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
