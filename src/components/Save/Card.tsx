import { calculateCV as calculateTotalCV, sumMainStats, sumSubStats, getDisplayName, getStatsData } from '../../hooks/useStats';
import { EchoPanelState, ELEMENT_SETS } from '../../types/echo';
import { getCachedEchoes } from '../../hooks/useEchoes';
import { StatName, getStatPaths } from '../../types/stats';
import React, { useState, useEffect } from 'react';
import { getAssetPath } from '../../types/paths';
import { useSubstats } from '../../hooks/useSub';
import '../../styles/PreviewEcho.css';

export interface ExpandedStyle {
    top: number;
    left: number;
    width: number;
    height: number;
    '--transform-origin'?: string;
}

export const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getSetInfo = (echoPanels: EchoPanelState[]) => {
    const setCounts = echoPanels.reduce((counts, panel) => {
        const echo = getCachedEchoes(panel.id);
        if (!echo) return counts;
        const element = panel.selectedElement || echo.elements[0];
        counts[element] = (counts[element] || 0) + 1;
        return counts;
    }, {} as Record<string, number>);

    return Object.entries(setCounts)
        .filter(([_, count]) => count >= 2)
        .map(([element, count], index, array) => (
            <React.Fragment key={element}>
                <div className={`save-sets ${element.toLowerCase()}`}>
                    {ELEMENT_SETS[element as keyof typeof ELEMENT_SETS]} ({count})
                </div>
                {index < array.length - 1 && " • "}
            </React.Fragment>
        ));
};

export const getCVClass = (cv: number): string => {
    if (cv >= 230) return 'cv-value goat';
    if (cv >= 220) return 'cv-value excellent';
    if (cv >= 205) return 'cv-value high';
    if (cv >= 195) return 'cv-value good';
    if (cv >= 175) return 'cv-value decent';
    return 'cv-value low';
};

export const getEchoCVClass = (cv: number): string => {
    if (cv < 25) return 'cv-value low';         // Not double crit
    if (cv >= 38) return 'cv-value goat';       // Top 10% (6-7 of 64)
    if (cv >= 35) return 'cv-value excellent';  // Top 20% (13 of 64)
    if (cv >= 32) return 'cv-value high';       // Top 35% (22 of 64)
    if (cv >= 29) return 'cv-value good';       // Top 50% (32 of 64)
    return 'cv-value decent';                   // Double crit but lower half
};

