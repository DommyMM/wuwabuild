'use client';

import React, { useCallback } from 'react';
import { Character } from '@/types/character';

interface ForteNodeProps {
  treeKey: string;
  nodePosition: 'top' | 'middle';
  character: Character;
  elementValue: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export const ForteNode: React.FC<ForteNodeProps> = ({
  treeKey,
  nodePosition,
  character,
  elementValue,
  isActive,
  onClick,
  className = ''
}) => {
  const isRover = character.name.startsWith('Rover');
  const isElementTree = treeKey === 'tree1' || treeKey === 'tree5';

  // Get node image URL
  const getNodeImageUrl = (): string => {
    // For Rover's element trees (tree1 and tree5), use element-based icons
    if (isRover && isElementTree) {
      return `/images/Elements/${elementValue}.png`;
    }

    // For other nodes, use stat/bonus type icons
    // tree1: Normal Attack (ATK based)
    // tree2: Skill (element based)
    // tree3: Circuit (character specific)
    // tree4: Liberation (element based)
    // tree5: Intro (element based)
    const treeToStat: Record<string, string> = {
      tree1: 'Attack',
      tree2: elementValue,
      tree3: 'ER',
      tree4: elementValue,
      tree5: elementValue
    };

    return `/images/Elements/${treeToStat[treeKey] || elementValue}.png`;
  };

  // Handle click
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
        isActive
          ? 'border-accent bg-accent/30 shadow-[0_0_12px_rgba(166,150,98,0.5)]'
          : 'border-border bg-background-secondary hover:border-text-primary/40'
      } ${className}`}
      aria-label={`${treeKey} ${nodePosition} node`}
      aria-pressed={isActive}
    >
      {/* Node glow effect when active */}
      {isActive && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-accent/20" />
      )}

      {/* Node image */}
      <img
        src={getNodeImageUrl()}
        alt={`${treeKey} ${nodePosition}`}
        className={`relative h-6 w-6 transition-transform group-hover:scale-110 ${
          isActive ? 'brightness-125' : 'brightness-75 grayscale-[30%]'
        }`}
      />
    </button>
  );
};

export default ForteNode;
