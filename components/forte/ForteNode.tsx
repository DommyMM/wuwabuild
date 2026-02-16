'use client';

import React from 'react';
import { Character, Element } from '@/types/character';
import { getAssetPath } from '@/lib/paths';

interface ForteNodeProps {
  treeKey: string;
  nodePosition: 'top' | 'middle';
  character: Character;
  elementValue: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

/** Non-element Bonus1 types → stat key for getAssetPath('stats', …). */
const NON_ELEMENT_STAT_KEY: Record<string, string> = {
  'Crit Rate': 'Crit Rate',
  'Crit DMG': 'Crit DMG',
  'Healing': 'Healing Bonus',
  'ATK': 'ATK%',
  'HP': 'HP%',
  'DEF': 'DEF%',
};

/** All Element enum values for quick lookup. */
const ELEMENT_VALUES = new Set<string>(Object.values(Element));

export const ForteNode: React.FC<ForteNodeProps> = ({
  treeKey,
  nodePosition,
  character,
  elementValue,
  isActive,
  onClick,
  className = '',
}) => {
  const isBonus1Tree = treeKey === 'tree1' || treeKey === 'tree5';

  const getNodeIcon = (): string => {
    if (isBonus1Tree) {
      // If Bonus1 is an element type (Fusion, Glacio, etc.) → use CDN element icon
      if (ELEMENT_VALUES.has(character.Bonus1)) {
        return character.elementIcon ?? getAssetPath('stats', `${character.Bonus1} DMG`);
      }
      // Non-element Bonus1 (Crit Rate, Crit DMG, Healing, etc.)
      const key = NON_ELEMENT_STAT_KEY[character.Bonus1] ?? character.Bonus1;
      return getAssetPath('stats', key);
    }

    // tree2 / tree4 → Bonus2 (ATK / HP / DEF percentage)
    return getAssetPath('stats', `${character.Bonus2}%`);
  };

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
        src={getNodeIcon()}
        alt={`${treeKey} ${nodePosition}`}
        className={`absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 object-contain transition-all
          ${isActive ? 'brightness-100 drop-shadow-[0_0_4px_rgba(166,150,98,0.6)]' : 'brightness-50'}`}
        draggable={false}
      />
    </button>
  );
};

export default ForteNode;
