import React from 'react';
import { cachedCharacters } from '../../hooks/useCharacters';
import { Character } from '../../types/character';
import { getCVClass } from '../Save/Card';
import { DecompressedEntry } from '../Build/types';
import { decompressStats } from '../../hooks/useStats';
import { getStatPaths } from '../../types/stats';
import { BuildSetsSection } from '../Build/BuildEntry';
import { CHARACTER_CONFIGS } from './config';

const BuildOwnerSection: React.FC<{
    username?: string;
    uid?: string;
}> = ({ username, uid }) => (
    <div className="build-owner">
        <div className="owner-name">{username || 'Anonymous'}</div>
        <div className="owner-uid">UID: {uid || '000000000'}</div>
    </div>
);

const BuildCharacterSection: React.FC<{
    character: Character | null | undefined;
    elementClass: string;
}> = ({ character, elementClass }) => (
    <div className="build-character">
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const IconStat: React.FC<{ 
    statName: string;
    value: number;
    isHighlighted?: boolean;
}> = ({ statName, value, isHighlighted }) => {
    const isBasestat = ['ATK', 'HP', 'DEF'].includes(statName);
    const elementType = statName.split(' ')[0].toLowerCase();
    const hasElementalColor = ['fusion', 'aero', 'electro', 'spectro', 'havoc', 'glacio', 'healing'].includes(elementType);
    
    const formattedValue = isBasestat ? 
        value.toFixed(0) : 
        `${value.toFixed(1)}%`;
        
    return (
        <span className={`build-stat ${isHighlighted ? 'highlighted' : ''}`}>
            <img src={getStatPaths(statName).cdn}
                alt={statName}
                className={`build-stat-icon ${hasElementalColor ? elementType : ''}`}
            />
            {formattedValue}
        </span>
    );
};

const StatsDisplay: React.FC<{ 
    stats: Record<string, number>;
    characterId: string;
    activeStat: string | null;
}> = ({ stats, characterId, activeStat }) => {
    const config = CHARACTER_CONFIGS[characterId];
    if (!config) return null;

    return (
        <div className="build-stats">
            {config.stats.map(statName => (
                <IconStat 
                    key={statName} 
                    statName={statName} 
                    value={stats[statName]} 
                    isHighlighted={activeStat === statName}
                />
            ))}
        </div>
    );
};

interface DamageEntryProps {
    entry: DecompressedEntry;
    rank: number;
    activeStat: string | null;
    activeSort: 'damage' | 'cv' | 'stat' | null;
}

export const DamageEntry: React.FC<DamageEntryProps> = ({ 
    entry, 
    rank, 
    activeStat, 
    activeSort 
}) => {
    const character = cachedCharacters?.find(c => c.id === entry.buildState.characterState.id);
    const characterId = entry.buildState.characterState.id || '';
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';
    const damage = entry.calculations?.[0]?.damage || 0;
    const stats = decompressStats(entry.stats);
    const critRate = stats.values['Crit Rate'];
    const critDmg = stats.values['Crit DMG'];

    return (
        <div className="build-entry">
            <div className="build-main-content">
                <div className="build-rank">#{rank}</div>
                <BuildOwnerSection 
                    username={entry.buildState.watermark?.username}
                    uid={entry.buildState.watermark?.uid}
                />
                <BuildCharacterSection character={character} elementClass={elementClass}
                />
                <BuildSetsSection 
                    echoPanels={entry.buildState.echoPanels}
                />
                <div className={`build-cv ${activeSort === 'cv' ? 'highlighted' : ''}`}>
                    <div className="build-cv-ratio">
                        {critRate.toFixed(1)} : {critDmg.toFixed(1)}
                    </div>
                    <div className={`build-cv-value ${getCVClass(entry.cv + entry.cvPenalty)}`}>
                        {entry.cv.toFixed(1)} CV
                        {entry.cvPenalty < 0 && (
                            <span className="cv-penalty">(-44)</span>
                        )}
                    </div>
                </div>
                <StatsDisplay 
                    stats={stats.values}
                    characterId={characterId}
                    activeStat={activeStat}
                />
                <div className={`build-damage ${activeSort === 'damage' ? 'highlighted' : ''}`}>
                    {damage.toLocaleString()}
                </div>
            </div>
        </div>
    );
};