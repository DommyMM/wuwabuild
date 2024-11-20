import React from 'react';
import { Character } from '../../types/character';
import { forteImagePaths } from '../../types/node';

interface ForteSectionProps {
  character: Character;
  isSpectro: boolean;
  nodeStates: Record<string, Record<string, boolean>>;
  levels: Record<string, number>;
}

const SimplifiedNode: React.FC<{
  type: string;
  imagePath: string;
  isActive: boolean;
  className?: string;
  children?: React.ReactNode;
  showDiamond?: boolean;
}> = ({ type, imagePath, isActive, className, children, showDiamond }) => (
  <div className={`simplified-node ${type} ${isActive ? 'active' : ''} ${className || ''}`}>
    <img className="node-image" src={imagePath} alt="" />
    {showDiamond && <div className="inner-diamond" />}
    {children}
  </div>
);

const SimplifiedBranch: React.FC<{
  branch: { type: string; name: string; tree: string };
  character: Character;
  isSpectro: boolean;
  isActive: { top: boolean; middle: boolean };
  level: number;
}> = ({ branch, character, isSpectro, isActive, level }) => {
  const elementImage = isSpectro ? 'Spectro' : 'Havoc';
  
  const getNodeImage = (position: 'top' | 'middle') => {
    if (character.name.startsWith('Rover')) {
      if (branch.tree === 'tree1' || branch.tree === 'tree5') {
        return `images/Stats/${elementImage}.png`;
      }
      if (branch.tree === 'tree2' || branch.tree === 'tree4') {
        return 'images/Stats/ATK.png';
      }
    }
    return branch.name === 'circuit'
      ? forteImagePaths.imagePaths[`tree3-${position}`](character.name)
      : forteImagePaths.sharedImages[branch.tree](character);
  };

  return (
    <div className="simplified-branch">
      <SimplifiedNode
        type={branch.type}
        imagePath={getNodeImage('top')}
        isActive={isActive.top}
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
        <img 
          className="skill-image"
          src={forteImagePaths.imagePaths[branch.name](character.name)}
          alt=""
        />
        <div className="level-indicator">{level}</div>
      </div>
    </div>
  );
};

export const ForteSection: React.FC<ForteSectionProps> = ({
  character,
  isSpectro,
  nodeStates,
  levels
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
          isSpectro={isSpectro}
          isActive={{
            top: nodeStates[branch.tree]?.top || false,
            middle: nodeStates[branch.tree]?.middle || false
          }}
          level={levels[branch.name] || 1}
        />
      ))}
    </div>
  );
};