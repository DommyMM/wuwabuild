import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { CharacterClient } from './CharacterClient';
import { adaptCDNCharacter } from '@/lib/character';
import { loadCharacterRaw } from '@/lib/server/ogData';

type GenericDict = Record<string, unknown>;

function loadWeapons(): GenericDict[] {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');
    if (!fs.existsSync(wepPath)) return [];

    const rawData = JSON.parse(fs.readFileSync(wepPath, 'utf8'));
    if (Array.isArray(rawData)) return rawData as GenericDict[];
    if (rawData && typeof rawData === 'object') {
        return Object.values(rawData as GenericDict).flatMap(group => {
            if (Array.isArray(group)) return group as GenericDict[];
            if (group && typeof group === 'object') return Object.values(group as GenericDict) as GenericDict[];
            return [];
        });
    }
    return [];
}

function getI18nText(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return (val as { en?: string }).en || '';
}

export async function generateStaticParams() {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const charPath = path.join(dataDir, 'Characters.json');

    if (fs.existsSync(charPath)) {
        const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8')) as GenericDict;
        return Object.values(charsData).map((char: unknown) => ({
            id: (char as { id?: string | number }).id?.toString(),
        })).filter(c => c.id);
    }
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    let title = 'Character Build Calculator - WuWaBuilds';
    let description = 'Calculate the best builds, echoes, and stats for this character on WuwaBuilds.';

    const rawChar = loadCharacterRaw(id);
    if (rawChar) {
        const char = adaptCDNCharacter(rawChar);
        title = `${char.name} Build, Stats & Calculator - Wuthering Waves`;
        description = `Calculate the best builds and optimal damage for ${char.name} in Wuthering Waves. Explore top player leaderboards, weapon rankings, and simulated echo loadouts on WuWaBuilds.`;
    }

    return {
        title,
        description,
        openGraph: { title, description, url: `https://wuwa.build/characters/${id}` },
        twitter: { title, description },
        alternates: { canonical: `/characters/${id}` },
    };
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const rawChar = loadCharacterRaw(id);
    const char = rawChar ? adaptCDNCharacter(rawChar) : null;
    let matchingWeapons: GenericDict[] = [];

    if (rawChar && char) {
        const weapons = loadWeapons();
        matchingWeapons = weapons.filter(w => {
            const typeName = (w.type as { name?: { en?: string } })?.name?.en;
            return (typeName === char?.weaponType || w.weaponType === char?.weaponType || w.type === char?.weaponType) && w.id;
        });
    }

    const charName = char ? char.name : '';
    const weaponType = char ? char.weaponType : '';
    const element = char ? char.element : '';

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
                "name": "Characters",
                "item": "https://wuwa.build/builds"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": charName || "Character",
                "item": `https://wuwa.build/characters/${id}`
            }
        ]
    };

    const jsonLdProfile = charName ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "mainEntity": {
            "@type": "Person",
            "name": charName,
            "description": `${charName} in Wuthering Waves. ${element} ${weaponType} Resonator.`
        }
    } : null;

    return (
        <main className="bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
            />
            {jsonLdProfile && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProfile) }}
                />
            )}
            {char && rawChar && (
                <section className="mx-3 mb-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-gray-300 md:mx-16 md:mt-4">
                    <h1 className="text-xl font-semibold text-gray-100">
                        {charName} Build Calculator & Leaderboards
                    </h1>
                    <p className="mt-2 max-w-4xl text-gray-400">
                        Calculate optimal Wuthering Waves builds for {charName}, a {element} Resonator who uses a {weaponType}. Use the calculator to test echo stats, weapon choices, forte levels, and sequence settings, then compare top player setups on the global leaderboard.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <Link className="text-accent underline hover:text-accent-hover" href={`/leaderboards/${id}`}>
                            View {charName} leaderboard
                        </Link>
                        <Link className="text-accent underline hover:text-accent-hover" href="/builds">
                            Browse all builds
                        </Link>
                        {matchingWeapons.slice(0, 5).map((weapon) => (
                            <Link
                                className="text-accent underline hover:text-accent-hover"
                                href={`/weapons/${weapon.id}`}
                                key={weapon.id as string}
                            >
                                {getI18nText(weapon.name) || (weapon.id as string)}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
            <div className="px-3 py-4 md:px-16 md:py-6">
                <CharacterClient characterId={id} />
            </div>
            {char && rawChar && (
                <details className="mx-3 mb-8 md:mx-16 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-gray-300 [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-gray-300 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:text-gray-400 [&_p]:mt-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_li]:mt-1 [&_a]:text-accent hover:[&_a]:text-accent-hover [&_a]:underline">
                    <summary className="cursor-pointer font-semibold text-gray-300 hover:text-white transition-colors">
                        Detailed {charName} skill data
                    </summary>
                    <div className="mt-4">
                        <h2>{charName} Build Calculator & Leaderboards</h2>
                        <p>
                            Welcome to the WuWaBuilds {charName} stat calculator and global leaderboard.
                            {charName} is a {element} Resonator who uses a {weaponType}. Here you can calculate optimal substats, simulate echo loadouts, and determine the highest damage ceiling for {charName}. Our custom server-side engine computes precise damage rotations for player-submitted builds.
                        </p>

                        <h2>Top {charName} Builds on the Leaderboard</h2>
                        <p>
                            Curious how your {charName} compares? Browse the <Link href="/builds">WuWaBuilds database</Link> or check the global <Link href={`/leaderboards/${id}`}>leaderboard for {charName}</Link> to see the best player setups. Compare total damage, Crit Value (CV), and echo loadouts.
                        </p>

                        <h2>Matching {weaponType} Weapons</h2>
                        <p>Selecting the right weapon drastically changes {charName}&apos;s damage output. Calculate rankings with these matching weapons:</p>
                        <ul>
                            {matchingWeapons.map((w) => (
                                <li key={w.id as string}>
                                    <Link href={`/weapons/${w.id}`}>{getI18nText(w.name) || (w.id as string)}</Link>
                                </li>
                            ))}
                        </ul>

                        <h2>{charName} Skill & Forte Multipliers</h2>
                        {rawChar.moves?.map(move => (
                            <div key={move.id}>
                                <h3>{getI18nText(move.name)}</h3>
                                <p>{getI18nText(move.description)}</p>
                                <ul>
                                    {move.values?.map(val => {
                                        const valName = getI18nText(val.name);
                                        if (!valName || !val.values) return null;
                                        return <li key={val.id}>{valName}: {val.values[val.values.length - 1]}</li>;
                                    })}
                                </ul>
                            </div>
                        ))}

                        <h2>Resonance Chains</h2>
                        {rawChar.chains?.map((chain, index) => (
                            <div key={chain.id}>
                                <h3>Sequence {index + 1}: {getI18nText(chain.name)}</h3>
                                <p>{getI18nText(chain.description)}</p>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </main>
    );
}
