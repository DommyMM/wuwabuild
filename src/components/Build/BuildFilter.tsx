'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
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

const CharacterSection: React.FC<{
    search: string;
    selected: Character[];
    onSelect: (char: Character) => void;
}> = ({ search, selected, onSelect }) => {
    const filteredCharacters = useMemo(() => 
        cachedCharacters?.filter(char => 
            char.name.toLowerCase().includes(search.toLowerCase()) &&
            !selected.some(c => c.id === char.id)
        ) || [], 
        [search, selected]
    );

    if (filteredCharacters.length === 0) return null;

    return (
        <div className="filter-section">
            <div className="section-header">Characters</div>
            <div className="section-content character">
                {filteredCharacters.map(char => (
                    <div key={char.id} className="filter-option" onClick={() => onSelect(char)} onMouseDown={e => e.preventDefault()}>
                        <Image src={getAssetPath('face1', char).cdn} alt={char.name} width={32} height={32} className="filter-icon" />
                        <span>{char.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WeaponSection: React.FC<{
    search: string;
    selected: typeof weaponList;
    onSelect: (weapon: typeof weaponList[0]) => void;
}> = ({ search, selected, onSelect }) => {
    const filteredWeapons = useMemo(() => 
        Object.entries(weaponList.reduce((acc, weapon) => {
            if (weapon.name.toLowerCase().includes(search.toLowerCase()) && !selected.some(w => w.id === weapon.id)) {
                acc[weapon.type] = [...(acc[weapon.type] || []), weapon];
            }
            return acc;
        }, {} as Record<string, typeof weaponList>)),
        [search, selected]
    );

    if (filteredWeapons.length === 0) return null;

    return (
        <div className="filter-section">
            <div className="section-header">Weapons</div>
            <div className="section-content weapon-groups">
                {filteredWeapons.map(([type, weapons]) => (
                    <div key={type}>
                        <div className="weapon-type-header">{type}</div>
                        {weapons.map(weapon => (
                            <div key={weapon.id} className="filter-option" onClick={() => onSelect(weapon)} onMouseDown={e => e.preventDefault()}>
                                <div className="filter-weapon">
                                    <Image src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} width={32} height={32} className="filter-icon" />
                                    <span>{weapon.name}</span>
                                </div>
                                <span className="weapon-rarity">{weapon.rarity}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const EchoSection: React.FC<{
    search: string;
    selected: Array<[number, number]>;
    onSelect: (set: [number, number]) => void;
}> = ({ search, selected, onSelect }) => {
    const filteredEchoes = useMemo(() => 
        Object.entries(ELEMENT_SETS).filter(([, name]) => 
            name.toLowerCase().includes(search.toLowerCase())
        ),
        [search]
    );

    if (filteredEchoes.length === 0) return null;
    const availableSets = [2, 5].reduce((count, pieceCount) => 
        count + filteredEchoes.reduce((setCount, [element]) => {
            const actualIndex = Object.keys(ELEMENT_SETS).indexOf(element);
            return setCount + (selected.some(([selectedCount, idx]) => 
                selectedCount === pieceCount && idx === actualIndex
            ) ? 0 : 1);
        }, 0)
    , 0);
    if (availableSets === 0) return null;
    return (
        <div className="filter-section">
            <div className="section-header">Echo Sets</div>
            <div className="section-content echo-groups">
                {[2, 5].map(count => (
                    <div key={count}>
                        <div className="echo-count-header">{count}p sets</div>
                        {filteredEchoes.map(([element]) => {
                            const actualIndex = Object.keys(ELEMENT_SETS).indexOf(element);
                            const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
                            const isSelected = selected.some(([selectedCount, idx]) => 
                                selectedCount === count && idx === actualIndex
                            );
                            
                            if (isSelected) return null;
                            return (
                                <div key={`${count}-${element}`} className="filter-option" onClick={() => onSelect([count, actualIndex])} onMouseDown={e => e.preventDefault()}>
                                    <Image src={getAssetPath('sets', element).cdn} alt={setName} width={76} height={76} className="filter-icon" /><span>{setName}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
const MainStatSection: React.FC<{
    search: string;
    selected: Array<[number, string]>;
    onSelect: (mainStat: [number, string]) => void;
}> = ({ search, selected, onSelect }) => {
    const filteredStats = useMemo(() => 
        [4, 3, 1].reduce((acc, cost) => {
            const stats = mainStatsCache.getMainStatsByCost(cost);
            if (!stats) return acc;
            const filtered = Object.entries(stats)
                .filter(([name]) => {
                    const searchMatch = name.toLowerCase().includes(search.toLowerCase()) || `${cost}`.includes(search.toLowerCase());
                    const notSelected = !selected.some(
                        ([sCost, sStat]) => sCost === cost && sStat === name
                    );
                    return searchMatch && notSelected;
                })
                .map(([name]) => [cost, name] as [number, string]);
            if (filtered.length > 0) acc[cost] = filtered;
            return acc;
        }, {} as Record<number, Array<[number, string]>>),
        [search, selected]
    );
    if (Object.keys(filteredStats).length === 0) return null;
    return (
        <div className="filter-section">
            <div className="section-header">Main Stats</div>
            <div className="section-content mainstat-groups">
                {[4, 3, 1].map(cost => !filteredStats[cost] ? null : (
                    <div key={cost}>
                        <div className="weapon-type-header">{cost} Cost</div>
                        {filteredStats[cost].map(([cost, stat]) => (
                            <div key={`${cost}-${stat}`} className="filter-option" onClick={() => onSelect([cost, stat])} onMouseDown={e => e.preventDefault()}>
                                <div className="filter-mainstat">
                                    <Image src={getStatPaths(stat).cdn} alt={stat} width={96} height={96} className="filter-icon" />
                                    <span>{stat}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
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
                        <Image src={getAssetPath('face1', char).cdn} alt={char.name} width={32} height={32} className="tag-icon"/>
                        <span>{char.name}</span>
                    </>
                );
            case 'weapon':
                const weapon = data as typeof weaponList[0];
                return (
                    <>
                        <Image src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} width={32} height={32} className="tag-icon"/>
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
                        <Image src={getAssetPath('sets', element).cdn} alt={setName} width={76} height={76} className="tag-icon echo"/>
                        <span>{setName}</span>
                    </>
                );
            case 'mainstat':
                const [cost, stat] = data as [number, string];
                return (
                    <>
                        <Image src={getStatPaths(stat).cdn} alt={stat} width={96} height={96} className="tag-icon"/>
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

interface FilterState {
    characters: Character[];
    weapons: typeof weaponList;
    echoSets: Array<[number, number]>;
    mainStats: Array<[number, string]>;
}

interface BuildFilterProps {
    onCharacterFilter: (characterIds: string[]) => void;
    onWeaponFilter: (weaponIds: string[]) => void;
    onEchoFilter: (sets: Array<[number, number]>) => void;
    onMainStatFilter: (stats: Array<[number, string]>) => void;
}

export const BuildFilter: React.FC<BuildFilterProps> = ({ onCharacterFilter, onWeaponFilter, onEchoFilter, onMainStatFilter }) => {
    const [search, setSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selected, setSelected] = useState<FilterState>({ characters: [], weapons: [], echoSets: [], mainStats: [] });
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCharacterSelect = useCallback((char: Character) => {
        setSelected(prev => {
            const newChars = [...prev.characters, char];
            const newState = { ...prev, characters: newChars };
            requestAnimationFrame(() => onCharacterFilter(newChars.map(c => c.id)));
            return newState;
        });
        setSearch('');
    }, [onCharacterFilter]);

    const handleWeaponSelect = useCallback((weapon: typeof weaponList[0]) => {
        setSelected(prev => {
            const newWeapons = [...prev.weapons, weapon];
            const newState = { ...prev, weapons: newWeapons };
            requestAnimationFrame(() => onWeaponFilter(newWeapons.map(w => w.id)));
            return newState;
        });
        setSearch('');
    }, [onWeaponFilter]);

    const handleEchoSelect = useCallback((set: [number, number]) => {
        setSelected(prev => {
            const newEchos = [...prev.echoSets, set];
            const newState = { ...prev, echoSets: newEchos };
            requestAnimationFrame(() => onEchoFilter(newEchos));
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
            
            requestAnimationFrame(() => onMainStatFilter(mappedStats));
            return newState;
        });
        setSearch('');
    }, [onMainStatFilter]);
    
    const handleRemove = useMemo(() => ({
        character: (id: string) => setSelected(prev => {
            const newChars = prev.characters.filter(c => c.id !== id);
            const newState = { ...prev, characters: newChars };
            requestAnimationFrame(() => onCharacterFilter(newChars.map(c => c.id)));
            return newState;
        }),
        weapon: (id: string) => setSelected(prev => {
            const newWeapons = prev.weapons.filter(w => w.id !== id);
            const newState = { ...prev, weapons: newWeapons };
            requestAnimationFrame(() => onWeaponFilter(newWeapons.map(w => w.id)));
            return newState;
        }),
        echo: () => setSelected(prev => {
            const newState = { ...prev, echoSets: [] };
            requestAnimationFrame(() => onEchoFilter([]));
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
            
            requestAnimationFrame(() => onMainStatFilter(mappedStats));
            return { ...prev, mainStats: newMainStats };
        })
    }), [onCharacterFilter, onWeaponFilter, onEchoFilter, onMainStatFilter]);

    const handleContainerClick = (e: React.MouseEvent) => {
        e.preventDefault();
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && search === '') {
            e.preventDefault();
            if (selected.mainStats.length > 0) {
                const lastStat = selected.mainStats[selected.mainStats.length - 1];
                handleRemove.mainStat(lastStat);
            } else if (selected.echoSets.length > 0) {
                handleRemove.echo();
            } else if (selected.weapons.length > 0) {
                const lastWeapon = selected.weapons[selected.weapons.length - 1];
                handleRemove.weapon(lastWeapon.id);
            } else if (selected.characters.length > 0) {
                const lastChar = selected.characters[selected.characters.length - 1];
                handleRemove.character(lastChar.id);
            }
        }
    };

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
            {(isDropdownVisible || search) && ( // Show dropdown if focused or has search
                <div className="unified-dropdown">
                    <CharacterSection search={search} selected={selected.characters} onSelect={handleCharacterSelect} />
                    <WeaponSection search={search} selected={selected.weapons} onSelect={handleWeaponSelect} />
                    <EchoSection search={search} selected={selected.echoSets} onSelect={handleEchoSelect} />
                    <MainStatSection search={search} selected={selected.mainStats} onSelect={handleMainStatSelect} />
                </div>
            )}
        </div>
    );
};