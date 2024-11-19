import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Character } from '../types/character';
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
  };

  const handleSequenceChange = (sequence: number) => {
    setCurrentSequence(sequence);
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
      />
    </div>
  );
};