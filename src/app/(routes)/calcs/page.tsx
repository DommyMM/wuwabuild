'use client';

import { useStats } from '@/hooks/useStats';
import { useLevelCurves } from '@/hooks/useLevelCurves';
import { cachedCharacters } from '@/hooks/useCharacters';
import { weaponCache } from '@/hooks/useWeapons';
import { Character } from '@/types/character';
import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_NODES = {
    'normal-attack': { 'top': true, 'middle': true },
    'skill': { 'top': true, 'middle': true },
    'circuit': { 'top': true, 'middle': true },
    'intro': { 'top': true, 'middle': true },
    'liberation': { 'top': true, 'middle': true }
} as const;

interface CharacterBaseData {
    name: string;
    element: string;
    weaponType: string;
    bonus1: string;
    bonus2: string;
    stats: Record<string, number>;
}

interface WeaponBaseData {
    name: string;
    type: string;
    rarity: string;
    ATK: number;
    main_stat: string;
    base_main: number;
    passive?: string;
    passive_stat?: number;
    passive2?: string;
    passive_stat2?: number;
}

const CharacterProcessor = ({ character, onProcess }: {
    character: Character;
    onProcess: (id: string, data: CharacterBaseData) => void;
}) => {
    const processedRef = useRef(false);
    const stats = useStats({
        character,
        characterState: {
            id: character.id,
            level: "90",
            element: character.element
        },
        weapon: null,
        weaponStats: undefined,
        echoPanels: [],
        nodeStates: MAX_NODES
    });

    useEffect(() => {
        // Only process once when stats are ready (HP > 0 indicates stats are computed)
        if (!processedRef.current && stats.values.HP > 0) {
            processedRef.current = true;
            onProcess(character.id, {
                name: character.name,
                element: character.element,
                weaponType: character.weaponType,
                bonus1: character.Bonus1,
                bonus2: character.Bonus2,
                stats: stats.values
            });
        }
    }, [character, stats.values, onProcess]);

    return null;
};

