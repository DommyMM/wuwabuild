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

interface VisibleItem {
    type: 'character' | 'weapon' | 'echo' | 'mainstat';
    data: Character | typeof weaponList[0] | [number, number] | [number, string];
    sectionTitle: string;
}

interface FilterState {
    characters: Character[];
    weapons: typeof weaponList;
    echoSets: Array<[number, number]>;
    mainStats: Array<[number, string]>;
}

interface FilterOptions {
    includeCharacters?: boolean;
    includeWeapons?: boolean;
    includeEchoes?: boolean;
    includeMainStats?: boolean;
}

interface BuildFilterProps extends Partial<{
    onCharacterFilter: (characterIds: string[]) => void;
    onWeaponFilter: (weaponIds: string[]) => void;
    onEchoFilter: (sets: Array<[number, number]>) => void;
    onMainStatFilter: (stats: Array<[number, string]>) => void;
}> {
    options?: FilterOptions;
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
                <div className="filter-weapon">
                    <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} className="filter-icon" />
                    <span>{weapon.name}</span>
                    <span className="weapon-rarity">{weapon.rarity}</span>
                </div>
            );
        case 'echo':
            const [count, index] = item.data as [number, number];
            const element = Object.keys(ELEMENT_SETS)[index];
            const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
            return (
                <>
                    <span>{count}p</span>
                    <img src={getAssetPath('sets', element).cdn} alt={setName} className="filter-icon" />
                    <span>{setName}</span>
                </>
            );
        case 'mainstat':
            const [cost, stat] = item.data as [number, string];
            return (
                <div className="filter-mainstat">
                    <img 
                        src={getStatPaths(stat).cdn} 
                        alt={stat} 
                        className={`build-stat-icon ${getElementClass(stat)}`}
                    />
                    <span>{stat}</span>
                    <span className="mainstat-cost">| {cost} Cost</span>
                </div>
            );
    }
};

