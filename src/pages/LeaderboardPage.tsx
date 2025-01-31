import React, { useState, useEffect, useMemo } from 'react';
import { LB_URL } from '../components/Import/Results';
import { decompressData } from '../components/Build/Backup';
import { Pagination } from '../components/Build/Pagination';
import { CompressedEntry, DecompressedEntry } from '../components/LB/types';
import { LBEntry } from '../components/LB/LbEntry';
import { SortAsc } from 'lucide-react';
import { decompressStats } from '../hooks/useStats';
import { STAT_ORDER } from '../types/stats';
import '../styles/Leaderboard.css';

const FILTERED_STATS = STAT_ORDER.filter(stat => 
    !stat.includes('Crit Rate') && 
    !stat.includes('Crit DMG') && 
    !stat.includes('%')
);

const LBHeader: React.FC = () => (
    <div className="lb-header-container">
        <h1 className="lb-header-title">Global Board</h1>
        <p className="lb-header-text">
            All builds simulated to Lv 90 Character, R1 Weapon <br />
            Actual damage calcs coming soon (After I learn math)
        </p>
    </div>
);

type CVSort = 'cv' | 'cr' | 'cd';
export type StatSort = typeof STAT_ORDER[number];
type ActiveSort = 'cv' | 'stat' | null;

const SortButton: React.FC<{
    direction: 'asc' | 'desc';
    onClick: (e: React.MouseEvent) => void;
}> = ({ direction, onClick }) => (
    <div className="sort-button" onClick={onClick}>
        <SortAsc className={`sort-icon ${direction === 'desc' ? 'asc' : ''}`} />
    </div>
);

const getDisplayName = (value: string) => {
    switch(value) {
        case 'cv': return 'Crit Value';
        case 'cr': return 'Crit Rate';
        case 'cd': return 'Crit DMG';
        case 'ATK': return 'Final Attack';
        case 'HP': return 'Final HP';
        case 'DEF': return 'Final DEF';
        case 'Basic Attack DMG Bonus': return 'Basic Attack';
        case 'Heavy Attack DMG Bonus': return 'Heavy Attack';
        case 'Resonance Skill DMG Bonus': return 'Resonance Skill';
        case 'Resonance Liberation DMG Bonus': return 'Liberation DMG';
        default: return value;
    }
};

interface SortDropdownProps {
    field: CVSort | StatSort | null;
    options: readonly (CVSort | StatSort)[];
    direction: 'asc' | 'desc';
    onFieldChange: (field: any) => void;
    onDirectionChange: (direction: 'asc' | 'desc') => void;
    placeholder?: string;
    isActive: boolean;
    hoveredSection?: number | null;
    lastHoveredSection?: number | null;
    onHoverSection?: (section: number | null) => void;
}

const getDropdownPosition = (current: number | null, last: number | null) => {
    const section = current ?? last;
    if (section === 0) return 'left';
    if (section === 3) return 'right';
    return 'center';
};

