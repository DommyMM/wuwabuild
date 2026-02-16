'use client';

import React, { useCallback, useMemo } from 'react';
import { SkillBranch } from './SkillBranch';
import { Character } from '@/types/character';
import { ForteLevels } from '@/types/build';
import { calculateForteBonus } from '@/lib/calculations/stats';
import { getAssetPath } from '@/lib/paths';

interface ForteGroupProps {
  character: Character;
  elementValue: string;
  nodeStates: Record<string, Record<string, boolean>>;
  levels: ForteLevels;
  onNodeChange: (nodeStates: Record<string, Record<string, boolean>>) => void;
  onLevelChange: (levels: ForteLevels) => void;
  onMaxAll: () => void;
  className?: string;
}

interface SkillBranchDef {
  skillName: string;
  skillKey: keyof ForteLevels;
  treeKey: string;
  hasNodes: boolean;
}

const SKILL_BRANCHES: SkillBranchDef[] = [
  { skillName: 'Normal Attack',        skillKey: 'normal-attack', treeKey: 'tree1', hasNodes: true },
  { skillName: 'Resonance Skill',      skillKey: 'skill',         treeKey: 'tree2', hasNodes: true },
  { skillName: 'Forte Circuit',        skillKey: 'circuit',       treeKey: 'tree3', hasNodes: false },
  { skillName: 'Res. Liberation', skillKey: 'liberation',    treeKey: 'tree4', hasNodes: true },
  { skillName: 'Intro Skill',          skillKey: 'intro',         treeKey: 'tree5', hasNodes: true },
];

export const ForteGroup: React.FC<ForteGroupProps> = ({
  character,
  elementValue,
  nodeStates,
  levels,
  onNodeChange,
  onLevelChange,
  onMaxAll,
  className = '',
}) => {
  // ── Bonus stats ──
  const { bonus1Total, bonus2Total, bonus1Type } = useMemo(
    () => calculateForteBonus(character, nodeStates),
    [character, nodeStates],
  );

  const bonus1Icon = useMemo(() => getAssetPath('stats', bonus1Type), [bonus1Type]);
  const bonus2Icon = useMemo(() => getAssetPath('stats', `${character.Bonus2}%`), [character.Bonus2]);

  // Format bonus display — percentages get %, flat stats don't
  const formatBonus = (type: string, value: number) => {
    if (value === 0) return `+0%`;
    return `+${value.toFixed(1)}%`;
  };

  // ── Handlers ──
  const handleNodeClick = useCallback(
    (treeKey: string, position: 'top' | 'middle') => {
      onNodeChange({
        ...nodeStates,
        [treeKey]: {
          ...nodeStates[treeKey],
          [position]: !nodeStates[treeKey]?.[position],
        },
      });
    },
    [nodeStates, onNodeChange],
  );

  const handleLevelChange = useCallback(
    (skillKey: keyof ForteLevels, level: number) => {
      onLevelChange({ ...levels, [skillKey]: level });
    },
    [levels, onLevelChange],
  );

  const handleMaxClick = useCallback(() => {
    onLevelChange({ 'normal-attack': 10, skill: 10, circuit: 10, liberation: 10, intro: 10 });
    onNodeChange({
      tree1: { top: true, middle: true },
      tree2: { top: true, middle: true },
      tree3: {},
      tree4: { top: true, middle: true },
      tree5: { top: true, middle: true },
    });
    onMaxAll();
  }, [onLevelChange, onNodeChange, onMaxAll]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* ── Bonus stat chips ── */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
          <img src={bonus1Icon} alt={bonus1Type} className="h-4 w-4 object-contain" />
          <span className="text-text-primary/60">{bonus1Type}</span>
          <span className="font-semibold text-accent">{formatBonus(bonus1Type, bonus1Total)}</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
          <img src={bonus2Icon} alt={`${character.Bonus2}%`} className="h-4 w-4 object-contain" />
          <span className="text-text-primary/60">{character.Bonus2}%</span>
          <span className="font-semibold text-accent">{formatBonus(character.Bonus2, bonus2Total)}</span>
        </span>
      </div>

      {/* ── 5 Skill Branches ── */}
      <div className="flex flex-1 items-end justify-center gap-1">
        {SKILL_BRANCHES.map((branch) => (
          <SkillBranch
            key={branch.skillKey}
            skillName={branch.skillName}
            skillKey={branch.skillKey}
            treeKey={branch.treeKey}
            character={character}
            elementValue={elementValue}
            hasNodes={branch.hasNodes}
            isActive={{
              top: nodeStates[branch.treeKey]?.top || false,
              middle: nodeStates[branch.treeKey]?.middle || false,
            }}
            level={levels[branch.skillKey] || 1}
            onNodeClick={(pos) => handleNodeClick(branch.treeKey, pos)}
            onLevelChange={(lvl) => handleLevelChange(branch.skillKey, lvl)}
          />
        ))}
      </div>

      {/* ── Max button ── */}
      <div className="mt-2 flex justify-center">
        <button onClick={handleMaxClick} className="relative h-10 w-28">
          <img
            src="/images/Resources/Max.png"
            alt="Max"
            className="h-full w-full object-contain transition-all hover:brightness-125"
            draggable={false}
          />
        </button>
      </div>
    </div>
  );
};

export default ForteGroup;
