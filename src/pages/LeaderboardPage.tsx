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
import { getCVClass } from '../components/Build/Card';
import { EchoPanelState } from '../types/echo';
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
    cv: number;
    timestamp: string;
}

interface DecompressedEntry {
    buildState: SavedState;
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

const LbEntry: React.FC<{ entry: DecompressedEntry; rank: number; onClick: () => void; isExpanded: boolean }> = ({ 
    entry, 
    rank,
    onClick,
    isExpanded
}) => {
    const character = entry.buildState.characterState.id ? cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    const weapon = getCachedWeapon(entry.buildState.weaponState.id);
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';

    return (
        <div className={`lb-entry ${isExpanded ? 'expanded' : ''}`} onClick={onClick}>
            <div className="lb-main-content">
                <div className="lb-rank">#{rank}</div>
                <div className="lb-owner">
                    <div className="owner-name">
                        {entry.buildState.watermark?.username || 'Anonymous'}
                    </div>
                    <div className="owner-uid">
                        UID: {entry.buildState.watermark?.uid || '000000000'}
                    </div>
                </div>
                <div className="lb-character">
                    <img src={getAssetPath('face1', character as Character).cdn}
                        alt={character?.name}
                        className={`lb-portrait ${elementClass}`}
                    />
                    <span className={`char-name ${elementClass}`}>
                        {character?.name}
                    </span>
                </div>
                <div className={`lb-sequence s${entry.buildState.currentSequence}`}>
                    <span>S{entry.buildState.currentSequence}</span>
                </div>
                <div className="lb-weapon">
                    {weapon && (
                        <>
                            <img src={getAssetPath('weapons', weapon).cdn}
                                alt={weapon.name}
                                className="weapon-portrait"
                            />
                        </>
                    )}
                </div>
                <div className="lb-sets">
                    {Object.entries(getSetCounts(entry.buildState.echoPanels))
                        .filter(([_, count]) => count >= 2)
                        .map(([element, count]) => (
                            <div key={element} className="build-sets">
                                <img src={`images/SetIcons/${element}.png`}
                                    alt={element}
                                    className="lb-set"
                                />
                                <span>{count}</span>
                            </div>
                        ))}
                </div>
                <div className={`lb-cv ${getCVClass(entry.cv)}`}>
                    {entry.cv.toFixed(1)}
                </div>
                <div className="lb-stats">
                    {/* Stats tab - to be implemented */}
                </div>
            </div>
            {isExpanded && (
                <div className="lb-expanded-content">
                    <span>Coming Soon</span>
                </div>
            )}
        </div>
    );
};

const LbHeader: React.FC = () => (
    <div className="lb-header-container">
        <h1 className="lb-header-title">Build Leaderboard</h1>
        <p className="lb-header-text">
            Global ranking of imported builds sorted by CV
        </p>
    </div>
);

export const Leaderboard: React.FC = () => {
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const itemsPerPage = 20;

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
                        <LbEntry 
                            key={entry.timestamp}
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
            <Pagination 
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};