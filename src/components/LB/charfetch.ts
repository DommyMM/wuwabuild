import path from 'path';
import { promises as fs } from 'fs';
import { Character } from '@/types/character';
import { Weapon } from '@/types/weapon';

export const LB_URL = process.env.NEXT_PUBLIC_LB_URL || 'http://localhost:3001';

let cachedCharacters: Character[] | null = null;
let cachedWeapons: Weapon[] | null = null;

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
        cache: 'no-store'  // Client always requests fresh data
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

export async function getWeapons(): Promise<Weapon[]> {
    if (cachedWeapons) return cachedWeapons;
    const filePath = path.join(process.cwd(), 'public', 'Data', 'Weapons.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as Weapon[];
    
    cachedWeapons = data;
    return data;
}

export async function getWeaponById(id: string): Promise<Weapon | undefined> {
    const weapons = await getWeapons();
    return weapons.find(w => w.id === id);
}