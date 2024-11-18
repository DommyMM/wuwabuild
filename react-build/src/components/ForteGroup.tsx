import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Character } from '../types/character';
import { forteImagePaths } from '../types/node';
import type { ForteImagePaths, SkillBranch } from '../types/node';
import '../styles/forte.css';

interface ForteGroupProps {
  selectedCharacter: Character | null;
  isSpectro?: boolean;
}

export interface ForteGroupRef {
  reset: () => void;
}

const GlowingNode = forwardRef<HTMLDivElement, {
  treeKey: string;
  skillKey: string;
  character: Character | null;
  altText: string;
  isSpectro?: boolean;
}>((props, ref) => {
  const { treeKey, skillKey, character, altText, isSpectro } = props;
  const [isActive, setIsActive] = useState(false);
  
  if (!character) return null;

  let imagePath;
  if (character.name.startsWith('Rover')) {
    const elementImage = isSpectro ? 'Spectro' : 'Havoc';
    const displayName = `Rover${elementImage}`;
    
    if (treeKey === 'tree1' || treeKey === 'tree5') {
      imagePath = `images/Stats/${elementImage}.png`;
    } else if (treeKey === 'tree2' || treeKey === 'tree4') {
      imagePath = 'images/Stats/ATK.png';
    } else {
      imagePath = forteImagePaths.imagePaths[skillKey]?.(displayName);
    }
  } else {
    imagePath = forteImagePaths.sharedImages[treeKey]?.(character) ||
                forteImagePaths.imagePaths[skillKey]?.(character.name);
  }

  return (
    <div 
      ref={ref}
      className={`glowing-node ${isActive ? 'active' : ''}`}
      data-tree={treeKey}
      data-skill={skillKey}
      onClick={() => setIsActive(!isActive)}
    >
      <img 
        className="node-image"
        src={imagePath}
        alt={altText}
      />
    </div>
  );
});

const SkillBranchComponent: React.FC<{
  skillName: string;
  skillKey: keyof ForteImagePaths['imagePaths'];
  treeKey: string;
  character: Character | null;
  isSpectro?: boolean;
  topRef?: (el: HTMLDivElement | null) => void;
  middleRef?: (el: HTMLDivElement | null) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}> = ({ skillName, skillKey, treeKey, character, isSpectro, topRef, middleRef, inputRef }) => {
  if (!character) return null;

  return (
    <div className="skill-branch">
      <div className="node-container">
        <div className="upper-line" />
        <GlowingNode 
          ref={topRef}
          treeKey={treeKey}
          skillKey={`${treeKey}-top`}
          character={character}
          isSpectro={isSpectro}
          altText="Top Node"
        />
      </div>
      
      <div className="lower-line" />
      
      <div className="node-container">
        <GlowingNode 
          ref={middleRef}
          treeKey={treeKey}
          skillKey={`${treeKey}-middle`}
          character={character}
          isSpectro={isSpectro}
          altText="Middle Node"
        />
      </div>

      <div className="bottom-wrapper">
        <div className="forte-slot" data-skill={skillKey}>
          <img 
            className="skill-image"
            src={forteImagePaths.imagePaths[skillKey](character.name)}
            alt={skillName}
          />
          <div className="node-content" />
        </div>
        <div className="skill-info">
          <div className="level-display">
            Lv. <input 
              ref={inputRef}
              type="number"
              className="skill-input"
              defaultValue={1}
              min={0}
              max={10}
            />/10
          </div>
          <div className="skill-name">{skillName}</div>
        </div>
      </div>
    </div>
  );
};

export const ForteGroup = forwardRef<ForteGroupRef, ForteGroupProps>(({ 
  selectedCharacter,
  isSpectro = false 
}, ref) => {
  const [clickCount, setClickCount] = useState(0);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  nodeRefs.current = Array(10).fill(null);
  inputRefs.current = Array(5).fill(null);

  const setNodeRef = (index: number) => (el: HTMLDivElement | null) => {
    if (nodeRefs.current) {
      nodeRefs.current[index] = el;
    }
  };

  const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
    if (inputRefs.current) {
      inputRefs.current[index] = el;
    }
  };

  const skillBranches: SkillBranch[] = [
    { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
    { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
    { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
    { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
    { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
  ];

  const handleMaxClick = () => {
    const newCount = (clickCount + 1) % 3;
    setClickCount(newCount);

    if (newCount === 1) {
      inputRefs.current.forEach(input => {
        if (input) input.value = '10';
      });
    } else if (newCount === 2) {
      nodeRefs.current.forEach(node => {
        if (node) node.classList.add('active');
      });
    } else {
      inputRefs.current.forEach(input => {
        if (input) input.value = '1';
      });
      nodeRefs.current.forEach(node => {
        if (node) node.classList.remove('active');
      });
    }
  };

  const reset = () => {
    setClickCount(0);
    inputRefs.current.forEach(input => {
      if (input) input.value = '1';
    });
    nodeRefs.current.forEach(node => {
      if (node) node.classList.remove('active');
    });
  };

  useImperativeHandle(ref, () => ({
    reset
  }));

  return (
    <div className="forte-group">
      <div className="forte-slots">
        {skillBranches.map((branch, index) => (
          <SkillBranchComponent 
            key={branch.skillKey}
            {...branch}
            character={selectedCharacter}
            isSpectro={isSpectro}
            topRef={setNodeRef(index * 2)}
            middleRef={setNodeRef(index * 2 + 1)}
            inputRef={setInputRef(index)}
          />
        ))}
      </div>
      <div className="max-wrapper">
        <img
          id="maxButton"
          className="max-frame"
          src={`images/Resources/Max${clickCount === 0 ? '' : clickCount}.png`}
          alt="Max Frame"
          title="First click: Set all levels to 10&#10;Second click: Activate all nodes&#10;Third click: Reset everything"
          onClick={handleMaxClick}
        />
      </div>
    </div>
  );
});