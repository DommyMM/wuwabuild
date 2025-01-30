import React from 'react';
import { useState, useEffect } from 'react';
import { LB_URL } from '../components/Import/Results';
import { decompressData } from '../components/Build/Backup';
import { SavedState } from '../types/SavedState';
import { Pagination } from '../components/Build/Pagination';
import { getCachedWeapon } from '../hooks/useWeapons';
import { cachedCharacters } from '../hooks/useCharacters';
import { getCachedEchoes } from '../hooks/useEchoes';
import { getAssetPath } from '../types/paths';
import { Character } from '../types/character';
import { getCVClass, getEchoCVClass } from '../components/Build/Card';
import { EchoPanelState } from '../types/echo';
import { CompressedStats, decompressStats, calculateCV } from '../hooks/useStats';
import { useSubstats } from '../hooks/useSub';
import { getStatIconName } from '../types/stats';
import '../styles/Leaderboard.css';

interface CompressedEntry {
    buildState: {
        c: { i: string; l: string; e: string; };
        w: { i: string; l: number; r: number; };
        e: any[];
        q: number;
        n: any;
        f: any;
        m: any;
    };
    stats: CompressedStats;
    cv: number;
    timestamp: string;
}

interface DecompressedEntry {
    buildState: SavedState;
    stats: CompressedStats;
    cv: number;
    timestamp: string;
}

const getSetCounts = (echoPanels: EchoPanelState[]) => {
    return echoPanels.reduce((counts, panel) => {
        const echo = getCachedEchoes(panel.id);
        if (!echo) return counts;
        const element = panel.selectedElement || echo.elements[0];
        counts[element] = (counts[element] || 0) + 1;
        return counts;
    }, {} as Record<string, number>);
};

const getHighestDmg = (values: Record<string, number>): [string, number] => {
    return Object.entries(values)
        .filter(([key]) => key.endsWith('DMG') && !key.includes('Crit') && !key.includes('Bonus'))
        .reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
};

const getHighestDmgBonus = (values: Record<string, number>): [string, number] => {
    return Object.entries(values)
        .filter(([key]) => key.endsWith('DMG Bonus'))
        .reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
};

const LbOwnerSection: React.FC<{
    username?: string;
    uid?: string;
}> = ({ username, uid }) => (
    <div className="lb-owner">
        <div className="owner-name">{username || 'Anonymous'}</div>
        <div className="owner-uid">UID: {uid || '000000000'}</div>
    </div>
);

