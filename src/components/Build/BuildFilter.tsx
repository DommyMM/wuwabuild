'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { getAssetPath } from '@/types/paths';
import { cachedCharacters } from '@/hooks/useCharacters';
import { Character } from '@/types/character';
import { weaponList } from '@/hooks/useWeapons';
import { ELEMENT_SETS } from '@/types/echo';
import { mainStatsCache } from '@/hooks/useMain';
import { STAT_MAP } from '../Save/Backup';
import { getStatPaths } from '@/types/stats';
import { X } from 'lucide-react';
import '@/styles/BuildFilter.css';

export interface VisibleItem {
    type: 'character' | 'weapon' | 'echo' | 'mainstat' | 'region';
    data: Character | typeof weaponList[0] | [number, number] | [number, string] | number;
    sectionTitle: string;
    subSection?: string;
}

const REGION_MAP: Record<string, number> = {
    'America': 5,
    'Europe': 6,
    'Asia': 7,
    'SEA': 9,
    'HMT': 1
};

export interface FilterState {
    characterIds: string[];
    weaponIds: string[];
    echoSets: Array<[number, number]>;
    mainStats: Array<[number, string]>;
    regions: number[];
}

interface FilterOptions {
    includeCharacters?: boolean;
    includeWeapons?: boolean;
    includeEchoes?: boolean;
    includeMainStats?: boolean;
    includeRegion?: boolean;
}

interface BuildFilterProps {
    filterState: FilterState;
    onFilterChange: (newState: FilterState) => void;
    options?: FilterOptions & {
        includeRegions?: boolean;
    };
}

const getElementClass = (statName: string): string => {
    const elementType = statName.split(' ')[0].toLowerCase();
    return ['fusion', 'aero', 'electro', 'spectro', 'havoc', 'glacio', 'healing']
        .includes(elementType) ? elementType : '';
};

export const createLeaderboardFilter = (props: Omit<BuildFilterProps, 'options'>) => (
    <BuildFilter 
        {...props}
        options={{
            includeCharacters: false,
            includeWeapons: false,
            includeEchoes: true,
            includeMainStats: true
        }}
    />
);

export const FilterOption: React.FC<{ item: VisibleItem }> = ({ item }) => {
    switch (item.type) {
        case 'character':
            const char = item.data as Character;
            return (
                <>
                    <img src={getAssetPath('face1', char).cdn} alt={char.name} className="filter-icon" />
                    <span>{char.name}</span>
                </>
            );
        case 'weapon':
            const weapon = item.data as typeof weaponList[0];
            return (
                <>
                    <div className="filter-weapon">
                        <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} className="filter-icon" />
                        <span>{weapon.name}</span>
                    </div>
                    <span className="weapon-rarity">{weapon.rarity}</span>
                </>
            );
        case 'echo':
            const [, index] = item.data as [number, number];
            const element = Object.keys(ELEMENT_SETS)[index];
            const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
            return (
                <>
                    <img src={getAssetPath('sets', element).cdn} alt={setName} className="filter-icon" />
                    <span>{setName}</span>
                </>
            );
        case 'mainstat':
            const [, stat] = item.data as [number, string];
            return (
                <div className="filter-mainstat">
                    <img 
                        src={getStatPaths(stat).cdn} 
                        alt={stat} 
                        className={`build-stat-icon ${getElementClass(stat)}`}
                    />
                    <span>{stat}</span>
                </div>
            );
        case 'region':
            const regionId = item.data as number;
            const regionName = Object.entries(REGION_MAP)
                .find(([, id]) => id === regionId)?.[0] || 'Unknown';
            return (
                <div className="filter-region">
                    <span>{regionName}</span>
                </div>
            );
            
        default:
            return null;
    }
};

const SelectedTag: React.FC<{
    type: 'character' | 'weapon' | 'echo' | 'mainstat' | 'region';
    data: Character | typeof weaponList[0] | [number, number] | [number, string] | number;
    onRemove: () => void;
}> = ({ type, data, onRemove }) => {
    const renderContent = () => {
        switch (type) {
            case 'character':
                const char = data as Character;
                return (
                    <>
                        <img src={getAssetPath('face1', char).cdn} alt={char.name} className="tag-icon"/>
                        <span>{char.name}</span>
                    </>
                );
            case 'weapon':
                const weapon = data as typeof weaponList[0];
                return (
                    <>
                        <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} className="tag-icon"/>
                        <span>{weapon.name}</span>
                    </>
                );
            case 'echo':
                const [count, index] = data as [number, number];
                const element = Object.keys(ELEMENT_SETS)[index];
                const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
                return (
                    <>
                        <span>{count}p</span>
                        <img src={getAssetPath('sets', element).cdn} alt={setName} className="tag-icon echo"/>
                        <span>{setName}</span>
                    </>
                );
            case 'mainstat':
                const [cost, stat] = data as [number, string];
                return (
                    <>
                        <img src={getStatPaths(stat).cdn} alt={stat} className={`build-stat-icon ${getElementClass(stat)}`}/>
                        <span>{stat}</span>
                        <span className="mainstat-cost">| {cost} Cost</span>
                    </>
                );
            case 'region':
                const regionId = data as number;
                const regionName = Object.entries(REGION_MAP)
                    .find(([, id]) => id === regionId)?.[0] || 'Unknown';
                return <span>{regionName}</span>;
        }
    };

    return (
        <div className="selected-tag">
            {renderContent()}
            <X size={16} className="remove-icon" onClick={onRemove} />
        </div>
    );
};

