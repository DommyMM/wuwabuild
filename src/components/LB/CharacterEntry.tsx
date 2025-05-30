'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LB_URL } from '@/components/Import/Results';
import { decompressData } from '@/components/Save/Backup';
import { Pagination } from '@/components/Save/Pagination';
import { CompressedEntry, DecompressedEntry } from '@/components/Build/types';
import { DamageEntry } from './DamageEntry';
import { LBInfo } from './LBInfo';
import { LBSortDropdown, LBSortHeader } from './SortDropdown';
import { CHARACTER_CONFIGS } from './config';
import { Sequence } from '@/components/Build/types';
import { Character } from '@/types/character';
import { BuildFilter, FilterState } from '@/components/Build/BuildFilter';

export type CVOptions = 'cv' | 'cr' | 'cd';
export type DamageOptions = 'damage';
export type SortField = CVOptions | DamageOptions | string | null;

const LeaderboardHeader: React.FC<{ 
    characterId?: string; 
    selectedWeapon?: number; 
    onWeaponSelect?: (weapon: number) => void;
    maxDamages: Array<{ weaponId: string; damage: number }>;
    selectedSequence?: Sequence;
    onSequenceSelect?: (sequence: Sequence) => void;
    character?: Character;
    characters: Character[];
}> = ({ 
    characterId, 
    selectedWeapon, 
    onWeaponSelect, 
    maxDamages,
    selectedSequence,
    onSequenceSelect,
    character,
    characters
}) => {
    if (!character) return null;

    return (
        <div className="build-header-container">
            <LBInfo characterId={characterId || ''}
                selectedWeapon={selectedWeapon} 
                onWeaponSelect={onWeaponSelect} 
                maxDamages={maxDamages}
                selectedSequence={selectedSequence}
                onSequenceSelect={onSequenceSelect}
                character={character}
                characters={characters}
            />
        </div>
    );
};

interface BuildResponse {
    builds: CompressedEntry[];
    total: number;
    page: number;
    pageSize: number;
}

interface LeaderboardTableProps {
    data: DecompressedEntry[];
    page: number;
    itemsPerPage: number;
    currentSort: SortField;
    sortDirection: 'asc' | 'desc';
    onSortChange: (field: SortField) => void;
    onDirectionChange: (direction: 'asc' | 'desc') => void;
    characterId?: string;
    hoveredSection?: number | null;
    lastHoveredSection?: number | null;
    onHoverSection?: (section: number | null) => void;
    selectedWeapon?: number;
    selectedSequence?: Sequence;
    expandedEntries: Set<string>;
    onEntryClick: (timestamp: string) => void;
}

const getDropdownPosition = (current: number | null | undefined, last: number | null | undefined) => {
    const section = (current ?? last) ?? null;
    if (section === 0) return 'left';
    if (section === 3) return 'right';
    return 'center';
};

