import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useSubstats } from '@/hooks/useSub';
import { EchoPanelState } from '@/types/echo';
import { getCachedEchoes } from '@/hooks/useEchoes';
import { getAssetPath } from '@/types/paths';
import { getStatPaths } from '@/types/stats';
import { calculateCV } from '@/hooks/useStats';
import { getEchoCVClass } from '@/components/Save/Card';
import { sumEchoSubstats } from './types';
import { Character } from '@/types/character';
import '@/styles/BuildExpand.css';

const formatValue = (value: number, isPercentage: boolean = true): string => {
    const fixed = value.toFixed(1);
    return `${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed}${isPercentage ? '%' : ''}`;
};

const BreakdownStat: React.FC<{ 
    name: string;
    value: number;
    isPercentage?: boolean;
    isSelected?: boolean;
    isTotal?: boolean;
    onToggle?: () => void;
}> = ({ name, value, isPercentage = true, isSelected = false, isTotal = false, onToggle }) => {
    const paths = getStatPaths(name);
    
    return (
        <div className={`breakdown-stat ${isSelected ? 'selected' : ''} ${isTotal ? 'total' : ''}`} onClick={onToggle}>
            <Image src={paths.cdn} alt={name} className="build-stat-icon" width={96} height={96} />
            <span>{formatValue(value, isPercentage)}</span>
        </div>
    );
};

export const BuildBreakdownRow: React.FC<{
    echoPanels: EchoPanelState[];
    selectedStats: Set<string>;
    onToggleStat: (statName: string) => void;
}> = ({ echoPanels, selectedStats, onToggleStat }) => {
    const substats = sumEchoSubstats(echoPanels);
    const baseStats = ['HP', 'ATK', 'DEF'] as const;
    
    return (
        <div className="build-breakdown">
            {Object.entries(substats).map(([name, value]) => (
                <BreakdownStat 
                    key={name} 
                    name={name} 
                    value={value} 
                    isPercentage={!baseStats.includes(name as typeof baseStats[number])}
                    isSelected={selectedStats.has(name)}
                    onToggle={() => onToggleStat(name)}
                />
            ))}
        </div>
    );
};

const EchoMainStat: React.FC<{
    type: string | null;
    value: number | null;
}> = ({ type, value }) => {
    if (!type || !value) return null;
    return (
        <div className="build-echo-mainstat">
            <Image src={getStatPaths(type).cdn}
                alt={type}
                className={`build-stat-icon ${type.split(' ')[0].toLowerCase()}`}
                width={96}
                height={96}
            />
            <div>{value.toFixed(1)}%</div>
        </div>
    );
};

const EchoSubstat: React.FC<{
    sub: { type: string | null; value: number | null };
    quality: string;
    isSelected: boolean;
}> = ({ sub, quality, isSelected }) => (
    <div className={`build-echo-substat ${isSelected ? 'selected' : ''}`}>
        <Image src={getStatPaths(sub.type || '').cdn}
            alt={sub.type || ''}
            className="build-stat-icon"
            width={96}
            height={96}
        />
        <div className={`build-echo-substat-value ${quality}`}>
            {sub.type && sub.value ? 
                `${sub.value}${['ATK', 'HP', 'DEF'].includes(sub.type) ? '' : '%'}` 
                : '-'}
        </div>
    </div>
);

interface StatDisplayProps {
    cv: number;
    rv: number;
    selectedCount: number;
}

const getEchoRVClass = (rv: number, selectedCount: number): string => {
    if (selectedCount === 0) return 'cv-value low';
    const maxPossible = selectedCount * 100;
    const percentage = (rv / maxPossible) * 100;
    if (percentage >= 90) return 'cv-value goat';
    if (percentage >= 80) return 'cv-value excellent';
    if (percentage >= 70) return 'cv-value high';
    if (percentage >= 60) return 'cv-value good';
    return 'cv-value decent';
};

const EchoStatDisplay: React.FC<StatDisplayProps> = ({ cv, rv, selectedCount }) => {
    const [showCV, setShowCV] = useState(true);
    
    return (
        <div 
            className={`build-echo-cv ${showCV ? getEchoCVClass(cv) : getEchoRVClass(rv, selectedCount)}`}
            onClick={() => setShowCV(!showCV)}
        >
            {showCV ? 
                `${cv.toFixed(1)} CV` : 
                selectedCount === 0 ? 'Select Stats' : `${rv.toFixed(1)}% RV`}
        </div>
    );
};

const calculatePanelCV = (panel: EchoPanelState): number => {
    const baseCV = calculateCV([panel]);
    const mainStat = panel.stats.mainStat.type;
    return baseCV - (mainStat?.includes('Crit') ? 44 : 0);
};

const mapStatName = (type: string): string => {
    // Remove 'DMG Bonus' suffix and map to shorter names
    const dmgBonusMap: Record<string, string> = {
        'Basic Attack DMG Bonus': 'Basic Attack',
        'Heavy Attack DMG Bonus': 'Heavy Attack',
        'Resonance Skill DMG Bonus': 'Skill',
        'Resonance Liberation DMG Bonus': 'Liberation'
    };
    return dmgBonusMap[type] || type;
};

const getQualityClass = (
    value: number | null, 
    type: string | null, 
    substatsData: Record<string, number[]> | null
): string => {
    if (!value || !type || !substatsData) return '';
    
    // Map the stat name to match substatsData keys
    const mappedType = mapStatName(type);
    const allValues = substatsData[mappedType];
    
    if (!allValues) return '';
    
    const quarterLength = Math.floor(allValues.length / 4);
    const valueIndex = allValues.findIndex((v: number) => v === value);
    if (valueIndex === -1) return '';
    
    if (valueIndex < quarterLength) return 'two-star';
    if (valueIndex < quarterLength * 2) return 'three-star';
    if (valueIndex < quarterLength * 3) return 'four-star';
    return 'five-star';
};

