import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { WeaponClient } from './WeaponClient';
import { DataLoadingGate } from '@/contexts/index';

export async function generateStaticParams() {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');

    const routes: { id: string }[] = [];
    if (fs.existsSync(wepPath)) {
        const wepsData = JSON.parse(fs.readFileSync(wepPath, 'utf8'));
        for (const typeKey in wepsData) {
            Object.values(wepsData[typeKey]).forEach((wep: unknown) => {
                routes.push({ id: (wep as { id: string | number }).id.toString() });
            });
        }
    }
    return routes;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');
    let title = 'Weapon Build - WuWaBuilds';
    let description = 'View the best resonators for this weapon on WuwaBuilds.';

    if (fs.existsSync(wepPath)) {
        const wepsData = JSON.parse(fs.readFileSync(wepPath, 'utf8'));
        let weaponInfo: { id: string | number; name?: { en: string } } | null = null;
        for (const typeKey in wepsData) {
            const weps = Object.values(wepsData[typeKey]);
            const found = weps.find((w: unknown) => (w as { id: string | number }).id.toString() === id) as { id: string | number; name?: { en: string } } | undefined;
            if (found) {
                weaponInfo = found;
                break;
            }
        }

        if (weaponInfo && weaponInfo.name && weaponInfo.name.en) {
            title = `${weaponInfo.name.en} Build & Stats - Wuthering Waves`;
            description = `Detailed stats and the best characters for ${weaponInfo.name.en} in Wuthering Waves. See optimal builds and echoes on WuWaBuilds.`;
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

export default async function WeaponPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');
    let wepName = '';
    let typeName = '';

    if (fs.existsSync(wepPath)) {
        const wepsData = JSON.parse(fs.readFileSync(wepPath, 'utf8'));
        for (const typeKey in wepsData) {
            const weps = Object.values(wepsData[typeKey]);
            const found = weps.find((w: unknown) => (w as { id: string | number }).id.toString() === id) as { id: string | number; name?: { en: string } } | undefined;
            if (found) {
                wepName = found.name?.en || '';
                typeName = typeKey;
                break;
            }
        }
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
