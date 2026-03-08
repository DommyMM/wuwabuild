import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { WeaponClient } from './WeaponClient';
import { DataLoadingGate } from '@/contexts/index';

type WeaponRecord = {
    id?: string | number;
    name?: { en?: string };
    type?: { name?: { en?: string } };
};

function normalizeWeaponsData(data: unknown): WeaponRecord[] {
    if (Array.isArray(data)) {
        return data as WeaponRecord[];
    }

    if (!data || typeof data !== 'object') {
        return [];
    }

    return Object.values(data as Record<string, unknown>).flatMap((group) => {
        if (Array.isArray(group)) {
            return group as WeaponRecord[];
        }
        if (group && typeof group === 'object') {
            return Object.values(group as Record<string, unknown>) as WeaponRecord[];
        }
        return [];
    });
}

function loadWeapons(): WeaponRecord[] {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');

    if (!fs.existsSync(wepPath)) {
        return [];
    }

    const rawData = JSON.parse(fs.readFileSync(wepPath, 'utf8')) as unknown;
    return normalizeWeaponsData(rawData);
}

function findWeaponById(id: string): WeaponRecord | undefined {
    return loadWeapons().find((weapon) => weapon.id != null && weapon.id.toString() === id);
}

export async function generateStaticParams() {
    return loadWeapons()
        .filter((weapon): weapon is WeaponRecord & { id: string | number } => weapon.id != null)
        .map((weapon) => ({ id: weapon.id.toString() }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    let title = 'Weapon Build - WuWaBuilds';
    let description = 'View the best resonators for this weapon on WuwaBuilds.';

    const weaponInfo = findWeaponById(id);
    if (weaponInfo?.name?.en) {
        title = `${weaponInfo.name.en} Build & Stats - Wuthering Waves`;
        description = `Detailed stats and the best characters for ${weaponInfo.name.en} in Wuthering Waves. See optimal builds and echoes on WuWaBuilds.`;
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

export default async function WeaponPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let wepName = '';
    let typeName = '';

    const weaponInfo = findWeaponById(id);
    if (weaponInfo) {
        wepName = weaponInfo.name?.en || '';
        typeName = weaponInfo.type?.name?.en || '';
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="sr-only">
                {wepName && <h1>{wepName} Stats & Best Resonators</h1>}
                {wepName && <p>Find the best characters and builds using the {wepName} in Wuthering Waves.</p>}
                {typeName && <p>The {wepName} is a {typeName} weapon.</p>}
                <h2>Best Characters for {wepName}</h2>
                <p>Equip this weapon on matching {typeName} resonators to maximize their damage output.</p>
            </div>
            <div className="px-3 py-4 md:px-16 md:py-6">
                <DataLoadingGate>
                    <WeaponClient weaponId={id} />
                </DataLoadingGate>
            </div>
        </main>
    );
}
