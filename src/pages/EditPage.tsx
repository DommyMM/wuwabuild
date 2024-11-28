import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Character, isRover } from '../types/character';
import { Weapon, WeaponType, WeaponState } from '../types/weapon';
import { EchoPanelState, Echo, ElementType } from '../types/echo';
import { OCRResponse, OCRAnalysis } from '../types/ocr';
import { CharacterSelector } from '../components/CharacterSelector';
import { CharacterInfo } from '../components/CharacterInfo';
import { EchoesSection } from '../components/EchoSection';
import { BuildCard } from '../components/BuildCard';
import { Scan } from '../components/Scan';
import { useOCRContext } from '../contexts/OCRContext';
import { useEchoes } from '../hooks/useEchoes';
import { matchEchoData } from '../hooks/echoMatching';
import { useMain } from '../hooks/useMain';
import { useSubstats } from '../hooks/useSub';
import '../styles/App.css';

export interface ElementState {
  selectedCharacter: Character | null;
  elementValue: string | undefined;
  displayName: string | undefined;
}

export interface WatermarkState {
  username: string;
  uid: string;
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
  const [currentSequence, setCurrentSequence] = useState(0);
  const echoesRef = useRef<HTMLElement>(null);
  const { echoesByCost } = useEchoes();
  const { mainStatsData, calculateValue } = useMain();
  const { substatsData } = useSubstats();
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

  const [watermark, setWatermark] = useState<WatermarkState>({
    username: '',
    uid: ''
  });

  const handleWatermarkChange = useCallback((newWatermark: WatermarkState) => {
    setWatermark(newWatermark);
  }, []);

  const handleOCRResult = useCallback((result: OCRResponse) => {
      if (!result.success || !result.analysis) return;
      switch (result.analysis.type) {
        case 'Character':
          const characterAnalysis = result.analysis;
          console.log(`Setting character: ${characterAnalysis.name}, Level: ${characterAnalysis.characterLevel}`);
          setOcrName(characterAnalysis.name);
          setCharacterLevel(prev => {
            const newLevel = characterAnalysis.characterLevel;
            const currentLevel = parseInt(prev);
            return newLevel > currentLevel ? newLevel.toString() : prev;
          });
          if (characterAnalysis.uid?.length === 9) {
            setWatermark(prev => ({...prev, uid: characterAnalysis.uid!}));
          }
          if (elementState.selectedCharacter && 
              isRover(elementState.selectedCharacter) && 
              characterAnalysis.element === "Spectro") {
            setElementState(prev => ({
              ...prev,
              elementValue: "Spectro",
              displayName: "RoverSpectro"
            }));
          }
          break;
        case 'Weapon':
          const weaponAnalysis = result.analysis;
          console.log(`Setting Weapon - Name: ${weaponAnalysis.name}, Type: ${weaponAnalysis.weaponType}, Level: ${weaponAnalysis.weaponLevel}, Rank: ${weaponAnalysis.rank}`);
          if (elementState.selectedCharacter?.weaponType.replace(/s$/, '') === weaponAnalysis.weaponType.replace(/s$/, '')) {
            setWeaponState(prev => ({
              ...prev,
              config: {
                level: Math.max(prev.config.level, weaponAnalysis.weaponLevel),
                rank: Math.max(prev.config.rank, weaponAnalysis.rank)
              }
            }));
          }
          break;
        case 'Sequences':
          const sequenceAnalysis = result.analysis;
          console.log(`Setting Sequence: ${sequenceAnalysis.sequence}`);
          setCurrentSequence(prev => 
            Math.max(prev, sequenceAnalysis.sequence)
          );
          break;
        case 'Forte':
          const forteAnalysis = result.analysis;
          console.group('Setting Forte');
          Object.entries(forteAnalysis).forEach(([skill, values]) => {
            if (skill === 'type') return;
            console.log(`${skill}: Level ${values[0]}, Top: ${values[1]}, Middle: ${values[2]}`);
          });
          console.groupEnd();
          const skillToTree = {
            normal: 'tree1',
            skill: 'tree2',
            circuit: 'tree3',
            liberation: 'tree4',
            intro: 'tree5'
          };
          const newNodeStates: Record<string, Record<string, boolean>> = {};
          const newForteLevels: Record<string, number> = {};
          Object.entries(forteAnalysis).forEach(([skill, values]) => {
            if (skill === 'type') return;
            const [level, top, middle] = values;
            const treeKey = skillToTree[skill as keyof typeof skillToTree];
            const skillKey = skill === 'normal' ? 'normal-attack' : skill;
        
            newNodeStates[treeKey] = {
              top: Boolean(top),
              middle: Boolean(middle)
            };
            newForteLevels[skillKey] = level;
          });
          setNodeStates(newNodeStates);
          setForteLevels(newForteLevels);
          break;
      case 'Echo':
        const echoAnalysis = result.analysis;
        console.group('Setting Echo:');
        console.log(`Name: ${echoAnalysis.name}, Element: ${echoAnalysis.element}, Level: ${echoAnalysis.echoLevel}`);
        console.log(`Main stat: ${echoAnalysis.main.name} = ${echoAnalysis.main.value}`);
        console.log('Sub stats:', echoAnalysis.subs.map(sub => 
          `${sub.name} = ${sub.value}`
        ).join(', '));
        console.groupEnd();
        if (!hasScrolledToEchoes.current) {
          echoesRef.current?.scrollIntoView({ behavior: 'smooth' });
          setIsEchoesMinimized(false);
          hasScrolledToEchoes.current = true;
        }
        setEchoPanels(prev => {
          const emptyIndex = prev.findIndex(p => !p.echo);
          
          if (emptyIndex === -1) {
            return prev;
          }
          const matchedPanel = matchEchoData(
            echoAnalysis, 
            echoesByCost,
            mainStatsData, 
            substatsData,
            calculateValue
          );
          if (!matchedPanel) {
            return prev;
          }
          const newPanels = prev.map((panel, i) => 
            i === emptyIndex ? matchedPanel : panel
          );
          return newPanels;
        });
    }
    setOCRAnalysis(result.analysis);
  }, [elementState.selectedCharacter, echoesByCost, mainStatsData, substatsData, calculateValue]);

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
        setIsCharacterMinimized(false);
        setIsEchoesMinimized(true); 
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
      unlock();
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
  
