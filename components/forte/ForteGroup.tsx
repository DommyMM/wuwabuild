'use client';

import React, { useCallback, useState } from 'react';
import { SkillBranch } from './SkillBranch';
import { Character } from '@/types/character';
import { ForteLevels } from '@/types/build';
import { Maximize2, RotateCcw } from 'lucide-react';

interface ForteGroupProps {
  character: Character;
  elementValue: string;
  nodeStates: Record<string, Record<string, boolean>>;
  levels: ForteLevels;
  onNodeChange: (nodeStates: Record<string, Record<string, boolean>>) => void;
  onLevelChange: (levels: ForteLevels) => void;
  onMaxAll: () => void;
  onReset: () => void;
  className?: string;
}

// Skill branch definitions
interface SkillBranchDef {
  skillName: string;
  skillKey: keyof ForteLevels;
  treeKey: string;
}

const SKILL_BRANCHES: SkillBranchDef[] = [
  { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
  { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
  { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
  { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
  { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
];

export const ForteGroup: React.FC<ForteGroupProps> = ({
  character,
  elementValue,
  nodeStates,
  levels,
  onNodeChange,
  onLevelChange,
  onMaxAll,
  onReset,
  className = ''
}) => {
  const [clickCount, setClickCount] = useState(0);

  // Handle node click
  const handleNodeClick = useCallback((treeKey: string, position: 'top' | 'middle') => {
    const newNodeStates = {
      ...nodeStates,
      [treeKey]: {
        ...nodeStates[treeKey],
        [position]: !nodeStates[treeKey]?.[position]
      }
    };
    onNodeChange(newNodeStates);
  }, [nodeStates, onNodeChange]);

  // Handle level change for a specific skill
  const handleLevelChange = useCallback((skillKey: keyof ForteLevels, level: number) => {
    const newLevels: ForteLevels = {
      ...levels,
      [skillKey]: level
    };
    onLevelChange(newLevels);
  }, [levels, onLevelChange]);

  // Handle max button click with cycling behavior
  const handleMaxClick = useCallback(() => {
    const nextCount = (clickCount + 1) % 3;
    setClickCount(nextCount);

    if (nextCount === 1) {
      // First click: Set all levels to 10
      const maxLevels: ForteLevels = {
        'normal-attack': 10,
        skill: 10,
        circuit: 10,
        liberation: 10,
        intro: 10
      };
      onLevelChange(maxLevels);
    } else if (nextCount === 2) {
      // Second click: Activate all nodes
      const maxNodeStates: Record<string, Record<string, boolean>> = {
        tree1: { top: true, middle: true },
        tree2: { top: true, middle: true },
        tree3: {},
        tree4: { top: true, middle: true },
        tree5: { top: true, middle: true }
      };
      onNodeChange(maxNodeStates);
      onMaxAll();
    } else {
      // Third click: Reset everything
      onReset();
    }
  }, [clickCount, onLevelChange, onNodeChange, onMaxAll, onReset]);

  // Handle reset button click
  const handleResetClick = useCallback(() => {
    setClickCount(0);
    onReset();
  }, [onReset]);

  return (
    <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-text-primary">Forte</span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMaxClick}
            className="flex items-center gap-1 rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
            title="Click to cycle: Max Levels -> Max Nodes -> Reset"
          >
            <Maximize2 size={14} />
            <span>Max</span>
            {clickCount > 0 && (
              <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-background">
                {clickCount}
              </span>
            )}
          </button>

          <button
            onClick={handleResetClick}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary/60 transition-colors hover:border-text-primary/40 hover:text-text-primary"
            title="Reset all fortes"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Skill Branches */}
      <div className="flex items-start justify-between gap-2 overflow-x-auto py-2">
        {SKILL_BRANCHES.map((branch) => (
          <SkillBranch
            key={branch.skillKey}
            skillName={branch.skillName}
            skillKey={branch.skillKey}
            treeKey={branch.treeKey}
            character={character}
            elementValue={elementValue}
            isActive={{
              top: nodeStates[branch.treeKey]?.top || false,
              middle: nodeStates[branch.treeKey]?.middle || false
            }}
            level={levels[branch.skillKey] || 1}
            onNodeClick={(position) => handleNodeClick(branch.treeKey, position)}
            onLevelChange={(level) => handleLevelChange(branch.skillKey, level)}
          />
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-text-primary/60">
        <span>Total Nodes: {countActiveNodes(nodeStates)}/8</span>
        <span>|</span>
        <span>Avg Level: {calculateAverageLevel(levels).toFixed(1)}</span>
      </div>
    </div>
  );
};

// Helper function to count active nodes
function countActiveNodes(nodeStates: Record<string, Record<string, boolean>>): number {
  let count = 0;
  Object.values(nodeStates).forEach((tree) => {
    if (tree.top) count++;
    if (tree.middle) count++;
  });
  return count;
}

// Helper function to calculate average level
function calculateAverageLevel(levels: ForteLevels): number {
  const values = Object.values(levels);
  if (values.length === 0) return 1;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export default ForteGroup;
