import React from 'react';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { Character } from '../../types/character';
import { getCVClass } from '../Save/Card';
import { EchoPanelState } from '../../types/echo';
import { decompressStats } from '../../hooks/useStats';
import { getStatPaths } from '../../types/stats';
import { DecompressedEntry, getSetCounts, getHighestDmg, getHighestDmgBonus } from './types';
import { BuildExpanded } from './BuildExpanded';
import { StatSort } from '../../pages/BuildsPage';

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

export const BuildSetsSection: React.FC<{ echoPanels: EchoPanelState[] }> = ({ echoPanels }) => (
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

const BuildStatsSection: React.FC<{ 
    values: Record<string, number>;
    character: Character | null | undefined;
    activeStat: StatSort | null;
}> = ({ values, character, activeStat }) => {
    const isHealer = character?.Bonus1 === "Healing";
    const [elementType, elementDmg] = isHealer ? 
        ["Healing Bonus", values['Healing Bonus'] || 0] : 
        getHighestDmg(values);
    
    let firstStat: [string, number] = isHealer ?
        ['HP', values['HP']] :
        ['ATK', values['ATK']];
    let secondStat: [string, number] = [elementType, elementDmg];
    let fourthStat: [string, number] = getHighestDmgBonus(values);
    if (activeStat === elementType) {
        secondStat = getHighestDmgBonus(values);
        fourthStat = [elementType, elementDmg];
    } else if (activeStat && !['ATK', 'HP', 'Energy Regen'].includes(activeStat)) {
        fourthStat = [activeStat, values[activeStat] || 0];
    } else if (activeStat === 'HP') {
        if (isHealer) {
            firstStat = ['ATK', values['ATK']];
            fourthStat = ['HP', values['HP']];
        } else {
            fourthStat = ['HP', values['HP']];
        }
    }
    return (
        <div className="build-stats">
            <IconStat statName={firstStat[0]} value={firstStat[1]} isHighlighted={activeStat === firstStat[0]} />
            <IconStat statName={secondStat[0]} value={secondStat[1]} isHighlighted={activeStat === secondStat[0]} />
            <IconStat statName="Energy Regen" value={values['Energy Regen']} isHighlighted={activeStat === 'Energy Regen'} />
            <IconStat statName={fourthStat[0]} value={fourthStat[1]} isHighlighted={activeStat === fourthStat[0]} />
        </div>
    );
};

export const BuildEntry: React.FC<{ 
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
        <div className={`build-entry ${isExpanded ? 'expanded' : ''}`}>
            <div className="build-main-content" onClick={onClick}>
                <div className="build-rank">#{rank}</div>
                <BuildOwnerSection 
                    username={entry.buildState.watermark?.username}
                    uid={entry.buildState.watermark?.uid}
                />
                <BuildCharacterSection character={character} elementClass={elementClass} />
                <div className={`build-sequence s${entry.buildState.currentSequence}`}>
                    <span>S{entry.buildState.currentSequence}</span>
                </div>
                <div className="build-weapon">
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
                <BuildStatsSection values={stats.values} character={character} activeStat={activeStat} />
            </div>
            {isExpanded && <BuildExpanded echoPanels={entry.buildState.echoPanels} character={character ?? null}/>}
        </div>
    );
};