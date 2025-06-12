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

const CharacterProcessor = ({ character, onProcess }: { 
    character: Character;
    onProcess: (id: string, data: any) => void;
}) => {
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
        onProcess(character.id, {
            name: character.name,
            element: character.element,
            weaponType: character.weaponType,
            bonus1: character.Bonus1,
            bonus2: character.Bonus2,
            stats: stats.values
        });
    }, [character, stats.values, onProcess]);

    return null;
};

export default function Page() {
    const [characterBases, setCharacterBases] = useState<Record<string, any>>({});
    const [weaponBases, setWeaponBases] = useState<Record<string, any>>({});
    const [processedCount, setProcessedCount] = useState(0);
    const { scaleAtk, scaleStat } = useLevelCurves();
    const characterDataRef = useRef<Record<string, any>>({});

    const handleCharacterProcess = useCallback((id: string, data: any) => {
        characterDataRef.current[id] = data;
        setProcessedCount(prev => prev + 1);
        
        if (Object.keys(characterDataRef.current).length === (cachedCharacters?.length || 0)) {
            setCharacterBases(characterDataRef.current);
        }
    }, []);

    useEffect(() => {
        const wpnBases: Record<string, any> = {};
        for (const [type, weapons] of weaponCache.entries()) {
            for (const weapon of weapons) {
                wpnBases[weapon.id] = {
                    name: weapon.name,
                    type: type,
                    rarity: weapon.rarity,
                    stats: {
                        atk: scaleAtk(Number(weapon.ATK), 90),
                        [weapon.main_stat]: scaleStat(Number(weapon.base_main), 90)
                    },
                    passive: weapon.passive ? {
                        type: weapon.passive,
                        value: weapon.passive_stat
                    } : null,
                    passive2: weapon.passive2 ? {
                        type: weapon.passive2,
                        value: weapon.passive_stat2
                    } : null
                };
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

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                Base Stats Generator
            </h1>
            
            <div style={{ marginBottom: '20px' }}>
                Processing: {processedCount}/{cachedCharacters?.length || 0}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
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
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                        Character Bases
                    </h2>
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
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                        Weapon Bases
                    </h2>
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