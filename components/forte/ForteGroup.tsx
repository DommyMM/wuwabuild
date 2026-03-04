'use client';

import React, { useCallback, useMemo } from 'react';
import { SkillBranch } from './SkillBranch';
import { Character } from '@/lib/character';
import { ForteState } from '@/lib/build';
import { calculateForteBonus } from '@/lib/calculations/stats';
import { SKILL_BRANCHES } from '@/lib/constants/skillBranches';

interface ForteGroupProps {
  character: Character;
  elementValue: string;
  forte: ForteState;
  onNodeChange: (col: number, pos: 'top' | 'middle', active: boolean) => void;
  onLevelChange: (col: number, level: number) => void;
  onMaxAll?: () => void;
  compact?: boolean;
  className?: string;
}

// Ascending pyramid offsets: outer cols lowest, center highest
const BRANCH_OFFSETS = ['', 'mb-8', 'mb-12', 'mb-8', ''];

export const ForteGroup: React.FC<ForteGroupProps> = ({
  character,
  elementValue,
  forte,
  onNodeChange,
  onLevelChange,
  onMaxAll,
  compact = false,
  className = '',
}) => {
  // Bonus stats
  const { bonus1Total, bonus2Total, bonus1Type } = useMemo(
    () => calculateForteBonus(character, forte),
    [character, forte],
  );

  // Use CDN node icons directly (tree1 for bonus1, tree2 for bonus2)
  const bonus1Icon = character.forteNodes?.['tree1.top']?.icon ?? '';
  const bonus2Icon = character.forteNodes?.['tree2.top']?.icon ?? '';

  // Format bonus display, percentages get %, flat stats don't
  const formatBonus = (type: string, value: number) => {
    if (value === 0) return `+0%`;
    return `+${value.toFixed(1)}%`;
  };

  // Handlers
  const handleNodeClick = useCallback(
    (col: number, position: 'top' | 'middle') => {
      const current = forte[col];
      const posIdx = position === 'top' ? 1 : 2;
      onNodeChange(col, position, !current[posIdx]);
    },
    [forte, onNodeChange],
  );

  const handleLevelChange = useCallback(
    (col: number, level: number) => {
      onLevelChange(col, level);
    },
    [onLevelChange],
  );


  const branchOffsets = compact ? ['', 'mb-4', 'mb-6', 'mb-4', ''] : BRANCH_OFFSETS;

  return (
    <div className={`flex h-full min-w-0 flex-col ${className}`}>
      {/* Bonus stat chips */}
      <div className={`flex flex-wrap items-center justify-center ${compact ? 'gap-2 text-xs' : 'gap-3 text-sm'}`}>
        <span className={`flex items-center gap-1.5 rounded-md border border-border bg-background ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
          <img src={bonus1Icon} alt={bonus1Type} className="h-4 w-4 object-contain" />
          <span className="text-text-primary/60">{bonus1Type}</span>
          <span className="font-semibold text-accent">{formatBonus(bonus1Type, bonus1Total)}</span>
        </span>
        <span className={`flex items-center gap-1.5 rounded-md border border-border bg-background ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
          <img src={bonus2Icon} alt={`${character.Bonus2}%`} className="h-4 w-4 object-contain" />
          <span className="text-text-primary/60">{character.Bonus2}%</span>
          <span className="font-semibold text-accent">{formatBonus(character.Bonus2, bonus2Total)}</span>
        </span>
      </div>

      <div className={`relative flex min-w-0 flex-1 ${compact ? 'items-end pb-2' : 'items-end'}`}>
        {SKILL_BRANCHES.map((branch, i) => (
          <SkillBranch
            key={branch.treeKey}
            skillName={branch.skillName}
            skillKey={branch.skillKey}
            treeKey={branch.treeKey}
            character={character}
            elementValue={elementValue}
            hasNodes={branch.hasNodes}
            isActive={{
              top: forte[i][1],
              middle: forte[i][2],
            }}
            level={forte[i][0]}
            onNodeClick={(pos) => handleNodeClick(i, pos)}
            onLevelChange={(lvl) => handleLevelChange(i, lvl)}
            compact={compact}
            className={`${compact ? 'min-w-[58px]' : 'flex-1'} ${branchOffsets[i]}`}
          />
        ))}

        {/* Max All button */}
        {onMaxAll && (
          <button
            onClick={onMaxAll}
            className={`absolute bottom-0 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background ${compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs'} font-medium text-text-primary/50 transition-colors hover:border-accent/50 hover:text-accent`}
          >
            Max All
          </button>
        )}
      </div>

    </div>
  );
};
