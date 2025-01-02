import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import domtoimage from 'dom-to-image';
import { Options } from './Build/Options';
import { CharacterSection } from './Build/CharacterSection';
import { WeaponSection } from './Build/WeaponSection';
import { ForteSection } from './Build/ForteSection';
import { EchoDisplay } from './Build/EchoDisplay';
import { StatSection } from './Build/StatSection';
import { Character } from '../types/character';
import { Weapon } from '../types/weapon';
import { EchoPanelState, ElementType } from '../types/echo';
import { StatName } from '../types/stats';
import { useStats } from '../hooks/useStats';
import { useLevelCurves } from '../hooks/useLevelCurves';
import { useStatHighlight } from '../hooks/useHighlight';
import '../styles/Build.css';

interface BuildCardProps {
  isVisible: boolean;
  isEchoesVisible: boolean;
  selectedCharacter: Character | null;
  displayName: string | undefined;
  characterLevel: string;
  isSpectro: boolean;
  elementValue: string | undefined;
  currentSequence: number;
  selectedWeapon: Weapon | null;
  weaponConfig: {
    level: number;
    rank: number;
  };
  nodeStates: Record<string, Record<string, boolean>>;
  levels: Record<string, number>;
  echoPanels: EchoPanelState[];
  watermark: {
    username: string;
    uid: string;
  };
  onWatermarkChange: (watermark: { username: string; uid: string }) => void;
}

export const BuildCard: React.FC<BuildCardProps> = ({
  isVisible,
  isEchoesVisible,
  selectedCharacter,
  displayName,
  characterLevel,
  isSpectro,
  elementValue,
  currentSequence,
  selectedWeapon,
  weaponConfig,
  nodeStates,
  levels,
  echoPanels,
  watermark,
  onWatermarkChange
}) => {
  useStatHighlight();
  const [isTabVisible, setIsTabVisible] = useState(false);
  const [showRollQuality, setShowRollQuality] = useState(true);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customImage, setCustomImage] = useState<File | undefined>(undefined);
  const [savedCustomImage, setSavedCustomImage] = useState<File | undefined>(undefined);
  const tabRef = useRef<HTMLDivElement>(null);

  const { scaleAtk, scaleStat } = useLevelCurves();

  const weaponConfigMemo = useMemo(() => ({
    level: weaponConfig.level,
    rank: weaponConfig.rank
  }), [weaponConfig.level, weaponConfig.rank]);

  const weaponStats = useMemo(() => 
    selectedWeapon ? {
      scaledAtk: scaleAtk(selectedWeapon.ATK, weaponConfigMemo.level),
      scaledMainStat: scaleStat(selectedWeapon.base_main, weaponConfigMemo.level),
      scaledPassive: selectedWeapon.passive_stat 
        ? Number((selectedWeapon.passive_stat * (1 + ((weaponConfigMemo.rank - 1) * 0.25))).toFixed(1)) 
        : undefined,
      scaledPassive2: selectedWeapon.passive_stat2
        ? Number((selectedWeapon.passive_stat2 * (1 + ((weaponConfigMemo.rank - 1) * 0.25))).toFixed(1)) 
        : undefined
    } : undefined,
    [selectedWeapon, weaponConfigMemo, scaleAtk, scaleStat]
  );

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
      if (!panel.echo) return counts;
      const element = panel.selectedElement || panel.echo.elements[0];
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
        const panelElement = echoPanels[i].selectedElement || echoPanels[i].echo?.elements[0];
        if (panelElement === element) {
          states[i] = 'start';
          startIndex = i;
          break;
        }
      }
      if (startIndex !== -1) {
        for (let i = echoPanels.length - 1; i > startIndex; i--) {
          const panelElement = echoPanels[i].selectedElement || echoPanels[i].echo?.elements[0];
          if (panelElement === element) {
            states[i] = 'end';
            for (let j = startIndex + 1; j < i; j++) {
              const middleElement = echoPanels[j].selectedElement || echoPanels[j].echo?.elements[0];
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
    domtoimage.toPng(tabRef.current)
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
    return panels.filter(panel => panel.echo?.cost === 4).length === 2;
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
          onWatermarkChange={onWatermarkChange}
          onRollQualityChange={setShowRollQuality}
          className={hasBeenVisible ? 'visible' : 'hidden'}
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
                >
                <ForteSection character={{...selectedCharacter, name: displayName || selectedCharacter.name}}
                  elementValue={elementValue}
                  nodeStates={nodeStates}
                  levels={levels}
                />
                {selectedWeapon && weaponStats && (
                  <WeaponSection weapon={selectedWeapon}
                    level={weaponConfig.level}
                    rank={weaponConfig.rank}
                    scaledStats={weaponStats}
                    characterElement={elementValue} 
                  />
                )}
                </CharacterSection>
                <StatSection isVisible={isTabVisible} stats={displayStats}/>
                <EchoDisplay isVisible={isTabVisible} echoPanels={echoPanels} showRollQuality={showRollQuality} leftStates={leftStates} rightStates={rightStates} sets={elementSets} cv={cv} getCVClass={getCVClass}/>
                <div className="watermark-container">
                  <div className="watermark-username">{watermark.username}</div>
                  <div className="watermark-uid">{watermark.uid}</div>
                </div>
                <div className="site-watermark">wuwabuilds.moe</div>
              </>
            )}
          </div>
        </div>
        {isTabVisible && (
          <div className="button-group">
            <button id="editButton" className="build-button" onClick={handleEditToggle}>
            {isEditMode ? 'Save' : 'Edit'}
            </button>
            <button id="downloadButton" className="build-button" onClick={handleDownload}>
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};