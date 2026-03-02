'use client';

import React from 'react';
import { Character } from '@/lib/character';
import { ForteState } from '@/lib/build';

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
  className?: string;
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
    <div className={`relative flex h-6 w-6 shrink-0 items-center justify-center border bg-[#222222] ${isCircuit ? '' : 'rounded-full'} ${active ? 'border-black/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]' : 'border-white/30'}`}>
      {isCircuit && (
        <div className={`pointer-events-none absolute h-[70%] w-[70%] rotate-45 border ${active ? 'border-black/60 bg-white' : 'border-white/35 bg-[#2b2b2b]'}`} />
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
  character, forte, className = '',
}) => {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {BRANCHES.map((branch, i) => {
        const [level, topActive, midActive] = forte[i];
        const skillIcon = character.skillIcons?.[branch.skillKey] ?? character.elementIcon ?? '';
        const isCircuit = branch.treeKey === 'tree3';
        const topNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-1'] ?? character.forteNodes?.['tree3.top']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.top`]?.icon ?? '');
        const midNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-2'] ?? character.forteNodes?.['tree3.middle']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.middle`]?.icon ?? '');

        return (
          <div key={branch.skillKey} className="flex flex-1 flex-col items-center justify-end gap-0.5">
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

            {/* Skill icon frame */}
            <div className="relative mt-0 h-8 w-8 shrink-0">
              <div className="flex h-8 w-8 rotate-45 items-center justify-center rounded-sm border border-black/60 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)]">
                {skillIcon && (
                  <img src={skillIcon} alt={branch.label} className="h-[18px] w-[18px] -rotate-45 object-contain brightness-0" />
                )}
              </div>

              <span className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-black/40 bg-[#a69662] text-[10px] font-bold leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {level}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
