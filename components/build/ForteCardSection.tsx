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
        className={`z-10 h-3.5 w-3.5 object-contain brightness-0 ${active ? '' : 'opacity-45'}`}
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
          <div key={branch.skillKey} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <NodeBadge
              icon={topNodeIcon}
              active={topActive}
              isCircuit={isCircuit}
              alt={`${branch.label} top node`}
            />

            <NodeBadge
              icon={midNodeIcon}
              active={midActive}
              isCircuit={isCircuit}
              alt={`${branch.label} middle node`}
            />

            {/* Connector line */}
            <div className="h-3 w-px shrink-0 bg-white/20" />

            {/* Skill icon frame */}
            <div className="flex h-9 w-9 shrink-0 rotate-45 items-center justify-center rounded-sm border border-black/60 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)]">
              {skillIcon && (
                <img src={skillIcon} alt={branch.label} className="h-5 w-5 -rotate-45 object-contain brightness-0" />
              )}
            </div>

            {/* Level number */}
            <span className="text-[12px] font-bold leading-none text-white/85">
              {level}
            </span>
          </div>
        );
      })}
    </div>
  );
};
