import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { SEO } from '../components/SEO';
import { isRover } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { EchoPanelState, ElementType } from '../types/echo';
import { OCRResponse, OCRAnalysis } from '../types/ocr';
import { SavedState, SavedEchoData } from '../types/SavedState';
import { CharacterSelector } from '../components/Edit/CharacterSelector';
import { CharacterInfo } from '../components/Edit/CharacterInfo';
import { EchoesSection } from '../components/Edit/EchoSection';
import { BuildCard } from '../components/Edit/BuildCard';
import { Scan } from '../components/Edit/Scan';
import { DailyNotification } from '../components/Edit/DailyNotification';
import { RestorePrompt } from '../components/Edit/Restore';
import { useOCRContext } from '../contexts/OCRContext';
import { getCachedEchoes } from '../hooks/useEchoes';
import { matchEchoData } from '../hooks/echoMatching';
import { cachedCharacters } from '../hooks/useCharacters';
import { weaponCache } from '../hooks/useWeapons';
import { mainStatsCache } from '../hooks/useMain';
import '../styles/App.css';

export interface CharacterState {
  id: string | null;
  level: string;
  element?: string;
}

export interface WatermarkState {
  username: string;
  uid: string;
}

export const EditPage: React.FC = () => {
  const { unlock } = useOCRContext();
  const [isOCRPanelOpen, setIsOCRPanelOpen] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState>({
    id: null,
    level: '1',
    element: undefined
  });
  const selectedCharacter = useMemo(() => characterState.id ? cachedCharacters?.find(c => c.id === characterState.id) ?? null : null, [characterState.id]);
  const [currentSequence, setCurrentSequence] = useState(0);
  const echoesRef = useRef<HTMLElement>(null);
  const hasScrolledToEchoes = useRef(false);
  const [weaponState, setWeaponState] = useState<WeaponState>({
    id: null,
    level: 1,
    rank: 1
  });
  const [clickCount, setClickCount] = useState(0);
  const [nodeStates, setNodeStates] = useState<Record<string, Record<string, boolean>>>({});
  const [forteLevels, setForteLevels] = useState<Record<string, number>>({});
  const [echoPanels, setEchoPanels] = useState<EchoPanelState[]>(
    Array(5).fill(null).map(() => ({
      id: null,
      level: 0,
      selectedElement: null,
      stats: {
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
      },
      phantom: false
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
        const characterId = characterAnalysis.name.includes('(M)') ? '4' : '5';
        setOcrName(characterAnalysis.name);
        setCharacterState(prev => ({
          id: characterId,
          level: characterAnalysis.characterLevel.toString(),
          element: characterAnalysis.element
        }));
        if (characterAnalysis.uid?.length === 9) {
          setWatermark(prev => ({...prev, uid: characterAnalysis.uid!}));
        }
        break;
      case 'Weapon':
        const weaponAnalysis = result.analysis;
        const character = characterState.id ? cachedCharacters!.find(c => c.id === characterState.id) : null;
        if (character?.weaponType.replace(/s$/, '') === weaponAnalysis.weaponType.replace(/s$/, '')) {
          const weapons = weaponCache.get(character.weaponType) ?? [];
          const matchedWeapon = weapons.find(w => 
            w.name.toLowerCase() === weaponAnalysis.name.toLowerCase()
          );
          setWeaponState(prev => ({
            id: matchedWeapon?.id ?? prev.id,
            level: Math.max(prev.level, weaponAnalysis.weaponLevel),
            rank: Math.max(prev.rank, weaponAnalysis.rank)
          }));
        }
        break;
      case 'Sequences':
        const sequenceAnalysis = result.analysis;
        setCurrentSequence(prev => 
          Math.max(prev, sequenceAnalysis.sequence)
        );
        break;
      case 'Forte':
        const forteAnalysis = result.analysis;
        console.group('Setting Forte');
        Object.entries(forteAnalysis).forEach(([skill, values]) => {
          if (skill === 'type') return;
          const [level, top, middle] = values;
          console.log(`${skill}: Level ${level}, Top: ${top === 1 ? 'On' : 'Off'}, Middle: ${middle === 1 ? 'On' : 'Off'}`);
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
        console.log(`Main stat: ${echoAnalysis.main.name}: ${echoAnalysis.main.value}`);
        console.log('Sub stats:', echoAnalysis.subs.map(sub => 
          `${sub.name}: ${sub.value}`
        ).join(', '));
        console.groupEnd();
        if (!hasScrolledToEchoes.current) {
          echoesRef.current?.scrollIntoView({ behavior: 'smooth' });
          setIsEchoesMinimized(false);
          hasScrolledToEchoes.current = true;
        }
        setEchoPanels(prev => {
          const emptyIndex = prev.findIndex(p => !p.id);
          
          if (emptyIndex === -1) {
            return prev;
          }
          const matchedPanel = matchEchoData(echoAnalysis);
          if (!matchedPanel) {
            console.error('Failed to match echo data');
            return prev;
          }
          const newPanels = prev.map((panel, i) => 
            i === emptyIndex ? matchedPanel : panel
          );
          return newPanels;
        });
    }
    setOCRAnalysis(result.analysis);
  }, [characterState.id]);
  const currentWeaponType = useMemo(() => {
    if (!characterState.id || !cachedCharacters) return null;
    return cachedCharacters.find(c => c.id === characterState.id)?.weaponType ?? null;
  }, [characterState.id]);
  const handleCharacterSelect = useCallback((characterId: string | null) => {
    if (characterId) {
      const character = cachedCharacters!.find(c => c.id === characterId);
      if (!character) return;
      
      setIsCharacterMinimized(false);
      setIsEchoesMinimized(true); 
      setCharacterState(prev => ({
        id: characterId,
        level: prev.level || '1',
        element: prev.element || (isRover(character) ? "Havoc" : character.element)
      }));
      if (!currentWeaponType || currentWeaponType !== character.weaponType) {
        setWeaponState({
          id: null,
          level: 1,
          rank: 1
        });
      }
      
      unlock();
    }
    }, [unlock, currentWeaponType]);
  
  const handleSpectroToggle = (value: boolean) => {
    setCharacterState(prev => ({
      ...prev,
      element: value ? "Spectro" : "Havoc"
    }));
  };
  const handleSequenceChange = useCallback((sequence: number) => {
    setCurrentSequence(sequence);
  }, []);
  const handleWeaponSelect = (weapon: Weapon | null) => {
    setWeaponState(prev => ({
      ...prev,
      id: weapon?.id ?? null
    }));
  };

  const handleWeaponConfigChange = useCallback((level: number, rank: number) => {
    setWeaponState(prevState => {
      if (prevState.level === level && prevState.rank === rank) {
        return prevState;
      }
      return {
        ...prevState,
        level,
        rank
      };
    });
  }, []);
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
    setCharacterState(prev => ({
      ...prev,
      level: level.toString()
    }));
  }, []);
  
  const handleEchoLevelChange = useCallback((index: number, level: number) => {
    setEchoPanels(prev => prev.map((panel, i) => {
      if (i !== index) return panel;
      
      const updatedPanel = { ...panel, level };
      const echo = getCachedEchoes(panel.id);
      if (panel.stats.mainStat.type && echo?.cost && mainStatsCache.data) {
        const mainStats = mainStatsCache.data[`${echo.cost}cost`]?.mainStats;
        if (mainStats?.[panel.stats.mainStat.type]) {
          const [min, max] = mainStats[panel.stats.mainStat.type];
          updatedPanel.stats = {
            ...updatedPanel.stats,
            mainStat: {
              ...updatedPanel.stats.mainStat,
              value: mainStatsCache.calculateValue(min, max, level)
            }
          };
        }
      }
      return updatedPanel;
    }));
  }, []);
  
  const handleEchoElementSelect = useCallback((index: number, element: ElementType | null) => {
    setEchoPanels(prev => prev.map((panel, i) => 
      i === index ? { ...panel, selectedElement: element } : panel
    ));
  }, []);
  
  const handleEchoSelect = useCallback((index: number, id: string) => {
    setEchoPanels(prev => prev.map((panel, i) => 
      i === index ? { ...panel, id, selectedElement: null } : panel
    ));
  }, []);

  const handleMainStatChange = useCallback((index: number, type: string | null) => {
    setEchoPanels(prev => prev.map((panel, i) => {
      if (i !== index) return panel;
      
      const echo = getCachedEchoes(panel.id);
      if (!type || !echo?.cost || !mainStatsCache.data) {
        return {
          ...panel,
          stats: {
            ...panel.stats,
            mainStat: { type: null, value: null }
          }
        };
      }
  
      const mainStats = mainStatsCache.data[`${echo.cost}cost`]?.mainStats;
      if (!mainStats?.[type]) {
        return panel;
      }
  
      const [min, max] = mainStats[type];
      const value = mainStatsCache.calculateValue(min, max, panel.level);
      return {
        ...panel,
        stats: {
          ...panel.stats,
          mainStat: { type, value }
        }
      };
    }));
  }, []);
  
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
  const [showRestore, setShowRestore] = useState(false);
  const [savedState, setSavedState] = useState<SavedState | null>(null);
  const [savedEchoes, setSavedEchoes] = useState<SavedEchoData[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_echoes') || '[]');
    } catch (error) {
      console.error('Failed to load saved echoes:', error);
      return [];
    }
  });
  const hashPanelData = (panel: EchoPanelState): string => {
    const mainStat = `${panel.stats.mainStat.type}-${panel.stats.mainStat.value}`;
    const subStats = panel.stats.subStats
      .map(sub => `${sub.type}-${sub.value}`)
      .join('_');
      
    const data = [panel.id, panel.level, panel.selectedElement, panel.phantom ? 1 : 0, mainStat, subStats].join('-');
  
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).slice(0, 6);
  };

  
  const handleSaveEcho = useCallback((panelIndex: number) => {
    const newEcho: SavedEchoData = {
      id: hashPanelData(echoPanels[panelIndex]),
      panelData: echoPanels[panelIndex]
    };
    setSavedEchoes(prev => {
      const newEchoes = [...prev, newEcho];
      localStorage.setItem('saved_echoes', JSON.stringify(newEchoes));
      return newEchoes;
    });
  }, [echoPanels]);
  
  const handleLoadEcho = useCallback((savedEcho: SavedEchoData, targetIndex: number) => {
    setEchoPanels(prev => prev.map((panel, idx) => 
      idx === targetIndex ? savedEcho.panelData : panel
    ));
  }, []);
  
  const handleDeleteEcho = useCallback((echoId: string) => {
    setSavedEchoes(prev => {
      const newEchoes = prev.filter(echo => echo.id !== echoId);
      localStorage.setItem('saved_echoes', JSON.stringify(newEchoes));
      return newEchoes;
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('last_build');
      if (saved) {
        const state = JSON.parse(saved);
        setSavedState(state);
        setShowRestore(true);
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  }, []);

  const buildState = useMemo(() => ({
    characterState,
    currentSequence,
    weaponState,
    nodeStates,
    forteLevels,
    echoPanels,
    watermark
  }), [characterState, currentSequence, weaponState, nodeStates, forteLevels, echoPanels, watermark]);
  
  useEffect(() => {
    if (!characterState.id) return;
    try {
      localStorage.setItem('last_build', JSON.stringify(buildState));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [characterState.id, buildState]);

  const handleRestore = useCallback(() => {
    if (savedState) {
      setCharacterState(savedState.characterState);
      setCurrentSequence(savedState.currentSequence);
      setWeaponState(savedState.weaponState);
      setNodeStates(savedState.nodeStates);
      setForteLevels(savedState.forteLevels);
      setEchoPanels(savedState.echoPanels);
      setWatermark(savedState.watermark);
      setIsCharacterMinimized(false);
      setIsEchoesMinimized(false);
      unlock();
    }
    setShowRestore(false);
  }, [savedState, unlock]);

  const handleDecline = useCallback(() => {
    localStorage.removeItem('last_build');
    setShowRestore(false);
  }, []);

  const [showEchoCostWarning, setShowEchoCostWarning] = useState(false);

  useEffect(() => {
    const totalCost = echoPanels.reduce((sum, panel) => {
      const echo = getCachedEchoes(panel.id);
      return sum + (echo?.cost || 0);
    }, 0);
    
    if (totalCost > 12) {
      setShowEchoCostWarning(true);
    }
  }, [echoPanels]);
  
  return (
    <>
      <SEO title="Build Editor - WuWa Builds"
        description="Scan in-game screenshots to create and customize Wuthering Waves builds with real-time stat calculations and build management tools."
        image="%PUBLIC_URL%/images/edit.png"
      />
      <main className="edit-page" aria-label="Wuthering Waves Build Editor">
        {showRestore && <RestorePrompt onRestore={handleRestore} onDecline={handleDecline} />}
        <DailyNotification />
        <div className="content">
          <div className="scan-container">
            <div className="ocr-panel-container">
              <button onClick={toggleOCRPanel} className="switch">
                {isOCRPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                Scan Images
              </button>
              <div className={`ocr-panel${isOCRPanelOpen ? ' open' : ''}`}>
                <div className="panel-content">
                  <Scan onOCRComplete={handleOCRResult}
                    currentCharacterType={characterState.id ? 
                      cachedCharacters!.find(c => c.id === characterState.id)?.weaponType.replace(/s$/, '') : 
                      undefined}
                  />
                </div>
              </div>
            </div>
          </div>
          <CharacterSelector onSelect={handleCharacterSelect}
            selectedCharacter={selectedCharacter}
            ocrName={ocrName} 
            onLevelReset={() => setCharacterState(prev => ({ ...prev, level: '1' }))} 
            initialCharacterId={characterState.id}
          />
          <CharacterInfo characterId={characterState.id}
            selectedCharacter={selectedCharacter}
            characterLevel={characterState.level}
            element={characterState.element}
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
            onLevelChange={handleLevelChange}
            currentSequence={currentSequence}
            isMinimized={isCharacterMinimized}
            onMinimize={() => setIsCharacterMinimized(!isCharacterMinimized)}
          />
          <EchoesSection ref={echoesRef}
            isVisible={characterState.id !== null}
            isMinimized={isEchoesMinimized}
            onMinimize={() => setIsEchoesMinimized(!isEchoesMinimized)}
            initialPanels={echoPanels}
            onLevelChange={handleEchoLevelChange}
            onElementSelect={handleEchoElementSelect} 
            onEchoSelect={handleEchoSelect}
            onMainStatChange={handleMainStatChange}
            onSubStatChange={handleSubStatChange}
            onPanelChange={setEchoPanels}
            savedEchoes={savedEchoes}
            onSaveEcho={handleSaveEcho}
            onLoadEcho={handleLoadEcho}
            onDeleteEcho={handleDeleteEcho}
            showCostWarning={showEchoCostWarning}
            onCostWarningDismiss={() => setShowEchoCostWarning(false)}
          />
          <BuildCard characterId={characterState.id}
            selectedCharacter={selectedCharacter}
            characterLevel={characterState.level}
            element={characterState.element}
            watermark={watermark}
            onWatermarkChange={handleWatermarkChange}
            currentSequence={currentSequence}
            weaponState={weaponState}
            nodeStates={nodeStates}
            levels={forteLevels}
            echoPanels={echoPanels}
            isVisible={true}
            isEchoesVisible={!isEchoesMinimized && characterState.id !== null}
          />
        </div>
      </main>
    </>
  );
};