const getSortType = (sort: SortField) => {
    if (!sort) return null;
    if (sort === 'damage') return 'damage';
    if (['cv', 'cr', 'cd'].includes(sort)) return 'cv';
    return 'stat';
};

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ 
    data, page, itemsPerPage, currentSort, sortDirection,
    onSortChange, onDirectionChange, characterId,
    hoveredSection, lastHoveredSection, onHoverSection,
    selectedWeapon, selectedSequence,
    expandedEntries, onEntryClick
}) => {
    const sortType = getSortType(currentSort);

    return (
        <div className="build-table">
            <div className="build-header">
                <span>Rank</span>
                <span>Owner</span>
                <span>Character</span>
                <span>Sets</span>
                <LBSortDropdown 
                    field={sortType === 'cv' ? currentSort : null}
                    options={['cv', 'cr', 'cd']}
                    direction={sortDirection}
                    onFieldChange={onSortChange}
                    onDirectionChange={onDirectionChange}
                    placeholder="Crit Value"
                    isActive={sortType === 'cv'}
                />
                {characterId && CHARACTER_CONFIGS[characterId] && (
                    <LBSortDropdown
                        field={sortType === 'stat' ? currentSort : null}
                        options={CHARACTER_CONFIGS[characterId].stats}
                        direction={sortDirection}
                        onFieldChange={onSortChange}
                        onDirectionChange={onDirectionChange}
                        placeholder="Stats"
                        isActive={sortType === 'stat'}
                        position={getDropdownPosition(hoveredSection, lastHoveredSection)}
                        onHoverSection={onHoverSection}
                    />
                )}
                <LBSortHeader
                    direction={sortDirection}
                    isActive={sortType === 'damage'}
                    onDirectionChange={onDirectionChange}
                    onClick={() => onSortChange('damage')}
                />
            </div>
            <div className="build-entries">
                {data.map((entry, index) => (
                    <DamageEntry 
                        key={entry.timestamp} 
                        entry={entry} 
                        rank={(page - 1) * itemsPerPage + index + 1}
                        activeStat={sortType === 'stat' ? currentSort : null}
                        activeSort={sortType}
                        selectedWeapon={selectedWeapon}
                        selectedSequence={selectedSequence}
                        isExpanded={expandedEntries.has(entry.timestamp)}
                        onClick={() => onEntryClick(entry.timestamp)}
                    />
                ))}
            </div>
        </div>
    );
};

const getSortParam = (currentSort: SortField): string => {
    if (!currentSort) return 'damage';
    switch (currentSort) {
        case 'damage': return 'damage';
        case 'cr': return 'Crit Rate';
        case 'cd': return 'Crit DMG';
        case 'cv': return 'finalCV';
        default: return String(currentSort);
    }
};

interface CharacterEntryProps {
    characterId: string;
    weaponMaxDamages: Array<{ weaponId: string; damage: number }>;
    character: Character;
    characters: Character[];
    weaponId: string;
}

