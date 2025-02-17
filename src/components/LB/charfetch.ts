import path from 'path';
import { promises as fs } from 'fs';
import { Character } from '@/types/character';

export const LB_URL = process.env.NEXT_PUBLIC_LB_URL || 'http://localhost:3001';

let cachedCharacters: Character[] | null = null;

export interface LeaderboardData {
    _id: string;
    totalEntries: number;
    weapons: Array<{
        weaponId: string;
        damage: number;
        owner: {
            username?: string;
            uid?: string;
        }
    }>;
}

export async function getLeaderboardData() {
    const res = await fetch(`${LB_URL}/leaderboard`, {
        next: { revalidate: 300 }
    });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const json = await res.json();
    return json.characters as LeaderboardData[];
}

export async function getCharacters(): Promise<Character[]> {
    if (cachedCharacters) return cachedCharacters;
    const filePath = path.join(process.cwd(), 'public', 'Data', 'Characters.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as Character[];
    
    cachedCharacters = data;
    return data;
}

export async function getCharacterById(id: string): Promise<Character | undefined> {
    const characters = await getCharacters();
    return characters.find(c => c.id === id);
}