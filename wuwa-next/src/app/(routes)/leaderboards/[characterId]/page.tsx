import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CharacterEntry from '@/components/LB/CharacterEntry';
import { getCharacters, getCharacterById } from '@/components/LB/charfetch';
import { CHARACTER_CONFIGS } from '@/components/LB/config';
import { getLeaderboardData } from '@/components/LB/charfetch';
import '@/styles/Leaderboard.css';
import '@/styles/BuildPage.css';
import '@/styles/BuildExpand.css';
import '@/styles/SavesPage.css';

interface Props {
    params: Promise<{ characterId: string }>
    searchParams: Promise<{ weapon: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { characterId } = await params;
    const character = await getCharacterById(characterId);
    if (!character) return notFound();
    
    return {
        title: `${character.name} Damage Calculations and Leaderboard - WuWa Builds`,
        description: `View top ${character.name} builds and damage calculations with detailed breakdowns`,
        openGraph: {
            title: `${character.name} Damage Calculations`,
            description: `View detailed ${character.name} builds and damage calculations`,
            images: ['/images/leaderboard.png'],
        }
    };
}


export default async function CharacterPage({ params, searchParams }: Props) {
    const { characterId } = await params;
    const { weapon } = await searchParams;

    const [character, characters, leaderboardData] = await Promise.all([
        getCharacterById(characterId),
        getCharacters(),
        getLeaderboardData()
    ]);
    
    const characterData = leaderboardData.find(char => char._id === characterId);
    if (!character || !characterData) return notFound();
    
    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.enabled || !config.weapons.includes(weapon)) {
        return notFound();
    }

    return (
        <main className="character-page">
            <CharacterEntry 
                characterId={characterId}
                weaponMaxDamages={characterData.weapons}
                character={character}
                characters={characters}
                weaponId={weapon}
            />
        </main>
    );
}