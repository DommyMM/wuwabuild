import React from 'react';
import { cachedCharacters } from '@/hooks/useCharacters';
import { Character } from '@/types/character';
import { getCVClass } from '@/components/Save/Card';
import { DecompressedEntry, MoveResult } from '@/components/Build/types';
import { decompressStats } from '@/hooks/useStats';
import { getStatPaths } from '@/types/stats';
import { BuildSetsSection } from '@/components/Build/BuildEntry';
import { CHARACTER_CONFIGS } from './config';
import { Sequence } from '@/components/Build/types';
import { DamageExpanded } from './DamageExpanded';
import '@/styles/Damage.css';

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
            <img src={getStatPaths(statName).local} alt={statName} className={`build-stat-icon ${hasElementalColor ? elementType : ''}`}/>
            {formattedValue}
        </span>
    );
};

const StatsDisplay: React.FC<{ 
    stats: Record<string, number>;
    characterId: string;
    activeStat: string | null;
    isActiveColumn?: boolean;
}> = ({ stats, characterId, activeStat, isActiveColumn }) => {
    const config = CHARACTER_CONFIGS[characterId];
    if (!config) return null;

    return (
        <div className={`build-stats ${isActiveColumn ? 'active-column' : ''}`}>
            {config.stats.map(statName => (
                <IconStat key={statName} 
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
    selectedWeapon?: number;
    selectedSequence?: Sequence;
    isExpanded?: boolean;
    onClick?: () => void;
    moveCache?: Map<string, MoveResult[]>;
    loadingMoves?: Set<string>;
}

export interface SequenceData {
    damage: number;
    moves: MoveResult[];
}

const isSequenceData = (data: unknown): data is SequenceData => {
    return data !== null && typeof data === 'object' && 'damage' in data;
};

export const STAT_MAP = {
    HP: "H",
    ATK: "A",
    DEF: "D",
    "Crit Rate": "CR",
    "Crit DMG": "CD",
    "Aero DMG": "AD",
    "Glacio DMG": "GD",
    "Fusion DMG": "FD",
    "Electro DMG": "ED",
    "Havoc DMG": "HD",
    "Spectro DMG": "SD",
    "Basic Attack DMG Bonus": "BA",
    "Heavy Attack DMG Bonus": "HA",
    "Resonance Liberation DMG Bonus": "RL",
    "Resonance Skill DMG Bonus": "RS",
    "Energy Regen": "ER",
    "Healing Bonus": "HB"
} as const;

export const DamageEntry: React.FC<DamageEntryProps> = ({ 
    entry, 
    rank, 
    activeStat, 
    activeSort,
    selectedWeapon = 0,
    selectedSequence = 's0',
    isExpanded = false,
    onClick,
    moveCache = new Map(),
    loadingMoves = new Set()
}) => {
    const characterId = entry.buildState.characterState.id || '';
    const config = CHARACTER_CONFIGS[characterId];
    
    // Get the weapon ID for the selected index
    const selectedWeaponId = config?.weapons[selectedWeapon];
    // Find the calculation matching this weapon ID
    const selectedCalc = entry.calculations?.find(
        calc => calc.weaponId === selectedWeaponId
    );
    
    // Get the sequence data and use the type guard
    const sequenceData = selectedCalc?.[selectedSequence as keyof typeof selectedCalc];
    const damage = isSequenceData(sequenceData) ? sequenceData.damage : 0;
    
    // Always use weapon-specific stats when available
    const stats = selectedCalc?.stats 
        ? { values: Object.entries(STAT_MAP).reduce((acc, [fullName, shortName]) => {
            acc[fullName] = selectedCalc.stats[shortName] || 0;
            return acc;
        }, {} as Record<string, number>) }
        : decompressStats(entry.stats);
    
    const character = cachedCharacters?.find(c => c.id === entry.buildState.characterState.id);
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';
    
    const critRate = stats.values['Crit Rate'] || 0;
    const critDmg = stats.values['Crit DMG'] || 0;

    return (
        <div className={`build-entry ${isExpanded ? 'expanded' : ''}`}>
            <div className="build-main-content" onClick={() => onClick?.()}>
                <div className="build-rank">#{rank}</div>
                <BuildOwnerSection username={entry.buildState.watermark?.username} uid={entry.buildState.watermark?.uid} />
                <BuildCharacterSection character={character} elementClass={elementClass} />
                <BuildSetsSection echoPanels={entry.buildState.echoPanels} />
                <div className={`build-cv ${activeSort === 'cv' ? 'active-column' : ''}`}>
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
                    isActiveColumn={activeSort === 'stat'}
                />
                <div className={`build-damage ${activeSort === 'damage' ? 'active-column' : ''}`}>
                    {Number(damage.toFixed(0)).toLocaleString()}
                </div>
            </div>
            {isExpanded && (
                <DamageExpanded 
                    entry={entry} 
                    selectedWeapon={selectedWeapon}
                    selectedSequence={selectedSequence}
                    moveCache={moveCache}
                    loadingMoves={loadingMoves}
                />
            )}
        </div>
    );
};