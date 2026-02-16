'use client';

import React from 'react';
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
  isActive,
  onClick,
  className = '',
}) => {
  // Look up icon directly from preprocessed CDN forteNodes
  const nodeData = character.forteNodes?.[`${treeKey}.${nodePosition}`];
  const nodeIcon = nodeData?.icon ?? '';

  // Game's actual node frame images
  const frameSrc = isActive
    ? '/images/Resources/NodeFull.png'
    : '/images/Resources/NodeEmpty.png';

  return (
    <button
      onClick={onClick}
      className={`forte-node group relative ${className}`}
      aria-label={`${treeKey} ${nodePosition} node`}
      aria-pressed={isActive}
    >
      <img
        src={frameSrc}
        alt=""
        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
        draggable={false}
      />

      <img
        src={nodeIcon}
        alt={nodeData?.name ?? `${treeKey} ${nodePosition}`}
        className={`absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 object-contain transition-all
          ${isActive ? 'brightness-100 drop-shadow-[0_0_4px_rgba(166,150,98,0.6)]' : 'brightness-50'}`}
        draggable={false}
      />
    </button>
  );
};

export default ForteNode;
