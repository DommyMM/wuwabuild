import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { WeaponClient } from './WeaponClient';
import { CDNCharacter } from '@/lib/character';

type WeaponRecord = {
    id?: string | number;
    name?: { en?: string };
    type?: { name?: { en?: string } };
    effectName?: { en?: string };
    effect?: { en?: string };
    params?: Record<string, string[]>;
    rarity?: { id?: number };
};

function normalizeWeaponsData(data: unknown): WeaponRecord[] {
    if (Array.isArray(data)) return data as WeaponRecord[];
    if (!data || typeof data !== 'object') return [];

    return Object.values(data as Record<string, unknown>).flatMap((group) => {
        if (Array.isArray(group)) return group as WeaponRecord[];
        if (group && typeof group === 'object') return Object.values(group as Record<string, unknown>) as WeaponRecord[];
        return [];
    });
}

function loadWeapons(): WeaponRecord[] {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');

    if (!fs.existsSync(wepPath)) return [];
    const rawData = JSON.parse(fs.readFileSync(wepPath, 'utf8')) as unknown;
    return normalizeWeaponsData(rawData);
}

function findWeaponById(id: string): WeaponRecord | undefined {
    return loadWeapons().find((weapon) => weapon.id != null && weapon.id.toString() === id);
}

function loadCharactersForWeaponType(weaponType: string): CDNCharacter[] {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const charPath = path.join(dataDir, 'Characters.json');
    if (!fs.existsSync(charPath)) return [];

    const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8')) as Record<string, unknown>;
    return Object.values(charsData).filter((c: unknown) => {
        const char = c as { weapon?: { name?: { en?: string } }, weaponType?: string };
        return char.weapon?.name?.en === weaponType || char.weaponType === weaponType;
    }) as CDNCharacter[];
}

function getI18nText(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return (val as { en?: string }).en || '';
}

export async function generateStaticParams() {
    return loadWeapons()
        .filter((weapon): weapon is WeaponRecord & { id: string | number } => weapon.id != null)
        .map((weapon) => ({ id: weapon.id.toString() }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    let title = 'Weapon Build Calculator - WuWaBuilds';
    let description = 'Calculate stats and optimal resonators for this weapon on WuwaBuilds.';

    const weaponInfo = findWeaponById(id);
    if (weaponInfo?.name?.en) {
        title = `${weaponInfo.name.en} Stats & Calculator - Wuthering Waves`;
        description = `Calculate exact damage scaling and stats for ${weaponInfo.name.en} in Wuthering Waves. See optimal builds across different characters on the WuWaBuilds leaderboard.`;
    }

    return {
        title,
        description,
        openGraph: { title, description, url: `https://wuwa.build/weapons/${id}` },
        twitter: { title, description },
        alternates: { canonical: `/weapons/${id}` },
    };
}

export default async function WeaponPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const weaponInfo = findWeaponById(id);
    let wepName = '';
    let typeName = '';
    let matchingCharacters: CDNCharacter[] = [];

    if (weaponInfo) {
        wepName = weaponInfo.name?.en || '';
        typeName = weaponInfo.type?.name?.en || '';
        if (typeName) {
            matchingCharacters = loadCharactersForWeaponType(typeName);
        }
    }

    const effectName = weaponInfo?.effectName?.en;
    let effectRank1 = weaponInfo?.effect?.en || '';
    let effectRank5 = weaponInfo?.effect?.en || '';

    if (weaponInfo?.params && weaponInfo.effect?.en) {
        const weaponParams = weaponInfo.params;
        effectRank1 = effectRank1.replace(/\{(\d+)\}/g, (match, idx) => {
            const arr = weaponParams[idx];
            return arr && arr.length > 0 ? arr[0] : match;
        });
        effectRank5 = effectRank5.replace(/\{(\d+)\}/g, (match, idx) => {
            const arr = weaponParams[idx];
            return arr && arr.length > 0 ? arr[arr.length - 1] : match;
        });
    }

    const jsonLdBreadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://wuwa.build"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Weapons",
                "item": "https://wuwa.build/builds"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": wepName || "Weapon",
                "item": `https://wuwa.build/weapons/${id}`
            }
        ]
    };

    const jsonLdItem = wepName ? {
        "@context": "https://schema.org",
        "@type": "ItemPage",
        "mainEntity": {
            "@type": "Thing",
            "name": wepName,
            "description": `${wepName} is a ${weaponInfo?.rarity?.id || 5}-star ${typeName} weapon in Wuthering Waves.`
        }
    } : null;

    return (
        <main className="bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
            />
            {jsonLdItem && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItem) }}
                />
            )}
            {weaponInfo && (
                <section className="mx-3 mb-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-gray-300 md:mx-16 md:mt-4">
                    <h1 className="text-xl font-semibold text-gray-100">
                        {wepName} Stats & Build Calculator
                    </h1>
                    <p className="mt-2 max-w-4xl text-gray-400">
                        Calculate Wuthering Waves builds using {wepName}, a {weaponInfo.rarity?.id || 5}-star {typeName} weapon. Compare passive scaling, matching resonators, and leaderboard performance across submitted WuWaBuilds setups.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <Link className="text-accent underline hover:text-accent-hover" href="/builds">
                            Browse top builds
                        </Link>
                        {matchingCharacters.slice(0, 6).map((character) => (
                            <Link
                                className="text-accent underline hover:text-accent-hover"
                                href={`/characters/${character.id}`}
                                key={character.id}
                            >
                                {getI18nText(character.name)}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
            <div className="px-3 py-4 md:px-16 md:py-6">
                <WeaponClient weaponId={id} />
            </div>
            {weaponInfo && (
                <details className="mx-3 mb-8 md:mx-16 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-gray-300 [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-gray-300 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:text-gray-400 [&_p]:mt-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_li]:mt-1 [&_a]:text-accent hover:[&_a]:text-accent-hover [&_a]:underline">
                    <summary className="cursor-pointer font-semibold text-gray-300 hover:text-white transition-colors">
                        Detailed {wepName} weapon data
                    </summary>
                    <div className="mt-4">
                        <h2>{wepName} Stats & Build Calculator</h2>
                        <p>
                            Welcome to the WuWaBuilds {wepName} calculator and database.
                            The {wepName} is a {weaponInfo.rarity?.id || 5}-star {typeName} weapon in Wuthering Waves.
                            Use our tool to calculate its exact passive scaling, view max level stats, and see how it performs on different resonators across the global leaderboard. Our custom backend engine runs native damage calculations for imported builds.
                        </p>

                        {effectName && (
                            <>
                                <h2>Passive: {effectName}</h2>
                                <h3>Rank 1</h3>
                                <p>{effectRank1}</p>
                                <h3>Rank 5</h3>
                                <p>{effectRank5}</p>
                            </>
                        )}

                        <h2>Best Characters for {wepName}</h2>
                        <p>Equip this weapon on matching {typeName} resonators to calculate their damage output. View character leaderboards:</p>
                        <ul>
                            {matchingCharacters.map((c) => (
                                <li key={c.id}>
                                    <Link href={`/characters/${c.id}`}>{getI18nText(c.name)}</Link>
                                </li>
                            ))}
                        </ul>

                        <h2>View Top Builds</h2>
                        <p>Browse the <Link href="/builds">WuWaBuilds database</Link> to discover how top players utilize the {wepName}.</p>
                    </div>
                </details>
            )}
        </main>
    );
}
