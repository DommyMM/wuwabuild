'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAssetPath } from '@/types/paths';
import { Character } from '@/types/character';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { CHARACTER_CONFIGS } from './config';

interface LeaderboardData {
    _id: string;
    totalEntries: number;
    weapons: Array<{
        weaponId: string;
        damage: number;
        owner: {
            username?: string;
            uid?: string;
        }
    }>;
    topBuild?: {
        damage: number;
        owner: {
            username?: string;
            uid?: string;
        }
    };
}

const LeaderboardHeader: React.FC = () => (
    <div className="build-header-container">
        <h1 className="build-header-title">Damage Leaderboards</h1>
        <span className="build-header-text">
            Characters are <strong>standardized</strong> to the same conditions. 
            The only variables between build calculations are the <strong>five echoes</strong><br />
            Click on a character to view more details
        </span>
    </div>
);

const LeaderboardCharacterSection: React.FC<{
    character: Character | null | undefined;
    elementClass: string;
}> = ({ character, elementClass }) => (
    <div className="build-character">
        <img src={getAssetPath('face1', character as Character).cdn} alt={character?.name ?? ''} className={`build-portrait ${elementClass}`} />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const LeaderboardTeamSection: React.FC<{ 
    characterId: string;
    characters: Character[];
}> = ({ characterId, characters }) => {
    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.enabled || !config.teamIds.length) return <div className="build-team">--</div>;

    return (
        <div className="build-team">
            <div className="preview-grid">
                {config.teamIds.map(id => {
                    const character = characters.find(c => c.id === id);
                    if (!character) return null;
                    return (
                        <img key={id} src={getAssetPath('face1', character).cdn} alt={character.name} className="preview-icon face" />
                    );
                })}
            </div>
        </div>
    );
};

interface LeaderboardEntryProps {
    data: LeaderboardData;
    character: Character | undefined;
    characters: Character[];
    onCharacterClick: (id: string) => void;
    onWeaponClick: (id: string, weaponIndex: number) => void;
}

const LeaderboardWeaponsWithRank: React.FC<{ 
    characterId: string;
    weapons: Array<{
        weaponId: string;
        damage: number;
        owner: { username?: string; uid?: string; }
    }> ;
    onWeaponClick?: (weaponIndex: number) => void;
}> = ({ characterId, weapons, onWeaponClick }) => {
    const config = CHARACTER_CONFIGS[characterId];
    
    // Show "Coming Soon" instead of dashes for disabled characters
    if (!config?.enabled || !config.weapons) {
        return <div className="build-weapons">Coming Soon</div>;
    }

    return (
        <div className="build-weapons-rank">
            {config.weapons.map((configWeaponId, index) => {
                const weapon = getCachedWeapon(configWeaponId);
                const weaponData = weapons.find(w => w.weaponId === configWeaponId);
                if (!weapon) return null;

                return (
                    <div key={configWeaponId} 
                        className="weapon-rank-entry"
                        onClick={(e) => {
                            e.stopPropagation();
                            onWeaponClick?.(index);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} className="preview-icon weapon" />
                        <div className="weapon-rank-info">
                            <div className="rank1-name">
                                {weaponData?.owner.username || 'Anonymous'}
                            </div>
                            <div className="rank1-damage">
                                {weaponData?.damage ? Number(weaponData.damage.toFixed(0)).toLocaleString() : '0'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const LeaderboardEntry: React.FC<LeaderboardEntryProps> = ({ 
    data, 
    character,
    characters,
    onCharacterClick, 
    onWeaponClick 
}) => {
    const elementClass = character?.element.toLowerCase() ?? '';
    const isDisabled = !CHARACTER_CONFIGS[data._id]?.enabled;
    
    return (
        <div className={`build-entry ${isDisabled ? 'disabled' : ''}`} onClick={() => onCharacterClick(data._id)}>
            <div className='build-main-content'>
                <LeaderboardCharacterSection character={character} elementClass={elementClass} />
                <LeaderboardTeamSection characterId={data._id} characters={characters} />
                {/* Always show entry counts regardless of disabled status */}
                <div className="lb-entries">{data.totalEntries}</div>
                <LeaderboardWeaponsWithRank characterId={data._id} weapons={data.weapons} onWeaponClick={(index) => onWeaponClick(data._id, index)} />
            </div>
        </div>
    );
};

interface CharacterListProps {
    initialData: LeaderboardData[];
    characters: Character[];
}

const CharacterList: React.FC<CharacterListProps> = ({ 
    initialData,
    characters
}) => {
    const router = useRouter();
    
    // Sort the data to prioritize enabled characters from the config
    const sortedData = [...initialData].sort((a, b) => {
        const configA = CHARACTER_CONFIGS[a._id];
        const configB = CHARACTER_CONFIGS[b._id];
        
        // First, prioritize characters with enabled configs
        if (configA?.enabled && !configB?.enabled) return -1;
        if (!configA?.enabled && configB?.enabled) return 1;
        
        // For characters with same enabled status, sort by entry count
        return b.totalEntries - a.totalEntries;
    });
    
    const [data] = useState<LeaderboardData[]>(sortedData);

    const handleCharacterClick = (id: string) => {
        const config = CHARACTER_CONFIGS[id];
        if (config?.enabled) {
            router.push(`/leaderboards/${id}?weapon=${config.weapons[0]}`);
        }
    };
    
    const handleWeaponClick = (id: string, weaponIndex: number) => {
        const config = CHARACTER_CONFIGS[id];
        if (config?.enabled) {
            router.push(`/leaderboards/${id}?weapon=${config.weapons[weaponIndex]}`);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="overall-wrapper">
                <LeaderboardHeader />
                <div className="build-container">
                    <div className="build-table">
                        <div className="build-header">
                            <span>Character</span>
                            <span>Team</span>
                            <span>Total Entries</span>
                            <span>Weapon Rankings</span>
                        </div>
                        <div className="build-entries">
                            {data.map(entry => {
                                const character = characters.find(c => c.id === entry._id);
                                return (
                                    <LeaderboardEntry 
                                        key={entry._id}
                                        data={entry}
                                        character={character}
                                        characters={characters}
                                        onCharacterClick={handleCharacterClick}
                                        onWeaponClick={handleWeaponClick}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterList;