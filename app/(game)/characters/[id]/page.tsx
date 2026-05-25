import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { adaptCDNCharacter } from '@/lib/character';
import { loadCharacterRaw } from '@/lib/server/ogData';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

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

function formatNumber(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return Math.round(value).toLocaleString('en-US');
}

function RichGameText({
    template,
    values = [],
    className = '',
}: {
    template: string;
    values?: Array<string | null | undefined>;
    className?: string;
}) {
    const rendered = renderGameTemplateWithHighlights({
        template,
        getParamValue: (index) => values[index] ?? null,
        highlightClassName: 'text-cyan-200 font-semibold',
        keepUnknownPlaceholders: false,
    });

    return <p className={`whitespace-pre-line leading-relaxed text-text-primary/72 ${className}`}>{rendered}</p>;
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
        <div className="rounded-md border border-white/8 bg-white/[0.025] px-3 py-3">
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
                                            <Link className="gold-glow rounded-sm border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-text-primary/82 transition-colors hover:border-accent/45 hover:text-accent" href="/builds">
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
            {char && rawChar && (
                <section className="mx-auto mb-10 mt-4 max-w-360 px-3 md:mt-6 md:px-16">
                    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="space-y-4">
                            <div className="rounded-xl border border-white/10 bg-background-secondary/70 p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/38">Matching weapons</p>
                                <div className="mt-4 grid gap-2">
                                    {matchingWeapons.slice(0, 8).map((weapon) => {
                                        const name = getI18nText(weapon.name) || (weapon.id as string);
                                        const icon = getImageUrl(weapon.icon);
                                        return (
                                            <Link
                                                className="group grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-sm border border-white/10 bg-black/24 p-2 transition-colors hover:border-accent/45 hover:bg-accent/8"
                                                href={`/weapons/${weapon.id}`}
                                                key={weapon.id as string}
                                            >
                                                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-black/35">
                                                    {icon && <img src={icon} alt="" className="h-10 w-10 object-contain" loading="lazy" />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-text-primary/86 group-hover:text-accent">{name}</span>
                                                    <span className="text-xs text-text-primary/42">{weaponType}</span>
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-background-secondary/70 p-5">
                            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/38">Parsed data</p>
                                    <h2 className="mt-1 font-plus-jakarta text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                                        Skills and resonance chains
                                    </h2>
                                </div>
                                <Link className="text-sm font-semibold text-accent hover:text-accent-hover" href={`/leaderboards/${id}`}>
                                    Leaderboard &rarr;
                                </Link>
                            </div>

                            <div className="mt-5 space-y-5">
                                {rawChar.moves?.map(move => {
                                    const moveName = getI18nText(move.name);
                                    const description = getI18nText(move.description);
                                    return (
                                        <article key={move.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <h3 className="font-plus-jakarta text-lg font-semibold tracking-[-0.01em] text-text-primary">{moveName}</h3>
                                            {description && (
                                                <RichGameText
                                                    template={description}
                                                    values={move.descriptionParams}
                                                    className="mt-2"
                                                />
                                            )}
                                            {move.values?.length > 0 && (
                                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                    {move.values.map(val => {
                                                        const valName = getI18nText(val.name);
                                                        if (!valName || !val.values?.length) return null;
                                                        return (
                                                            <div key={val.id} className="rounded-sm border border-white/8 bg-white/[0.025] p-2">
                                                                <p className="truncate text-xs text-text-primary/45">{valName}</p>
                                                                <p className="mt-1 font-gowun text-sm text-text-primary tabular-nums">{val.values[val.values.length - 1]}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}

                                {rawChar.chains?.length ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {rawChar.chains.map((chain, index) => {
                                            const name = getI18nText(chain.name);
                                            const description = getI18nText(chain.description);
                                            return (
                                                <article key={chain.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                                                    <div className="flex items-center gap-3">
                                                        {chain.icon && <img src={chain.icon} alt="" className="h-10 w-10 rounded-md border border-white/10 bg-black/30 object-contain" loading="lazy" />}
                                                        <div>
                                                            <p className={`seq-badge s${index + 1}`}>S{index + 1}</p>
                                                            <h3 className="mt-1 font-plus-jakarta text-base font-semibold tracking-[-0.01em] text-text-primary">{name}</h3>
                                                        </div>
                                                    </div>
                                                    {description && (
                                                        <RichGameText
                                                            template={description}
                                                            values={chain.param}
                                                            className="mt-3 text-sm"
                                                        />
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
