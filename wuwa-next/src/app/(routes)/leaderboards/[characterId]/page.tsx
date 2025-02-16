import { Metadata } from 'next';
import { cachedCharacters } from '@/hooks/useCharacters';
import { notFound } from 'next/navigation';
import CharacterEntry from '@/components/LB/CharacterEntry';
import { LB_URL } from '@/components/Import/Results';

interface Props {
    params: { characterId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const character = cachedCharacters?.find(c => c.id === params.characterId);
    if (!character) return notFound();

    return {
        title: `${character.name} Rankings - WuWa Builds`,
        description: `View top ${character.name} builds and rankings`,
        openGraph: {
            title: `${character.name} Rankings - WuWa Builds`,
            description: `View detailed ${character.name} builds and rankings`,
            images: [`/images/characters/${character.id}.png`],
        }
    };
}

async function getMaxDamages(characterId: string) {
    const res = await fetch(`${LB_URL}/leaderboard/${characterId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.weapons || [];
}

export default async function CharacterPage({ params }: Props) {
    const character = cachedCharacters?.find(c => c.id === params.characterId);
    if (!character) return notFound();
    
    const maxDamages = await getMaxDamages(params.characterId);

    return (
        <main className="character-page">
            <CharacterEntry 
                characterId={params.characterId}
                weaponMaxDamages={maxDamages}
            />
        </main>
    );
}