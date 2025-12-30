'use client';

import { useStats } from '@/hooks/useStats';
import { useLevelCurves } from '@/hooks/useLevelCurves';
import { cachedCharacters } from '@/hooks/useCharacters';
import { weaponCache } from '@/hooks/useWeapons';
import { useEchoes } from '@/hooks/useEchoes';
import { Character } from '@/types/character';
import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_NODES = {
    'normal-attack': { 'top': true, 'middle': true },
    'skill': { 'top': true, 'middle': true },
    'circuit': { 'top': true, 'middle': true },
    'intro': { 'top': true, 'middle': true },
    'liberation': { 'top': true, 'middle': true }
} as const;

type TabType = 'character' | 'weapon' | 'echo';

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

interface EchoBaseData {
    name: string;
    cost: number;
    elements: string[];
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
    const [activeTab, setActiveTab] = useState<TabType>('character');
    const [characterBases, setCharacterBases] = useState<Record<string, CharacterBaseData>>({});
    const [weaponBases, setWeaponBases] = useState<Record<string, WeaponBaseData>>({});
    const [echoBases, setEchoBases] = useState<Record<string, EchoBaseData>>({});
    const [processedCount, setProcessedCount] = useState(0);
    const { scaleAtk, scaleStat } = useLevelCurves();
    const { echoesByCost } = useEchoes();
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

    useEffect(() => {
        const echoBasesData: Record<string, EchoBaseData> = {};
        for (const echoes of Object.values(echoesByCost)) {
            for (const echo of echoes) {
                echoBasesData[echo.id] = {
                    name: echo.name,
                    cost: echo.cost,
                    elements: echo.elements
                };
            }
        }
        setEchoBases(echoBasesData);
    }, [echoesByCost]);

    const copyToClipboard = (type: TabType) => {
        let tsContent = '';

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

            tsContent = `import { CharacterBase } from '../types/base';

export const CHARACTER_BASES: Record<string, CharacterBase> = {
${characterEntries}
} as const;`;
        } else if (type === 'weapon') {
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

            tsContent = `import { WeaponBase } from '../types/base';

export const WEAPONBASES: Record<string, WeaponBase> = {
${weaponEntries}
} as const;`;
        } else if (type === 'echo') {
            const echoEntries = Object.entries(echoBases).map(([id, echoData]) => {
                const elementsStr = JSON.stringify(echoData.elements);
                return `    "${id}": {
        name: "${echoData.name}",
        cost: ${echoData.cost},
        elements: ${elementsStr}
    }`;
            }).join(',\n');

            tsContent = `import { EchoBase } from '../types/base';

export const ECHOBASES: Record<string, EchoBase> = {
${echoEntries}
} as const;`;
        }

        navigator.clipboard.writeText(tsContent);
        alert('Copied to clipboard!');
    };

    const getTabData = () => {
        switch (activeTab) {
            case 'character':
                return { data: characterBases, count: Object.keys(characterBases).length };
            case 'weapon':
                return { data: weaponBases, count: Object.keys(weaponBases).length };
            case 'echo':
                return { data: echoBases, count: Object.keys(echoBases).length };
        }
    };

    const tabData = getTabData();
    const tabs: { key: TabType; label: string }[] = [
        { key: 'character', label: 'Characters' },
        { key: 'weapon', label: 'Weapons' },
        { key: 'echo', label: 'Echoes' }
    ];

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                Base Stats Generator
            </h1>

            <div style={{ marginBottom: '20px', color: '#888' }}>
                Characters Processing: {processedCount}/{cachedCharacters?.length || 0}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === tab.key ? '#2563eb' : '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px 4px 0 0',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.key ? 600 : 400
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Panel */}
            <div style={{
                border: '1px solid #374151',
                borderRadius: '0 4px 4px 4px',
                padding: '20px',
                backgroundColor: '#1f2937'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                        {activeTab === 'character' && 'Character Bases'}
                        {activeTab === 'weapon' && 'Weapon Bases'}
                        {activeTab === 'echo' && 'Echo Bases'}
                        <span style={{ color: '#888', fontWeight: 400, marginLeft: '8px' }}>
                            ({tabData.count} items)
                        </span>
                    </h2>
                    <button
                        onClick={() => copyToClipboard(activeTab)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        Copy TypeScript
                    </button>
                </div>

                <pre style={{
                    fontSize: '12px',
                    maxHeight: '600px',
                    overflow: 'auto',
                    padding: '16px',
                    borderRadius: '4px',
                    backgroundColor: '#111827',
                    margin: 0
                }}>
                    {JSON.stringify(tabData.data, null, 2)}
                </pre>
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