export const BuildFilter: React.FC<BuildFilterProps> = ({ 
    filterState,
    onFilterChange,
    options = {
        includeCharacters: true,
        includeWeapons: true,
        includeEchoes: true,
        includeMainStats: true
    }
}) => {
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [search, setSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFilterUpdate = useCallback(<T extends keyof FilterState>(
        type: T, 
        newValue: FilterState[T]
    ) => {
        onFilterChange({
            ...filterState,
            [type]: newValue
        });
    }, [filterState, onFilterChange]);
    
    const handleCharacterSelect = useCallback((char: Character) => {
        handleFilterUpdate('characterIds', [...filterState.characterIds, char.id]);
        setSearch('');
    }, [handleFilterUpdate, filterState.characterIds]);
    
    const handleWeaponSelect = useCallback((weapon: typeof weaponList[0]) => {
        handleFilterUpdate('weaponIds', [...filterState.weaponIds, weapon.id]);
        setSearch('');
    }, [handleFilterUpdate, filterState.weaponIds]);
    
    const handleEchoSelect = useCallback((set: [number, number]) => {
        handleFilterUpdate('echoSets', [...filterState.echoSets, set]);
        setSearch('');
    }, [handleFilterUpdate, filterState.echoSets]);
    
    const handleMainStatSelect = useCallback((mainStat: [number, string]) => {
        const newMainStats = [...filterState.mainStats, mainStat];
        const mappedStats = newMainStats.map(([cost, stat]) => [
            cost,
            STAT_MAP[stat as keyof typeof STAT_MAP] || stat
        ] as [number, string]);
        handleFilterUpdate('mainStats', mappedStats);
        setSearch('');
    }, [handleFilterUpdate, filterState.mainStats]);

    const handleRemove = useMemo(() => ({
        character: (id: string) => {
            const newChars = filterState.characterIds.filter(cId => cId !== id);
            handleFilterUpdate('characterIds', newChars);
        },
        weapon: (id: string) => {
            const newWeapons = filterState.weaponIds.filter(wId => wId !== id);
            handleFilterUpdate('weaponIds', newWeapons);
        },
        echo: () => {
            handleFilterUpdate('echoSets', []);
        },
        mainStat: (stat: [number, string]) => {
            const newMainStats = filterState.mainStats.filter(
                ([cost, type]) => !(cost === stat[0] && type === stat[1])
            );
            const mappedStats = newMainStats.map(([cost, stat]) => [
                cost,
                STAT_MAP[stat as keyof typeof STAT_MAP] || stat
            ] as [number, string]);
            handleFilterUpdate('mainStats', mappedStats);
        },
        region: (id: number) => {
            const newRegions = filterState.regions.filter(r => r !== id);
            handleFilterUpdate('regions', newRegions);
        }
    }), [handleFilterUpdate, filterState]);

    const handleContainerClick = (e: React.MouseEvent) => {
        e.preventDefault();
        inputRef.current?.focus();
    };
    const filteredCharacters = useMemo(() => 
        cachedCharacters?.filter(char => 
            char.name.toLowerCase().includes(search.toLowerCase()) &&
            !filterState.characterIds.includes(char.id)
        ) || [], 
        [search, filterState.characterIds]
    );
    const filteredWeapons = useMemo(() => 
        weaponList.filter(weapon => 
            weapon.name.toLowerCase().includes(search.toLowerCase()) &&
            !filterState.weaponIds.includes(weapon.id)
        ),
        [search, filterState.weaponIds]
    );

    const visibleItems = useMemo<VisibleItem[]>(() => {
        const items: VisibleItem[] = [];
        
        if (options.includeRegions) {
            Object.entries(REGION_MAP)
                .filter(([name]) => 
                    name.toLowerCase().includes(search.toLowerCase()) &&
                    !filterState.regions.includes(REGION_MAP[name])
                )
                .forEach(([, id]) => {
                    items.push({
                        type: 'region' as const,
                        data: id,
                        sectionTitle: 'Regions'
                    });
                });
        }

        if (options.includeCharacters && filteredCharacters?.length) {
            items.push(...filteredCharacters.map(char => ({
                type: 'character' as const,
                data: char,
                sectionTitle: 'Characters'
            })));
        }
        
        if (options.includeWeapons && filteredWeapons?.length) {
            const weaponsByType = filteredWeapons.reduce((acc, weapon) => {
                acc[weapon.type] = [...(acc[weapon.type] || []), weapon];
                return acc;
            }, {} as Record<string, typeof weaponList>);

            Object.entries(weaponsByType).forEach(([type, weapons]) => {
                weapons.forEach(weapon => {
                    items.push({
                        type: 'weapon',
                        data: weapon,
                        sectionTitle: 'Weapons',
                        subSection: type
                    });
                });
            });
        }
    
        if (options.includeEchoes) {
            const filteredEchoes = Object.entries(ELEMENT_SETS)
                .filter(([, name]) => 
                    name.toLowerCase().includes(search.toLowerCase())
                );
            [2, 5].forEach(count => {
                filteredEchoes.forEach(([element], ) => {
                    const setIndex = Object.keys(ELEMENT_SETS).indexOf(element);
                    if (!filterState.echoSets.some(([c, i]) => c === count && i === setIndex)) {
                        items.push({
                            type: 'echo',
                            data: [count, setIndex] as [number, number],
                            sectionTitle: 'Echo Sets'
                        });
                    }
                });
            });
        }

        if (options.includeMainStats) {
            [4, 3, 1].forEach(cost => {
                const stats = mainStatsCache.getMainStatsByCost(cost);
                if (stats) {
                    Object.entries(stats)
                        .filter(([name]) => {
                            const searchMatch = name.toLowerCase().includes(search.toLowerCase());
                            const notSelected = !filterState.mainStats.some(
                                ([c, s]) => c === cost && s === name
                            );
                            return searchMatch && notSelected;
                        })
                        .forEach(([name]) => {
                            items.push({
                                type: 'mainstat',
                                data: [cost, name] as [number, string],
                                sectionTitle: 'Main Stats'
                            });
                        });
                }
            });
        }
        
        return items;
    }, [filteredCharacters, filteredWeapons, search, filterState, options]);

    const handleItemSelect = useCallback((item: VisibleItem) => {
        switch (item.type) {
            case 'character':
                handleCharacterSelect(item.data as Character);
                break;
            case 'weapon':
                handleWeaponSelect(item.data as typeof weaponList[0]);
                break;
            case 'echo':
                handleEchoSelect(item.data as [number, number]);
                break;
            case 'mainstat':
                handleMainStatSelect(item.data as [number, string]);
                break;
            case 'region':
                handleFilterUpdate('regions', [...filterState.regions, item.data as number]);
                setSearch('');
                break;
        }
    }, [handleCharacterSelect, handleWeaponSelect, handleEchoSelect, handleMainStatSelect, handleFilterUpdate, filterState.regions]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && search === '') {
            e.preventDefault();
            if (filterState.regions.length) {
                handleRemove.region(filterState.regions[filterState.regions.length - 1]);
            } else if (filterState.mainStats.length) {
                handleRemove.mainStat(filterState.mainStats[filterState.mainStats.length - 1]);
            } else if (filterState.echoSets.length) {
                handleRemove.echo();
            } else if (filterState.weaponIds.length) {
                handleRemove.weapon(filterState.weaponIds[filterState.weaponIds.length - 1]);
            } else if (filterState.characterIds.length) {
                handleRemove.character(filterState.characterIds[filterState.characterIds.length - 1]);
            }
            return;
        }

        if (!isDropdownVisible || !visibleItems.length) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => 
                    prev >= visibleItems.length - 1 ? 0 : prev + 1
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => 
                    prev <= 0 ? visibleItems.length - 1 : prev - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0) {
                    handleItemSelect(visibleItems[focusedIndex]);
                }
                break;
        }
    };
    useEffect(() => {
        if (focusedIndex >= 0) {
            const element = document.querySelector(`[data-index="${focusedIndex}"]`);
            element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusedIndex]);

    useEffect(() => {
        setFocusedIndex(isDropdownVisible ? 0 : -1);
    }, [isDropdownVisible]);

    useEffect(() => {
        setFocusedIndex(0);
    }, [search]);

    const hasSelectedItems = filterState.characterIds.length > 0 || filterState.weaponIds.length > 0 || filterState.echoSets.length > 0 || filterState.mainStats.length > 0;

    const getSectionHeader = (item: VisibleItem, index: number, items: VisibleItem[]) => {
        if (index === 0 || items[index - 1].sectionTitle !== item.sectionTitle) {
            const header = <div key={`header-${item.sectionTitle}`} className="section-header">
                {item.sectionTitle}
            </div>;
            const subHeader = (() => {
                switch (item.type) {
                    case 'weapon':
                        if (index === 0 || items[index - 1].subSection !== item.subSection) {
                            return <div key={`subheader-${item.subSection}`} className="weapon-type-header">
                                {item.subSection}
                            </div>;
                        }
                        return null;
                    case 'echo':
                        const [count] = item.data as [number, number];
                        return <div key={`subheader-${count}`} className="echo-count-header">
                            {count}p sets
                        </div>;
                    case 'mainstat':
                        const [cost] = item.data as [number, string];
                        return <div key={`subheader-${cost}`} className="weapon-type-header">
                            {cost} Cost
                        </div>;
                    default:
                        return null;
                }
            })();
            return [header, subHeader].filter(Boolean);
        }
        
        switch (item.type) {
            case 'weapon':
                if (items[index - 1].subSection !== item.subSection) {
                    return <div key={`subheader-${item.subSection}`} className="weapon-type-header">
                        {item.subSection}
                    </div>;
                }
                break;
            case 'echo':
                const [currentCount] = item.data as [number, number];
                const [previousCount] = (items[index - 1].data as [number, number]);
                if (currentCount !== previousCount) {
                    return <div key={`subheader-${currentCount}`} className="echo-count-header">
                        {currentCount}p sets
                    </div>;
                }
                break;
            case 'mainstat':
                const [currentCost] = item.data as [number, string];
                const [previousCost] = (items[index - 1].data as [number, string]);
                if (currentCost !== previousCost) {
                    return <div key={`subheader-${currentCost}`} className="weapon-type-header">
                        {currentCost} Cost
                    </div>;
                }
                break;
        }
        return null;
    };

    return (
        <div className="build-filter">
            <div className="filter-input-container" onClick={handleContainerClick}>
                <div className="selected-tags">
                    {filterState.characterIds.map(charId => {
                        const char = cachedCharacters?.find(c => c.id === charId);
                        if (!char) return null;
                        return (
                            <SelectedTag 
                                key={charId} 
                                type="character" 
                                data={char} 
                                onRemove={() => handleRemove.character(charId)} 
                            />
                        );
                    })}
                    {filterState.weaponIds.map(weaponId => {
                        const weapon = weaponList.find(w => w.id === weaponId);
                        if (!weapon) return null;
                        return (
                            <SelectedTag 
                                key={weaponId} 
                                type="weapon" 
                                data={weapon} 
                                onRemove={() => handleRemove.weapon(weaponId)} 
                            />
                        );
                    })}
                    {filterState.echoSets.map(set => 
                        <SelectedTag key={`${set[0]}-${set[1]}`} type="echo" data={set} onRemove={() => handleRemove.echo()} />
                    )}
                    {filterState.mainStats.map(stat => 
                        <SelectedTag key={`${stat[0]}-${stat[1]}`} type="mainstat" data={stat} onRemove={() => handleRemove.mainStat(stat)} />
                    )}
                    {filterState.regions.map(regionId => 
                        <SelectedTag key={`region-${regionId}`} type="region" data={regionId} onRemove={() => handleRemove.region(regionId)} />
                    )}
                    <input ref={inputRef}
                        type="text"
                        className="filter-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 100)}
                        placeholder={hasSelectedItems ? "" : "Search filters (e.g. region, character, weapon, echo, main stat)"}
                    />
                </div>
            </div>
            {(isDropdownVisible || search) && (
                <div className="unified-dropdown">
                    {visibleItems.reduce((acc, item, index) => {
                        const headers = getSectionHeader(item, index, visibleItems);
                        if (headers) {
                            acc.push(...(Array.isArray(headers) ? headers : [headers]));
                        }
                        
                        acc.push(
                            <div key={`item-${index}`}
                                data-index={index}
                                className={`filter-option ${focusedIndex === index ? 'focused' : ''}`}
                                onClick={() => handleItemSelect(item)}
                                onMouseEnter={() => setFocusedIndex(index)}
                                onMouseDown={e => e.preventDefault()}
                            >
                                <FilterOption item={item} />
                            </div>
                        );
                        
                        return acc;
                    }, [] as React.ReactNode[])}
                </div>
            )}
        </div>
    );
};