const SortDropdown: React.FC<SortDropdownProps> = ({ 
    field, options, direction, onFieldChange, onDirectionChange, 
    placeholder = 'Sort By', isActive, hoveredSection, lastHoveredSection, onHoverSection 
}) => {
    const isStatsDropdown = placeholder === 'Stats';
    
    return (
        <div className={`sort-dropdown ${isActive ? 'active' : ''} ${isStatsDropdown ? 'stats' : ''}`}>
            <div className={isStatsDropdown ? 'stats-grid' : ''}>
                {isStatsDropdown && [0,1,2,3].map(section => (
                    <div key={section}
                        className="stats-hover-section"
                        onMouseEnter={() => onHoverSection?.(section)}
                        onMouseLeave={() => onHoverSection?.(null)}
                    />
                ))}
                <div className="sort-header">
                    {field ? getDisplayName(field) : placeholder}
                    {isActive && (
                        <SortButton direction={direction} 
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
                            }} 
                        />
                    )}
                </div>
                <div className={`sort-options ${placeholder === 'Stats' ? getDropdownPosition(hoveredSection ?? null, lastHoveredSection ?? null) : ''}`}>
                    {options.map((option) => (
                        <div key={option} 
                            className={`sort-option ${field === option ? 'active' : ''}`}
                            onClick={() => onFieldChange(option)}
                        >
                            <span>{getDisplayName(option)}</span>
                            {field === option && isActive && (
                                <SortButton direction={direction} 
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
                                    }} 
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Leaderboard: React.FC = () => {
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [CVSort, setCVSort] = useState<CVSort>('cv');
    const [statSort, setStatSort] = useState<StatSort | null>(null);
    const [activeSort, setActiveSort] = useState<ActiveSort>('cv');
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [lastHoveredSection, setLastHoveredSection] = useState<number | null>(null);
    const itemsPerPage = 10;
    const initialLimit = 30;
    const decompressedStats = useMemo(() => {
        return data.map(entry => ({
            ...entry,
            decompressedStats: decompressStats(entry.stats).values
        }));
    }, [data]);
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const getSortParam = () => {
                    if (statSort) return statSort;
                    if (CVSort === 'cr') return 'Crit Rate';
                    if (CVSort === 'cd') return 'Crit DMG';
                    return 'finalCV';
                };
                const params = new URLSearchParams({
                    limit: String(initialLimit),
                    sort: getSortParam(),
                    direction: sortDirection
                });
                const response = await fetch(`${LB_URL}/leaderboard?${params}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const json: CompressedEntry[] = await response.json();
                
                const initialData = json.map(entry => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                }));
                
                setData(initialData);
                setLoading(false);
                const fullParams = new URLSearchParams({
                    sort: getSortParam(),
                    direction: sortDirection
                });
                const fullResponse = await fetch(`${LB_URL}/leaderboard?${fullParams}`);
                if (!fullResponse.ok) throw new Error('Failed to fetch full leaderboard');
                const fullJson: CompressedEntry[] = await fullResponse.json();
                
                const fullData = fullJson.map(entry => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                }));
                
                setData(fullData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        loadInitial();
    }, [sortDirection, CVSort, statSort, initialLimit]);
    useEffect(() => {
        setExpandedEntries(new Set());
    }, [activeSort, CVSort, statSort, currentPage, sortDirection]);
    const sortedData = useMemo(() => {
        return [...decompressedStats].sort((a, b) => {
            let valueA, valueB;
            if (statSort) {
                valueA = a.decompressedStats[statSort] || 0;
                valueB = b.decompressedStats[statSort] || 0;
            }
            else if (CVSort === 'cr') {
                valueA = a.decompressedStats['Crit Rate'];
                valueB = b.decompressedStats['Crit Rate'];
            }
            else if (CVSort === 'cd') {
                valueA = a.decompressedStats['Crit DMG'];
                valueB = b.decompressedStats['Crit DMG'];
            }
            else {
                valueA = a.finalCV;
                valueB = b.finalCV;
            }
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        });
    }, [decompressedStats, statSort, CVSort, sortDirection]);

    const currentData = useMemo(() => 
        sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
        [sortedData, currentPage, itemsPerPage]
    );

    const handleCVSort = (field: CVSort) => {
        if (field === CVSort && activeSort === 'cv') {
            setActiveSort(null);
        } else {
            setActiveSort('cv');
            setCVSort(field);
            setStatSort(null);
        }
    };

    const handleStatSort = (field: StatSort | null) => {
        if (field === statSort && activeSort === 'stat') {
            setActiveSort(null);
            setStatSort(null);
        } else {
            setActiveSort('stat');
            setStatSort(field);
            setCVSort('cv');
        }
    };

    const handleHoverSection = (section: number | null) => {
        setHoveredSection(section);
        if (section !== null) {
            setLastHoveredSection(section);
        }
    };

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

    return (
        <div className="page-wrapper">
            <div className="lb-wrapper">
                <div className="lb-container">
                    <LBHeader />
                    <div className="lb-table">
                        <div className="lb-header">
                            <span>Rank</span>
                            <span>Owner</span>
                            <span>Character</span>
                            <span></span>
                            <span></span>
                            <span>Sets</span>
                            <SortDropdown 
                                field={CVSort}
                                options={['cv', 'cr', 'cd'] as const}
                                direction={sortDirection}
                                onFieldChange={handleCVSort}
                                onDirectionChange={setSortDirection}
                                placeholder="Crit Value"
                                isActive={activeSort === 'cv'}
                            />
                            <SortDropdown 
                                field={statSort}
                                options={FILTERED_STATS}
                                direction={sortDirection}
                                onFieldChange={handleStatSort}
                                onDirectionChange={setSortDirection}
                                placeholder="Stats"
                                isActive={activeSort === 'stat'}
                                hoveredSection={hoveredSection}
                                lastHoveredSection={lastHoveredSection}
                                onHoverSection={handleHoverSection}
                            />
                        </div>
                        <div className="lb-entries">
                            {currentData.map((entry, index) => (
                                <LBEntry 
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
                                    activeStat={activeSort === 'stat' ? statSort : null}
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