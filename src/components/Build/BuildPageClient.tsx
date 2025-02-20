'use client';

import React, { useState, useEffect } from 'react';
import { LB_URL } from '@/components/Import/Results';
import { decompressData } from '@/components/Save/Backup';
import { Pagination } from '@/components/Save/Pagination';
import { CompressedEntry, DecompressedEntry } from './types';
import { BuildEntry } from './BuildEntry';
import { SortAsc } from 'lucide-react';
import { STAT_ORDER } from '@/types/stats';
import { useRouter } from 'next/navigation';
import { BuildFilter } from './BuildFilter';
import '@/styles/BuildPage.css';

const FILTERED_STATS = STAT_ORDER.filter(stat => 
    !stat.includes('Crit Rate') && 
    !stat.includes('Crit DMG') && 
    !stat.includes('%')
);

const BuildHeader: React.FC = () => (
    <div className="build-header-container">
    <h1 className="build-header-title">Global Board</h1>
    <div className="build-header-divider"></div>
    <div className="build-header-text">
        <span>Pool of all builds, standardized to Lv 90</span>
        <div className="build-header-info">
            <div className="info-item">
                <span className="info-label">Roll Value (RV):</span>
                <span className="division-style">
                    <span>Stat Value</span>
                    <span>Max Value</span>
                </span>
            </div>
            <div className="info-item">
                <span className="info-label">Crit Value (CV):</span>
                <span>2 x CR + CD</span>
            </div>
        </div>
    </div>
</div>
);

type CVSort = 'cv' | 'cr' | 'cd';
export type StatSort = typeof STAT_ORDER[number];
export type ActiveSort = 'cv' | 'stat' | null;

const SortButton: React.FC<{
    direction: 'asc' | 'desc';
    onClick: (e: React.MouseEvent) => void;
}> = ({ direction, onClick }) => (
    <div className="sort-button" onClick={onClick}>
        <SortAsc className={`sort-icon ${direction === 'desc' ? 'asc' : ''}`} />
    </div>
);

export const getDisplayName = (value: string) => {
    switch(value) {
        case 'cv': return 'Crit Value';
        case 'cr': return 'Crit Rate';
        case 'cd': return 'Crit DMG';
        case 'ATK': return 'Total Attack';
        case 'HP': return 'Total HP';
        case 'DEF': return 'Total DEF';
        case 'Basic Attack DMG Bonus': return 'Basic Attack';
        case 'Heavy Attack DMG Bonus': return 'Heavy Attack';
        case 'Resonance Skill DMG Bonus': return 'Resonance Skill';
        case 'Resonance Liberation DMG Bonus': return 'Liberation DMG';
        case 'damage': return 'Damage';
        default: return value;
    }
};

interface SortDropdownProps<T> {
    field: T | null;
    options: readonly T[]; 
    direction: 'asc' | 'desc';
    onFieldChange: (field: T) => void;
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

const SortDropdown = <T extends string>({ 
    field, 
    options, 
    direction, 
    onFieldChange, 
    onDirectionChange, 
    placeholder = 'Sort By', 
    isActive, 
    hoveredSection, 
    lastHoveredSection, 
    onHoverSection 
}: SortDropdownProps<T>) => {
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

interface BuildResponse {
    builds: CompressedEntry[];
    total: number;
    page: number;
    pageSize: number;
}

export default function BuildPageClient() {
    const router = useRouter();
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
    const [total, setTotal] = useState(0);
    const [characterId, setcharacterId] = useState<string | null>(null);
    const [weaponId, setweaponId] = useState<string | null>(null);
    const [isTableLoading, setIsTableLoading] = useState(false);

    useEffect(() => {
        const getSortParam = () => {
            if (statSort) return statSort;
            if (CVSort === 'cr') return 'Crit Rate';
            if (CVSort === 'cd') return 'Crit DMG';
            return 'finalCV';
        };
        const params = new URLSearchParams({
            sort: getSortParam(),
            direction: sortDirection,
            page: String(currentPage)
        });
        if (characterId) params.append('characterId', characterId);
        if (weaponId) params.append('weaponId', weaponId);
        router.push(`/builds?${params.toString()}`, { scroll: false });
        const loadData = async () => {
            try {
                setIsTableLoading(true);
                const fetchParams = new URLSearchParams({
                    sort: getSortParam(),
                    direction: sortDirection,
                    page: String(currentPage),
                    pageSize: String(itemsPerPage)
                });
                if (characterId) fetchParams.append('characterId', characterId);
                if (weaponId) fetchParams.append('weaponId', weaponId);
                const response = await fetch(`${LB_URL}/build?${fetchParams}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                
                const { builds, total } = await response.json() as BuildResponse;
                setTotal(total);
                setData(builds.map((entry: CompressedEntry) => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state,
                })));
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            } finally {
                setIsTableLoading(false);
            }
        };
        loadData();
    }, [currentPage, sortDirection, CVSort, statSort, router, characterId, weaponId]);

    useEffect(() => {
        setExpandedEntries(new Set());
    }, [activeSort, CVSort, statSort, currentPage, sortDirection]);

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
        <div className="build-container">
            <div className="loading-state">Loading leaderboard data...</div>
        </div>
    );
    
    if (error) return (
        <div className="build-container">
            <div className="error-state">Error: {error}</div>
        </div>
    );
    const pageCount = Math.ceil(total / itemsPerPage);

    return (
        <div className="page-wrapper">
            <div className="build-wrapper">
                <BuildHeader />
                <div className="build-container">
                    <div className="build-table-wrapper">
                        <div className={`table-loading-overlay ${isTableLoading ? 'active' : ''}`}>
                            <div className="loading-spinner" />
                            <div className="loading-text">Updating results...</div>
                        </div>
                        <div className="build-table">
                            <BuildFilter onCharacterFilter={setcharacterId} onWeaponFilter={setweaponId}/>
                            <div className="build-header">
                                <span>Rank</span>
                                <span>Owner</span>
                                <span>Character</span>
                                <span></span>
                                <span></span>
                                <span>Sets</span>
                                <SortDropdown<CVSort>
                                    field={CVSort}
                                    options={['cv', 'cr', 'cd'] as const}
                                    direction={sortDirection}
                                    onFieldChange={handleCVSort}
                                    onDirectionChange={setSortDirection}
                                    placeholder="Crit Value"
                                    isActive={activeSort === 'cv'}
                                />
                                <SortDropdown<StatSort>
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
                            <div className="build-entries">
                                {data.map((entry, index) => (
                                    <BuildEntry 
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
                                        activeSort={activeSort}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        </div>
    );
}