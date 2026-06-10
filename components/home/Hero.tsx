'use client';

import { useEffect, useState } from 'react';
import { HomeLink } from './HomeLink';
import { ProfileSearch } from './ProfileSearch';
import { LB_SEQ_BADGE_COLORS } from '../leaderboards/constants';
import type { HomeHeroSlide } from './types';

interface HeroProps {
    slides: HomeHeroSlide[];
    totalBuilds: number;
    totalLeaderboards: number;
}

const ROTATE_MS = 6500;

// Element glow tints behind the splash art (element colors belong to gameplay data, and the art is gameplay).
const ELEMENT_GLOW_RGB: Record<string, string> = {
    glacio: '65, 174, 251',
    fusion: '240, 116, 78',
    electro: '180, 107, 255',
    aero: '85, 255, 181',
    spectro: '248, 229, 108',
    havoc: '230, 73, 166',
    rover: '120, 146, 161',
};

export function Hero({ slides, totalBuilds, totalLeaderboards }: HeroProps) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (slides.length < 2 || paused) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const timer = setInterval(() => {
            setIndex((current) => (current + 1) % slides.length);
        }, ROTATE_MS);
        return () => clearInterval(timer);
    }, [slides.length, paused, index]);

    const active = slides[index] ?? null;

    return (
        <section className="relative overflow-hidden border-b border-border">
            {/* Rotating splash art of each character's record holder */}
            {slides.length > 0 && (
                <div className="absolute inset-0" aria-hidden>
                    {slides.map((slide, i) => {
                        const glowRgb = ELEMENT_GLOW_RGB[slide.element];
                        return (
                            <div
                                key={`${slide.characterId}:${slide.trackLabel}`}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
                            >
                                {glowRgb && (
                                    <div
                                        className="absolute inset-0"
                                        style={{ background: `radial-gradient(700px 520px at 76% 55%, rgba(${glowRgb}, 0.13), transparent 70%)` }}
                                    />
                                )}
                                <img
                                    src={slide.splashUrl}
                                    alt=""
                                    className="absolute bottom-0 right-0 h-full w-auto max-w-none object-contain object-bottom opacity-35 md:opacity-60 mask-[linear-gradient(to_left,rgba(0,0,0,1)_45%,transparent_95%)]"
                                    loading={i === 0 ? 'eager' : 'lazy'}
                                />
                            </div>
                        );
                    })}
                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/15 to-transparent" />
                </div>
            )}

            <div className="relative mx-auto max-w-260 px-6 md:px-10 py-16 md:py-24">
                <h1 className="font-plus-jakarta font-medium text-text-primary max-w-3xl">
                    <span className="block text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-text-primary/55 mb-4">
                        Wuthering Waves Character Builds &amp; Leaderboard
                    </span>
                    <span className="block text-[38px] md:text-6xl leading-[1.04] tracking-[-0.03em]">
                        Scan your stats.<br />
                        <span className="text-accent italic font-normal">Rank</span> your damage.
                    </span>
                </h1>

                <p className="mt-5 max-w-xl text-base md:text-lg leading-normal text-text-primary/65">
                    Search any player, or import your own build from a wuwa-bot screenshot.
                    {totalBuilds > 0 && (
                        <span className="block mt-1 font-mono text-xs text-text-primary/45 tabular-nums">
                            {totalBuilds.toLocaleString('en-US')} builds on file across {totalLeaderboards} boards.
                        </span>
                    )}
                </p>

                <div className="mt-7">
                    <ProfileSearch />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <HomeLink
                        href="/import"
                        cta="import"
                        section="hero"
                        className="gold-glow inline-flex items-center gap-2.5 rounded-sm bg-accent px-5 py-2.5 text-[15px] font-semibold tracking-[0.02em] text-background hover:bg-accent-hover"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M12 15V3m0 0l-4 4m4-4l4 4M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
                        </svg>
                        Import a build
                    </HomeLink>
                    <HomeLink
                        href="/leaderboards"
                        cta="leaderboards"
                        section="hero"
                        className="text-sm text-text-primary/70 transition-colors hover:text-accent"
                    >
                        Leaderboards →
                    </HomeLink>
                    <HomeLink
                        href="/builds"
                        cta="builds"
                        section="hero"
                        className="text-sm text-text-primary/70 transition-colors hover:text-accent"
                    >
                        All builds →
                    </HomeLink>
                </div>

                {/* Record panel for the active slide */}
                {active && (
                    <div
                        className="mt-10 max-w-95 md:absolute md:bottom-6 md:right-6 md:mt-0 md:w-90"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                    >
                        <HomeLink
                            key={`${active.characterId}:${active.trackLabel}`}
                            href={active.href}
                            cta="leaderboards"
                            section="hero"
                            characterId={active.characterId}
                            className="hero-rise group block overflow-hidden rounded-lg border border-border bg-background-secondary/75 backdrop-blur-sm px-4 py-3.5 transition-colors hover:border-accent/40"
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary/45">
                                    Highest damage
                                </span>
                                {active.reignLabel && (
                                    <span className="font-mono text-[10px] text-accent/80 tabular-nums">
                                        {active.reignLabel}
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 flex items-center gap-2 min-w-0">
                                <span className={`truncate text-lg font-semibold leading-tight ${active.element ? `char-sig ${active.element}` : 'text-text-primary'}`}>
                                    {active.name}
                                </span>
                                {active.seqLevel > 0 && (
                                    <span className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[active.seqLevel]}`}>
                                        S{active.seqLevel}
                                    </span>
                                )}
                                {active.trackLabel && (
                                    <span className="shrink-0 text-xs text-text-primary/50">
                                        {active.trackLabel}
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-gowun text-[26px] leading-none text-accent tabular-nums">
                                        {Math.round(active.damage).toLocaleString('en-US')}
                                    </div>
                                    <div className="mt-1.5 truncate font-mono text-[10px] text-text-primary/50">
                                        by {active.owner || 'Anonymous'} ↗
                                    </div>
                                </div>
                                {active.weaponIcon && (
                                    <div className="flex shrink-0 items-center gap-2">
                                        <img
                                            src={active.weaponIcon}
                                            alt=""
                                            className="h-10 w-10 object-contain"
                                            loading="lazy"
                                        />
                                        {active.weaponName && (
                                            <span className="hidden sm:block max-w-28 text-right text-xs leading-tight text-text-primary/55">
                                                {active.weaponName}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </HomeLink>

                        {slides.length > 1 && (
                            <div className="mt-2.5 flex justify-end gap-1.5">
                                {slides.map((slide, i) => (
                                    <button
                                        key={`${slide.characterId}:${slide.trackLabel}`}
                                        type="button"
                                        onClick={() => setIndex(i)}
                                        aria-label={`Show ${slide.name} record`}
                                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                            i === index ? 'w-5 bg-accent' : 'w-1.5 bg-text-primary/25 hover:bg-text-primary/45'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
