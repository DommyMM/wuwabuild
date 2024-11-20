import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Character, isRover } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { CharacterSelector } from '../components/CharacterSelector';
import { CharacterInfo } from '../components/CharacterInfo';
import { EchoesSection } from '../components/EchoSection';
import { BuildCard } from '../components/BuildCard';
import '../styles/App.css';

interface ElementState {
  selectedCharacter: Character | null;
  isSpectro: boolean;
  elementValue: string | undefined;
  displayName: string | undefined;
}

export const EditPage: React.FC = () => {
  const [elementState, setElementState] = useState<ElementState>({
    selectedCharacter: null,
    isSpectro: false,
    elementValue: undefined,
    displayName: undefined
  });

  const [characterLevel, setCharacterLevel] = useState('90');
  const [isEchoesVisible, setIsEchoesVisible] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [currentSequence, setCurrentSequence] = useState(0);
  const echoesRef = useRef<HTMLElement>(null);

  const [weaponState, setWeaponState] = useState<WeaponState>({
    selectedWeapon: null,
    config: { level: 1, rank: 1 }
  });

  const [clickCount, setClickCount] = useState(0);
  const [nodeStates, setNodeStates] = useState<Record<string, Record<string, boolean>>>({});
  const [forteLevels, setForteLevels] = useState<Record<string, number>>({});

  const skillBranches = [
    { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
    { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
    { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
    { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
    { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
  ];

  useEffect(() => {
    if (elementState.selectedCharacter) {
      setCharacterLevel('1');
      setCurrentSequence(0);
      setClickCount(0);
      setNodeStates({});
      setForteLevels({});
    }
  }, [elementState.selectedCharacter]);

  const handleEchoesClick = () => {
    setIsEchoesVisible(true);
    setIsOptionsVisible(true);
    setTimeout(() => {
      echoesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleGenerateClick = (level: number) => {
    setCharacterLevel(level.toString());
  };

  const handleSpectroToggle = (value: boolean) => {
    setElementState(prev => {
      const newElementValue = prev.selectedCharacter && isRover(prev.selectedCharacter) ?
        (value ? "Spectro" : "Havoc") : 
        prev.elementValue;
      
      const newDisplayName = prev.selectedCharacter?.name.startsWith('Rover') ?
        `Rover${value ? 'Spectro' : 'Havoc'}` :
        prev.selectedCharacter?.name;
  
      return {
        ...prev,
        isSpectro: value,
        elementValue: newElementValue,
        displayName: newDisplayName
      };
    });
  };

  const handleCharacterSelect = (character: Character | null) => {
    setElementState({
      selectedCharacter: character,
      isSpectro: false,
      elementValue: character ? 
        (isRover(character) ? "Havoc" : character.element) : 
        undefined,
      displayName: character?.name.startsWith('Rover') ? 
        'RoverHavoc' : 
        character?.name
    });
    setCharacterLevel('1');
    setWeaponState({
      selectedWeapon: null,
      config: { level: 1, rank: 1 }
    });
  };

  const handleSequenceChange = (sequence: number) => {
    setCurrentSequence(sequence);
  };

  const handleWeaponSelect = (weapon: Weapon | null) => {
    setWeaponState(prev => ({
      ...prev,
      selectedWeapon: weapon
    }));
  };

  const handleWeaponConfigChange = (level: number, rank: number) => {
    setWeaponState(prev => ({
      ...prev,
      config: { level, rank }
    }));
  };

  const handleMaxClick = () => {
    const newCount = (clickCount + 1) % 3;
    setClickCount(newCount);

    const newNodeStates: Record<string, Record<string, boolean>> = {};
    const newLevels: Record<string, number> = {};

    skillBranches.forEach((branch) => {
      newNodeStates[branch.treeKey] = {
        top: newCount === 2,
        middle: newCount === 2
      };
      newLevels[branch.skillKey] = newCount === 1 || newCount === 2 ? 10 : 1;
    });

    setNodeStates(newNodeStates);
    setForteLevels(newLevels);
  };

  const handleForteChange = (
    newNodeStates: Record<string, Record<string, boolean>>,
    newLevels: Record<string, number>
  ) => {
    setNodeStates(newNodeStates);
    setForteLevels(newLevels);
  };

  return (
    <div className="app-container">
      <nav>
        <Link to="/scan" className="tab">Scan Screenshots</Link>
      </nav>
      
      <h2>Edit Stats</h2>

      <div className="manual-section">
        <CharacterSelector onSelect={handleCharacterSelect} />
      </div>

      <CharacterInfo 
        selectedCharacter={elementState.selectedCharacter} 
        displayName={elementState.displayName}
        isSpectro={elementState.isSpectro}
        elementValue={elementState.elementValue}
        onEchoesClick={handleEchoesClick}
        onGenerateClick={handleGenerateClick}
        onSpectroToggle={handleSpectroToggle}
        onSequenceChange={handleSequenceChange}
        onWeaponSelect={handleWeaponSelect}
        onWeaponConfigChange={handleWeaponConfigChange}
        weaponState={weaponState}
        nodeStates={nodeStates}
        forteLevels={forteLevels}
        clickCount={clickCount}
        onMaxClick={handleMaxClick}
        onForteChange={handleForteChange}
      />

      <EchoesSection 
        ref={echoesRef}  
        isVisible={isEchoesVisible} 
      />
      
      <BuildCard 
        isVisible={isOptionsVisible}
        selectedCharacter={elementState.selectedCharacter}
        displayName={elementState.displayName}
        characterLevel={characterLevel}
        isSpectro={elementState.isSpectro}
        elementValue={elementState.elementValue}
        currentSequence={currentSequence}
        selectedWeapon={weaponState.selectedWeapon}
        weaponConfig={weaponState.config}
        nodeStates={nodeStates}
        levels={forteLevels}
      />
    </div>
  );
};