export const calculateSelectedRV = (
    panel: EchoPanelState, 
    substatsData: Record<string, number[]> | null,
    selectedStats: Set<string>
): number => {
    if (!substatsData || selectedStats.size === 0) return 0;
    let totalPercentage = 0;
    let statCount = 0;
    
    panel.stats.subStats.forEach(sub => {
        if (sub.type && sub.value && selectedStats.has(sub.type) && substatsData[sub.type]) {
            statCount++;
            const maxRollIndex = substatsData[sub.type].length - 1;
            const maxPossible = substatsData[sub.type][maxRollIndex];
            if (maxPossible > 0) {
                totalPercentage += (sub.value / maxPossible) * 100;
            }
        }
    });
    
    return statCount > 0 ? totalPercentage : 0;
};

export const BuildEchoRow: React.FC<{
    echoPanels: EchoPanelState[];
    substatsData: Record<string, number[]> | null;
    selectedStats: Set<string>;
}> = ({ echoPanels, substatsData, selectedStats }) => (
    <div className="build-echoes">
        {echoPanels.map((panel, i) => {
            const echo = getCachedEchoes(panel.id);
            if (!echo) return null;
            const panelCV = calculatePanelCV(panel);
            const panelRV = calculateSelectedRV(panel, substatsData, selectedStats);
            
            const isSingleElement = echo.elements.length === 1;
            const element = isSingleElement ? echo.elements[0] : panel.selectedElement;
            const setClass = element ? `set-${element.toLowerCase()}` : 'default';
            
            return (
                <div key={i} className={`build-echo-slot ${setClass}`}>
                    <EchoStatDisplay cv={panelCV} rv={panelRV} selectedCount={selectedStats.size} />
                    <div className="build-echo-info">
                        {element && (
                            <Image src={getAssetPath('sets', element).cdn}
                                alt={`${element} Set Icon`}
                                className="build-set-icon"
                                width={76}
                                height={76}
                            />
                        )}
                        <Image src={getAssetPath('echoes', echo).cdn}
                            alt={echo.name}
                            className="build-echo-icon"
                            width={256}
                            height={256}
                        />
                        <EchoMainStat type={panel.stats.mainStat.type} value={panel.stats.mainStat.value} />
                    </div>
                    <div className="build-echo-stats">
                        {panel.stats.subStats.map((sub, index) => (
                            <EchoSubstat key={index}
                                sub={sub}
                                quality={getQualityClass(sub.value, sub.type, substatsData)}
                                isSelected={sub.type ? selectedStats.has(sub.type) : false}
                            />
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);

export const TotalBreakdown: React.FC<{
    echoPanels: EchoPanelState[];
    selectedStats: Set<string>;
}> = ({ echoPanels, selectedStats }) => {
    const { substatsData } = useSubstats();
    
    const { rollValue } = useMemo(() => {
        let totalPercentage = 0;
        let totalStatCount = 0;
        
        selectedStats.forEach(statName => {
            const statTotal = echoPanels.reduce((sum, panel) => {
                const statSub = panel.stats.subStats.find(sub => sub.type === statName);
                return sum + (statSub?.value || 0);
            }, 0);
            const statCount = echoPanels.reduce((sum, panel) => {
                return sum + (panel.stats.subStats.some(sub => sub.type === statName) ? 1 : 0);
            }, 0);
            if (statCount > 0 && substatsData?.[statName]) {
                const maxRollIndex = substatsData[statName].length - 1;
                const maxPossible = substatsData[statName][maxRollIndex] * statCount;
                totalPercentage += (statTotal / maxPossible) * 100 * statCount;
                totalStatCount += statCount;
            }
        });
        
        return {
            rollValue: totalStatCount > 0 ? Math.round(totalPercentage / totalStatCount) : 0
        };
    }, [echoPanels, selectedStats, substatsData]);
    if (selectedStats.size === 0) return null;
    
    return (
        <div className="breakdown-stat total" title="Average Roll Value of Selected Stats">{rollValue}% RV </div>
    );
};

export const getCharacterDefaultStats = (character: Character | null): Set<string> => {
    if (!character) return new Set();
    
    const defaultStats = new Set(['Energy Regen']);
    if (character.Bonus1 !== 'Healing') {
        defaultStats.add('Crit Rate');
        defaultStats.add('Crit DMG');
    }
    if (character.Bonus1) defaultStats.add(character.Bonus1);
    if (character.Bonus2) {
        defaultStats.add(character.Bonus2);
        if (['ATK', 'HP', 'DEF'].includes(character.Bonus2)) {
            defaultStats.add(`${character.Bonus2}%`);
        }
    }
    
    return defaultStats;
};

export const BuildExpanded: React.FC<{
    echoPanels: EchoPanelState[];
    character: Character | null;
}> = ({ echoPanels, character }) => {
    const { substatsData } = useSubstats();
    const [selectedStats, setSelectedStats] = useState<Set<string>>(() => 
        getCharacterDefaultStats(character)
    );
    
    return (
        <>
            <BuildEchoRow echoPanels={echoPanels} substatsData={substatsData} selectedStats={selectedStats} />
            <div className="build-breakdown-container">
                <BuildBreakdownRow 
                    echoPanels={echoPanels} 
                    selectedStats={selectedStats}
                    onToggleStat={(statName) => {
                        setSelectedStats(prev => {
                            const next = new Set(prev);
                            if (next.has(statName)) {
                                next.delete(statName);
                            } else {
                                next.add(statName);
                            }
                            return next;
                        });
                    }}
                />
                <TotalBreakdown echoPanels={echoPanels} selectedStats={selectedStats} />
            </div>
        </>
    );
};