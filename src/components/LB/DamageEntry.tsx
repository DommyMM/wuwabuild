import React from 'react';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { Character } from '../../types/character';
import { getCVClass } from '../Save/Card';
import { DecompressedEntry } from '../Build/types';
import { decompressStats } from '../../hooks/useStats';
import { getStatPaths } from '../../types/stats';
import { BuildSetsSection } from '../Build/BuildEntry';

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
        <img src={getAssetPath('face1', character as Character).cdn}
            alt={character?.name}
            className={`build-portrait ${elementClass}`}
        />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const BuildCrit: React.FC<{ 
    stats: Record<string, number>
}> = ({ stats }) => (
    <div className="build-stats">
        <span className="build-stat">
            <img src={getStatPaths('Crit Rate').cdn} alt="CR" className="build-stat-icon" />
            {stats['Crit Rate']?.toFixed(1)}%
        </span>
        <span className="build-stat">
            <img src={getStatPaths('Crit DMG').cdn} alt="CD" className="build-stat-icon" />
            {stats['Crit DMG']?.toFixed(1)}%
        </span>
    </div>
);

export const DamageEntry: React.FC<{ 
    entry: DecompressedEntry; 
    rank: number;
}> = ({ entry, rank }) => {
    const character = cachedCharacters?.find(c => c.id === entry.buildState.characterState.id);
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';
    const damage = entry.calculations?.[0]?.damage || 0;
    const stats = decompressStats(entry.stats);
    const critRate = stats.values['Crit Rate'];
    const critDmg = stats.values['Crit DMG'];

    return (
        <div className="build-entry">
            <div className="build-main-content">
                <div className="build-rank">#{rank}</div>
                <BuildOwnerSection username={entry.buildState.watermark?.username} uid={entry.buildState.watermark?.uid}/>
                <BuildCharacterSection character={character} elementClass={elementClass}/>
                <BuildSetsSection echoPanels={entry.buildState.echoPanels} />
                <div className="build-cv">
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
                <BuildCrit stats={stats.values} />
                <div className="build-damage">
                    {damage.toLocaleString()}
                </div>
            </div>
        </div>
    );
};