const LbCharacterSection: React.FC<{
    character: Character | null | undefined;
    elementClass: string;
}> = ({ character, elementClass }) => (
    <div className="lb-character">
        <img src={getAssetPath('face1', character as Character).cdn}
            alt={character?.name}
            className={`lb-portrait ${elementClass}`}
        />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const LbSetsSection: React.FC<{ echoPanels: EchoPanelState[] }> = ({ echoPanels }) => (
    <div className="lb-sets">
        {Object.entries(getSetCounts(echoPanels))
            .filter(([_, count]) => count >= 2)
            .map(([element, count]) => (
                <div key={element} className="lb-set-container">
                    <img src={`images/SetIcons/${element}.png`}
                        alt={element}
                        className="lb-set"
                    />
                    <span>{count}</span>
                </div>
            ))}
    </div>
);

const IconStat: React.FC<{ statName: string; value: number }> = ({ statName, value }) => {
    const iconName = getStatIconName(statName);
    const isBasestat = ['ATK', 'HP', 'DEF'].includes(statName);
    const elementType = statName.split(' ')[0].toLowerCase();
    const hasElementalColor = ['fusion', 'aero', 'electro', 'spectro', 'havoc', 'glacio'].includes(elementType);
    
    const formattedValue = isBasestat ? 
        value.toFixed(0) : 
        `${value.toFixed(1)}%`;
        
    return (
        <span className="lb-stat">
            <img src={`images/Stats/${iconName}.png`}
                alt={statName}
                className={`lb-stat-icon ${hasElementalColor ? elementType : ''}`}
            />
            {formattedValue}
        </span>
    );
};

const LbStatsSection: React.FC<{ values: Record<string, number> }> = ({ values }) => {
    const atk = values['ATK'];
    const [elementType, elementDmg] = getHighestDmg(values);
    const er = values['Energy Regen'];
    const [bonusType, bonusDmg] = getHighestDmgBonus(values);
    return (
        <div className="lb-stats">
            <IconStat statName="ATK" value={atk} />
            <IconStat statName={elementType} value={elementDmg} />
            <IconStat statName="Energy Regen" value={er} />
            <IconStat statName={bonusType} value={bonusDmg} />
        </div>
    );
};

const LbEchoRow: React.FC<{
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

const BreakdownStat: React.FC<{ 
    name: string;
    value: number;
    isPercentage?: boolean;
}> = ({ name, value, isPercentage = true }) => {
    const elementType = name.split(' ')[0].toLowerCase();
    const hasElementalColor = ['fusion', 'aero', 'electro', 'spectro', 'havoc', 'glacio'].includes(elementType);
    
    return (
        <div className="breakdown-stat">
            <img 
                src={`images/Stats/${getStatIconName(name)}.png`}
                alt={name}
                className={`lb-stat-icon ${hasElementalColor ? elementType : ''}`}
            />
            <span>{value.toFixed(1)}{isPercentage ? '%' : ''}</span>
        </div>
    );
};

const LbBreakdownRow: React.FC<{
    stats: ReturnType<typeof decompressStats>;
}> = ({ stats }) => {
    const { updates, breakdowns } = stats;
    if (!breakdowns) return null;
    
    const baseStats = ['HP', 'ATK', 'DEF'] as const;
    
    return (
        <div className="lb-breakdown">
            {baseStats.map(stat => (
                <React.Fragment key={stat}>
                    {breakdowns[stat].percent > 0 && (
                        <BreakdownStat name={stat} value={breakdowns[stat].percent} />
                    )}
                    {breakdowns[stat].flat > 0 && (
                        <BreakdownStat name={stat} value={breakdowns[stat].flat} isPercentage={false} />
                    )}
                </React.Fragment>
            ))}
            {Object.entries(updates)
                .filter(([name]) => !baseStats.includes(name as typeof baseStats[number]))
                .map(([name, value]) => (
                    <BreakdownStat key={name} name={name} value={value} />
                ))}
        </div>
    );
};

const LbExpandedContent: React.FC<{ 
    stats: ReturnType<typeof decompressStats>;
    echoPanels: EchoPanelState[];
}> = ({ stats, echoPanels }) => {
    const { substatsData } = useSubstats();
    
    return (
        <div className="lb-expanded-content">
            <LbEchoRow echoPanels={echoPanels} substatsData={substatsData}/>
            <LbBreakdownRow stats={stats} />
        </div>
    );
};

const LbEntry: React.FC<{ entry: DecompressedEntry; rank: number; onClick: () => void; isExpanded: boolean }> = ({ 
    entry, 
    rank,
    onClick,
    isExpanded
}) => {
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    const weapon = getCachedWeapon(entry.buildState.weaponState.id);
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';

    const stats = decompressStats(entry.stats);
    const critRate = stats.values['Crit Rate'];
    const critDmg = stats.values['Crit DMG'];

    return (
        <div className={`lb-entry ${isExpanded ? 'expanded' : ''}`} onClick={onClick}>
            <div className="lb-main-content">
                <div className="lb-rank">#{rank}</div>
                <LbOwnerSection 
                    username={entry.buildState.watermark?.username}
                    uid={entry.buildState.watermark?.uid}
                />
                <LbCharacterSection character={character} elementClass={elementClass} />
                <div className={`lb-sequence s${entry.buildState.currentSequence}`}>
                    <span>S{entry.buildState.currentSequence}</span>
                </div>
                <div className="lb-weapon">
                    {weapon && (
                        <img src={getAssetPath('weapons', weapon).cdn}
                            alt={weapon.name}
                            className="weapon-portrait"
                        />
                    )}
                </div>
                <LbSetsSection echoPanels={entry.buildState.echoPanels} />
                <div className="lb-cv">
                    <div className="lb-cv-ratio">
                        {critRate.toFixed(1)} : {critDmg.toFixed(1)}
                    </div>
                    <div className={`lb-cv-value ${getCVClass(entry.cv)}`}>
                        {entry.cv.toFixed(1)} cv
                    </div>
                </div>
                <LbStatsSection values={stats.values} />
            </div>
            {isExpanded && <LbExpandedContent stats={stats} echoPanels={entry.buildState.echoPanels}
            />}
        </div>
    );
};

const LbHeader: React.FC = () => (
    <div className="lb-header-container">
        <h1 className="lb-header-title">Global Board</h1>
        <p className="lb-header-text">
            Global ranking of imported builds
        </p>
    </div>
);

export const Leaderboard: React.FC = () => {
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${LB_URL}/leaderboard`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const json: CompressedEntry[] = await response.json();
                
                const decompressedData = json
                    .map(entry => ({
                        ...entry,
                        buildState: decompressData({ state: entry.buildState }).state
                    }))
                    .sort((a, b) => b.cv - a.cv);
                
                setData(decompressedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    if (loading) return (
        <div className="lb-container">
            <div className="loading-state">Loading leaderboard data...</div>
        </div>
    );
    
    if (error) return (
        <div className="lb-container">
            <div className="error-state">Error: {error}</div>
        </div>
    );

    const pageCount = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="page-wrapper">
            <div className="lb-wrapper">
                <div className="lb-container">
                    <LbHeader />
                    <div className="lb-table">
                        <div className="lb-header">
                            <span>Rank</span>
                            <span>Owner</span>
                            <span>Character</span>
                            <span></span>
                            <span></span>
                            <span>Sets</span>
                            <span>Crit Value</span>
                            <span>Stats</span>
                        </div>
                        <div className="lb-entries">
                            {currentData.map((entry, index) => (
                                <LbEntry key={entry.timestamp}
                                    entry={entry}
                                    rank={(currentPage - 1) * itemsPerPage + index + 1}
                                    onClick={() => setExpandedEntries(prev => {
                                        const next = new Set(prev);
                                        if (next.has(entry.timestamp)) {
                                            next.delete(entry.timestamp);
                                        } else {
                                            next.add(entry.timestamp);
                                        }
                                        return next;
                                    })}
                                    isExpanded={expandedEntries.has(entry.timestamp)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        </div>
    );
};