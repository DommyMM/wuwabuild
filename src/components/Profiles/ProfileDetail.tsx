'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LB_URL } from '@/components/Import/Results';
import { decompressData } from '@/components/Save/Backup';
import { Pagination } from '@/components/Save/Pagination';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DecompressedEntry } from '@/components/Build/types';
import { CompressedStats } from '@/hooks/useStats';
import { ProfileEntry } from './ProfileEntry';
import { StatSort, ActiveSort, getDisplayName } from '../Build/BuildPageClient';
import { STAT_ORDER } from '@/types/stats';
import { SortAsc } from 'lucide-react';
import { BuildFilter, FilterState } from '../Build/BuildFilter';
import { Calculation } from '@/components/Build/types';
import { CompressedBuildState } from '@/components/Save/Backup';

const FILTERED_STATS = STAT_ORDER.filter(stat => 
    !stat.includes('Crit Rate') && 
    !stat.includes('Crit DMG') && 
    !stat.includes('%')
);


interface ProfileBuild {
    timestamp: string;
    username: string;
    buildState: CompressedBuildState; 
    verified: boolean;
    stats?: CompressedStats;
    cv?: number;
    cvPenalty?: number;
    finalCV?: number;
    calculations?: Calculation[]; 
}

interface ProfileData {
    builds: ProfileBuild[];
    total: number;
    page: number;
    pageSize: number;
    uid: string;
}

type CVSort = 'cv' | 'cr' | 'cd';

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

const SortButton: React.FC<{
    direction: 'asc' | 'desc';
    onClick: (e: React.MouseEvent) => void;
}> = ({ direction, onClick }) => (
    <div className="sort-button" onClick={onClick}>
        <SortAsc className={`sort-icon ${direction === 'desc' ? 'asc' : ''}`} />
    </div>
);

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
                        <SortButton 
                            direction={direction} 
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
                                <SortButton 
                                    direction={direction} 
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

