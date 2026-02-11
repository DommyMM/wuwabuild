'use client';

import React, { useCallback } from 'react';
import { ForteNode } from './ForteNode';
import { Character } from '@/types/character';
import { ForteLevels } from '@/types/build';

interface SkillBranchProps {
  skillName: string;
  skillKey: keyof ForteLevels;
  treeKey: string;
  character: Character;
  elementValue: string;
  isActive: { top: boolean; middle: boolean };
  level: number;
  onNodeClick: (position: 'top' | 'middle') => void;
  onLevelChange: (level: number) => void;
  className?: string;
}

export const SkillBranch: React.FC<SkillBranchProps> = ({
  skillName,
  skillKey,
  treeKey,
  character,
  elementValue,
  isActive,
  level,
  onNodeClick,
  onLevelChange,
  className = ''
}) => {
  // Handle input change for level
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      onLevelChange(value);
    }
  }, [onLevelChange]);

  // Get skill icon URL
  const getSkillIconUrl = (): string => {
    // Skills use character-specific icons from CDN
    const skillToSuffix: Record<string, string> = {
      'normal-attack': 'NormalAttack',
      'skill': 'Skill',
      'circuit': 'Circuit',
      'liberation': 'Liberation',
      'intro': 'Intro'
    };

    const suffix = skillToSuffix[skillKey] || skillKey;
    return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconSkill/${character.id}_${suffix}.png`;
  };

  // Handle node clicks
  const handleTopNodeClick = useCallback(() => {
    onNodeClick('top');
  }, [onNodeClick]);

  const handleMiddleNodeClick = useCallback(() => {
    onNodeClick('middle');
  }, [onNodeClick]);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Top Node */}
      <div className="relative flex flex-col items-center">
        {/* Connection line to top */}
        <div className="h-4 w-0.5 bg-border" />

        <ForteNode
          treeKey={treeKey}
          nodePosition="top"
          character={character}
          elementValue={elementValue}
          isActive={isActive.top}
          onClick={handleTopNodeClick}
        />
      </div>

      {/* Connection line between nodes */}
      <div className="h-4 w-0.5 bg-border" />

      {/* Middle Node */}
      <ForteNode
        treeKey={treeKey}
        nodePosition="middle"
        character={character}
        elementValue={elementValue}
        isActive={isActive.middle}
        onClick={handleMiddleNodeClick}
      />

      {/* Connection line to skill */}
      <div className="h-4 w-0.5 bg-border" />

      {/* Main Skill Slot */}
      <div className="flex flex-col items-center gap-2">
        {/* Skill Icon */}
        <div className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-accent/50 bg-background-secondary">
          <img
            src={getSkillIconUrl()}
            alt={skillName}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to element icon if skill icon fails
              (e.target as HTMLImageElement).src = `/images/Elements/${elementValue}.png`;
            }}
          />
        </div>

        {/* Level Input */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-text-primary/60">Lv.</span>
          <input
            type="number"
            min={1}
            max={10}
            value={level}
            onChange={handleInputChange}
            className="w-8 rounded border border-border bg-background px-1 py-0.5 text-center text-text-primary focus:border-accent focus:outline-none"
          />
          <span className="text-text-primary/60">/10</span>
        </div>

        {/* Skill Name */}
        <div className="max-w-[80px] text-center text-xs text-text-primary/80">
          {skillName}
        </div>
      </div>
    </div>
  );
};

export default SkillBranch;
