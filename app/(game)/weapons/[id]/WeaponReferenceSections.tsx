'use client';

import { useState } from 'react';
import Link from 'next/link';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

type I18nLike = string | { en?: string };

type ReferenceCharacter = {
    id: string | number;
    name: I18nLike;
    icon?: { iconRound?: string };
};

function getI18nText(val: I18nLike | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.en || '';
}

function RichWeaponText({
    template,
    rank,
    params,
    className = '',
}: {
    template: string;
    rank: number;
    params?: Record<string, string[]>;
    className?: string;
}) {
    const rankIndex = Math.max(0, Math.min(4, rank - 1));
    const rendered = renderGameTemplateWithHighlights({
        template,
        getParamValue: (index) => {
            const values = params?.[String(index)];
            return values?.[rankIndex] ?? null;
        },
        highlightClassName: 'text-cyan-200 font-semibold',
        keepUnknownPlaceholders: false,
    });

    return <p className={`whitespace-pre-line leading-relaxed text-text-primary/72 ${className}`}>{rendered}</p>;
}

function formatBonusValue(value: number | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/u, '');
    return `${formatted}%`;
}

export function WeaponReferenceSections({
    weaponName,
    typeName,
    effectName,
    effectTemplate,
    params,
    passiveBonuses,
    matchingCharacters,
}: {
    weaponName: string;
    typeName: string;
    effectName?: string;
    effectTemplate: string;
    params?: Record<string, string[]>;
    passiveBonuses: Array<[string, number[]]>;
    matchingCharacters: ReferenceCharacter[];
}) {
    const [rank, setRank] = useState(1);
    const rankIndex = rank - 1;

    return (
        <section className="mx-auto mb-10 mt-4 max-w-360 px-3 md:mt-6 md:px-16">
            {matchingCharacters.length > 0 && (
                <div className="mb-4 rounded-xl border border-white/10 bg-background-secondary/70 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/38">Compatible resonators</p>
                            <p className="mt-1 text-sm text-text-primary/55">
                                {typeName} users that can equip {weaponName}.
                            </p>
                        </div>
                        <Link className="text-sm font-semibold text-accent hover:text-accent-hover" href="/builds">
                            Builds &rarr;
                        </Link>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {matchingCharacters.slice(0, 10).map((character) => {
                            const name = getI18nText(character.name);
                            return (
                                <Link
                                    className="group grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-sm border border-white/10 bg-black/24 p-2 transition-colors hover:border-accent/45 hover:bg-accent/8"
                                    href={`/characters/${character.id}`}
                                    key={character.id}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/35">
                                        {character.icon?.iconRound && <img src={character.icon.iconRound} alt="" className="h-10 w-10 object-cover" loading="lazy" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-text-primary/86 group-hover:text-accent">{name}</span>
                                        <span className="text-xs text-text-primary/42">{typeName}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-white/10 bg-background-secondary/70 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/38">Parsed data</p>
                        <h2 className="mt-1 font-plus-jakarta text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                            Passive and rank scaling
                        </h2>
                    </div>
                    <div className="min-w-[220px]">
                        <div className="flex items-center justify-between gap-4">
                            <label htmlFor="weapon-rank" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-primary/38">
                                Weapon rank
                            </label>
                            <span className="font-gowun text-xl text-accent tabular-nums">R{rank}</span>
                        </div>
                        <input
                            id="weapon-rank"
                            type="range"
                            min={1}
                            max={5}
                            value={rank}
                            onChange={(event) => setRank(Number(event.target.value))}
                            className="level-slider mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border"
                            style={{
                                background: `linear-gradient(to right, #a69662 0%, #bfad7d ${((rank - 1) / 4) * 100}%, #333333 ${((rank - 1) / 4) * 100}%, #333333 100%)`,
                            }}
                        />
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {effectTemplate && (
                        <article className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="seq-badge">{`R${rank}`}</p>
                            <h3 className="mt-3 font-plus-jakarta text-lg font-semibold tracking-[-0.01em] text-text-primary">
                                {effectName || 'Passive'}
                            </h3>
                            <RichWeaponText
                                template={effectTemplate}
                                rank={rank}
                                params={params}
                                className="mt-2"
                            />
                        </article>
                    )}

                    {passiveBonuses.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-primary/38">Static passive bonuses</p>
                            <div className="mt-3 grid gap-2">
                                {passiveBonuses.map(([stat, values]) => (
                                    <div key={stat} className="rounded-sm border border-white/8 bg-white/[0.025] p-3">
                                        <p className="truncate text-xs text-text-primary/45">{stat}</p>
                                        <p className="mt-1 font-gowun text-2xl leading-none text-text-primary tabular-nums">
                                            <span className="text-accent">+</span>{formatBonusValue(values[rankIndex])}
                                        </p>
                                        <p className="mt-1 text-xs text-text-primary/35">Rank {rank} value</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
