'use client';

import React from 'react';
import { Character } from '@/lib/character';
import { ForteState } from '@/lib/build';

interface BranchDef { label: string; skillKey: string; treeKey: string; }
const BRANCHES: BranchDef[] = [
  { label: 'Normal', skillKey: 'normal-attack', treeKey: 'tree1' },
  { label: 'Skill',  skillKey: 'skill',          treeKey: 'tree2' },
  { label: 'Circuit',skillKey: 'circuit',        treeKey: 'tree3' },
  { label: 'Liberation', skillKey: 'liberation',     treeKey: 'tree4' },
  { label: 'Intro',  skillKey: 'intro',          treeKey: 'tree5' },
];
const BRANCH_OFFSETS = ['mb-0', 'mb-6', 'mb-10', 'mb-6', 'mb-0'] as const;

interface ForteCardSectionProps {
  character: Character;
  forte: ForteState;
}

interface NodeBadgeProps {
  icon: string;
  active: boolean;
  isCircuit: boolean;
  alt: string;
}

const NodeBadge: React.FC<NodeBadgeProps> = ({ icon, active, isCircuit, alt }) => {
  if (!icon) return <div className="h-6 w-6 shrink-0" />;

  return (
    <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center border bg-background-secondary ${isCircuit ? '' : 'rounded-full'} ${active ? 'border-black/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]' : 'border-white/30'}`}>
      {isCircuit && (
        <div className={`pointer-events-none absolute h-[70%] w-[70%] rotate-45 border ${active ? 'border-black/60 bg-white' : 'border-white/35 bg-background-secondary'}`} />
      )}
      <img
        src={icon}
        alt={alt}
        className={`z-10 h-4 w-4 object-contain brightness-0 ${active ? '' : 'opacity-45'}`}
      />
    </div>
  );
};

export const ForteCardSection: React.FC<ForteCardSectionProps> = ({
  character, forte,
}) => {
  return (
    <div className="flex items-end gap-2 pt-4">
      {BRANCHES.map((branch, i) => {
        const [level, topActive, midActive] = forte[i];
        const isMaxLevel = level >= 10;
        const skillIcon = character.skillIcons?.[branch.skillKey] ?? character.elementIcon ?? '';
        const isCircuit = branch.treeKey === 'tree3';
        const topNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-1'] ?? character.forteNodes?.['tree3.top']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.top`]?.icon ?? '');
        const midNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-2'] ?? character.forteNodes?.['tree3.middle']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.middle`]?.icon ?? '');

        return (
          <div key={branch.skillKey} className={`flex flex-1 flex-col items-center justify-end gap-0.5 ${BRANCH_OFFSETS[i]}`}>
            <NodeBadge
              icon={topNodeIcon}
              active={topActive}
              isCircuit={isCircuit}
              alt={`${branch.label} top node`}
            />

            <div className="-my-0.5 h-2.5 w-px shrink-0 bg-white/28" />

            <NodeBadge
              icon={midNodeIcon}
              active={midActive}
              isCircuit={isCircuit}
              alt={`${branch.label} middle node`}
            />

            <div className="-my-0.5 h-2.5 w-px shrink-0 bg-white/28" />

            {/* Skill icon frame + level bubble below */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 rotate-45 items-center justify-center rounded-sm border border-black/60 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)]">
                {skillIcon && (
                  <img src={skillIcon} alt={branch.label} className="h-5 w-5 -rotate-45 object-contain brightness-0" />
                )}
              </div>
              <span
                className={`flex h-5 w-8 items-center justify-center rounded-full border text-xs font-bold leading-none tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.45)] z-2 ${
                  isMaxLevel
                    ? 'border-amber-300/55 bg-amber-300/92 text-[#4a3400]'
                    : 'border-black/35 bg-black/55 text-white/92'
                }`}
              >
                {level}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
