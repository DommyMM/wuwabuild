import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import domtoimage from 'dom-to-image';
import { Options } from '../Card/Options';
import { CharacterSection } from '../Card/CharacterSection';
import { WeaponSection } from '../Card/WeaponSection';
import { ForteSection } from '../Card/ForteSection';
import { EchoDisplay } from '../Card/EchoDisplay';
import { StatSection } from '../Card/StatSection';
import { Character } from '../../types/character';
import { WeaponState } from '../../types/weapon';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { getCachedEchoes } from '../../hooks/useEchoes';
import { EchoPanelState, ElementType } from '../../types/echo';
import { StatName } from '../../types/stats';
import { useStats } from '../../hooks/useStats';
import { useLevelCurves } from '../../hooks/useLevelCurves';
import { useStatHighlight } from '../../hooks/useHighlight';
import { SaveBuild } from '../Edit/SaveBuild';
import { SavedState } from '../../types/SavedState';
import { toast } from 'react-toastify';
import { Pencil, ImageDownIcon, Download, Database } from 'lucide-react';
import '../../styles/Build.css';

interface BuildCardProps {
  characterId: string | null;
  selectedCharacter: Character | null;
  characterLevel: string;
  element?: string;
  isVisible: boolean;
  isEchoesVisible: boolean;
  currentSequence: number;
  nodeStates: Record<string, Record<string, boolean>>;
  levels: Record<string, number>;
  echoPanels: EchoPanelState[];
  watermark: {
    username: string;
    uid: string;
  };
  onWatermarkChange: (watermark: { username: string; uid: string }) => void;
  onSaveBuild?: () => void;
  weaponState: WeaponState; 
}

