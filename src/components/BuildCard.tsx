import React, { useState, useRef, useEffect, useMemo } from 'react';
import domtoimage from 'dom-to-image';
import { Options } from './Build/Options';
import { CharacterSection } from './Build/CharacterSection';
import { WeaponSection } from './Build/WeaponSection';
import { ForteSection } from './Build/ForteSection';
import { EchoDisplay } from './Build/EchoDisplay';
import { StatSection } from './Build/StatSection';
import { Character } from '../types/character';
import { Weapon, ScaledWeaponStats } from '../types/weapon';
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
}

interface WatermarkData {
  username: string;
  uid: string;
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
  echoPanels
}) => {
  useStatHighlight();
  const [isTabVisible, setIsTabVisible] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkData>({
    username: '',
    uid: ''
  });
  const [showRollQuality, setShowRollQuality] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const { scaleAtk, scaleStat } = useLevelCurves();

  const weaponStats: ScaledWeaponStats | undefined = useMemo(() => 
    selectedWeapon ? {
      scaledAtk: scaleAtk(selectedWeapon.ATK, weaponConfig.level),
      scaledMainStat: scaleStat(selectedWeapon.base_main, weaponConfig.level),
      scaledPassive: selectedWeapon.passive_stat 
        ? Math.floor(selectedWeapon.passive_stat * (1 + ((weaponConfig.rank - 1) * 0.25)))
        : undefined,
      scaledPassive2: selectedWeapon.passive_stat2
        ? Math.floor(selectedWeapon.passive_stat2 * (1 + ((weaponConfig.rank - 1) * 0.25)))
        : undefined
    } : undefined,
    [selectedWeapon, weaponConfig.level, weaponConfig.rank, scaleAtk, scaleStat]
  );

  const { values, baseValues, updates } = useStats({
    character: selectedCharacter,
    level: characterLevel,
    weapon: selectedWeapon,
    weaponStats,
    echoPanels,
    nodeStates,
    isSpectro
  });

  const formatStatValue = (stat: StatName, value: number): string => {
    const flatStats = ['HP', 'ATK', 'DEF'];
    return flatStats.includes(stat) 
      ? Math.round(value).toString() 
      : `${value.toFixed(1)}%`;
  };

  const displayStats = Object.entries(values)
    .filter(([_, value]) => value !== 0)
    .map(([stat, value]) => ({
      name: stat as StatName,
      value: formatStatValue(stat as StatName, value as number),
      baseValue: baseValues[stat as StatName],
      update: updates[stat as StatName]
    }));

  useEffect(() => {
    if (isTabVisible && tabRef.current) {
      setTimeout(() => {
        tabRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [isTabVisible]);

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setWatermark(prev => ({
      ...prev,
      [id.replace('build-', '')]: value
    }));
  };

  const handleGenerate = () => {
    setIsTabVisible(true);
    setTimeout(() => {
      tabRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const handleDownload = () => {
    if (!tabRef.current) return;

    const now = new Date();
    const timestamp = now.toISOString().slice(0,19).replace(/[T:]/g, ' ');
    
    domtoimage.toPng(tabRef.current)
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = `${timestamp}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error: Error) => {
        console.error('Error capturing build-tab:', error);
      });
  };

  const calculateSets = (): Array<{ element: ElementType; count: number }> => {
    const elementCounts: Record<ElementType, number> = {} as Record<ElementType, number>;
    const usedEchoes = new Set();
  
    echoPanels.forEach(panel => {
      if (panel.echo && !usedEchoes.has(panel.echo.name)) {
        const element = panel.echo.elements.length === 1 ? 
          panel.echo.elements[0] : 
          panel.selectedElement;
        
        if (element) {
          elementCounts[element] = (elementCounts[element] || 0) + 1;
          usedEchoes.add(panel.echo.name);
        }
      }
    });
  
    return Object.entries(elementCounts)
      .filter(([_, count]) => count >= 2)
      .map(([element, count]) => ({
        element: element as ElementType,
        count
      }))
      .sort((a, b) => {
        const aIsFiveSet = a.count >= 5;
        const bIsFiveSet = b.count >= 5;
        if (aIsFiveSet !== bIsFiveSet) return bIsFiveSet ? 1 : -1;
        return b.count - a.count;
      });
  };

  if (!isVisible) return null;

  return (
    <div className="build-card">
      <Options
        watermark={watermark}
        showRollQuality={showRollQuality}
        onWatermarkChange={handleWatermarkChange}
        onRollQualityChange={setShowRollQuality}
        className={isEchoesVisible ? 'visible' : 'hidden'}
      />

      <button
        id="generateDownload"
        className="build-button"
        onClick={handleGenerate}
        style={{ 
          display: isEchoesVisible ? 'block' : 'none'
        }}
      >
        Generate
      </button>

      <div
        ref={tabRef}
        id="build-tab"
        className="tab"
        style={{ 
          display: isTabVisible ? 'flex' : 'none',
          opacity: isTabVisible ? 1 : 0
        }}
      >
        {isTabVisible && selectedCharacter && elementValue && (
          <>
            <CharacterSection 
              character={selectedCharacter} 
              level={characterLevel}
              isSpectro={isSpectro}
              currentSequence={currentSequence}
              username={watermark.username}
            >
              <ForteSection
                character={{
                  ...selectedCharacter,
                  name: displayName || selectedCharacter.name
                }}
                elementValue={elementValue}
                nodeStates={nodeStates}
                levels={levels}
              />
            </CharacterSection>
            {selectedWeapon && weaponStats && (
              <WeaponSection
                weapon={selectedWeapon}
                level={weaponConfig.level}
                rank={weaponConfig.rank}
                scaledStats={weaponStats}
                characterElement={elementValue} 
              />
            )}
            <StatSection 
              isVisible={isTabVisible}
              stats={displayStats}
              sets={calculateSets()}
            />
            <EchoDisplay 
              isVisible={isTabVisible}
              echoPanels={echoPanels}
              showRollQuality={showRollQuality}
            />
            <div className="watermark-container">
              <div className="watermark-username">{watermark.username}</div>
              <div className="watermark-uid">{watermark.uid}</div>
            </div>
          </>
        )}
      </div>

      {isTabVisible && (
        <button
          id="downloadButton"
          className="build-button"
          onClick={handleDownload}
        >
          Download
        </button>
      )}
    </div>
  );
};