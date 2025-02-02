import React from 'react';
import { Character } from '../../types/character';
import { forteImagePaths } from '../../types/node';
import type { ForteImagePaths, SkillBranch } from '../../types/node';
import { getAssetPath } from '../../types/paths';
import '../../styles/forte.css';

interface ForteGroupProps {
  selectedCharacter: Character;
  displayName: string;
  elementValue: string;
  nodeStates: Record<string, Record<string, boolean>>;
  levels: Record<string, number>;
  clickCount: number;
  onMaxClick: () => void;
  onChange: (
    nodeStates: Record<string, Record<string, boolean>>,
    levels: Record<string, number>
  ) => void;
}

interface GlowingNodeProps {
  treeKey: string;
  skillKey: string;
  character: Character;
  altText: string;
  elementValue: string; 
  isActive: boolean;
  onChange: (treeKey: string, position: 'top' | 'middle') => void;
}

const GlowingNode: React.FC<GlowingNodeProps> = ({
  treeKey, skillKey, character, altText, elementValue, isActive, onChange
}) => {
  const isRover = character.name.startsWith('Rover');
  const isElementTree = treeKey === 'tree1' || treeKey === 'tree5';
  
  let imagePath;
  if (isRover && isElementTree) {
    imagePath = getAssetPath('stats', elementValue).cdn;
  } else {
    imagePath = forteImagePaths.sharedImages[treeKey]?.(character) || forteImagePaths.imagePaths[skillKey]?.(character);
  }

  return (
    <div 
      className={`glowing-node ${isActive ? 'active' : ''}`}
      data-tree={treeKey}
      data-skill={skillKey}
      onClick={() => onChange(treeKey, 'top')}
    >
      <img 
        className="node-image"
        src={imagePath}
        alt={altText}
      />
    </div>
  );
};

interface SkillBranchComponentProps {
  skillName: string;
  skillKey: keyof ForteImagePaths['imagePaths'];
  treeKey: string;
  character: Character;
  displayName: string;
  elementValue: string;
  isActive: { top: boolean; middle: boolean };
  level: number;
  onNodeClick: (position: 'top' | 'middle') => void;
  onInputChange: (value: string) => void;
}

const SkillBranchComponent: React.FC<SkillBranchComponentProps> = ({
  skillName,
  skillKey,
  treeKey,
  character,
  displayName,
  elementValue,
  isActive,
  level,
  onNodeClick,
  onInputChange
}) => {
  return (
    <div className="skill-branch">
      <div className="node-container">
        <div className="upper-line" />
        <GlowingNode 
          treeKey={treeKey}
          skillKey={`${treeKey}-top`}
          character={character}
          elementValue={elementValue}
          altText="Top Node"
          isActive={isActive.top}
          onChange={() => onNodeClick('top')}
        />
      </div>
      
      <div className="lower-line" />
      
      <div className="node-container">
        <GlowingNode 
          treeKey={treeKey}
          skillKey={`${treeKey}-middle`}
          character={character}
          elementValue={elementValue}
          altText="Middle Node"
          isActive={isActive.middle}
          onChange={() => onNodeClick('middle')}
        />
      </div>

      <div className="bottom-wrapper">
        <div className="forte-slot" data-skill={skillKey}>
          <img className="skill-image"
            src={forteImagePaths.imagePaths[skillKey](character)}
            alt={skillName}
          />
          <div className="node-content" />
        </div>
        <div className="skill-info">
          <div className="level-display">
            Lv. <input 
              type="number"
              className="skill-input"
              value={level}
              min={0}
              max={10}
              onChange={(e) => onInputChange(e.target.value)}
            />/10
          </div>
          <div className="skill-name">{skillName}</div>
        </div>
      </div>
    </div>
  );
};

export const ForteGroup: React.FC<ForteGroupProps> = ({
  selectedCharacter,
  displayName,
  elementValue,
  nodeStates,
  levels,
  clickCount,
  onMaxClick,
  onChange,
}) => {
  const skillBranches: SkillBranch[] = [
    { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
    { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
    { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
    { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
    { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
  ];

  const handleNodeClick = (treeKey: string, position: 'top' | 'middle') => {
    const newNodeStates = {
      ...nodeStates,
      [treeKey]: {
        ...nodeStates[treeKey],
        [position]: !nodeStates[treeKey]?.[position]
      }
    };
    onChange(newNodeStates, levels);
  };

  const handleInputChange = (skillKey: string, value: string) => {
    const newLevels = {
      ...levels,
      [skillKey]: Number(value) || 1
    };
    onChange(nodeStates, newLevels);
  };

  return (
    <div className="forte-group">
      <div className="forte-slots">
        {skillBranches.map((branch) => (
          <SkillBranchComponent 
            key={branch.skillKey}
            {...branch}
            character={selectedCharacter}
            displayName={displayName}
            elementValue={elementValue}
            isActive={{
              top: nodeStates[branch.treeKey]?.top || false,
              middle: nodeStates[branch.treeKey]?.middle || false
            }}
            level={levels[branch.skillKey] || 1}
            onNodeClick={(position) => handleNodeClick(branch.treeKey, position)}
            onInputChange={(value) => handleInputChange(branch.skillKey, value)}
          />
        ))}
      </div>
      <div className="max-wrapper">
        <img
          id="maxButton"
          className="max-frame"
          src={`images/Resources/Max${clickCount || ''}.png`} 
          alt="Max Frame"
          title="First click: Set all levels to 10&#10;Second click: Activate all nodes&#10;Third click: Reset everything"
          onClick={onMaxClick}
        />
      </div>
    </div>
  );
};