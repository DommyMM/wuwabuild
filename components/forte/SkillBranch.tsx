'use client';

import React, { useCallback, useState } from 'react';
import { ForteNode } from './ForteNode';
import { Character } from '@/lib/character';

interface SkillBranchProps {
  skillName: string;
  skillKey: string;
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
          <div className="h-8 w-[2px] bg-text-primary" />

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
          <div className="h-8 w-[2px] bg-text-primary" />
        </>
      ) : (
        /* tree3 — inherent skill nodes (D1 top, D2 middle) */
        <>
          {(['top', 'middle'] as const).map((pos, i) => {
            const inherentIcon = character.skillIcons?.[`inherent-${i + 1}`] ?? '';
            const active = isActive[pos];
            const frameBg = active
              ? "bg-[url('https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillAHold.png')]"
              : "bg-[url('https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillALockHold.png')]";
            return (
              <React.Fragment key={pos}>
                <button
                  onClick={() => onNodeClick(pos)}
                  className={`group relative flex items-center justify-center cursor-pointer -mx-16 -my-0.5 h-32 w-32 ${frameBg} bg-contain bg-center bg-no-repeat transition-all duration-200 hover:scale-105`}
                  aria-label={`${treeKey} ${pos} inherent`}
                  aria-pressed={active}
                >
                  {active && (
                    <img
                      src="https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillANor.png"
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                      draggable={false}
                    />
                  )}
                  <img
                    src={inherentIcon}
                    alt={`Inherent ${i + 1}`}
                    className={`h-8 w-8 object-contain invert transition-all
                      ${active ? 'opacity-100 drop-shadow-[0_0_4px_rgba(166,150,98,0.6)]' : 'opacity-40'}`}
                    draggable={false}
                  />
                </button>
                <div className="h-6 w-[2px] bg-text-primary" />
              </React.Fragment>
            );
          })}
        </>
      )}

      {/* ── Skill icon ── */}
      <div
        className="relative -mx-6 -my-10 flex h-44 w-44 items-center justify-center bg-[url('https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillANor.png')] bg-contain bg-center bg-no-repeat transition-all duration-300"
      >
        <img
          src={skillIcon}
          alt={skillName}
          className="relative h-10 w-10 object-contain invert"
          draggable={false}
          onError={(e) => {
            if (character.elementIcon) (e.target as HTMLImageElement).src = character.elementIcon;
          }}
        />
      </div>

      {/* ── Level display ── */}
      <div className="relative z-10 flex flex-col items-center gap-2">
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
          className="forte-level-slider h-1.5 w-24 cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, #a69662 0%, #bfad7d ${fillPct}%, #333333 ${fillPct}%)`,
          }}
        />
      </div>

      {/* ── Skill name ── */}
      <span className="mt-2 text-center text-base leading-tight text-text-primary/60">
        {skillName}
      </span>
    </div>
  );
};