export default function Page() {
    const [characterBases, setCharacterBases] = useState<Record<string, CharacterBaseData>>({});
    const [weaponBases, setWeaponBases] = useState<Record<string, WeaponBaseData>>({});
    const [processedCount, setProcessedCount] = useState(0);
    const { scaleAtk, scaleStat } = useLevelCurves();
    const characterDataRef = useRef<Record<string, CharacterBaseData>>({});

    const handleCharacterProcess = useCallback((id: string, data: CharacterBaseData) => {
        characterDataRef.current[id] = data;
        setProcessedCount(prev => prev + 1);
        
        if (Object.keys(characterDataRef.current).length === (cachedCharacters?.length || 0)) {
            setCharacterBases(characterDataRef.current);
        }
    }, []);

    useEffect(() => {
        const wpnBases: Record<string, WeaponBaseData> = {};
        for (const [type, weapons] of weaponCache.entries()) {
            for (const weapon of weapons) {
                const base: WeaponBaseData = {
                    name: weapon.name,
                    type: type,
                    rarity: weapon.rarity,
                    ATK: scaleAtk(Number(weapon.ATK), 90),
                    main_stat: weapon.main_stat,
                    base_main: scaleStat(Number(weapon.base_main), 90)
                };
                if (weapon.passive && weapon.passive_stat !== undefined) {
                    base.passive = weapon.passive;
                    base.passive_stat = weapon.passive_stat;
                }
                if (weapon.passive2 && weapon.passive_stat2 !== undefined) {
                    base.passive2 = weapon.passive2;
                    base.passive_stat2 = weapon.passive_stat2;
                }
                wpnBases[weapon.id] = base;
            }
        }
        setWeaponBases(wpnBases);
    }, [scaleAtk, scaleStat]);

    const downloadBases = (type: 'character' | 'weapon') => {
        const data = type === 'character' ? characterBases : weaponBases;
        const filename = `${type}_bases.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = (type: 'character' | 'weapon') => {
        if (type === 'character') {
            const characterEntries = Object.entries(characterBases).map(([id, charData]) => {
                return `    "${id}": {
        name: "${charData.name}",
        element: "${charData.element}",
        weaponType: "${charData.weaponType}",
        bonus1: "${charData.bonus1}",
        bonus2: "${charData.bonus2}",
        stats: {
            HP: ${charData.stats.HP},
            ATK: ${charData.stats.ATK},
            DEF: ${charData.stats.DEF},
            "Crit Rate": ${charData.stats["Crit Rate"]},
            "Crit DMG": ${charData.stats["Crit DMG"]},
            "Energy Regen": ${charData.stats["Energy Regen"]},
            "Healing Bonus": ${charData.stats["Healing Bonus"]},
            "Aero DMG": ${charData.stats["Aero DMG"]},
            "Glacio DMG": ${charData.stats["Glacio DMG"]},
            "Fusion DMG": ${charData.stats["Fusion DMG"]},
            "Electro DMG": ${charData.stats["Electro DMG"]},
            "Havoc DMG": ${charData.stats["Havoc DMG"]},
            "Spectro DMG": ${charData.stats["Spectro DMG"]},
            "Basic Attack DMG Bonus": ${charData.stats["Basic Attack DMG Bonus"]},
            "Heavy Attack DMG Bonus": ${charData.stats["Heavy Attack DMG Bonus"]},
            "Resonance Skill DMG Bonus": ${charData.stats["Resonance Skill DMG Bonus"]},
            "Resonance Liberation DMG Bonus": ${charData.stats["Resonance Liberation DMG Bonus"]}
        }
    }`;
            }).join(',\n');

            const tsContent = `import { CharacterBase } from '../types/base';

export const CHARACTER_BASES: Record<string, CharacterBase> = {
${characterEntries}
} as const;`;
            
            navigator.clipboard.writeText(tsContent);
        } else {
            const weaponEntries = Object.entries(weaponBases).map(([id, weaponData]) => {
                let passiveSection = '';
                if (weaponData.passive !== undefined) {
                    passiveSection = `,
        passive: "${weaponData.passive}",
        passive_stat: ${weaponData.passive_stat}`;
                }
                if (weaponData.passive2 !== undefined) {
                    passiveSection += `,
        passive2: "${weaponData.passive2}",
        passive_stat2: ${weaponData.passive_stat2}`;
                }

                return `    "${id}": {
        name: "${weaponData.name}",
        type: "${weaponData.type}",
        rarity: "${weaponData.rarity}",
        ATK: ${weaponData.ATK},
        main_stat: "${weaponData.main_stat}",
        base_main: ${weaponData.base_main}${passiveSection}
    }`;
            }).join(',\n');
            const tsContent = `import { WeaponBase } from '../types/base';

export const WEAPONBASES: Record<string, WeaponBase> = {
${weaponEntries}
} as const;`;

            navigator.clipboard.writeText(tsContent);
        }
        
        alert('Copied to clipboard!');
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                Base Stats Generator
            </h1>
            
            <div style={{ marginBottom: '20px' }}>
                Processing: {processedCount}/{cachedCharacters?.length || 0}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'flex-start' }}>
                <button 
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                    onClick={() => downloadBases('character')}
                >
                    Download Character Bases
                </button>
                <button 
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                    onClick={() => downloadBases('weapon')}
                >
                    Download Weapon Bases
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                            Character Bases
                        </h2>
                        <button 
                            style={{
                                padding: '4px 8px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                            onClick={() => copyToClipboard('character')}
                        >
                            Copy
                        </button>
                    </div>
                    <pre style={{ 
                        fontSize: '12px', 
                        maxHeight: '600px', 
                        overflow: 'auto',
                        padding: '16px',
                        borderRadius: '4px'
                    }}>
                        {JSON.stringify(characterBases, null, 2)}
                    </pre>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                            Weapon Bases
                        </h2>
                        <button 
                            style={{
                                padding: '4px 8px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                            onClick={() => copyToClipboard('weapon')}
                        >
                            Copy
                        </button>
                    </div>
                    <pre style={{ 
                        fontSize: '12px', 
                        maxHeight: '600px', 
                        overflow: 'auto',
                        padding: '16px',
                        borderRadius: '4px'
                    }}>
                        {JSON.stringify(weaponBases, null, 2)}
                    </pre>
                </div>
            </div>

            {cachedCharacters?.map(character => (
                <CharacterProcessor
                    key={character.id}
                    character={character}
                    onProcess={handleCharacterProcess}
                />
            ))}
        </div>
    );
}