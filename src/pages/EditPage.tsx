import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Character, isRover } from '../types/character';
import { Weapon, WeaponType, WeaponState } from '../types/weapon';
import { EchoPanelState } from '../types/echo';
import { OCRResponse, OCRAnalysis } from '../types/ocr';
import { CharacterSelector } from '../components/CharacterSelector';
import { CharacterInfo } from '../components/CharacterInfo';
import { EchoesSection } from '../components/EchoSection';
import { BuildCard } from '../components/BuildCard';
import { Scan } from '../components/Scan';
import { useOCRContext } from '../contexts/OCRContext';
import '../styles/App.css';

export interface ElementState {
  selectedCharacter: Character | null;
  elementValue: string | undefined;
  displayName: string | undefined;
}

export const EditPage: React.FC = () => {
  const { unlock } = useOCRContext();
  const [isOCRPanelOpen, setIsOCRPanelOpen] = useState(false);
  
  const [elementState, setElementState] = useState<ElementState>({
    selectedCharacter: null,
    elementValue: undefined,
    displayName: undefined
  });

  const [characterLevel, setCharacterLevel] = useState('1');
  const [isEchoesVisible, setIsEchoesVisible] = useState(false);
  const [currentSequence, setCurrentSequence] = useState(0);
  const echoesRef = useRef<HTMLElement>(null);
  const hasScrolledToEchoes = useRef(false);

  const [weaponState, setWeaponState] = useState<WeaponState>({
    selectedWeapon: null,
    config: { level: 1, rank: 1 }
  });

  const [clickCount, setClickCount] = useState(0);
  const [nodeStates, setNodeStates] = useState<Record<string, Record<string, boolean>>>({});
  const [forteLevels, setForteLevels] = useState<Record<string, number>>({});

  const [echoPanels, setEchoPanels] = useState<EchoPanelState[]>(
    Array(5).fill(null).map(() => ({
      echo: null,
      level: 0,
      selectedElement: null,
      stats: {
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
      }
    }))
  );

  const skillBranches = [
    { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
    { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
    { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
    { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
    { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
  ];

  const [ocrName, setOcrName] = useState<string | undefined>();
  const [ocrAnalysis, setOCRAnalysis] = useState<OCRAnalysis | undefined>();
  const [weaponCache, setWeaponCache] = useState<Record<WeaponType, Weapon[]>>({} as Record<WeaponType, Weapon[]>);

  const handleOCRResult = useCallback((result: OCRResponse) => {
    if (result.success && result.analysis) {
      if (result.analysis.type === 'Character') {
        setOcrName(result.analysis.name);
        setCharacterLevel(result.analysis.characterLevel.toString());
      } 
      else if (result.analysis.type === 'Weapon') {
        const weaponAnalysis = result.analysis;
        if (elementState.selectedCharacter?.weaponType === weaponAnalysis.weaponType) {
          setWeaponState(prev => ({
            ...prev,
            config: {
              level: weaponAnalysis.weaponLevel,
              rank: weaponAnalysis.rank
            }
          }));
        }
      } else if (result.analysis.type === 'Sequences') {
        if (currentSequence !== result.analysis.sequence) {
          setCurrentSequence(result.analysis.sequence);
        }
      }
      setOCRAnalysis(result.analysis);
    }
  }, [currentSequence, elementState.selectedCharacter?.weaponType]);

  const handleEchoesClick = () => {
    setIsEchoesVisible(true);
    setTimeout(() => {
      echoesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleGenerateClick = (level: number) => {
    setCharacterLevel(level.toString());
  };

  const handleSpectroToggle = (value: boolean) => {
    setElementState(prev => ({
      ...prev,
      elementValue: prev.selectedCharacter && isRover(prev.selectedCharacter) ?
        (value ? "Spectro" : "Havoc") : prev.elementValue,
      displayName: prev.selectedCharacter?.name.startsWith('Rover') ?
        `Rover${value ? 'Spectro' : 'Havoc'}` :
        prev.selectedCharacter?.name
    }));
  };

  const handleCharacterSelect = useCallback(async (character: Character | null) => {
    if (character) {
      unlock();
      if (!weaponCache[character.weaponType]) {
        try {
          const response = await fetch(`/Data/${character.weaponType}s.json`);
          const data = await response.json();
          setWeaponCache(prev => ({
            ...prev,
            [character.weaponType]: data
          }));
        } catch (error) {
          console.error('Failed to load weapons:', error);
        }
      }

      setElementState({
        selectedCharacter: character,
        elementValue: isRover(character) ? "Havoc" : character.element,
        displayName: character.name.startsWith('Rover') ? 'RoverHavoc' : character.name
      });
      setWeaponState({
        selectedWeapon: null,
        config: { level: 1, rank: 1 }
      });
      setCharacterLevel('1');
      setCurrentSequence(0);
      setNodeStates({});
      setForteLevels({});
      setEchoPanels(Array(5).fill(null).map(() => ({
        echo: null,
        level: 0,
        selectedElement: null,
        stats: {
          mainStat: { type: null, value: null },
          subStats: Array(5).fill({ type: null, value: null })
        }
      })));
    }
  }, [unlock, weaponCache]);

  const handleSequenceChange = useCallback((sequence: number) => {
    setCurrentSequence(sequence);
  }, []);

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

  const toggleOCRPanel = () => {
    setIsOCRPanelOpen(!isOCRPanelOpen);
  };

  const handleLevelChange = useCallback((level: number) => {
    setCharacterLevel(level.toString());
  }, []);

  return (
    <div className="edit-page">
      <div className="content">
        <h2>Edit Stats</h2>
        <div className="sticky-container">
          <div className="ocr-panel-container">
            <button onClick={toggleOCRPanel} className="switch">
              {isOCRPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              Scan Images
            </button>
            <div className={`ocr-panel${isOCRPanelOpen ? ' open' : ''}`}>
              <div className="panel-content">
                <Scan 
                  onOCRComplete={handleOCRResult}
                  currentCharacterType={elementState.selectedCharacter?.weaponType.replace(/s$/, '')}
                />
              </div>
            </div>
          </div>
        </div>
  
        <CharacterSelector onSelect={handleCharacterSelect} ocrName={ocrName} onLevelReset={() => setCharacterLevel('1')}/>
  
        <CharacterInfo
          selectedCharacter={elementState.selectedCharacter} 
          displayName={elementState.displayName}
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
          ocrData={ocrAnalysis}
          characterLevel={characterLevel}
          onLevelChange={handleLevelChange} 
          currentSequence={currentSequence}
          preloadedWeapons={elementState.selectedCharacter ? weaponCache[elementState.selectedCharacter.weaponType] : undefined}
        />

        <EchoesSection 
          ref={echoesRef}  
          isVisible={isEchoesVisible}
          onPanelChange={setEchoPanels}
          initialPanels={echoPanels}
        />
        
        <BuildCard 
          isVisible={true}
          isEchoesVisible={isEchoesVisible}
          selectedCharacter={elementState.selectedCharacter}
          displayName={elementState.displayName}
          characterLevel={characterLevel}
          isSpectro={elementState.elementValue === "Spectro"}
          elementValue={elementState.elementValue}
          currentSequence={currentSequence}
          selectedWeapon={weaponState.selectedWeapon}
          weaponConfig={weaponState.config}
          nodeStates={nodeStates}
          levels={forteLevels}
          echoPanels={echoPanels}
        />
      </div>
    </div>
  );
};