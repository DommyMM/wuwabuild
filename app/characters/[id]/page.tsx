import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { CharacterClient } from './CharacterClient';
import { DataLoadingGate } from '@/contexts/index';

export async function generateStaticParams() {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const charPath = path.join(dataDir, 'Characters.json');

    if (fs.existsSync(charPath)) {
        const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8'));
        // Characters is an object where values are the character objects
        return Object.values(charsData).map((char: unknown) => ({
            id: (char as { id: string | number }).id.toString(),
        }));
    }
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const charPath = path.join(dataDir, 'Characters.json');
    let title = 'Character Build - WuWaBuilds';
    let description = 'View the best builds, echoes, and stats for this character on WuwaBuilds.';

    if (fs.existsSync(charPath)) {
        const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8'));
        const char = Object.values(charsData).find((c: unknown) => (c as { id: string | number }).id.toString() === id) as { id: string | number; name?: { en: string } } | undefined;
        if (char && char.name && char.name.en) {
            title = `${char.name.en} Build & Guide - Wuthering Waves`;
            description = `The best build for ${char.name.en} in Wuthering Waves. See optimal weapons, echoes, skill priorities, and stats on WuWaBuilds.`;
        }
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
        }
    };
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const charPath = path.join(dataDir, 'Characters.json');
    let charName = '';
    let weaponType = '';
    let element = '';

    if (fs.existsSync(charPath)) {
        const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8'));
        const char = Object.values(charsData).find((c: unknown) => (c as { id: string | number }).id.toString() === id) as { id: string | number; name?: { en: string }; weaponType?: string; element?: string } | undefined;
        if (char) {
            charName = char.name?.en || '';
            weaponType = char.weaponType || '';
            element = char.element || '';
        }
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="sr-only">
                {charName && <h1>{charName} Build Guide & Best Stats</h1>}
                {charName && <p>Find the best overall build, weapons, and echoes for {charName} in Wuthering Waves.</p>}
                {element && weaponType && <p>{charName} is a {element} element Resonator that uses a {weaponType}.</p>}
                <h2>Best Weapons for {charName}</h2>
                <p>Equip the best {weaponType} to maximize {charName}&apos;s damage.</p>
                <h2>Best Echoes for {charName}</h2>
                <p>Maximize {charName}&apos;s stats by choosing the optimal echo sets and main stats.</p>
            </div>
            <div className="px-3 py-4 md:px-16 md:py-6">
                <DataLoadingGate>
                    <CharacterClient characterId={id} />
                </DataLoadingGate>
            </div>
        </main>
    );
}
