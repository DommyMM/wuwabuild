'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import { GlossaryNotes } from '@/components/ui/GlossaryNotes';

type ReferenceWeapon = {
    id: string;
    name: string;
    icon: string;
    rarity?: number;
    type: string;
};

/** Move with its text already resolved to English by the page, so the other twelve languages never reach the client */
export type ReferenceMove = {
    id: number;
    name: string;
    description?: string;
    descriptionParams?: string[];
    maxLevel?: number;
    values?: Array<{ id: number; name: string; values: string[] }>;
};

/** Resonance chain node with English text, icon and template params */
export type ReferenceChain = {
    id: number;
    name: string;
    description?: string;
    icon: string;
    param?: string[];
};

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

    return (
        <div className={className}>
            <p className="whitespace-pre-line leading-relaxed text-text-primary/72">{rendered}</p>
            <GlossaryNotes template={template} />
        </div>
    );
}

function getLevelValue(values: string[] | undefined, level: number): string {
    if (!values?.length) return '';
    return values[Math.min(Math.max(level - 1, 0), values.length - 1)] ?? values[values.length - 1] ?? '';
}

export function CharacterReferenceSections({
    characterId,
    characterName,
    weaponType,
    matchingWeapons,
    moves,
    chains,
    hasLeaderboard,
}: {
    characterId: string;
    characterName: string;
    weaponType: string;
    matchingWeapons: ReferenceWeapon[];
    moves: ReferenceMove[];
    chains: ReferenceChain[];
    /** False when the character has no board, so the link to a 404 stays off the page */
    hasLeaderboard: boolean;
}) {
    const maxSkillLevel = useMemo(() => {
        const levels = moves.map((move) => move.maxLevel ?? 0).filter((level) => level > 0);
        return Math.max(10, ...levels);
    }, [moves]);
    const [skillLevel, setSkillLevel] = useState(Math.min(10, maxSkillLevel));

    return (
        <section className="mx-auto mb-10 mt-4 max-w-360 px-3 md:mt-6 md:px-16">
            {matchingWeapons.length > 0 && (
                <div className="mb-4 rounded-xl border border-border bg-background-secondary/70 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-2xs font-semibold uppercase tracking-[0.24em] text-text-primary/38">Compatible weapons</p>
                            <p className="mt-1 text-sm text-text-primary/55">
                                {weaponType} options that can be opened from this reference page.
                            </p>
                        </div>
                        {hasLeaderboard && (
                            <Link className="text-sm font-semibold text-accent hover:text-accent-hover" href={`/leaderboards/${characterId}`}>
                                {characterName} leaderboard &rarr;
                            </Link>
                        )}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {matchingWeapons.slice(0, 8).map((weapon) => (
                            <Link
                                className="group grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded border border-border bg-black/24 p-2 transition-colors hover:border-accent/45 hover:bg-accent/8"
                                href={`/weapons/${weapon.id}`}
                                key={weapon.id}
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-black/35">
                                    {weapon.icon && <img src={weapon.icon} alt="" className="h-9 w-9 object-contain" loading="lazy" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-text-primary/86 group-hover:text-accent">{weapon.name}</span>
                                    <span className="text-xs text-text-primary/42">{weapon.rarity ? `${weapon.rarity}-star` : weapon.type}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-border bg-background-secondary/70 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
                    <div>
                        <p className="text-2xs font-semibold uppercase tracking-[0.24em] text-text-primary/38">Parsed data</p>
                        <h2 className="mt-1 font-plus-jakarta text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                            Skills and resonance chains
                        </h2>
                    </div>
                    <div className="min-w-55">
                        <div className="flex items-center justify-between gap-4">
                            <label htmlFor="skill-level" className="text-2xs font-semibold uppercase tracking-[0.2em] text-text-primary/38">
                                Skill level
                            </label>
                            <span className="font-gowun text-xl text-accent tabular-nums">Lv {skillLevel}</span>
                        </div>
                        <input
                            id="skill-level"
                            type="range"
                            min={1}
                            max={maxSkillLevel}
                            value={skillLevel}
                            onChange={(event) => setSkillLevel(Number(event.target.value))}
                            className="level-slider mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border"
                            style={{
                                background: `linear-gradient(to right, #a69662 0%, #bfad7d ${((skillLevel - 1) / Math.max(maxSkillLevel - 1, 1)) * 100}%, #333333 ${((skillLevel - 1) / Math.max(maxSkillLevel - 1, 1)) * 100}%, #333333 100%)`,
                            }}
                        />
                    </div>
                </div>

                <div className="mt-5 space-y-5">
                    {moves.map(move => {
                        const moveName = move.name;
                        const description = move.description ?? '';
                        const valueRows = move.values?.filter((value) => value.name && value.values?.length) ?? [];

                        return (
                            <article key={move.id} className="rounded-lg border border-border bg-black/20 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <h3 className="font-plus-jakarta text-lg font-semibold tracking-[-0.01em] text-text-primary">{moveName}</h3>
                                    {move.maxLevel ? (
                                        <span className="rounded border border-accent/25 bg-accent/8 px-2 py-1 text-xs font-semibold text-accent">
                                            Lv {skillLevel}/{move.maxLevel}
                                        </span>
                                    ) : null}
                                </div>
                                {description && (
                                    <RichGameText
                                        template={description}
                                        values={move.descriptionParams}
                                        className="mt-2"
                                    />
                                )}
                                {valueRows.length > 0 && (
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {valueRows.map(val => (
                                            <div key={val.id} className="rounded border border-white/8 bg-white/2.5 p-2">
                                                <p className="truncate text-xs text-text-primary/45">{val.name}</p>
                                                <p className="mt-1 font-gowun text-sm text-text-primary tabular-nums">{getLevelValue(val.values, skillLevel)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}

                    {chains.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {chains.map((chain, index) => {
                                const { name, description } = chain;
                                return (
                                    <article key={chain.id} className="rounded-lg border border-border bg-black/20 p-4">
                                        <div className="flex items-center gap-3">
                                            {chain.icon && <img src={chain.icon} alt="" className="h-10 w-10 rounded-md border border-border bg-black/30 object-contain" loading="lazy" />}
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
        </section>
    );
}