export default function ProfileDetail({ uid }: { uid: string }) {
    const [data, setData] = useState<ProfileData | null>(null);
    const [decompressedBuilds, setDecompressedBuilds] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [CVSort, setCVSort] = useState<CVSort>('cv');
    const [statSort, setStatSort] = useState<StatSort | null>(null);
    const [activeSort, setActiveSort] = useState<ActiveSort>('cv');
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [lastHoveredSection, setLastHoveredSection] = useState<number | null>(null);
    
    // Filter state variables
    const [characterIds, setCharacterIds] = useState<string[]>([]);
    const [weaponIds, setWeaponIds] = useState<string[]>([]);
    const [echoSets, setEchoSets] = useState<Array<[number, number]>>([]);
    const [mainStats, setMainStats] = useState<Array<[number, string]>>([]);
    const [regions, setRegions] = useState<number[]>([]);
    const [username, setUsername] = useState<string | undefined>(undefined);
    // Note: We don't set UID state since it's provided as prop
    
    const router = useRouter();
    const itemsPerPage = 12;

    // Create a fingerprint for filter state to detect changes
    const getFilterHash = useCallback((state: FilterState): string => {
        return [
            state.characterIds.join(','),
            state.weaponIds.join(','),
            state.echoSets.map(set => `${set[0]}~${set[1]}`).join(','),
            state.mainStats.map(stat => `${stat[0]}~${stat[1]}`).join(','),
            state.regions.join(','),
            state.username || '',
            state.uid || ''
        ].join('|');
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        
        // Parse sort parameters from URL
        const sortParam = searchParams.get('sort');
        const directionParam = searchParams.get('direction');
        const pageParam = searchParams.get('page');
        
        // Parse filter parameters from URL
        const regionParam = searchParams.get('region');
        const charParam = searchParams.get('char');
        const weaponParam = searchParams.get('weap');
        const echoParam = searchParams.get('set');
        const mainStatParam = searchParams.get('stat');
        const usernameParam = searchParams.get('username');
        
        // Handle sort params
        if (sortParam) {
            if (sortParam === 'Crit Rate') {
                setCVSort('cr');
                setActiveSort('cv');
            } else if (sortParam === 'Crit DMG') {
                setCVSort('cd');
                setActiveSort('cv');
            } else if (sortParam === 'finalCV') {
                setCVSort('cv');
                setActiveSort('cv');
            } else if (FILTERED_STATS.includes(sortParam as StatSort)) {
                setStatSort(sortParam as StatSort);
                setActiveSort('stat');
            }
        }
        
        if (directionParam && (directionParam === 'asc' || directionParam === 'desc')) {
            setSortDirection(directionParam);
        }
        
        if (pageParam) {
            const page = parseInt(pageParam);
            if (!isNaN(page) && page > 0) {
                setCurrentPage(page);
            }
        }
        
        // Handle filter params
        if (regionParam) setRegions(regionParam.split('.').map(Number));
        if (charParam) setCharacterIds(charParam.split('.'));
        if (weaponParam) setWeaponIds(weaponParam.split('.'));
        if (usernameParam) setUsername(usernameParam);
        if (echoParam) {
            setEchoSets(echoParam.split('.').map(set => {
                const [a, b] = set.split('~').map(Number);
                return [a, b] as [number, number];
            }));
        }
        if (mainStatParam) {
            setMainStats(mainStatParam.split('.').map(stat => {
                const num = parseInt(stat[0]);
                const type = stat.slice(1);
                return [num, type] as [number, string];
            }));
        }
    }, []);

    useEffect(() => {
        const getSortParam = () => {
            if (statSort) return statSort;
            if (CVSort === 'cr') return 'Crit Rate';
            if (CVSort === 'cd') return 'Crit DMG';
            return 'finalCV';
        };

        // Update URL with current sort parameters and filters
        const params = new URLSearchParams({
            sort: getSortParam(),
            direction: sortDirection,
            page: String(currentPage)
        });
        
        // Add filter params if they exist
        if (regions.length > 0) params.append('region', regions.join('.'));
        if (characterIds.length > 0) params.append('char', characterIds.join('.'));
        if (weaponIds.length > 0) params.append('weap', weaponIds.join('.'));
        if (echoSets.length > 0) params.append('set', echoSets.map(set => set.join('~')).join('.'));
        if (mainStats.length > 0) params.append('stat', mainStats.map(stat => stat.join('')).join('.'));
        if (username) params.append('username', username);
        
        router.push(`/profiles/${uid}?${params.toString()}`, { scroll: false });

        const fetchProfileData = async () => {
            try {
                setIsTableLoading(true);
                setLoading(true);
                const fetchParams = new URLSearchParams({
                    sort: getSortParam(),
                    direction: sortDirection,
                    page: String(currentPage),
                    pageSize: String(itemsPerPage)
                });
                
                // Add filter params to fetch
                if (regions.length > 0) {
                    fetchParams.append('region', JSON.stringify(regions));
                }
                if (characterIds.length > 0) {
                    fetchParams.append('characterId', JSON.stringify(characterIds));
                }
                if (weaponIds.length > 0) {
                    fetchParams.append('weaponId', JSON.stringify(weaponIds));
                }
                if (echoSets.length > 0) {
                    fetchParams.append('echoSets', JSON.stringify(echoSets));
                }
                if (mainStats.length > 0) {
                    fetchParams.append('echoMains', JSON.stringify(mainStats));
                }
                if (username) {
                    fetchParams.append('username', username);
                }

                // Make the API request
                const response = await fetch(
                    `${LB_URL}/profile/${uid}?${fetchParams}`
                );
                
                if (!response.ok) {
                    if (response.status === 404) {
                        toast.error(`No profile found with UID: ${uid}`);
                        router.push('/profiles');
                        return;
                    }
                    throw new Error('Failed to fetch profile data');
                }
                
                const profileData = await response.json() as ProfileData;
                setData(profileData);
                
                const processed = profileData.builds.map(build => ({
                    _id: build.timestamp, 
                    buildState: decompressData({ state: build.buildState }).state,
                    timestamp: build.timestamp,
                    username: build.username,
                    stats: build.stats || { values: {} },
                    cv: build.cv || 0,
                    cvPenalty: build.cvPenalty || 0,
                    finalCV: build.finalCV || 0,
                    calculations: build.calculations || []
                } as DecompressedEntry));
                
                setDecompressedBuilds(processed);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
                setIsTableLoading(false);
            }
        };
        
        fetchProfileData();
    }, [uid, currentPage, sortDirection, CVSort, statSort, router, 
        characterIds, weaponIds, echoSets, mainStats, regions, username]);

    useEffect(() => {
        setExpandedEntries(new Set());
    }, [activeSort, CVSort, statSort, currentPage, sortDirection, 
        characterIds, weaponIds, echoSets, mainStats, regions, username]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setExpandedEntries(new Set());
    };

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

    if (loading && !isTableLoading) {
        return (
            <div className="page-wrapper">
                <div className="build-header-container">
                    <h1 className="build-header-title">Player Profile: {uid}</h1>
                    <div className="build-header-divider"></div>
                </div>
                <div className="profile-loading">Loading profile data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-wrapper">
                <div className="build-header-container">
                    <h1 className="build-header-title">Player Profile</h1>
                    <div className="build-header-divider"></div>
                </div>
                <div className="profile-error">
                    <div>Error: {error}</div>
                    <Link href="/profiles" className="build-button">Back to Profiles</Link>
                </div>
            </div>
        );
    }

    if (!data || data.total === 0) {
        return (
            <div className="page-wrapper">
                <div className="build-header-container">
                    <h1 className="build-header-title">Player Profile: {uid}</h1>
                    <div className="build-header-divider"></div>
                </div>
                <div className="profile-empty">
                    <div>No builds found for this player.</div>
                    <Link href="/profiles" className="build-button">Back to Profiles</Link>
                </div>
            </div>
        );
    }

    const pageCount = Math.ceil(data.total / itemsPerPage);
    
    // Construct filter state object for BuildFilter
    const filterState: FilterState = {
        characterIds,
        weaponIds,
        echoSets,
        mainStats,
        regions,
        username,
        uid // Always use the UID from props
    };

    return (
        <div className="page-wrapper">
            <div className="build-header-container">
                <h1 className="build-header-title">Player Profile: {uid}</h1>
                <div className="build-header-divider"></div>
                <div className="build-header-text">
                    <span>Viewing {data.total} build{data.total !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="profile-main-container">
                <div className="build-container">
                    <div className={`table-loading-overlay ${isTableLoading ? 'active' : ''}`}>
                        <div className="loading-spinner" />
                        <div className="loading-text">Updating results...</div>
                    </div>
                    
                    <div className="build-table-wrapper">
                        <BuildFilter 
                            filterState={filterState}
                            onFilterChange={(newState: FilterState) => {
                                const hasFilterChanged = getFilterHash(newState) !== getFilterHash(filterState);
                                
                                if (hasFilterChanged) {
                                    setCurrentPage(1);
                                }
                                
                                // Update all filter states
                                setCharacterIds(newState.characterIds);
                                setWeaponIds(newState.weaponIds);
                                setEchoSets(newState.echoSets);
                                setMainStats(newState.mainStats);
                                setRegions(newState.regions);
                                setUsername(newState.username);
                                // Don't update uid as it's a prop
                            }}
                            options={{
                                includeCharacters: true,
                                includeWeapons: true,
                                includeEchoes: true,
                                includeMainStats: true,
                                includeRegions: true
                            }}
                        />
                        
                        <div className="build-table">
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
                                    hoveredSection={hoveredSection}
                                    lastHoveredSection={lastHoveredSection}
                                    onHoverSection={handleHoverSection}
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
                            <div className="build-entries profile-builds">
                                {decompressedBuilds.map((build, index) => (
                                    <ProfileEntry 
                                        key={build.timestamp}
                                        entry={build}
                                        rank={(currentPage - 1) * itemsPerPage + index + 1}
                                        onClick={() => setExpandedEntries(prev => {
                                            const next = new Set(prev);
                                            if (next.has(build.timestamp)) {
                                                next.delete(build.timestamp);
                                            } else {
                                                next.add(build.timestamp);
                                            }
                                            return next;
                                        })}
                                        isExpanded={expandedEntries.has(build.timestamp)}
                                        activeStat={activeSort === 'stat' ? statSort : null}
                                        activeSort={activeSort}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {pageCount > 1 && (
                <Pagination 
                    currentPage={currentPage} 
                    pageCount={pageCount} 
                    onPageChange={handlePageChange} 
                />
            )}
        </div>
    );
}