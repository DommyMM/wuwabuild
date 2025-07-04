import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Pencil, ImageDownIcon, Download, ExternalLink, Database } from 'lucide-react';
import domtoimage from 'dom-to-image';
import { Options } from './Options';
import { CharacterSection } from './CharacterSection';
import { WeaponSection } from './WeaponSection';
import { ForteSection } from './ForteSection';
import { EchoDisplay } from './EchoDisplay';
import { StatSection } from './StatSection';
import { Character } from '@/types/character';
import { cachedCharacters } from '@/hooks/useCharacters';
import { WeaponState } from '@/types/weapon';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { getCachedEchoes } from '@/hooks/useEchoes';
import { EchoPanelState, ElementType } from '@/types/echo';
import { StatName } from '@/types/stats';
import { useStats } from '@/hooks/useStats';
import { useLevelCurves } from '@/hooks/useLevelCurves';
import { useStatHighlight } from '@/hooks/useHighlight';
import { SaveBuild } from '@/components/Edit/SaveBuild';
import { SavedState } from '@/types/SavedState';
import { toast } from 'react-toastify';
import '@/styles/Build.css';

export const calculateWeaponStats = (
  selectedWeapon: ReturnType<typeof getCachedWeapon>,
  weaponState: WeaponState,
  scaleAtk: ReturnType<typeof useLevelCurves>['scaleAtk'],
  scaleStat: ReturnType<typeof useLevelCurves>['scaleStat']
) => selectedWeapon ? {
  scaledAtk: scaleAtk(selectedWeapon.ATK, weaponState.level),
  scaledMainStat: scaleStat(selectedWeapon.base_main, weaponState.level),
  scaledPassive: selectedWeapon.passive_stat 
    ? Number((selectedWeapon.passive_stat * (1 + ((weaponState.rank - 1) * 0.25))).toFixed(1)) 
    : undefined,
  scaledPassive2: selectedWeapon.passive_stat2
    ? Number((selectedWeapon.passive_stat2 * (1 + ((weaponState.rank - 1) * 0.25))).toFixed(1)) 
    : undefined
} : undefined;

export const formatStatValue = (stat: StatName, value: number): string => {
  const flatStats = ['HP', 'ATK', 'DEF'];
  return flatStats.includes(stat) ? Math.round(value).toString() : `${value.toFixed(1)}%`;
};

export const hasTwoFourCosts = (panels: EchoPanelState[]): boolean => {
  return panels.filter(panel => {
    const echo = getCachedEchoes(panel.id);
    return echo?.cost === 4;
  }).length === 2;
};

export const getCVClass = (cv: number, panels: EchoPanelState[]): string => {
  const hasDouble4Cost = hasTwoFourCosts(panels);
  const adjustedCV = hasDouble4Cost ? cv - 44 : cv;
  if (adjustedCV >= 230) return 'goat';
  if (adjustedCV >= 220) return 'excellent';
  if (adjustedCV >= 205) return 'high'; 
  if (adjustedCV >= 195) return 'good';
  if (adjustedCV >= 175) return 'decent';
  return 'low';
};

