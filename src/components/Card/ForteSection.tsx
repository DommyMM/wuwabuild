/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Character, isRover } from '../../types/character';
import { forteImagePaths } from '../../types/node';
import { getAssetPath } from '../../types/paths';
import { STAT_CDN_NAMES } from '../../types/stats';

interface ForteSectionProps {
  character: Character;
  elementValue: string;
  nodeStates: Record<string, Record<string, boolean>>;
  forteLevels: Record<string, number>;
}

export const getStatClass = (imagePath: string) => {
  if (!imagePath.includes('/IconAttribute/')) return '';
  const match = imagePath.match(/T_Iconproperty(red|green)(\w+)_UI\.png/);
  if (!match) return '';
  const cdnName = `${match[1]}${match[2]}`;
  const statName = Object.entries(STAT_CDN_NAMES)
    .find(([, cdn]) => cdn === cdnName)?.[0];
  return statName?.toLowerCase() || '';
};

const SimplifiedNode: React.FC<{
  type: string;
  imagePath: string;
  isActive: boolean;
  className?: string;
  children?: React.ReactNode;
  showDiamond?: boolean;
}> = ({ type, imagePath, isActive, className, children, showDiamond }) => {
  const statClass = getStatClass(imagePath);
  
  return (
    <div className={`simplified-node ${type} ${isActive ? 'active' : ''} ${className || ''} ${statClass || ''}`}>
      <img className="node-image" src={imagePath} alt="" />
      {showDiamond && <div className="inner-diamond" />}
      {children}
    </div>
  );
};

interface SimplifiedBranchProps {
  branch: { type: string; name: string; tree: string };
  character: Character;
  elementValue: string;
  isActive: { top: boolean; middle: boolean };
  level: number;
}

const SimplifiedBranch: React.FC<SimplifiedBranchProps> = ({ 
  branch, 
  character, 
  elementValue,
  isActive, 
  level 
}) => {
  const getNodeImage = (position: 'top' | 'middle') => {
    const isElementTree = branch.tree === 'tree1' || branch.tree === 'tree5';
    const isStatTree = branch.tree === 'tree2' || branch.tree === 'tree4';
    
    if (isRover(character)) {
      if (isElementTree) {
        return getAssetPath('stats', elementValue).cdn;
      }
      if (isStatTree) {
        return getAssetPath('stats', 'ATK').cdn;
      }
    }
  
    return branch.name === 'circuit'
      ? forteImagePaths.imagePaths[`tree3-${position}`](character)
      : forteImagePaths.sharedImages[branch.tree](character);
  };

  const getNodeClassName = () => {
    const isElementTree = branch.tree === 'tree1' || branch.tree === 'tree5';
    const isStatTree = branch.tree === 'tree2' || branch.tree === 'tree4';
    if (isRover(character)) {
      if (isElementTree) return elementValue.toLowerCase();
      if (isStatTree) return 'atk';
    }
    return '';
  };

  return (
    <div className="simplified-branch">
      <SimplifiedNode
        type={branch.type}
        imagePath={getNodeImage('top')}
        isActive={isActive.top}
        className={getNodeClassName()}
        showDiamond={branch.name === 'circuit'}
      />
      <div className="top-line" />
      <SimplifiedNode
        type={branch.type}
        imagePath={getNodeImage('middle')}
        isActive={isActive.middle}
        showDiamond={branch.name === 'circuit'}
      />
      <div className="bottom-line" />
      <div className="simplified-base">
        <img className="skill-image" src={forteImagePaths.imagePaths[branch.name](character)} alt={`${character.name} ${branch.name}`} />
        <div className="level-indicator">{level}</div>
      </div>
      {branch.name === 'circuit' && (
        <div className="base">
          <img className="skill-image" src={forteImagePaths.imagePaths.base(character)} alt={`${character.name} base`} />
        </div>
      )}
    </div>
  );
};

export const ForteSection: React.FC<ForteSectionProps> = ({
  character,
  elementValue,
  nodeStates,
  forteLevels
}) => {
  const branches = [
    { type: 'circle', name: 'normal-attack', tree: 'tree1' },
    { type: 'circle', name: 'skill', tree: 'tree2' },
    { type: 'square', name: 'circuit', tree: 'tree3' },
    { type: 'circle', name: 'liberation', tree: 'tree4' },
    { type: 'circle', name: 'intro', tree: 'tree5' }
  ];

  return (
    <div className="simplified-forte">
      {branches.map(branch => (
        <SimplifiedBranch
          key={branch.name}
          branch={branch}
          character={character}
          elementValue={elementValue}
          isActive={{
            top: nodeStates[branch.tree]?.top || false,
            middle: nodeStates[branch.tree]?.middle || false
          }}
          level={forteLevels[branch.name] || 1}
        />
      ))}
      <img className="max" src="/images/Resources/Max.png" alt="Forte Max Frame" />
    </div>
  );
};