export const PreviewEcho: React.FC<{ panel: EchoPanelState }> = ({ panel }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { substatsData } = useSubstats();
    const echo = getCachedEchoes(panel.id);
    
    const getQualityClass = (value: number, type: string): string => {
        if (!substatsData || !substatsData[type]) return '';
        const allValues = substatsData[type];
        const quarterLength = Math.floor(allValues.length / 4);
        const valueIndex = allValues.findIndex((v: number) => v === value);
        if (valueIndex === -1) return '';
        
        if (valueIndex < quarterLength) return 'two';
        if (valueIndex < quarterLength * 2) return 'three';
        if (valueIndex < quarterLength * 3) return 'four';
        return 'five';
    };

    const calculatePanelCV = () => {
        const baseCV = calculateTotalCV([panel]);
        const mainStat = panel.stats.mainStat.type;
        return (baseCV - (mainStat?.includes('Crit') ? 44 : 0)).toFixed(1);
    };
    
    if (!echo) return null;
    return (
        <div className="preview-echo">
            <div className="echo-circle" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <img  src={getAssetPath('echoes', echo, false, panel.phantom).cdn}
                    alt={echo.name}
                    className={`echo-icon ${panel.selectedElement?.toLowerCase() || ''}`}
                />
                <div className={`echo-details ${isHovered ? 'visible' : ''}`}>
                    <div className="echo-header">
                        <h4>{echo.name}</h4>
                        <div className="echo-intro">
                            <span className="echo-level">Lv. {panel.level}</span>
                            <span className={getEchoCVClass(Number(calculatePanelCV()))}> {calculatePanelCV()} CV</span>
                        </div>
                    </div>
                    {(panel.stats.mainStat.type && panel.stats.mainStat.value) && (
                        <div className="main-stat-row">
                            <div className="stat-name">
                                <img src={getStatPaths(panel.stats.mainStat.type as StatName).cdn}
                                    alt={String(panel.stats.mainStat.type)}
                                    className="save-stat-icon"
                                />
                                <span>{getDisplayName(panel.stats.mainStat.type as StatName).replace('%', '')}</span>
                            </div>
                            <span>{panel.stats.mainStat.value}%</span>
                        </div>
                    )}
                    <div className="echo-stats">
                        {panel.stats.subStats
                            .filter((stat): stat is { type: StatName; value: number } => 
                                stat.type !== null).map((stat, index) => {
                                const flatStats = ['HP', 'ATK', 'DEF'];
                                const isPercentage = !flatStats.includes(stat.type);
                                
                                return (
                                    <div key={index} className="stat-row">
                                        <div className="stat-name">
                                            <img src={getStatPaths(stat.type).cdn} 
                                                alt={String(stat.type)} 
                                                className="save-stat-icon"
                                            />
                                            <span>{getDisplayName(stat.type).replace(' DMG Bonus', '').replace('%', '')}</span>
                                        </div>
                                        <span className={`sub ${getQualityClass(stat.value, stat.type)}`}> {stat.value}{isPercentage ? '%' : ''} </span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
            <div className="echo-preview">
                <span className="main-stat">{panel.stats.mainStat.type}</span>
                <span className={`echo-cv ${getEchoCVClass(Number(calculatePanelCV()))}`}> CV: {calculatePanelCV()}</span>
            </div>
        </div>
    );
};

interface StatsMenuProps {
    weapon: any;
    echoPanels: EchoPanelState[];
}

interface StatValues {
    flat: number;
    percent: number;
}

export const StatsMenu: React.FC<StatsMenuProps> = ({ weapon, echoPanels }) => {
    const [loading, setLoading] = useState(true);
    const [baseStats, setBaseStats] = useState<Map<StatName, StatValues>>(new Map());
    const [otherStats, setOtherStats] = useState<Map<StatName, number>>(new Map());
    const [statsOrder, setStatsOrder] = useState<StatName[]>([]);
    
    useEffect(() => {
        const initStats = async () => {
            const data = await getStatsData();
            const baseStatTracker = new Map<StatName, StatValues>();
            const otherStatTracker = new Map<StatName, number>();
            
            echoPanels.forEach(panel => {
                if (panel.stats?.mainStat?.type) {
                    const type = panel.stats.mainStat.type as StatName;
                    const value = sumMainStats(type, [panel]);
                    
                    if (['HP', 'ATK', 'DEF'].includes(type) || type.endsWith('%')) {
                        const baseType = type.endsWith('%') ? type.replace('%', '') as StatName : type;
                        const current = baseStatTracker.get(baseType) || { flat: 0, percent: 0 };
                        if (type.endsWith('%')) {
                            baseStatTracker.set(baseType, { ...current, percent: current.percent + value });
                        } else {
                            baseStatTracker.set(baseType, { ...current, flat: current.flat + value });
                        }
                    } else {
                        otherStatTracker.set(type, (otherStatTracker.get(type) || 0) + value);
                    }
                }
                panel.stats?.subStats.forEach(subStat => {
                    if (!subStat.type) return;
                    const type = subStat.type as StatName;
                    const value = sumSubStats(type, [panel]);
                    
                    if (['HP', 'ATK', 'DEF'].includes(type) || type.endsWith('%')) {
                        const baseType = type.endsWith('%') ? type.replace('%', '') as StatName : type;
                        const current = baseStatTracker.get(baseType) || { flat: 0, percent: 0 };
                        if (type.endsWith('%')) {
                            baseStatTracker.set(baseType, { ...current, percent: current.percent + value });
                        } else {
                            baseStatTracker.set(baseType, { ...current, flat: current.flat + value });
                        }
                    } else {
                        otherStatTracker.set(type, (otherStatTracker.get(type) || 0) + value);
                    }
                });
            });
            setBaseStats(baseStatTracker);
            setOtherStats(otherStatTracker);
            setStatsOrder(data.stats);
            setLoading(false);
        };
        initStats();
    }, [echoPanels]);
    if (loading) return null;
    
    return (
        <div className="stats-menu">
            {statsOrder
                .filter(type => ['HP', 'ATK', 'DEF'].includes(type))
                .map(type => {
                    const values = baseStats.get(type);
                    if (!values || (values.flat === 0 && values.percent === 0)) return null;
                    const displayName = getDisplayName(type)
                    return (
                        <div key={type} className="stat-row">
                            <span className="stat-type">{displayName}</span>
                            <div className="preview-values">
                                {values.flat > 0 && (
                                    <span className="preview-value flat">
                                        {Math.round(values.flat)}
                                    </span>
                                )}
                                {values.percent > 0 && (
                                    <span className="preview-value percent">
                                        {values.percent.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            {statsOrder
                .filter(type => !['HP', 'ATK', 'DEF'].includes(type))
                .map(type => {
                    const value = otherStats.get(type);
                    if (!value || value === 0) return null;
                    const displayName = getDisplayName(type).replace(/(DMG\s)?Bonus/, '')
                    return (
                        <div key={type} className="stat-row">
                            <span className="stat-type">{displayName}</span>
                            <span className="preview-value percent">
                                {value.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
        </div>
    );
};