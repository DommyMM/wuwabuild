import React from 'react';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { Character } from '../../types/character';
import { getCVClass } from '../Build/Card';
import { EchoPanelState } from '../../types/echo';
import { decompressStats } from '../../hooks/useStats';
import { getStatPaths } from '../../types/stats';
import { DecompressedEntry, getSetCounts, getHighestDmg, getHighestDmgBonus } from './types';
import { LBExpanded } from './LbExpanded';
import { StatSort } from '../../pages/LeaderboardPage';

const LBOwnerSection: React.FC<{
    username?: string;
    uid?: string;
}> = ({ username, uid }) => (
    <div className="lb-owner">
        <div className="owner-name">{username || 'Anonymous'}</div>
        <div className="owner-uid">UID: {uid || '000000000'}</div>
    </div>
);

const LBCharacterSection: React.FC<{
    character: Character | null | undefined;
    elementClass: string;
}> = ({ character, elementClass }) => (
    <div className="lb-character">
        <img src={getAssetPath('face1', character as Character).cdn}
            alt={character?.name}
            className={`lb-portrait ${elementClass}`}
        />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const LBSetsSection: React.FC<{ echoPanels: EchoPanelState[] }> = ({ echoPanels }) => (
    <div className="lb-sets">
        {Object.entries(getSetCounts(echoPanels))
            .filter(([_, count]) => count >= 2)
            .map(([element, count]) => (
                <div key={element} className="lb-set-container">
                    <img src={`images/SetIcons/${element}.png`}
                        alt={element}
                        className="lb-set"
                    />
                    <span>{count}</span>
                </div>
            ))}
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
        <span className={`lb-stat ${isHighlighted ? 'highlighted' : ''}`}>
            <img src={getStatPaths(statName).cdn}
                alt={statName}
                className={`lb-stat-icon ${hasElementalColor ? elementType : ''}`}
            />
            {formattedValue}
        </span>
    );
};

const LBStatsSection: React.FC<{ 
    values: Record<string, number>;
    character: Character | null | undefined;
    activeStat: StatSort | null;
}> = ({ values, character, activeStat }) => {
    const atk = values['ATK'];
    const er = values['Energy Regen'];
    const isHealer = character?.Bonus1 === "Healing";
    const [elementType, elementDmg] = isHealer ? 
        ["Healing Bonus", values['Healing Bonus'] || 0] : 
        getHighestDmg(values);
    let secondStat: [string, number];
    let fourthStat: [string, number];
    if (activeStat === elementType) {
        secondStat = getHighestDmgBonus(values);
        fourthStat = [elementType, elementDmg];
    } else if (activeStat && !['ATK', 'Energy Regen'].includes(activeStat)) {
        secondStat = [elementType, elementDmg];
        fourthStat = [activeStat, values[activeStat] || 0];
    } else {
        secondStat = [elementType, elementDmg];
        fourthStat = getHighestDmgBonus(values);
    }
    return (
        <div className="lb-stats">
            <IconStat statName="ATK" value={atk} isHighlighted={activeStat === 'ATK'} />
            <IconStat statName={secondStat[0]} value={secondStat[1]} isHighlighted={activeStat === secondStat[0]} />
            <IconStat statName="Energy Regen" value={er} isHighlighted={activeStat === 'Energy Regen'} />
            <IconStat statName={fourthStat[0]} value={fourthStat[1]} isHighlighted={activeStat === fourthStat[0]} />
        </div>
    );
};

export const LBEntry: React.FC<{ 
    entry: DecompressedEntry; 
    rank: number; 
    onClick: () => void; 
    isExpanded: boolean;
    activeStat: StatSort | null;
}> = ({ entry, rank, onClick, isExpanded, activeStat }) => {
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    const weapon = getCachedWeapon(entry.buildState.weaponState.id);
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';

    const stats = decompressStats(entry.stats);
    const critRate = stats.values['Crit Rate'];
    const critDmg = stats.values['Crit DMG'];

    return (
        <div className={`lb-entry ${isExpanded ? 'expanded' : ''}`}>
            <div className="lb-main-content" onClick={onClick}>
                <div className="lb-rank">#{rank}</div>
                <LBOwnerSection 
                    username={entry.buildState.watermark?.username}
                    uid={entry.buildState.watermark?.uid}
                />
                <LBCharacterSection character={character} elementClass={elementClass} />
                <div className={`lb-sequence s${entry.buildState.currentSequence}`}>
                    <span>S{entry.buildState.currentSequence}</span>
                </div>
                <div className="lb-weapon">
                    {weapon && (
                        <>
                            <img src={getAssetPath('weapons', weapon).cdn}
                                alt={weapon.name}
                                className="weapon-portrait"
                            />
                            <span className="weapon-rank">R{entry.buildState.weaponState.rank}</span>
                        </>
                    )}
                </div>
                <LBSetsSection echoPanels={entry.buildState.echoPanels} />
                <div className="lb-cv">
                    <div className="lb-cv-ratio">
                        {critRate.toFixed(1)} : {critDmg.toFixed(1)}
                    </div>
                    <div className={`lb-cv-value ${getCVClass(entry.cv + entry.cvPenalty)}`}>
                        {entry.cv.toFixed(1)} CV
                        {entry.cvPenalty < 0 && (
                            <span className="cv-penalty">(-44)</span>
                        )}
                    </div>
                </div>
                <LBStatsSection values={stats.values} character={character} activeStat={activeStat} />
            </div>
            {isExpanded && <LBExpanded echoPanels={entry.buildState.echoPanels} character={character ?? null}/>}
        </div>
    );
};