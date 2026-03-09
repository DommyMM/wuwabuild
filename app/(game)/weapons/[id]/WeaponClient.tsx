'use client';

import { useEffect, useRef } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { BuildEditor } from '@/components/edit/BuildEditor';
import { Element } from '@/lib/character';

export function WeaponClient({ weaponId }: { weaponId: string }) {
    const { setCharacter, setWeapon, state } = useBuild();
    const { characters, getWeapon } = useGameData();
    const hasSetWeapon = useRef(false);

    useEffect(() => {
        if (hasSetWeapon.current) return;
        const weapon = getWeapon(weaponId);

        if (weapon) {
            // Check if current character matches the weapon type
            const currentChar = characters.find(c => c.id?.toString() === state.characterId?.toString());
            let targetChar = currentChar;

            // If there's no character or the character's weapon type doesn't match the new weapon
            if (!currentChar || currentChar.weaponType !== weapon.type) {
                // Find highest rarity character that uses this weapon
                const matchingChars = characters.filter(c => c.weaponType === weapon.type);
                if (matchingChars.length > 0) {
                    targetChar = matchingChars.reduce((prev, current) =>
                        ((prev as { star?: number }).star || 0) > ((current as { star?: number }).star || 0) ? prev : current
                    );
                }
            }

            if (targetChar) {
                if (state.characterId?.toString() !== targetChar.id?.toString()) {
                    const element = targetChar.element === Element.Rover ? 'Spectro' : targetChar.element;
                    setCharacter(targetChar.id.toString(), element);
                }

                // Then immediately set the weapon so it doesn't get wiped by the BuildEditor's effect
                setWeapon(weaponId);
            }
        }
        hasSetWeapon.current = true;
    }, [weaponId, setCharacter, setWeapon, characters, getWeapon, state.characterId]);

    return <BuildEditor />;
}