export const calculateSets = (echoPanels: EchoPanelState[]): Array<{ element: ElementType; count: number }> => {
  const elementCounts = echoPanels.reduce((counts, panel) => {
    if (!panel.id) return counts;
    const echo = getCachedEchoes(panel.id);
    if (!echo) return counts;
    const element = panel.selectedElement || echo.elements[0];
    counts[element] = (counts[element] || 0) + 1;
    return counts;
  }, {} as Record<ElementType, number>);

  return Object.entries(elementCounts)
    .filter(([, count]) => count >= 2)
    .map(([element, count]) => ({
      element: element as ElementType,
      count: count >= 5 ? 5 : 2
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
};

export const hashBuildData = (state: SavedState): string => {
  const data = [
    state.characterState.id, 
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

export interface StatsInput {
  character: Character | null;
  level: string;
  weapon: ReturnType<typeof getCachedWeapon>;
  weaponStats: ReturnType<typeof calculateWeaponStats>;
  echoPanels: EchoPanelState[];
  nodeStates: Record<string, Record<string, boolean>>;
}

export const calculateDisplayStats = (
  values: Record<StatName, number>,
  baseValues: Record<StatName, number>,
  updates: Record<StatName, number>
) => {
  const elementStats = [
    'Aero DMG', 'Electro DMG', 'Fusion DMG', 
    'Glacio DMG', 'Havoc DMG', 'Spectro DMG'
  ];
  
  // Get all non-zero entries first
  const nonZeroEntries = Object.entries(values).filter(([, value]) => value !== 0);
  
  // Filter out element stats for special handling
  const nonElementEntries = nonZeroEntries.filter(([stat]) => !elementStats.includes(stat));
  const elementEntries = nonZeroEntries.filter(([stat]) => elementStats.includes(stat));
  
  // Handle element stats: show highest, plus second if within 20
  const finalElementEntries = [];
  if (elementEntries.length > 0) {
    elementEntries.sort(([,a], [,b]) => b - a);
    finalElementEntries.push(elementEntries[0]); // Always show highest
    
    if (elementEntries.length > 1 && elementEntries[0][1] - elementEntries[1][1] <= 20) {
      finalElementEntries.push(elementEntries[1]); // Show second if within 20
    }
  }
  
  // Combine and format
  return [...nonElementEntries, ...finalElementEntries].map(([stat, value]) => ({
    name: stat as StatName,
    value: formatStatValue(stat as StatName, value as number),
    baseValue: baseValues[stat as StatName],
    update: updates[stat as StatName]
  }));
};

export const calculateElementStates = (sets: ReturnType<typeof calculateSets>, echoPanels: EchoPanelState[]) => {
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
  return { leftStates, rightStates };
};

interface BuildCardProps {
  characterState: {
    id: string | null;
    level: string;
    element?: string;
  };
  weaponState: WeaponState;
  watermark: {
    username: string;
    uid: string;
  };
  currentSequence: number;
  nodeStates: Record<string, Record<string, boolean>>;
  forteLevels: Record<string, number>;
  echoPanels: EchoPanelState[];
  isVisible: boolean;
  isEchoesVisible: boolean;
  onWatermarkChange: (watermark: { username: string; uid: string }) => void;
}

export const BuildCard: React.FC<BuildCardProps> = ({
  characterState,
  weaponState,
  watermark,
  currentSequence,
  nodeStates,
  forteLevels,
  echoPanels,
  isVisible,
  isEchoesVisible,
  onWatermarkChange
}) => {
  useStatHighlight();
  const [isTabVisible, setIsTabVisible] = useState(false);
  const [showRollQuality, setShowRollQuality] = useState(true);
  const [showCV, setShowCV] = useState(true);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customImage, setCustomImage] = useState<File | undefined>(undefined);
  const [savedCustomImage, setSavedCustomImage] = useState<File | undefined>(undefined);
  const [useAltSkin, setUseAltSkin] = useState(false);
  const [artSource, setArtSource] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'download' | 'open' | null>(null);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string>('');
  const tabRef = useRef<HTMLDivElement>(null);
  const { scaleAtk, scaleStat } = useLevelCurves();

  const selectedCharacter = useMemo(() => 
    characterState.id ? cachedCharacters?.find(c => c.id === characterState.id) : null,
    [characterState.id]
  );

  const selectedWeapon = useMemo(() => 
    getCachedWeapon(weaponState.id),
    [weaponState.id]
  );

  const weaponStats = useMemo(() => 
    calculateWeaponStats(selectedWeapon, weaponState, scaleAtk, scaleStat),
    [selectedWeapon, weaponState, scaleAtk, scaleStat]
  );

  const displayName = useMemo(() => 
    selectedCharacter ? 
      (selectedCharacter.name.startsWith('Rover') ? 
        `Rover${characterState.element || "Havoc"}` : 
        selectedCharacter.name) : 
      undefined,
    [selectedCharacter, characterState.element]
  );

  const elementValue = useMemo(() => 
    selectedCharacter?.name.startsWith('Rover') ? 
      characterState.element || "Havoc" : 
      selectedCharacter?.element,
    [selectedCharacter, characterState.element]
  );

  const statsInput = useMemo(() => ({
      character: selectedCharacter ?? null,
      characterState,
      weapon: selectedWeapon ?? null,
      weaponStats,
      echoPanels,
      nodeStates,
      sequence: currentSequence
  }), [selectedCharacter, characterState, selectedWeapon, weaponStats, echoPanels, nodeStates, currentSequence]);

  const { values, baseValues, updates, cv } = useStats(statsInput);

  const displayStats = useMemo(() => 
    calculateDisplayStats(values, baseValues, updates),
    [values, baseValues, updates]
  );

  const { elementSets, leftStates, rightStates } = useMemo(() => {
    const sets = calculateSets(echoPanels);
    const states = calculateElementStates(sets, echoPanels);
    return { elementSets: sets, ...states };
  }, [echoPanels]);

  const handleGenerate = useCallback(() => {
    if (!isTabVisible) setIsTabVisible(true);
  }, [isTabVisible]);

  const handleDownload = useCallback(() => {
    if (!tabRef.current || isProcessing) return;
    setIsEditMode(false);
    setIsProcessing(true);
    setProcessingType('download');

    // Wait for React to update the DOM after state change
    setTimeout(() => {
      // Re-check ref is still valid
      if (!tabRef.current) {
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }
      
      const now = new Date();
      const timestamp = now.toISOString().slice(0,19).replace(/[T:]/g, ' ');
      
      // Create clone AFTER React has updated the DOM
      const clone = tabRef.current.cloneNode(true) as HTMLElement;
      clone.id = 'build-tab';
      clone.classList.add('downloading');
      
      // Position without changing visual appearance
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.zIndex = '-1000';
      clone.style.pointerEvents = 'none';
      clone.style.display = 'flex';
      document.body.appendChild(clone);
      
      // Give time for all resources to load and render
      setTimeout(() => {
        domtoimage.toPng(clone, {cacheBust: true})
        .then((dataUrl: string) => {
          // Store the image for "Open Image" button
          setLastGeneratedImage(dataUrl);
          
          // Trigger download
          const link = document.createElement('a');
          link.download = `${timestamp}.png`;
          link.href = dataUrl;
          link.click();
          
          document.body.removeChild(clone);
          setIsProcessing(false);
          setProcessingType(null);
        })
        .catch((error: Error) => {
          console.error('Error capturing build-tab:', error);
          toast.error('Download failed. Please try again.');
          document.body.removeChild(clone);
          setIsProcessing(false);
          setProcessingType(null);
        });
      }, 250);
    }, 0); // Even a 0ms timeout pushes to next event loop iteration
  }, [isProcessing]);

  const handleOpenImage = useCallback(() => {
    if (lastGeneratedImage) {
      // Convert data URL to blob with explicit PNG MIME type
      fetch(lastGeneratedImage)
        .then(res => res.blob())
        .then(blob => new Blob([blob], { type: 'image/png' })) // Explicit MIME type
        .then(pngBlob => {
          const blobUrl = URL.createObjectURL(pngBlob);
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        });
      return;
    }
    
    // Generate fresh image with loading state
    if (!tabRef.current || isProcessing) return;
    setIsProcessing(true);
    setProcessingType('open');
    
    const clone = tabRef.current.cloneNode(true) as HTMLElement;
    clone.classList.add('downloading');
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.zIndex = '-1000';
    clone.style.pointerEvents = 'none';
    clone.style.display = 'flex';
    document.body.appendChild(clone);
    
    setTimeout(() => {
      domtoimage.toPng(clone, {cacheBust: true})
      .then(dataUrl => {
        setLastGeneratedImage(dataUrl);
        
        // Convert to PNG blob and open
        return fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => new Blob([blob], { type: 'image/png' })); // Add explicit MIME type for png
      })
      .then(pngBlob => {
        const blobUrl = URL.createObjectURL(pngBlob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        
        document.body.removeChild(clone);
        setIsProcessing(false);
        setProcessingType(null);
      })
      .catch(error => {
        console.error('Failed to generate image:', error);
        toast.error('Failed to open image');
        document.body.removeChild(clone);
        setIsProcessing(false);
        setProcessingType(null);
      });
    }, 250);
  }, [lastGeneratedImage, isProcessing]);

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

  const handleSaveConfirm = (name: string) => {
    const state: SavedState = {
      characterState,
      currentSequence,
      weaponState,
      nodeStates,
      forteLevels,
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

  if (!isVisible) return null;

  return (
    <div className="build-section">
      <div className="build-card">
        <Options watermark={watermark}
          showRollQuality={showRollQuality}
          showCV={showCV}
          useAltSkin={useAltSkin}
          artSource={artSource}
          onWatermarkChange={onWatermarkChange}
          onRollQualityChange={setShowRollQuality}
          onCVChange={setShowCV} 
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
            className={`${elementValue?.toLowerCase() || ''}`}
            style={{ 
              display: isTabVisible ? 'flex' : 'none',
              opacity: isTabVisible ? 1 : 0
            }}
          >
            {isTabVisible && selectedCharacter && elementValue && (
              <>
                <CharacterSection character={{...selectedCharacter, name: displayName || selectedCharacter.name}}
                  level={characterState.level}
                  currentSequence={currentSequence}
                  username={watermark.username}
                  isEditMode={isEditMode}
                  onImageChange={handleImageChange}
                  customImage={savedCustomImage}
                  useAltSkin={useAltSkin}
                  artSource={artSource}
                >
                <ForteSection character={{...selectedCharacter, name: displayName || selectedCharacter.name}}
                  elementValue={elementValue}
                  nodeStates={nodeStates}
                  forteLevels={forteLevels}
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
                <EchoDisplay isVisible={isTabVisible} echoPanels={echoPanels} showRollQuality={showRollQuality} showCV={showCV} leftStates={leftStates} rightStates={rightStates} sets={elementSets} cv={cv}/>
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
            <button 
              id="downloadButton" 
              className={`build-button ${isProcessing && processingType === 'download' ? 'downloading-btn' : ''}`} 
              onClick={handleDownload}
              disabled={isProcessing}
            >
              {isProcessing && processingType === 'download' ? (
                <span className="download-animation">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              ) : (
                <><Download size={20}/> Download</>
              )}
            </button>
            
            <button 
              className={`build-button ${isProcessing && processingType === 'open' ? 'downloading-btn' : ''}`}
              onClick={handleOpenImage}
              disabled={isProcessing}
            >
              {isProcessing && processingType === 'open' ? (
                <span className="download-animation">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              ) : (
                <><ExternalLink size={20}/> Open Image</>
              )}
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