const SelectedTag: React.FC<{
    type: 'character' | 'weapon' | 'echo' | 'mainstat';
    data: Character | typeof weaponList[0] | [number, number] | [number, string];
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
                        <img 
                            src={getStatPaths(stat).cdn} 
                            alt={stat} 
                            className={`build-stat-icon ${getElementClass(stat)}`}
                        />
                        <span>{stat}</span>
                        <span className="mainstat-cost">| {cost} Cost</span>
                    </>
                );
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
    onCharacterFilter,
    onWeaponFilter,
    onEchoFilter,
    onMainStatFilter,
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
    const [selected, setSelected] = useState<FilterState>({ characters: [], weapons: [], echoSets: [], mainStats: [] });
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCharacterSelect = useCallback((char: Character) => {
        setSelected(prev => {
            const newChars = [...prev.characters, char];
            const newState = { ...prev, characters: newChars };
            requestAnimationFrame(() => onCharacterFilter?.(newChars.map(c => c.id)));
            return newState;
        });
        setSearch('');
    }, [onCharacterFilter]);

    const handleWeaponSelect = useCallback((weapon: typeof weaponList[0]) => {
        setSelected(prev => {
            const newWeapons = [...prev.weapons, weapon];
            const newState = { ...prev, weapons: newWeapons };
            requestAnimationFrame(() => onWeaponFilter?.(newWeapons.map(w => w.id)));
            return newState;
        });
        setSearch('');
    }, [onWeaponFilter]);

    const handleEchoSelect = useCallback((set: [number, number]) => {
        setSelected(prev => {
            const newEchos = [...prev.echoSets, set];
            const newState = { ...prev, echoSets: newEchos };
            requestAnimationFrame(() => onEchoFilter?.(newEchos));
            return newState;
        });
        setSearch('');
    }, [onEchoFilter]);

    const handleMainStatSelect = useCallback((mainStat: [number, string]) => {
        setSelected(prev => {
            const newMainStats = [...prev.mainStats, mainStat];
            const newState = { ...prev, mainStats: newMainStats };
            const mappedStats = newMainStats.map(([cost, stat]) => [
                cost,
                STAT_MAP[stat as keyof typeof STAT_MAP] || stat
            ] as [number, string]);
            
            requestAnimationFrame(() => onMainStatFilter?.(mappedStats));
            return newState;
        });
        setSearch('');
    }, [onMainStatFilter]);
    
    const handleRemove = useMemo(() => ({
        character: (id: string) => setSelected(prev => {
            const newChars = prev.characters.filter(c => c.id !== id);
            const newState = { ...prev, characters: newChars };
            requestAnimationFrame(() => onCharacterFilter?.(newChars.map(c => c.id)));
            return newState;
        }),
        weapon: (id: string) => setSelected(prev => {
            const newWeapons = prev.weapons.filter(w => w.id !== id);
            const newState = { ...prev, weapons: newWeapons };
            requestAnimationFrame(() => onWeaponFilter?.(newWeapons.map(w => w.id)));
            return newState;
        }),
        echo: () => setSelected(prev => {
            const newState = { ...prev, echoSets: [] };
            requestAnimationFrame(() => onEchoFilter?.([]));
            return newState;
        }),
        mainStat: (stat: [number, string]) => setSelected(prev => {
            const newMainStats = prev.mainStats.filter(
                ([cost, type]) => !(cost === stat[0] && type === stat[1])
            );
            
            const mappedStats = newMainStats.map(([cost, stat]) => [
                cost,
                STAT_MAP[stat as keyof typeof STAT_MAP] || stat
            ] as [number, string]);
            
            requestAnimationFrame(() => onMainStatFilter?.(mappedStats));
            return { ...prev, mainStats: newMainStats };
        })
    }), [onCharacterFilter, onWeaponFilter, onEchoFilter, onMainStatFilter]);

    const handleContainerClick = (e: React.MouseEvent) => {
        e.preventDefault();
        inputRef.current?.focus();
    };

    const filteredCharacters = useMemo(() => 
        cachedCharacters?.filter(char => 
            char.name.toLowerCase().includes(search.toLowerCase()) &&
            !selected.characters.some(c => c.id === char.id)
        ) || [], 
        [search, selected.characters]
    );

    const filteredWeapons = useMemo(() => 
        weaponList.filter(weapon => 
            weapon.name.toLowerCase().includes(search.toLowerCase()) &&
            !selected.weapons.some(w => w.id === weapon.id)
        ),
        [search, selected.weapons]
    );

    const visibleItems = useMemo<VisibleItem[]>(() => {
        const items: VisibleItem[] = [];
        
        if (options.includeCharacters && filteredCharacters?.length) {
            items.push(...filteredCharacters.map(char => ({
                type: 'character' as const,
                data: char,
                sectionTitle: 'Characters'
            })));
        }
        
        if (options.includeWeapons && filteredWeapons?.length) {
            items.push(...filteredWeapons.map(weapon => ({
                type: 'weapon' as const,
                data: weapon,
                sectionTitle: 'Weapons'
            })));
        }
    
        if (options.includeEchoes) {
            const filteredEchoes = Object.entries(ELEMENT_SETS)
                .filter(([, name]) => name.toLowerCase().includes(search.toLowerCase()));
            [2, 5].forEach(count => {
                filteredEchoes.forEach(([], index) => {
                    if (!selected.echoSets.some(([c, i]) => c === count && i === index)) {
                        items.push({
                            type: 'echo',
                            data: [count, index] as [number, number],
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
                            const notSelected = !selected.mainStats.some(
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
    }, [filteredCharacters, filteredWeapons, search, selected, options]);

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
        }
    }, [handleCharacterSelect, handleWeaponSelect, handleEchoSelect, handleMainStatSelect]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && search === '') {
            e.preventDefault();
            if (selected.mainStats.length) {
                handleRemove.mainStat(selected.mainStats[selected.mainStats.length - 1]);
            } else if (selected.echoSets.length) {
                handleRemove.echo();
            } else if (selected.weapons.length) {
                handleRemove.weapon(selected.weapons[selected.weapons.length - 1].id);
            } else if (selected.characters.length) {
                handleRemove.character(selected.characters[selected.characters.length - 1].id);
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

    const hasSelectedItems = selected.characters.length > 0 || selected.weapons.length > 0 || selected.echoSets.length > 0 || selected.mainStats.length > 0;

    return (
        <div className="build-filter">
            <div className="filter-input-container" onClick={handleContainerClick}>
                <div className="selected-tags">
                    {selected.characters.map(char => 
                        <SelectedTag key={char.id} type="character" data={char} onRemove={() => handleRemove.character(char.id)} />
                    )}
                    {selected.weapons.map(weapon => 
                        <SelectedTag key={weapon.id} type="weapon" data={weapon} onRemove={() => handleRemove.weapon(weapon.id)} />
                    )}
                    {selected.echoSets.map(set => 
                        <SelectedTag key={`${set[0]}-${set[1]}`} type="echo" data={set} onRemove={() => handleRemove.echo()} />
                    )}
                    {selected.mainStats.map(stat => 
                        <SelectedTag 
                            key={`${stat[0]}-${stat[1]}`} 
                            type="mainstat" 
                            data={stat} 
                            onRemove={() => handleRemove.mainStat(stat)} 
                        />
                    )}
                    <input 
                        ref={inputRef}
                        type="text"
                        className="filter-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 100)}
                        placeholder={hasSelectedItems ? "" : "Search filters (e.g. character, weapon, echo, main stat)"}
                    />
                </div>
            </div>
            {(isDropdownVisible || search) && (
                <div className="unified-dropdown">
                    {visibleItems.reduce((acc, item, index) => {
                        if (index === 0 || visibleItems[index - 1].sectionTitle !== item.sectionTitle) {
                            acc.push(
                                <div key={`header-${item.sectionTitle}`} className="section-header">
                                    {item.sectionTitle}
                                </div>
                            );
                        }
                        
                        acc.push(
                            <div 
                                key={`item-${index}`}
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