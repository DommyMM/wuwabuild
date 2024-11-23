import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Character, isRover } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { EchoPanelState } from '../types/echo';
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
  const [isOCRPanelOpen, setIsOCRPanelOpen] = useState(false);
  
  const [elementState, setElementState] = useState<ElementState>({
    selectedCharacter: null,
    elementValue: undefined,
    displayName: undefined
  });

  const [characterLevel, setCharacterLevel] = useState('90');
  const [isEchoesVisible, setIsEchoesVisible] = useState(false);
  const [currentSequence, setCurrentSequence] = useState(0);
  const echoesRef = useRef<HTMLElement>(null);

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

  const { ocrResult } = useOCRContext();
  
  const ocrData = React.useMemo(() => {
    if (!ocrResult?.success || !ocrResult.analysis) return undefined;
  
    switch (ocrResult.analysis.type) {
      case 'Character':
        return {
          type: 'Character' as const,
          name: ocrResult.analysis.name,
          level: ocrResult.analysis.level
        };
      case 'Weapon':
        return {
          type: 'Weapon' as const,
          name: ocrResult.analysis.name,
          weaponType: ocrResult.analysis.weaponType,
          level: ocrResult.analysis.level,
          rank: ocrResult.analysis.rank
        };
      case 'Sequences':
        return {
          type: 'Sequences' as const,
          sequence: ocrResult.analysis.sequence
        };
      case 'Forte':
        const nodeStates = {
          tree1: { top: ocrResult.analysis.normal[1] === 1, middle: ocrResult.analysis.normal[2] === 1 },
          tree2: { top: ocrResult.analysis.skill[1] === 1, middle: ocrResult.analysis.skill[2] === 1 },
          tree3: { top: ocrResult.analysis.circuit[1] === 1, middle: ocrResult.analysis.circuit[2] === 1 },
          tree4: { top: ocrResult.analysis.liberation[1] === 1, middle: ocrResult.analysis.liberation[2] === 1 },
          tree5: { top: ocrResult.analysis.intro[1] === 1, middle: ocrResult.analysis.intro[2] === 1 }
        };

        const levels = {
          'normal-attack': ocrResult.analysis.normal[0],
          'skill': ocrResult.analysis.skill[0],
          'circuit': ocrResult.analysis.circuit[0], 
          'liberation': ocrResult.analysis.liberation[0],
          'intro': ocrResult.analysis.intro[0]
        };

        return {
          type: 'Forte' as const,
          nodeStates,
          levels
        };
      default:
        return undefined;
    }
  }, [ocrResult]);

  useEffect(() => {
    if (elementState.selectedCharacter) {
      setCharacterLevel('1');
      setCurrentSequence(0);
      setClickCount(0);
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
  }, [elementState.selectedCharacter]);

  useEffect(() => {
    if (ocrData?.level) {
      setCharacterLevel(ocrData.level.toString());
    }
  }, [ocrData]);

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

  const handleCharacterSelect = (character: Character | null) => {
    setElementState({
      selectedCharacter: character,
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

  const toggleOCRPanel = () => {
    setIsOCRPanelOpen(!isOCRPanelOpen);
  };

  return (
    <div className="edit-page">
      <div className="content">        
        <h2>Edit Stats</h2>
        <div className="sticky-container">
          <div className="ocr-panel-container">
            <button 
              onClick={toggleOCRPanel}
              className="switch"
            >
              {isOCRPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              Scan Images
            </button>
            
            <div className={`ocr-panel${isOCRPanelOpen ? ' open' : ''}`}>
              <div className="panel-content">
                <Scan />
              </div>
            </div>
          </div>
        </div>
  
        <CharacterSelector 
          onSelect={handleCharacterSelect}
          ocrData={ocrData?.type === 'Character' ? {
            name: ocrData.name,
            level: ocrData.level
          } : undefined}
        />
  
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
          initialLevel={ocrData?.type === 'Character' ? ocrData.level : undefined}
          ocrData={ocrData}
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