'use client';

import React, { useCallback, useState } from 'react';
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
  hasNodes: boolean;
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
  hasNodes,
  onNodeClick,
  onLevelChange,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Skill icon directly from CDN data
  const skillIcon = character.skillIcons?.[skillKey] ?? '';

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onLevelChange(parseInt(e.target.value));
    },
    [onLevelChange],
  );

  const startEditing = useCallback(() => {
    setInputValue('');
    setIsEditing(true);
  }, []);

  const finalize = useCallback(() => {
    const v = parseInt(inputValue);
    if (!isNaN(v) && v >= 1 && v <= 10) onLevelChange(v);
    setIsEditing(false);
  }, [inputValue, onLevelChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') finalize();
      if (e.key === 'Escape') setIsEditing(false);
    },
    [finalize],
  );

  const fillPct = ((level - 1) / 9) * 100;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* ── Nodes above the skill icon ── */}
      {hasNodes ? (
        <>
          {/* Top node */}
          <ForteNode
            treeKey={treeKey}
            nodePosition="top"
            character={character}
            elementValue={elementValue}
            isActive={isActive.top}
            onClick={() => onNodeClick('top')}
            className="h-20 w-20"
          />

          {/* Connection line */}
          <div className="h-5 w-[2px] bg-text-primary/30" />

          {/* Middle node */}
          <ForteNode
            treeKey={treeKey}
            nodePosition="middle"
            character={character}
            elementValue={elementValue}
            isActive={isActive.middle}
            onClick={() => onNodeClick('middle')}
            className="h-20 w-20"
          />

          {/* Connection line to skill */}
          <div className="h-5 w-[2px] bg-text-primary/30" />
        </>
      ) : (
        /* tree3 — inherent skill nodes (D1 top, D2 middle) */
        <>
          {(['top', 'middle'] as const).map((pos, i) => {
            const inherentIcon = character.skillIcons?.[`inherent-${i + 1}`] ?? '';
            const active = isActive[pos];
            return (
              <React.Fragment key={pos}>
                <button
                  onClick={() => onNodeClick(pos)}
                  className="forte-node group relative h-20 w-20"
                  aria-label={`${treeKey} ${pos} inherent`}
                  aria-pressed={active}
                >
                  {active ? (
                    <>
                      {/* Outer ring frame (empty center) */}
                      <img
                        src="https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillAHold.png"
                        alt=""
                        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        draggable={false}
                      />
                      {/* Center fill */}
                      <img
                        src="https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillANor.png"
                        alt=""
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                      />
                    </>
                  ) : (
                    <img
                      src="https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillALockHold.png"
                      alt=""
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      draggable={false}
                    />
                  )}
                  <img
                    src={inherentIcon}
                    alt={`Inherent ${i + 1}`}
                    className={`absolute left-1/2 top-1/2 h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 object-contain invert transition-all
                      ${active ? 'brightness-100 drop-shadow-[0_0_4px_rgba(166,150,98,0.6)]' : 'brightness-50'}`}
                    draggable={false}
                  />
                </button>
                <div className="h-5 w-[2px] bg-text-primary/30" />
              </React.Fragment>
            );
          })}
        </>
      )}

      {/* ── Skill icon ── */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <img
          src="https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillBSel1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <img
          src={skillIcon}
          alt={skillName}
          className="relative h-[32%] w-[32%] object-contain invert"
          draggable={false}
          onError={(e) => {
            if (character.elementIcon) (e.target as HTMLImageElement).src = character.elementIcon;
          }}
        />
      </div>

      {/* ── Level display ── */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 text-sm text-text-primary/70">
          <span>Lv.</span>
          {isEditing ? (
            <input
              type="number"
              min={1}
              max={10}
              value={inputValue}
              placeholder={level.toString()}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={finalize}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-8 rounded border border-accent bg-background px-0.5 py-0.5 text-center text-sm font-semibold text-accent focus:outline-none"
            />
          ) : (
            <button
              onClick={startEditing}
              className="min-w-7 rounded border border-border bg-background px-1 py-0.5 text-center text-sm font-semibold text-accent transition-colors hover:border-accent"
            >
              {level}
            </button>
          )}
        </div>

        {/* Horizontal forte-level slider (1 → 10) */}
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={level}
          onChange={handleSliderChange}
          className="forte-level-slider h-1.5 w-20 cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, #a69662 0%, #bfad7d ${fillPct}%, #333333 ${fillPct}%)`,
          }}
        />
      </div>

      {/* ── Skill name ── */}
      <span className="mt-1 max-w-22 text-center text-[11px] leading-tight text-text-primary/60">
        {skillName}
      </span>
    </div>
  );
};

export default SkillBranch;
