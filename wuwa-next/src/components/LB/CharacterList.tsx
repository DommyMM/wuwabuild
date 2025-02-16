'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cachedCharacters } from '@/hooks/useCharacters';
import { LB_URL } from '@/components/Import/Results';
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
        <Image 
            src={getAssetPath('face1', character as Character).cdn}
            alt={character?.name ?? ''}
            className={`build-portrait ${elementClass}`}
            width={256}
            height={256}
        />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const LeaderboardTeamSection: React.FC<{ characterId: string }> = ({ characterId }) => {
    if (characterId !== "32") return <div className="build-team">--</div>;

    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.teamIds.length) return <div className="build-team">--</div>;

    return (
        <div className="build-team">
            <div className="preview-grid">
                {config.teamIds.map(id => {
                    const character = cachedCharacters?.find(c => c.id === id);
                    if (!character) return null;
                    return (
                        <img 
                            key={id}
                            src={getAssetPath('face1', character).cdn}
                            alt={character.name}
                            className="preview-icon face"
                        />
                    );
                })}
            </div>
        </div>
    );
};

const LeaderboardWeaponsWithRank: React.FC<{ 
    characterId: string;
    weapons: Array<{
        weaponId: string;
        damage: number;
        owner: { username?: string; uid?: string; }
    }>;
    onWeaponClick?: (weaponIndex: number) => void;
}> = ({ characterId, weapons, onWeaponClick }) => {
    if (characterId !== "32") return <div className="build-weapons">--</div>;
    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.weapons) return <div className="build-weapons">--</div>;

    return (
        <div className="build-weapons-rank">
            {config.weapons.map((configWeaponId, index) => {
                const weapon = getCachedWeapon(configWeaponId);
                const weaponData = weapons.find(w => w.weaponId === configWeaponId);
                if (!weapon) return null;

                return (
                    <div 
                        key={configWeaponId} 
                        className="weapon-rank-entry"
                        onClick={(e) => {
                            e.stopPropagation();
                            onWeaponClick?.(index);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={getAssetPath('weapons', weapon).cdn}
                            alt={weapon.name}
                            className="preview-icon weapon"
                        />
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

const LeaderboardEntry: React.FC<{ 
    data: LeaderboardData;
    onCharacterClick: (id: string, data: LeaderboardData) => void;
    onWeaponClick: (id: string, data: LeaderboardData, weaponIndex: number) => void;
}> = ({ data, onCharacterClick, onWeaponClick }) => {
    const character = cachedCharacters?.find(c => c.id === data._id);
    const elementClass = character?.element.toLowerCase() ?? '';
    const isDisabled = data._id !== "32";
    
    return (
        <div className={`build-entry ${isDisabled ? 'disabled' : ''}`}
            onClick={() => onCharacterClick(data._id, data)}
        >
            <div className='build-main-content'>
                <LeaderboardCharacterSection 
                    character={character} 
                    elementClass={elementClass} 
                />
                <LeaderboardTeamSection characterId={data._id} />
                <div className="lb-entries">
                    {isDisabled ? 'Coming Soon' : data.totalEntries}
                </div>
                <LeaderboardWeaponsWithRank 
                    characterId={data._id}
                    weapons={data.weapons}
                    onWeaponClick={(index) => onWeaponClick(data._id, data, index)}
                />
            </div>
        </div>
    );
};

const CharacterList: React.FC = () => {
    const router = useRouter();
    const [data, setData] = useState<LeaderboardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${LB_URL}/leaderboard`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const json = await response.json();
                setData(json.characters);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCharacterClick = (id: string, data: LeaderboardData) => {
        if (id === "32") {
            router.push(`/leaderboards/${id}?weapon=0`);
        }
    };

    const handleWeaponClick = (id: string, data: LeaderboardData, weaponIndex: number) => {
        if (id === "32") {
            router.push(`/leaderboards/${id}?weapon=${weaponIndex}`);
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
                            {data.map(entry => (
                                <LeaderboardEntry 
                                    key={entry._id}
                                    data={entry}
                                    onCharacterClick={handleCharacterClick}
                                    onWeaponClick={handleWeaponClick}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterList;