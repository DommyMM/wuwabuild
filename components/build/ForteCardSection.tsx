'use client';

import React from 'react';
import { Character } from '@/lib/character';
import { ForteState } from '@/lib/build';

const ELEMENT_COLOR: Record<string, string> = {
  Aero: '#55FFB5', Havoc: '#E649A6', Spectro: '#F8E56C',
  Glacio: '#41AEFB', Electro: '#B46BFF', Fusion: '#F0744E',
};

interface BranchDef { label: string; skillKey: string; treeKey: string; }
const BRANCHES: BranchDef[] = [
  { label: 'Normal', skillKey: 'normal-attack', treeKey: 'tree1' },
  { label: 'Skill',  skillKey: 'skill',          treeKey: 'tree2' },
  { label: 'Circuit',skillKey: 'circuit',        treeKey: 'tree3' },
  { label: 'Libera', skillKey: 'liberation',     treeKey: 'tree4' },
  { label: 'Intro',  skillKey: 'intro',          treeKey: 'tree5' },
];

interface ForteCardSectionProps {
  character: Character;
  forte: ForteState;
  element: string;
  className?: string;
}

export const ForteCardSection: React.FC<ForteCardSectionProps> = ({
  character, forte, element, className = '',
}) => {
  const color = ELEMENT_COLOR[element] ?? '#ffffff';

  return (
    <div className={`flex items-stretch gap-1 ${className}`}>
      {BRANCHES.map((branch, i) => {
        const [level, topActive, midActive] = forte[i];
        const skillIcon = character.skillIcons?.[branch.skillKey] ?? '';
        const topNode = character.forteNodes?.[`${branch.treeKey}.top`];
        const midNode = character.forteNodes?.[`${branch.treeKey}.middle`];

        return (
          <div key={branch.skillKey} className="flex flex-col items-center justify-end gap-0.5 flex-1">
            {/* Top node — diamond */}
            {topNode ? (
              <div
                className="w-2.5 h-2.5 rotate-45 border shrink-0"
                style={{
                  borderColor: topActive ? color : 'rgba(255,255,255,0.25)',
                  backgroundColor: topActive ? `${color}55` : 'transparent',
                  boxShadow: topActive ? `0 0 4px ${color}60` : 'none',
                }}
              />
            ) : <div className="w-2.5 h-2.5" />}

            {/* Mid node — circle */}
            {midNode ? (
              <div
                className="w-2.5 h-2.5 rounded-full border shrink-0"
                style={{
                  borderColor: midActive ? color : 'rgba(255,255,255,0.25)',
                  backgroundColor: midActive ? `${color}55` : 'transparent',
                  boxShadow: midActive ? `0 0 4px ${color}60` : 'none',
                }}
              />
            ) : <div className="w-2.5 h-2.5" />}

            {/* Connector line */}
            <div className="w-px h-2 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

            {/* Skill icon frame */}
            <div
              className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0"
              style={{
                borderColor: `${color}70`,
                backgroundColor: `${color}18`,
                boxShadow: `0 0 8px ${color}25`,
              }}
            >
              {skillIcon && (
                <img src={skillIcon} alt={branch.label} className="w-4 h-4 object-contain invert" />
              )}
            </div>

            {/* Level */}
            <span
              className="text-[9px] font-semibold leading-none"
              style={{ color: level >= 10 ? color : 'rgba(255,255,255,0.6)' }}
            >
              {level}
            </span>

            {/* Label */}
            <span className="text-[7px] text-white/35 leading-none text-center">
              {branch.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
