import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Character } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { CharacterSelector } from '../components/CharacterSelector';
import { CharacterInfo } from '../components/CharacterInfo';
import { EchoesSection } from '../components/EchoSection';
import { BuildCard } from '../components/BuildCard';
import '../styles/App.css';

export const EditPage: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characterLevel, setCharacterLevel] = useState('90');
  const [isEchoesVisible, setIsEchoesVisible] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isSpectro, setIsSpectro] = useState(false);
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
    if (selectedCharacter) {
      setCharacterLevel('1');
      setCurrentSequence(0);
      setClickCount(0);
      setNodeStates({});
      setForteLevels({});
    }
  }, [selectedCharacter]);

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
    setIsSpectro(value);
  };

  const handleCharacterSelect = (character: Character | null) => {
    setSelectedCharacter(character);
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
        selectedCharacter={selectedCharacter} 
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
        selectedCharacter={selectedCharacter}
        characterLevel={characterLevel}
        isSpectro={isSpectro}
        currentSequence={currentSequence}
        selectedWeapon={weaponState.selectedWeapon}
        weaponConfig={weaponState.config}
        nodeStates={nodeStates}
        levels={forteLevels}
      />
    </div>
  );
};