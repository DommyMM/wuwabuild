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

  useEffect(() => {
    if (selectedCharacter) {
      setCharacterLevel('1');
      setCurrentSequence(0);
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
      />
    </div>
  );
};