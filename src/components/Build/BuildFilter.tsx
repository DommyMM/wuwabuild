'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { getAssetPath } from '@/types/paths';
import { cachedCharacters } from '@/hooks/useCharacters';
import { Character } from '@/types/character';
import { weaponList } from '@/hooks/useWeapons';
import { X } from 'lucide-react';

const CharacterFilterSection: React.FC<{
    onCharacterFilter: (characterId: string | null) => void;
}> = ({ onCharacterFilter }) => {
    const [charSearch, setCharSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedChar, setSelectedChar] = useState<Character | null>(null);

    const filteredCharacters = useMemo(() => 
        cachedCharacters?.filter(char => 
            char.name.toLowerCase().includes(charSearch.toLowerCase())
        ) || [],
        [charSearch]
    );

    return (
        <div className="filter-group">
            <span className="filter-label">Character</span>
            <div className="filter-search">
                {selectedChar ? (
                    <div className="filter-selected" onClick={() => {
                        setSelectedChar(null);
                        setCharSearch('');
                        onCharacterFilter(null);
                    }}>
                        <div className="filter-selected-content">
                            <Image src={getAssetPath('face1', selectedChar).cdn} alt={selectedChar.name} width={256} height={256} className="filter-icon"/>
                            <span>{selectedChar.name}</span>
                        </div>
                        <X size={16} className="filter-clear-icon" />
                    </div>
                ) : (
                    <input
                        type="text"
                        className="filter-input"
                        value={charSearch}
                        onChange={(e) => setCharSearch(e.target.value)}
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 50)}
                        placeholder="Search characters..."
                    />
                )}
                
                {!selectedChar && (isDropdownVisible || charSearch) && (
                    <div className="filter-dropdown">
                        {filteredCharacters.map(char => (
                            <div key={char.id} className="filter-option"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCharacterFilter(char.id);
                                    setSelectedChar(char);
                                    setCharSearch('');
                                    setIsDropdownVisible(false);
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                }}
                            >
                                <Image src={getAssetPath('face1', char).cdn} alt={char.name} width={256} height={256} className="filter-icon"/>
                                <span>{char.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const WeaponFilterSection: React.FC<{
    onWeaponFilter: (weaponId: string | null) => void;
}> = ({ onWeaponFilter }) => {
    const [weaponSearch, setWeaponSearch] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedWeapon, setSelectedWeapon] = useState<typeof weaponList[0] | null>(null);

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

    return (
        <div className="filter-group">
            <span className="filter-label">Weapon</span>
            <div className="filter-search">
                {selectedWeapon ? (
                    <div className="filter-selected" onClick={() => {
                        setSelectedWeapon(null);
                        setWeaponSearch('');
                        onWeaponFilter(null);
                    }}>
                        <div className="filter-selected-content">
                            <Image src={getAssetPath('weapons', selectedWeapon).cdn} alt={selectedWeapon.name} width={256} height={256} className="filter-icon"/>
                            <span>{selectedWeapon.name}</span>
                        </div>
                        <X size={16} className="filter-clear-icon" />
                    </div>
                ) : (
                    <input type="text"
                        className="filter-input"
                        value={weaponSearch}
                        onChange={(e) => setWeaponSearch(e.target.value)}
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 50)}
                        placeholder="Search weapons..."
                    />
                )}
                
                {!selectedWeapon && (isDropdownVisible || weaponSearch) && (
                    <div className="filter-dropdown">
                        {Object.entries(weaponsByType).map(([type, weapons]) => (
                            <div key={type} className="weapon-type-group">
                                <div className="weapon-type-header">{type}</div>
                                {weapons.map(weapon => (
                                    <div key={weapon.id} className="filter-option"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onWeaponFilter(weapon.id);
                                            setSelectedWeapon(weapon);
                                            setWeaponSearch('');
                                            setIsDropdownVisible(false);
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                        }}
                                    >
                                        <div className='filter-weapon'>
                                            <Image src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} width={256} height={256} className="filter-icon"/>
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

interface BuildFilterProps {
    onCharacterFilter: (characterId: string | null) => void;
    onWeaponFilter: (weaponId: string | null) => void;
}

export const BuildFilter: React.FC<BuildFilterProps> = ({ 
    onCharacterFilter, 
    onWeaponFilter 
}) => {
    return (
        <div className="build-filter">
            <span>Filters: </span>
            <CharacterFilterSection onCharacterFilter={onCharacterFilter} />
            <WeaponFilterSection onWeaponFilter={onWeaponFilter} />
        </div>
    );
};