export const CharacterEntry: React.FC<CharacterEntryProps> = ({ 
    characterId,
    weaponMaxDamages,
    character,
    characters,
    weaponId
}) => {
    const router = useRouter();
    const config = CHARACTER_CONFIGS[characterId];
    const initialWeapon = config.weapons.indexOf(weaponId);
    const [selectedWeapon, setSelectedWeapon] = useState(initialWeapon);
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentSort, setCurrentSort] = useState<SortField>('damage');
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [lastHoveredSection, setLastHoveredSection] = useState<number | null>(null);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [selectedSequence, setSelectedSequence] = useState<Sequence>('s0');
    const itemsPerPage = 10;
    const [filterState, setFilterState] = useState<FilterState>({
        characterIds: [],
        weaponIds: [],
        echoSets: [],
        mainStats: [],
        regions: [],
        username: undefined,
        uid: undefined
    });

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
        const params = new URLSearchParams({
            weapon: config.weapons[selectedWeapon],
            sort: getSortParam(currentSort),
            direction: sortDirection,
            page: String(page)
        });
        
        // Handle both old format (s0) and new format (s0_solo)
        const defaultSequence = config.styles?.some(s => s.key === 'default') ? 's0' : 's0';
        if (selectedSequence !== defaultSequence) {
            params.set('sequence', selectedSequence);
        }
        if (filterState.echoSets.length > 0) {
            params.append('set', filterState.echoSets.map(set => set.join('~')).join('.'));
        }
        if (filterState.mainStats.length > 0) {
            params.append('stat', filterState.mainStats.map(stat => stat.join('')).join('.'));
        }
        if (filterState.regions.length > 0) {
            params.append('region', filterState.regions.join('.'));
        }
        if (filterState.username) {
            params.append('username', filterState.username);
        }
        if (filterState.uid) {
            params.append('uid', filterState.uid);
        }
        router.push(`/leaderboards/${characterId}?${params.toString()}`, { scroll: false });
    }, [characterId, selectedWeapon, currentSort, sortDirection, page, selectedSequence, config.weapons, router, filterState]);
    
    useEffect(() => {
        setExpandedEntries(new Set());
        
        const loadData = async () => {
            if (!characterId) return;
            try {
                const fetchParams = new URLSearchParams({
                    sort: getSortParam(currentSort),
                    direction: sortDirection,
                    page: String(page),
                    pageSize: String(itemsPerPage),
                    weaponIndex: String(selectedWeapon)
                });
                
                // Handle sequence_style format
                const defaultSequence = config.styles?.some(s => s.key === 'default') ? 's0' : 's0';
                if (selectedSequence !== defaultSequence) {
                    fetchParams.set('sequence', selectedSequence);
                }
                if (filterState.regions.length > 0) {
                    fetchParams.append('region', JSON.stringify(filterState.regions));
                }
                if (filterState.echoSets.length > 0) {
                    fetchParams.append('echoSets', JSON.stringify(filterState.echoSets));
                }
                if (filterState.mainStats.length > 0) {
                    fetchParams.append('echoMains', JSON.stringify(filterState.mainStats));
                }
                if (filterState.username) {
                    fetchParams.append('username', filterState.username);
                }
                if (filterState.uid) {
                    fetchParams.append('uid', filterState.uid);
                }
                
                const response = await fetch(`${LB_URL}/leaderboard/${characterId}?${fetchParams}`);
                if (!response.ok) throw new Error('Failed to fetch data');
                
                const data = await response.json() as BuildResponse;
                setTotal(data.total);
                setData(data.builds.map((entry: CompressedEntry) => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state,
                })));
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [page, characterId, sortDirection, currentSort, selectedWeapon, selectedSequence, config.weapons, filterState]);

    const handleSortChange = (field: SortField) => {
        setCurrentSort(field === currentSort ? null : field);
    };

    if (loading) return (
        <div className="build-container">
            <div className="loading-state">Loading character data...</div>
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
            <div className="lb-wrapper">
                <LeaderboardHeader 
                    characterId={characterId}
                    selectedWeapon={selectedWeapon}
                    onWeaponSelect={setSelectedWeapon}
                    maxDamages={weaponMaxDamages}
                    selectedSequence={selectedSequence}
                    onSequenceSelect={setSelectedSequence}
                    character={character}
                    characters={characters}
                />
                <BuildFilter 
                    filterState={filterState}
                    onFilterChange={(newState: FilterState) => {
                        const hasFilterChanged = getFilterHash(newState) !== getFilterHash(filterState);
                        if (hasFilterChanged) {
                            setPage(1);
                        }
                        setFilterState(newState);
                    }}
                    options={{
                        includeCharacters: false,
                        includeWeapons: false,
                        includeEchoes: true,
                        includeMainStats: true,
                        includeRegions: true
                    }}
                />
                <div className="build-container">
                    <LeaderboardTable 
                        data={data}
                        page={page}
                        itemsPerPage={itemsPerPage}
                        currentSort={currentSort}
                        sortDirection={sortDirection}
                        onSortChange={handleSortChange}
                        onDirectionChange={setSortDirection}
                        characterId={characterId}
                        hoveredSection={hoveredSection}
                        lastHoveredSection={lastHoveredSection}
                        onHoverSection={(section) => {
                            setHoveredSection(section);
                            if (section !== null) {
                                setLastHoveredSection(section);
                            }
                        }}
                        selectedWeapon={selectedWeapon}
                        selectedSequence={selectedSequence}
                        expandedEntries={expandedEntries}
                        onEntryClick={(timestamp) => 
                            setExpandedEntries(prev => {
                                const next = new Set(prev);
                                if (next.has(timestamp)) {
                                    next.delete(timestamp);
                                } else {
                                    next.add(timestamp);
                                }
                                return next;
                            })
                        }
                    />
                    <Pagination currentPage={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
};

export default CharacterEntry;