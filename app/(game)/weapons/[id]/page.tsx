import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { CDNCharacter } from '@/lib/character';
import { WeaponReferenceSections } from './WeaponReferenceSections';

type WeaponRecord = {
    id?: string | number;
    name?: { en?: string };
    type?: { name?: { en?: string } };
    effectName?: { en?: string };
    effect?: { en?: string };
    params?: Record<string, string[]>;
    rarity?: { id?: number };
    icon?: { icon?: string; iconMiddle?: string; iconSmall?: string } | string;
    stats?: {
        first?: { attribute?: string; value?: number };
        second?: { attribute?: string; name?: { en?: string }; value?: number; isRatio?: boolean };
    };
    unconditionalPassiveBonuses?: Record<string, number[]>;
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

function getWeaponIcon(weapon: WeaponRecord | undefined): string {
    const icon = weapon?.icon;
    if (!icon) return '';
    if (typeof icon === 'string') return icon;
    return icon.iconMiddle || icon.icon || icon.iconSmall || '';
}

function formatSubstatValue(value: number | undefined, isRatio: boolean | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0%';
    const normalized = isRatio ? value * 100 : value / 100;
    return `${normalized.toFixed(1).replace(/\.0$/u, '')}%`;
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
    const effectTemplate = weaponInfo?.effect?.en || '';
    const weaponIcon = getWeaponIcon(weaponInfo);
    const baseAtk = weaponInfo?.stats?.first?.value ?? 0;
    const substatName = weaponInfo?.stats?.second?.name?.en ?? weaponInfo?.stats?.second?.attribute ?? 'Substat';
    const substatValue = formatSubstatValue(weaponInfo?.stats?.second?.value, weaponInfo?.stats?.second?.isRatio);
    const passiveBonuses = Object.entries(weaponInfo?.unconditionalPassiveBonuses ?? {}).slice(0, 6);

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
                <section className="mx-auto max-w-360 px-3 pt-4 md:px-16 md:pt-8">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-background-secondary/72 shadow-[0_6px_16px_rgba(0,0,0,0.26)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_120%_at_12%_0%,rgba(166,150,98,0.18)_0%,transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.035)_0%,transparent_48%,rgba(0,0,0,0.24)_100%)]" />
                        <div className="relative grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <div className="relative min-h-[250px] border-b border-white/10 bg-black/20 lg:border-r lg:border-b-0">
                                {weaponIcon && (
                                    <img
                                        src={weaponIcon}
                                        alt=""
                                        className="absolute inset-x-0 bottom-6 mx-auto h-52 w-52 object-contain opacity-95"
                                        loading="eager"
                                    />
                                )}
                            </div>
                            <div className="p-5 md:p-7">
                                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Weapon dossier</p>
                                        <h1 className="mt-2 font-plus-jakarta text-4xl font-semibold leading-[1.02] tracking-[-0.02em] text-text-primary md:text-6xl">
                                            {wepName}
                                        </h1>
                                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-primary/68">
                                            {weaponInfo.rarity?.id || 5}-star {typeName} reference page with parsed passive ranks, base stats, and compatible resonators.
                                        </p>
                                        <div className="mt-6 flex flex-wrap gap-2">
                                            <Link className="gold-glow rounded-sm border border-accent/45 bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover" href="/builds">
                                                Browse top builds
                                            </Link>
                                            {matchingCharacters[0] && (
                                                <Link className="gold-glow rounded-sm border border-white/10 bg-white/3 px-4 py-2 text-sm font-semibold text-text-primary/82 transition-colors hover:border-accent/45 hover:text-accent" href={`/characters/${matchingCharacters[0].id}`}>
                                                    Open {getI18nText(matchingCharacters[0].name)}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-2 rounded-lg border border-white/10 bg-black/18 p-2 md:grid-cols-3 xl:grid-cols-2">
                                        <CompactStat label="Rarity" value={`${weaponInfo.rarity?.id || 5} star`} />
                                        <CompactStat label="Type" value={typeName} />
                                        <CompactStat label="Base ATK" value={baseAtk.toLocaleString('en-US')} />
                                        <CompactStat label={substatName} value={substatValue} />
                                        <CompactStat label="Passive" value={effectName || 'Weapon skill'} />
                                        <CompactStat label="Matches" value={matchingCharacters.length} detail={`${typeName} resonators`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
            {weaponInfo && (
                <WeaponReferenceSections
                    weaponName={wepName}
                    typeName={typeName}
                    effectName={effectName}
                    effectTemplate={effectTemplate}
                    params={weaponInfo.params}
                    passiveBonuses={passiveBonuses}
                    matchingCharacters={matchingCharacters}
                />
            )}
        </main>
    );
}
