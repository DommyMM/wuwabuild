import React, { useState, useRef } from 'react';
import { Character } from './types/character';
import { CharacterSelector } from './components/CharacterSelector';
import { CharacterInfo } from './components/CharacterInfo';
import { EchoesSection } from './components/EchoSection';
import './styles/App.css';

function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isEchoesVisible, setIsEchoesVisible] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const echoesRef = useRef<HTMLDivElement>(null);

  const handleEchoesClick = () => {
    setIsEchoesVisible(true);
    setIsOptionsVisible(true);
    setTimeout(() => {
      echoesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  return (
    <div className="app-container">
      <div>
        <a href="/" className="tab">Scan Screenshots</a>
      </div>
      
      <h2>Edit Stats</h2>

      <div className="manual-section">
        <CharacterSelector onSelect={setSelectedCharacter} />
      </div>

      <CharacterInfo 
        selectedCharacter={selectedCharacter} 
        onEchoesClick={handleEchoesClick}  
      />

      <div ref={echoesRef}>
        <EchoesSection isVisible={isEchoesVisible} />
      </div>
      
      {isOptionsVisible && (
        <>
          <div className="options-container" style={{ display: 'flex' }}></div>
          <button id="generateDownload" style={{ display: 'block' }}>
            Generate
          </button>
        </>
      )}
    </div>
  );
}

export default App;