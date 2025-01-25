import { AnalysisData } from './Results';
import { SavedState } from '../../types/SavedState';
import { cachedCharacters } from '../../hooks/useCharacters';
import { weaponCache } from '../../hooks/useWeapons';
import { isRover } from '../../types/character';
import { matchEchoData } from '../../hooks/echoMatching';
import { ElementType } from '../Edit/EchoSection';

export const convertBuild = (data: AnalysisData, saveToLb: boolean): SavedState => {
    const characterData = data.character;
    let characterName = characterData?.name ?? '';
    let roverElement;
    if (characterName.includes('Rover')) {
        const [baseName, element] = characterName.split(') ');
        characterName = baseName + ')';
        roverElement = element?.trim();
    }
    const character = characterName ? 
        cachedCharacters?.find(c => 
            c.name.toLowerCase() === characterName.toLowerCase()
        ) : null;
    const weaponData = data.weapon;
    const weapons = character ? weaponCache.get(character.weaponType) ?? [] : [];
    const weapon = weaponData?.name ?
        weapons.find(w => 
            w.name.toLowerCase() === weaponData.name.toLowerCase()
        ) : null;
    const nodeStates = {
        tree1: { top: true, middle: true },
        tree2: { top: true, middle: true },
        tree3: { top: true, middle: true },
        tree4: { top: true, middle: true },
        tree5: { top: true, middle: true }
    };
    const forteLevels = {
        'normal-attack': data.forte?.levels?.[0] ?? 1,
        'skill': data.forte?.levels?.[1] ?? 1,
        'circuit': data.forte?.levels?.[2] ?? 1,
        'intro': data.forte?.levels?.[3] ?? 1,
        'liberation': data.forte?.levels?.[4] ?? 1
    };
    const echoPanels = Array(5).fill(null).map(() => ({
        id: null as string | null,
        level: 0,
        selectedElement: null as ElementType | null,
        stats: {
            mainStat: { 
                type: null as string | null,
                value: null as number | null
            },
            subStats: Array(5).fill({ 
                type: null as string | null, 
                value: null as number | null 
            })
        },
        phantom: false
    }));
    [data.echo1, data.echo2, data.echo3, data.echo4, data.echo5].forEach((echoData, index) => {
        if (!echoData) return;
        
        const ocrData = {
            type: 'Echo' as const,
            name: echoData.name.name,
            element: echoData.element,
            echoLevel: 25,
            main: {
                name: echoData.main.name,
                value: echoData.main.value
            },
            subs: echoData.substats.map(sub => ({
                name: sub.name,
                value: sub.value
            }))
        };
        
        const panel = matchEchoData(ocrData);
        if (panel) {
            echoPanels[index] = {
                ...panel,
                level: 25
            };
        }
    });
    const newState: SavedState = {
        characterState: {
            id: character?.id ?? null,
            level: characterData?.level.toString() ?? '1',
            element: character && isRover(character) ? roverElement : character?.element
        },
        weaponState: {
            id: weapon?.id ?? null,
            level: weaponData?.level ?? 1,
            rank: 1
        },
        currentSequence: data.sequences?.sequence ?? 0,
        nodeStates,
        forteLevels,
        echoPanels,
        watermark: {
            username: data.watermark?.username ?? '',
            uid: data.watermark?.uid?.toString() ?? ''
        },
        verified: true
    };
    return newState;
};