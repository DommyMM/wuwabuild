import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { adaptCDNCharacter } from '@/lib/character';
import { loadCharacterRaw } from '@/lib/server/gameData';
import { getLeaderboardInsight, formatInsightProse } from '@/lib/server/leaderboardInsight';
import { CharacterReferenceSections } from './CharacterReferenceSections';

// The leaderboard insight prose is data-driven and shifts as builds are submitted;
// regenerate daily (the page is force-static by the (game) layout default).
export const revalidate = 86400;

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

function getImageUrl(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const icon = val as { icon?: string; iconMiddle?: string; iconSmall?: string; iconRound?: string; banner?: string };
    return icon.iconMiddle || icon.icon || icon.iconSmall || icon.iconRound || icon.banner || '';
}

function getRarity(val: unknown): number | undefined {
    if (!val || typeof val !== 'object') return undefined;
    const rarity = val as { id?: unknown };
    return typeof rarity.id === 'number' ? rarity.id : undefined;
}

function formatNumber(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return Math.round(value).toLocaleString('en-US');
}

function CompactStat({
    label,
    value,
    detail,
}: {
    label: string;
    value: ReactNode;
    detail?: ReactNode;
}) {
    return (
        <div className="rounded-md border border-white/8 bg-white/2.5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-primary/32">{label}</p>
            <p className="mt-1 font-gowun text-xl leading-none text-text-primary tabular-nums">{value}</p>
            {detail && <p className="mt-1 text-xs text-text-primary/42">{detail}</p>}
        </div>
    );
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
        openGraph: {
            title,
            description,
            url: `https://wuwa.build/characters/${id}`,
            images: [{ url: `https://wuwa.build/api/og/character?id=${encodeURIComponent(id)}`, width: 1200, height: 630, alt: title }],
        },
        twitter: { title, description, images: [`https://wuwa.build/api/og/character?id=${encodeURIComponent(id)}`] },
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
    const insight = char ? await getLeaderboardInsight(id) : null;
    const insightProse = char && insight ? formatInsightProse(charName, insight) : null;
    const weaponType = char ? char.weaponType : '';
    const element = char ? char.element : '';
    const matchingWeaponRefs = matchingWeapons.map((weapon) => ({
        id: String(weapon.id),
        name: getI18nText(weapon.name) || String(weapon.id),
        icon: getImageUrl(weapon.icon),
        rarity: getRarity(weapon.rarity),
        type: weaponType,
    }));
    const elementColor = rawChar?.element?.color || undefined;
    const heroStyle = {
        '--seo-element-color': elementColor ?? '#a69662',
    } as CSSProperties;

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
                "name": "Builds",
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
                <section className="mx-auto max-w-360 px-3 pt-4 md:px-16 md:pt-8" style={heroStyle}>
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-background-secondary/72 shadow-[0_6px_16px_rgba(0,0,0,0.26)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(56%_120%_at_14%_0%,color-mix(in_srgb,var(--seo-element-color)_18%,transparent)_0%,transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.035)_0%,transparent_48%,rgba(0,0,0,0.24)_100%)]" />
                        <div className="relative grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <div className="relative min-h-[250px] border-b border-white/10 bg-black/20 lg:border-r lg:border-b-0">
                                {rawChar.icon?.banner && (
                                    <img
                                        src={rawChar.icon.banner}
                                        alt=""
                                        className="absolute inset-x-0 bottom-0 mx-auto h-[270px] w-full object-contain object-bottom opacity-90"
                                        loading="eager"
                                    />
                                )}
                            </div>
                            <div className="p-5 md:p-7">
                                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Resonator dossier</p>
                                        <h1 className={`char-sig ${element.toLowerCase()} mt-2 font-plus-jakarta text-4xl font-semibold leading-[1.02] tracking-[-0.02em] md:text-6xl`}>
                                            {charName}
                                        </h1>
                                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-primary/68">
                                            {element} {weaponType} reference page with parsed skill text, resonance chain details, base stats, and links to compatible weapons.
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            {char.title && (
                                                <span className="rounded-sm border border-white/10 bg-black/24 px-2.5 py-1 text-xs text-text-primary/60">
                                                    {char.title}
                                                </span>
                                            )}
                                            {rawChar.tags?.slice(0, 4).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-black/24 px-2.5 py-1 text-xs text-text-primary/60"
                                                >
                                                    {tag.icon && <img src={tag.icon} alt="" className="h-4 w-4 object-contain opacity-75" loading="lazy" />}
                                                    {getI18nText(tag.name)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-6 flex flex-wrap gap-2">
                                            <Link className="gold-glow rounded-sm border border-accent/45 bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover" href={`/leaderboards/${id}`}>
                                                View leaderboard
                                            </Link>
                                            <Link className="gold-glow rounded-sm border border-white/10 bg-white/3 px-4 py-2 text-sm font-semibold text-text-primary/82 transition-colors hover:border-accent/45 hover:text-accent" href="/builds">
                                                Browse builds
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="grid gap-2 rounded-lg border border-white/10 bg-black/18 p-2 md:grid-cols-3 xl:grid-cols-2">
                                        <CompactStat label="Element" value={element} />
                                        <CompactStat label="Weapon" value={weaponType} />
                                        <CompactStat label="HP" value={formatNumber(char.HP)} />
                                        <CompactStat label="ATK" value={formatNumber(char.ATK)} />
                                        <CompactStat label="DEF" value={formatNumber(char.DEF)} />
                                        <CompactStat label="Bonus" value={char.Bonus1} detail={char.Bonus2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
            {insightProse && (
                <section className="mx-auto max-w-360 px-3 pt-4 md:px-16">
                    <div className="rounded-xl border border-white/10 bg-background-secondary/55 p-5 md:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Leaderboard insight</p>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-primary/72">{insightProse}</p>
                    </div>
                </section>
            )}
            {char && rawChar && (
                <CharacterReferenceSections
                    characterId={id}
                    characterName={charName}
                    weaponType={weaponType}
                    matchingWeapons={matchingWeaponRefs}
                    moves={rawChar.moves ?? []}
                    chains={rawChar.chains ?? []}
                />
            )}
        </main>
    );
}