  const handleEchoLevelChange = useCallback((index: number, level: number) => {
    setEchoPanels(prev => prev.map((panel, i) => {
      if (i !== index) return panel;
      
      const updatedPanel = { ...panel, level };

      if (panel.stats.mainStat.type && panel.echo?.cost && mainStatsData) {
        const [min, max] = mainStatsData[`${panel.echo.cost}cost`].mainStats[panel.stats.mainStat.type];
        updatedPanel.stats = {
          ...updatedPanel.stats,
          mainStat: {
            ...updatedPanel.stats.mainStat,
            value: calculateValue(min, max, level)
          }
        };
      }

      return updatedPanel;
    }));
  }, [mainStatsData, calculateValue]);
  
  const handleEchoElementSelect = useCallback((index: number, element: ElementType | null) => {
    setEchoPanels(prev => prev.map((panel, i) => 
      i === index ? { ...panel, selectedElement: element } : panel
    ));
  }, []);
  
  const handleEchoSelect = useCallback((index: number, echo: Echo) => {
    setEchoPanels(prev => prev.map((panel, i) => 
      i === index ? { ...panel, echo, selectedElement: null } : panel
    ));
  }, []);

  const handleMainStatChange = useCallback((index: number, type: string | null) => {
    setEchoPanels(prev => prev.map((panel, i) => {
      if (i !== index) return panel;
      
      if (!type || !mainStatsData || !panel.echo?.cost) {
        return {
          ...panel,
          stats: {
            ...panel.stats,
            mainStat: { type: null, value: null }
          }
        };
      }
  
      const [min, max] = mainStatsData[`${panel.echo.cost}cost`].mainStats[type];
      const value = calculateValue(min, max, panel.level);
  
      return {
        ...panel,
        stats: {
          ...panel.stats,
          mainStat: { type, value }
        }
      };
    }));
  }, [mainStatsData, calculateValue]);
  
  const handleSubStatChange = useCallback((
    panelIndex: number, 
    substatIndex: number, 
    type: string | null, 
    value: number | null
  ) => {
    setEchoPanels(prev => prev.map((panel, i) => {
      if (i !== panelIndex) return panel;
      
      const newSubStats = [...panel.stats.subStats];
      newSubStats[substatIndex] = { type, value };
  
      return {
        ...panel,
        stats: {
          ...panel.stats,
          subStats: newSubStats
        }
      };
    }));
  }, []);

  const [isCharacterMinimized, setIsCharacterMinimized] = useState(true);
  const [isEchoesMinimized, setIsEchoesMinimized] = useState(true);

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
          isMinimized={isCharacterMinimized}
          onMinimize={() => setIsCharacterMinimized(!isCharacterMinimized)}
        />

        <EchoesSection 
          ref={echoesRef}
          isVisible={elementState.selectedCharacter !== null}
          isMinimized={isEchoesMinimized}
          onMinimize={() => setIsEchoesMinimized(!isEchoesMinimized)}
          initialPanels={echoPanels}
          onLevelChange={handleEchoLevelChange}
          onElementSelect={handleEchoElementSelect} 
          onEchoSelect={handleEchoSelect}
          onMainStatChange={handleMainStatChange}
          onSubStatChange={handleSubStatChange}
          onPanelChange={setEchoPanels}
        />
        
        <BuildCard 
          isVisible={true}
          isEchoesVisible={!isEchoesMinimized && elementState.selectedCharacter !== null}
          selectedCharacter={elementState.selectedCharacter}
          watermark={watermark}
          onWatermarkChange={handleWatermarkChange}
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