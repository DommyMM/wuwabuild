'use client';

import React, { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { getAssetPath } from '@/types/paths';
import { cachedCharacters } from '@/hooks/useCharacters';
import { Character } from '@/types/character';
import { weaponList } from '@/hooks/useWeapons';
import { ELEMENT_SETS } from '@/types/echo';
import { X } from 'lucide-react';
import '@/styles/BuildFilter.css';

const SelectedCharacterTag: React.FC<{
    char: Character;
    onRemove: (id: string) => void;
}> = ({ char, onRemove }) => (
    <div className="selected-tag">
        <Image 
            src={getAssetPath('face1', char).cdn} 
            alt={char.name} 
            width={32} 
            height={32} 
            className="tag-icon"
        />
        <span>{char.name}</span>
        <X 
            size={16} 
            className="remove-icon" 
            onClick={(e) => {
                e.stopPropagation();
                onRemove(char.id);
            }}
        />
    </div>
);

const CharacterDropdown: React.FC<{
    filteredChars: Character[];
    selectedChars: Character[];
    onSelect: (char: Character) => void;
}> = ({ filteredChars, selectedChars, onSelect }) => (
    <div className="filter-dropdown">
        {filteredChars
            .filter(char => !selectedChars.some(selected => selected.id === char.id))
            .map(char => (
                <div 
                    key={char.id} 
                    className="filter-option"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(char);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Image 
                        src={getAssetPath('face1', char).cdn} 
                        alt={char.name} 
                        width={32} 
                        height={32} 
                        className="filter-icon"
                    />
                    <span>{char.name}</span>
                </div>
            ))}
    </div>
);

const CharacterFilterSection: React.FC<{
    onCharacterFilter: (characterIds: string[]) => void;
}> = ({ onCharacterFilter }) => {
    const [charSearch, setCharSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedChars, setSelectedChars] = useState<Character[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCharacters = useMemo(() => 
        cachedCharacters?.filter(char => 
            char.name.toLowerCase().includes(charSearch.toLowerCase())
        ) || [],
        [charSearch]
    );

    const handleRemoveChar = (id: string) => {
        const newChars = selectedChars.filter(c => c.id !== id);
        setSelectedChars(newChars);
        onCharacterFilter(newChars.map(c => c.id));
    };

    const handleSelectChar = (char: Character) => {
        const newChars = [...selectedChars, char];
        setSelectedChars(newChars);
        onCharacterFilter(newChars.map(c => c.id));
        setCharSearch('');
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="filter-group">
            <span className="filter-label">Char</span>
            <div className="filter-search">
                <div 
                    className="filter-input-container" 
                    onClick={handleContainerClick}
                >
                    <div className="selected-tags">
                        {selectedChars.map(char => (
                            <SelectedCharacterTag 
                                key={char.id} 
                                char={char} 
                                onRemove={handleRemoveChar}
                            />
                        ))}
                        <input
                            ref={inputRef}
                            type="text"
                            className="filter-input"
                            value={charSearch}
                            onChange={(e) => setCharSearch(e.target.value)}
                            onFocus={() => setIsDropdownVisible(true)}
                            onBlur={() => setTimeout(() => setIsDropdownVisible(false), 50)}
                            placeholder={selectedChars.length ? "" : "Search characters..."}
                        />
                    </div>
                </div>
                
                {(isDropdownVisible || charSearch) && (
                    <CharacterDropdown 
                        filteredChars={filteredCharacters}
                        selectedChars={selectedChars}
                        onSelect={handleSelectChar}
                    />
                )}
            </div>
        </div>
    );
};

const SelectedWeaponTag: React.FC<{
    weapon: typeof weaponList[0];
    onRemove: (id: string) => void;
}> = ({ weapon, onRemove }) => (
    <div className="selected-tag">
        <Image 
            src={getAssetPath('weapons', weapon).cdn} 
            alt={weapon.name} 
            width={32} 
            height={32} 
            className="tag-icon"
        />
        <span>{weapon.name}</span>
        <X 
            size={16} 
            className="remove-icon" 
            onClick={(e) => {
                e.stopPropagation();
                onRemove(weapon.id);
            }}
        />
    </div>
);

const WeaponFilterSection: React.FC<{
    onWeaponFilter: (weaponIds: string[]) => void;
}> = ({ onWeaponFilter }) => {
    const [weaponSearch, setWeaponSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedWeapons, setSelectedWeapons] = useState<typeof weaponList>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const weaponsByType = useMemo(() => {
        const grouped = weaponList.reduce((acc, weapon) => {
            const type = weapon.type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(weapon);
            return acc;
        }, {} as Record<string, typeof weaponList>);

        if (weaponSearch) {
            Object.keys(grouped).forEach(type => {
                grouped[type] = grouped[type].filter(weapon => 
                    weapon.name.toLowerCase().includes(weaponSearch.toLowerCase())
                );
                if (grouped[type].length === 0) {
                    delete grouped[type];
                }
            });
        }

        return grouped;
    }, [weaponSearch]);

    const handleRemoveWeapon = (id: string) => {
        const newWeapons = selectedWeapons.filter(w => w.id !== id);
        setSelectedWeapons(newWeapons);
        onWeaponFilter(newWeapons.map(w => w.id));
    };

    const handleSelectWeapon = (weapon: typeof weaponList[0]) => {
        const newWeapons = [...selectedWeapons, weapon];
        setSelectedWeapons(newWeapons);
        onWeaponFilter(newWeapons.map(w => w.id));
        setWeaponSearch('');
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="filter-group">
            <span className="filter-label">Weap</span>
            <div className="filter-search">
                <div 
                    className="filter-input-container" 
                    onClick={handleContainerClick}
                >
                    <div className="selected-tags">
                        {selectedWeapons.map(weapon => (
                            <SelectedWeaponTag 
                                key={weapon.id} 
                                weapon={weapon} 
                                onRemove={handleRemoveWeapon}
                            />
                        ))}
                        <input
                            ref={inputRef}
                            type="text"
                            className="filter-input"
                            value={weaponSearch}
                            onChange={(e) => setWeaponSearch(e.target.value)}
                            onFocus={() => setIsDropdownVisible(true)}
                            onBlur={() => setTimeout(() => setIsDropdownVisible(false), 50)}
                            placeholder={selectedWeapons.length ? "" : "Search weapons..."}
                        />
                    </div>
                </div>
                
                {(isDropdownVisible || weaponSearch) && (
                    <div className="filter-dropdown">
                        {Object.entries(weaponsByType).map(([type, weapons]) => (
                            <div key={type} className="weapon-type-group">
                                <div className="weapon-type-header">{type}</div>
                                {weapons
                                    .filter(weapon => !selectedWeapons.some(w => w.id === weapon.id))
                                    .map(weapon => (
                                        <div key={weapon.id} className="filter-option"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelectWeapon(weapon);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            <div className='filter-weapon'>
                                                <Image src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} width={32} height={32} className="filter-icon"/>
                                                <span>{weapon.name}</span>
                                            </div>
                                            <span className="weapon-rarity">{weapon.rarity}</span>
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface EchoFilterProps {
    onEchoFilter: (sets: Array<[number, number]>) => void;  // [count, elementIndex]
}

const EchoFilterSection: React.FC<EchoFilterProps> = ({ onEchoFilter }) => {
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedSets, setSelectedSets] = useState<Array<[number, number]>>([]);
    const [echoSearch, setEchoSearch] = useState('');

    return (
        <div className="filter-group">
            <span className="filter-label">Echo Sets</span>
            <div className="filter-search">
                {selectedSets.length > 0 ? (
                    <div className="filter-selected" onClick={() => {
                        setSelectedSets([]);
                        setEchoSearch('');
                        onEchoFilter([]);
                    }}>
                        <div className="filter-selected-content">
                            {selectedSets.map(([count, index]) => {
                                const element = Object.keys(ELEMENT_SETS)[index];
                                const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
                                return (
                                    <div key={`${count}-${index}`} className="selected-echo-set">
                                        <span>{count}p</span>
                                        <Image src={getAssetPath('sets', element).cdn} alt={setName} width={76} height={76} className="filter-icon"/>
                                    </div>
                                );
                            })}
                        </div>
                        <X size={16} className="filter-clear-icon" />
                    </div>
                ) : (
                    <input
                        type="text"
                        className="filter-input"
                        value={echoSearch}
                        onChange={(e) => setEchoSearch(e.target.value)}
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 50)}
                        placeholder="Search echo sets..."
                    />
                )}
                
                {!selectedSets.length && (isDropdownVisible || echoSearch) && (
                    <div className="filter-dropdown">
                        {[2, 5].map(count => (
                            <div key={count} className="echo-count-group">
                                <div className="echo-count-header">{count}p sets</div>
                                {Object.entries(ELEMENT_SETS)
                                    .filter(([_, name]) => 
                                        name.toLowerCase().includes(echoSearch.toLowerCase())
                                    )
                                    .map(([element]) => {
                                        const actualIndex = Object.keys(ELEMENT_SETS).indexOf(element);
                                        const setName = ELEMENT_SETS[element as keyof typeof ELEMENT_SETS];
                                        
                                        return (
                                            <div key={element} className="filter-option"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newSet: [number, number] = [count, actualIndex];
                                                    setSelectedSets([newSet]);
                                                    onEchoFilter([newSet]);
                                                    setEchoSearch('');
                                                    setIsDropdownVisible(false);
                                                }}
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
                                                <div className="filter-echo">
                                                    <Image src={getAssetPath('sets', element).cdn} alt={setName} width={76} height={76} className="filter-icon"/>
                                                    <span>{setName}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface BuildFilterProps {
    onCharacterFilter: (characterIds: string[]) => void;
    onWeaponFilter: (weaponIds: string[]) => void;
    onEchoFilter: (sets: Array<[number, number]>) => void;
}

export const BuildFilter: React.FC<BuildFilterProps> = ({ 
    onCharacterFilter, 
    onWeaponFilter,
    onEchoFilter 
}) => {
    return (
        <div className="build-filter">
            <CharacterFilterSection onCharacterFilter={onCharacterFilter} />
            <WeaponFilterSection onWeaponFilter={onWeaponFilter} />
            <EchoFilterSection onEchoFilter={onEchoFilter} />
        </div>
    );
};