export const BuildCard: React.FC<BuildCardProps> = ({
  isVisible,
  isEchoesVisible,
  characterId,
  selectedCharacter,
  characterLevel,
  element,
  currentSequence,
  nodeStates,
  levels,
  echoPanels,
  watermark,
  onWatermarkChange,
  onSaveBuild,
  weaponState
}) => {
  useStatHighlight();
  const [isTabVisible, setIsTabVisible] = useState(false);
  const [showRollQuality, setShowRollQuality] = useState(true);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customImage, setCustomImage] = useState<File | undefined>(undefined);
  const [savedCustomImage, setSavedCustomImage] = useState<File | undefined>(undefined);
  const [useAltSkin, setUseAltSkin] = useState(false);
  const [artSource, setArtSource] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const { scaleAtk, scaleStat } = useLevelCurves();

  const selectedWeapon = useMemo(() => 
    getCachedWeapon(weaponState.id),
    [weaponState.id]
  );

  const weaponStats = useMemo(() => 
    selectedWeapon ? {
      scaledAtk: scaleAtk(selectedWeapon.ATK, weaponState.level),
      scaledMainStat: scaleStat(selectedWeapon.base_main, weaponState.level),
      scaledPassive: selectedWeapon.passive_stat 
        ? Number((selectedWeapon.passive_stat * (1 + ((weaponState.rank - 1) * 0.25))).toFixed(1)) 
        : undefined,
      scaledPassive2: selectedWeapon.passive_stat2
        ? Number((selectedWeapon.passive_stat2 * (1 + ((weaponState.rank - 1) * 0.25))).toFixed(1)) 
        : undefined
    } : undefined,
    [selectedWeapon, weaponState, scaleAtk, scaleStat]
  );
  const displayName = selectedCharacter ? 
    (selectedCharacter.name.startsWith('Rover') ? `Rover${element || "Havoc"}` : selectedCharacter.name) : 
    undefined;
  const isSpectro = element === "Spectro";
  const elementValue = selectedCharacter?.name.startsWith('Rover') ? 
    element || "Havoc" : 
    selectedCharacter?.element;

  const statsInput = useMemo(() => ({
    character: selectedCharacter,
    level: characterLevel,
    weapon: selectedWeapon,
    weaponStats,
    echoPanels,
    nodeStates,
    isSpectro
  }), [
    selectedCharacter,
    characterLevel,
    selectedWeapon,
    weaponStats,
    echoPanels,
    nodeStates,
    isSpectro
  ]);

  const { values, baseValues, updates, cv } = useStats(statsInput);

  const calculateSets = useCallback((): Array<{ element: ElementType; count: number }> => {
    const elementCounts = echoPanels.reduce((counts, panel) => {
      if (!panel.id) return counts;
      const echo = getCachedEchoes(panel.id);
      if (!echo) return counts;
      const element = panel.selectedElement || echo.elements[0];
      counts[element] = (counts[element] || 0) + 1;
      return counts;
    }, {} as Record<ElementType, number>);
  
    return Object.entries(elementCounts)
      .filter(([_, count]) => count >= 2)
      .map(([element, count]) => ({
        element: element as ElementType,
        count: count >= 5 ? 5 : 2
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
  }, [echoPanels]);

  const formatStatValue = (stat: StatName, value: number): string => {
    const flatStats = ['HP', 'ATK', 'DEF'];
    return flatStats.includes(stat) ? Math.round(value).toString() : `${value.toFixed(1)}%`;
  };

  const displayStats = useMemo(() => 
    Object.entries(values)
      .filter(([_, value]) => value !== 0)
      .map(([stat, value]) => ({
        name: stat as StatName,
        value: formatStatValue(stat as StatName, value as number),
        baseValue: baseValues[stat as StatName],
        update: updates[stat as StatName]
      })),
    [values, baseValues, updates]
  );

  const { elementSets, leftStates, rightStates } = useMemo(() => {
    const sets = calculateSets();
    const leftStates = Array(5).fill('none');
    const rightStates = Array(5).fill('none');
    sets.forEach((set, setIndex) => {
      const states = setIndex === 0 ? leftStates : rightStates;
      const element = set.element;
      let startIndex = -1;
      for (let i = 0; i < echoPanels.length; i++) {
        const panelElement = (() => {
          const echo = getCachedEchoes(echoPanels[i].id);
          return echoPanels[i].selectedElement || (echo?.elements[0] ?? null);
        })();
        if (panelElement === element) {
          states[i] = 'start';
          startIndex = i;
          break;
        }
      }
      if (startIndex !== -1) {
        for (let i = echoPanels.length - 1; i > startIndex; i--) {
          const panelElement = (() => {
            const echo = getCachedEchoes(echoPanels[i].id);
            return echoPanels[i].selectedElement || (echo?.elements[0] ?? null);
          })();
          if (panelElement === element) {
            states[i] = 'end';
            for (let j = startIndex + 1; j < i; j++) {
              const middleElement = (() => {
                const echo = getCachedEchoes(echoPanels[j].id);
                return echoPanels[j].selectedElement || (echo?.elements[0] ?? null);
              })();
              states[j] = 'continue' + (middleElement === element ? ' connect' : '');
            }
            break;
          }
        }
      }
    });
    return { elementSets: sets, leftStates, rightStates };
  }, [echoPanels, calculateSets]);

  const handleGenerate = useCallback(() => {
    if (!isTabVisible) setIsTabVisible(true);
  }, [isTabVisible]);

  const handleDownload = useCallback(() => {
    if (!tabRef.current) return;
  
    const now = new Date();
    const timestamp = now.toISOString().slice(0,19).replace(/[T:]/g, ' ');
    
    tabRef.current.classList.add('downloading');
    domtoimage.toPng(tabRef.current, {cacheBust: true, quality: 1})
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = `${timestamp}.png`;
        link.href = dataUrl;
        link.click();
        if (tabRef.current) {
          tabRef.current.classList.remove('downloading');
        }
      })
      .catch((error: Error) => {
        console.error('Error capturing build-tab:', error);
        if (tabRef.current) {
          tabRef.current.classList.remove('downloading');
        }
      });
  }, [tabRef]);

  const handleImageChange = (file: File | undefined) => {
    if (isEditMode) {
      setCustomImage(file);
      setSavedCustomImage(file);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      setSavedCustomImage(customImage);
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveBuildClick = () => {
    setIsSaveModalOpen(true);
  };

  const hashBuildData = (state: SavedState): string => {
    const data = [state.characterState.id, 
      state.characterState.level,
      state.characterState.element,
      state.weaponState.id,
      state.weaponState.level,
      state.weaponState.rank,
      state.currentSequence,
      JSON.stringify(state.echoPanels),
      JSON.stringify(state.nodeStates),
      JSON.stringify(state.forteLevels)
    ].join('-');
  
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).slice(0, 6);
  };
  
  const handleSaveConfirm = (name: string) => {
    const state: SavedState = {
      characterState: {
        id: characterId,
        level: characterLevel,  
        element
      },
      currentSequence,
      weaponState,
      nodeStates,
      forteLevels: levels,
      echoPanels,
      watermark
    };
    try {
      const builds = JSON.parse(localStorage.getItem('saved_builds') || '{"version":"1.0.2","builds":[]}');
      builds.builds.push({
        id: hashBuildData(state),
        name,
        date: new Date().toISOString(),
        state
      });
      builds.version = '1.0.2';
      localStorage.setItem('saved_builds', JSON.stringify(builds));
      toast.success('Build saved');
      setIsSaveModalOpen(false);
    } catch (error) {
      toast.error('Save failed');
      console.error('Failed to save build:', error);
    }
  };

  useEffect(() => {
    if (isTabVisible && tabRef.current) {
      const timer = setTimeout(() => {
        tabRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isTabVisible]);

  useEffect(() => {
    if (isEchoesVisible && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isEchoesVisible, hasBeenVisible]);

  const hasTwoFourCosts = (panels: EchoPanelState[]): boolean => {
    return panels.filter(panel => {
      const echo = getCachedEchoes(panel.id);
      return echo?.cost === 4;
    }).length === 2;
  };
  
  const getCVClass = (cv: number): string => {
    const hasDouble4Cost = hasTwoFourCosts(echoPanels);
    const adjustedCV = hasDouble4Cost ? cv - 44 : cv;
    if (adjustedCV >= 230) return 'goat';
    if (adjustedCV >= 220) return 'excellent';
    if (adjustedCV >= 205) return 'high'; 
    if (adjustedCV >= 195) return 'good';
    if (adjustedCV >= 175) return 'decent';
    return 'low';
  };
  if (!isVisible) return null;

  return (
    <div className="build-section">
      <div className="build-card">
        <Options watermark={watermark}
          showRollQuality={showRollQuality}
          useAltSkin={useAltSkin}
          artSource={artSource}
          onWatermarkChange={onWatermarkChange}
          onRollQualityChange={setShowRollQuality}
          onSkinChange={setUseAltSkin}
          onArtSourceChange={setArtSource}
          className={hasBeenVisible ? 'visible' : 'hidden'}
          characterName={selectedCharacter?.name}
        />
        <button
          id="generateDownload"
          className="build-button"
          onClick={handleGenerate}
          style={{ 
            display: hasBeenVisible ? 'block' : 'none'
          }}
        > Generate </button>
        <div className="card">
          <div ref={tabRef}
            id="build-tab"
            className="tab"
            style={{ 
              display: isTabVisible ? 'flex' : 'none',
              opacity: isTabVisible ? 1 : 0
            }}
          >
            {isTabVisible && selectedCharacter && elementValue && (
              <>
                <CharacterSection character={selectedCharacter} 
                  level={characterLevel}
                  isSpectro={isSpectro}
                  currentSequence={currentSequence}
                  username={watermark.username}
                  isEditMode={isEditMode}
                  onImageChange={handleImageChange}
                  customImage={savedCustomImage}
                  useAltSkin={useAltSkin}
                  artSource={artSource}
                  onArtSourceChange={setArtSource}
                >
                <ForteSection character={{...selectedCharacter, name: displayName || selectedCharacter.name}}
                  elementValue={elementValue}
                  nodeStates={nodeStates}
                  levels={levels}
                />
                {selectedWeapon && weaponStats && (
                  <WeaponSection weapon={selectedWeapon}
                    level={weaponState.level}
                    rank={weaponState.rank}
                    scaledStats={weaponStats}
                    characterElement={elementValue}
                    useAltSkin={useAltSkin}
                  />
                )}
                </CharacterSection>
                <StatSection isVisible={isTabVisible} stats={displayStats}/>
                <EchoDisplay isVisible={isTabVisible} echoPanels={echoPanels} showRollQuality={showRollQuality} leftStates={leftStates} rightStates={rightStates} sets={elementSets} cv={cv} getCVClass={getCVClass}/>
                <div className="watermark-container">
                  <div className="username">{watermark.username}</div>
                  <div className="uid">{watermark.uid}</div>
                </div>
                <div className="site-watermark">wuwabuilds.moe</div>
              </>
            )}
          </div>
        </div>
        {isTabVisible && (
          <div className="button-group">
            <button id="editButton" className="build-button" onClick={handleEditToggle}>
            {isEditMode ? (<><ImageDownIcon size={20} /> Save Image</>) : 
              (<><Pencil size={20} /> Edit</>)}
            </button>
            <button id="downloadButton" className="build-button" onClick={handleDownload}>
              <Download size={20}/> Download
            </button>
            <button id="saveBuildButton" className="build-button" onClick={handleSaveBuildClick}>
              <Database size={20}/>Save Build
            </button>
          </div>
        )}
        <SaveBuild isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveConfirm}
          defaultName={selectedCharacter?.name ? `${selectedCharacter.name} Build` : undefined}
        />
      </div>
    </div>
  );
};