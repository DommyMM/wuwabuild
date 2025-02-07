import React, { useState, useEffect } from 'react';
import { LB_URL } from '../components/Import/Results';
import { decompressData } from '../components/Save/Backup';
import { Pagination } from '../components/Save/Pagination';
import { CompressedEntry, DecompressedEntry } from '../components/Build/types';
import { DamageEntry } from '../components/LB/DamageEntry';
import { useParams } from 'react-router-dom';
import { LBInfo } from '../components/LB/LBInfo';
import { LBSortDropdown, LBSortHeader } from '../components/LB/SortDropdown';
import { CHARACTER_CONFIGS } from '../components/LB/config';

export type CVOptions = 'cv' | 'cr' | 'cd';
export type DamageOptions = 'damage';
export type SortField = CVOptions | DamageOptions | string | null;

const LeaderboardHeader: React.FC<{ characterId?: string; entry?: DecompressedEntry; selectedWeapon?: number; onWeaponSelect?: (weapon: number)
=> void }>=({ characterId, entry, selectedWeapon, onWeaponSelect }) => {
    return (
        <div className="build-header-container">
            <LBInfo characterId={characterId || ''}  calculations={entry?.calculations} selectedWeapon={selectedWeapon} onWeaponSelect={onWeaponSelect} />
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
    expandedEntry: string | null;
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
    selectedWeapon, expandedEntry, onEntryClick
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
                        hoveredSection={hoveredSection}
                        lastHoveredSection={lastHoveredSection}
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
                        isExpanded={expandedEntry === entry.timestamp}
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

export const CharacterEntry: React.FC = () => {
    const { characterId } = useParams<{ characterId: string }>();
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentSort, setCurrentSort] = useState<SortField>('damage');
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [lastHoveredSection, setLastHoveredSection] = useState<number | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState(0);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        const loadData = async () => {
            if (!characterId) return;
            try {
                const searchParams: Record<string, string> = {
                    sort: getSortParam(currentSort),
                    direction: sortDirection,
                    page: String(page),
                    pageSize: String(itemsPerPage)
                };
                
                const params = new URLSearchParams(searchParams);
                const response = await fetch(`${LB_URL}/leaderboard/${characterId}?${params}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                
                const { builds, total } = await response.json() as BuildResponse;
                setTotal(total);
                setData(builds.map((entry: CompressedEntry) => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                })));
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        loadData();
    }, [page, characterId, sortDirection, currentSort]);

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
                <div className="build-container">
                    <LeaderboardHeader 
                        characterId={characterId} 
                        entry={data[0]}
                        selectedWeapon={selectedWeapon}
                        onWeaponSelect={setSelectedWeapon}
                    />
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
                        expandedEntry={expandedEntry}
                        onEntryClick={(timestamp) => 
                            setExpandedEntry(expandedEntry === timestamp ? null : timestamp)
                        }
                    />
                    <Pagination currentPage={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
};