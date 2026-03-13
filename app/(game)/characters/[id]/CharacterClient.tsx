'use client';

import { useEffect, useRef } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { BuildEditor } from '@/components/edit/BuildEditor';
import { Element } from '@/lib/character';

export function CharacterClient({ characterId }: { characterId: string }) {
    const { setCharacter, state } = useBuild();
    const { characters } = useGameData();
    const hasSetCharacter = useRef(false);

    useEffect(() => {
        if (hasSetCharacter.current) return;
        // We set the character if it's different, OR if it's the first render 
        // to ensure the loaded character actually matches the page URL directly
        if (state.characterId?.toString() !== characterId) {
            const char = characters.find(c => c.id?.toString() === characterId);
            if (char) {
                // If it's Rover, defaults to Spectro unless otherwise specified
                const element = char.element === Element.Rover ? 'Spectro' : char.element;
                setCharacter(char.id.toString(), element);
            }
        }
        hasSetCharacter.current = true;
    }, [characterId, setCharacter, characters, state.characterId]);

    return <BuildEditor />;
}
