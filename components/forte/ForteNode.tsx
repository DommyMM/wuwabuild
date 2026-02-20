'use client';

import React from 'react';
import { Character } from '@/lib/character';

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
  isActive,
  onClick,
  className = '',
}) => {
  // Look up icon directly from preprocessed CDN forteNodes
  const nodeData = character.forteNodes?.[`${treeKey}.${nodePosition}`];
  const nodeIcon = nodeData?.icon ?? '';

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center cursor-pointer -my-6 h-32 w-32 bg-[url('https://files.wuthery.com/d/GameData/UIResources/UiRole/Atlas/SP_RoleSkillBNor.png')] bg-contain bg-center bg-no-repeat transition-all duration-200 hover:scale-105 ${isActive ? '' : 'opacity-30'} ${className}`}
      aria-label={`${treeKey} ${nodePosition} node`}
      aria-pressed={isActive}
    >
      <img
        src={nodeIcon}
        alt={nodeData?.name ?? `${treeKey} ${nodePosition}`}
        className={`h-8 w-8 object-contain invert transition-all
          ${isActive ? 'opacity-100 drop-shadow-[0_0_4px_rgba(166,150,98,0.6)]' : 'opacity-40'}`}
        draggable={false}
      />
    </button>
  );
};

export default ForteNode;
