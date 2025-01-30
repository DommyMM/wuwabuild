import React from 'react';
import { useSubstats } from '../../hooks/useSub';
import { EchoPanelState } from '../../types/echo';
import { getCachedEchoes } from '../../hooks/useEchoes';
import { getAssetPath } from '../../types/paths';
import { getStatIconName } from '../../types/stats';
import { calculateCV } from '../../hooks/useStats';
import { getEchoCVClass } from '../Build/Card';
import { sumEchoSubstats } from './types';

const BreakdownStat: React.FC<{ 
    name: string;
    value: number;
    isPercentage?: boolean;
}> = ({ name, value, isPercentage = true }) => {
    const elementType = name.split(' ')[0].toLowerCase();
    const hasElementalColor = ['fusion', 'aero', 'electro', 'spectro', 'havoc', 'glacio'].includes(elementType);
    
    return (
        <div className="breakdown-stat">
            <img src={`images/Stats/${getStatIconName(name)}.png`}
                alt={name}
                className={`lb-stat-icon ${hasElementalColor ? elementType : ''}`}
            />
            <span>{value.toFixed(1)}{isPercentage ? '%' : ''}</span>
        </div>
    );
};

const LBBreakdownRow: React.FC<{
    echoPanels: EchoPanelState[];
}> = ({ echoPanels }) => {
    const substats = sumEchoSubstats(echoPanels);
    const baseStats = ['HP', 'ATK', 'DEF'] as const;
    
    return (
        <div className="lb-breakdown">
            {Object.entries(substats).map(([name, value]) => (
                <BreakdownStat key={name} name={name} 
                    value={value} 
                    isPercentage={!baseStats.includes(name as typeof baseStats[number])}
                />
            ))}
        </div>
    );
};

const LBEchoRow: React.FC<{
    echoPanels: EchoPanelState[];
    substatsData: Record<string, number[]> | null;
}> = ({ echoPanels, substatsData }) => {
    const calculatePanelCV = (panel: EchoPanelState): number => {
        const baseCV = calculateCV([panel]);
        const mainStat = panel.stats.mainStat.type;
        return baseCV - (mainStat?.includes('Crit') ? 44 : 0);
    };
    
    const getQualityClass = (value: number | null, type: string | null): string => {
        if (!value || !type || !substatsData) return '';
        const allValues = substatsData[type];
        if (!allValues) return '';
        
        const quarterLength = Math.floor(allValues.length / 4);
        const valueIndex = allValues.findIndex((v: number) => v === value);
        if (valueIndex === -1) return '';
        
        if (valueIndex < quarterLength) return 'two-star';
        if (valueIndex < quarterLength * 2) return 'three-star';
        if (valueIndex < quarterLength * 3) return 'four-star';
        return 'five-star';
    };

    return (
        <div className="lb-echoes">
            {echoPanels.map((panel, i) => {
                const echo = getCachedEchoes(panel.id);
                if (!echo) return null;
                const panelCV = calculatePanelCV(panel);
                return (
                    <div key={i} className="lb-echo-slot">
                        <div className={`lb-echo-cv ${getEchoCVClass(panelCV)}`}>
                            {panelCV.toFixed(1)}
                        </div>
                        <div className="lb-echo-info">
                            <img src={getAssetPath('echoes', echo).cdn}
                                alt={echo.name}
                                className="lb-echo-icon"
                            />
                            <div className="lb-echo-mainstat">
                                <img src={`images/Stats/${getStatIconName(panel.stats.mainStat.type || '')}.png`}
                                    alt={panel.stats.mainStat.type || ''}
                                    className="lb-stat-icon"
                                />
                                <div>{panel.stats.mainStat.value?.toFixed(1)}%</div>
                            </div>
                        </div>
                        <div className="lb-echo-stats">
                            {panel.stats.subStats.map((sub, index) => {
                                const quality = getQualityClass(sub.value, sub.type);
                                return (
                                    <div key={index} className="lb-echo-substat">
                                        <img src={`images/Stats/${getStatIconName(sub.type || '')}.png`}
                                            alt={sub.type || ''}
                                            className="lb-stat-icon"
                                        />
                                        <div className={`lb-echo-substat-value ${quality}`}>
                                            {sub.type && sub.value ? 
                                                `${sub.value}${['ATK', 'HP', 'DEF'].includes(sub.type) ? '' : '%'}` 
                                                : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const LBExpanded: React.FC<{
    echoPanels: EchoPanelState[];
}> = ({ echoPanels }) => {
    const { substatsData } = useSubstats();
    
    return (
        <div className="lb-expanded-content">
            <LBEchoRow echoPanels={echoPanels} substatsData={substatsData} />
            <LBBreakdownRow echoPanels={echoPanels} />
        </div>
    );
};