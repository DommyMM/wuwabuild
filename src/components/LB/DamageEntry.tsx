import React from 'react';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { Character } from '../../types/character';
import { DecompressedEntry, getSetCounts } from '../Build/types';

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

const BuildSetsSection: React.FC<{ echoPanels: any[] }> = ({ echoPanels }) => (
    <div className="build-sets">
        {Object.entries(getSetCounts(echoPanels))
            .filter(([_, count]) => count >= 2)
            .map(([element, count]) => (
                <div key={element} className="build-set-container">
                    <img src={`images/SetIcons/${element}.png`}
                        alt={element}
                        className="build-set"
                    />
                    <span>{count}</span>
                </div>
            ))}
    </div>
);

export const DamageEntry: React.FC<{ 
    entry: DecompressedEntry; 
    rank: number;
}> = ({ entry, rank }) => {
    const character = cachedCharacters?.find(c => c.id === entry.buildState.characterState.id);
    const damage = entry.calculations?.[0]?.damage || 0;

    return (
        <div className="build-entry">
            <div className="build-main-content">
                <div className="build-rank">#{rank}</div>
                <BuildOwnerSection 
                    username={entry.buildState.watermark?.username}
                    uid={entry.buildState.watermark?.uid}
                />
                <BuildCharacterSection 
                    character={character} 
                    elementClass=""
                />
                <BuildSetsSection echoPanels={entry.buildState.echoPanels} />
                <div className="build-cv">
                    <div className="cv-total">{entry.finalCV.toFixed(1)}</div>
                </div>
                <div className="build-stats">
                    <div>{entry.stats.v.CR?.toFixed(1)}%</div>
                    <div>{entry.stats.v.CD?.toFixed(1)}%</div>
                </div>
                <div className="build-damage">
                    {damage.toLocaleString()}
                </div>
            </div>
        </div>
    );
};