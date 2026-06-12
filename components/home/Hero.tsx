'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { HomeLink } from './HomeLink';
import { ProfileSearch } from './ProfileSearch';
import { LB_SEQ_BADGE_COLORS } from '../leaderboards/constants';
import { getHeroSplashOffset } from '@/lib/splashArt';
import type { HomeHeroSlide } from './types';

interface HeroProps {
    slides: HomeHeroSlide[];
    totalBuilds: number;
    totalLeaderboards: number;
}

const ROTATE_MS = 6500;
// prefers-reduced-motion as an external store: SSR assumes reduced (no
// hairline in the server markup), the client snapshot corrects it on hydration.
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getReducedMotionServer = () => true;
// Scan-line wipe duration — must stay in sync between the clip reveals and
// the sweeping line, so all of them read it from here via inline styles.
const SCAN_MS = 500;

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
    // Bumps on hover release so the timer hairline remounts and restarts in
    // sync with the rearmed countdown; slide changes restart it via index.
    const [resumes, setResumes] = useState(0);
    // The record being scanned out: held under the incoming slide for the
    // wipe's duration so the sweep replaces content instead of fading it.
    const [leaving, setLeaving] = useState<HomeHeroSlide | null>(null);
    const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServer);
    const rotates = slides.length >= 2 && !reducedMotion;
    const prevIndex = slides.length > 0 ? (index - 1 + slides.length) % slides.length : 0;
    const nextIndex = slides.length > 0 ? (index + 1) % slides.length : 0;

    useEffect(() => {
        if (!rotates || paused) return;
        const timer = setTimeout(() => {
            setLeaving(slides[index] ?? null);
            setIndex((index + 1) % slides.length);
        }, ROTATE_MS);
        return () => clearTimeout(timer);
    }, [slides, rotates, paused, index]);

    useEffect(() => {
        if (!leaving) return;
        const timer = setTimeout(() => setLeaving(null), SCAN_MS);
        return () => clearTimeout(timer);
    }, [leaving]);

    const active = slides[index] ?? null;

    return (
        <section className="relative overflow-visible border-b border-border">
            {/* Rotating splash art of each character's record holder */}
            {slides.length > 0 && (
                <div className="absolute inset-0 overflow-hidden" aria-hidden>
                    {slides.map((slide, i) => {
                        const glowRgb = ELEMENT_GLOW_RGB[slide.element];
                        const offset = getHeroSplashOffset(slide.characterId);
                        return (
                            <div
                                key={`${slide.characterId}:${slide.trackKey}`}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === index ? 'hero-settle opacity-100' : 'opacity-0'}`}
                                style={{ animationDuration: `${ROTATE_MS}ms` }}
                            >
                                {glowRgb && (
                                    <div
                                        className="absolute inset-0 max-md:[--hero-glow-x:50%]"
                                        style={{ background: `radial-gradient(700px 520px at var(--hero-glow-x,76%) 55%, rgba(${glowRgb}, 0.13), transparent 70%)` }}
                                    />
                                )}
                                {/* Mobile shows a center slice of the full-height art, so it reuses the
                                    per-character card offsets (as % of the image's own width) to keep the
                                    character centered. Desktop stays right-anchored. */}
                                {(i === prevIndex || i === index || i === nextIndex) && (
                                    <img
                                        src={slide.splashUrl}
                                        alt=""
                                        className="absolute bottom-0 left-1/2 h-full w-auto max-w-none origin-bottom object-contain object-bottom opacity-35 max-md:transform-[translateX(calc(-50%+var(--splash-x,0%)))_scale(var(--splash-s,1))] md:left-auto md:right-0 md:opacity-60 md:mask-[linear-gradient(to_left,rgba(0,0,0,1)_45%,transparent_95%)]"
                                        style={offset ? { '--splash-x': `${offset.xPct}%`, '--splash-s': offset.scale } as React.CSSProperties : undefined}
                                        loading={i === 0 ? 'eager' : 'lazy'}
                                    />
                                )}
                            </div>
                        );
                    })}
                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/15 to-transparent" />
                </div>
            )}

            <div className="relative mx-auto max-w-260 px-6 md:px-10 py-12 md:py-24">
                <h1 className="font-plus-jakarta font-medium text-text-primary max-w-3xl">
                    <span className="block text-[10px] md:text-sm font-semibold uppercase tracking-[0.18em] md:tracking-[0.22em] text-text-primary/55 mb-4">
                        Wuthering Waves Character Builds &amp; Leaderboard
                    </span>
                    <span className="block text-[38px] md:text-6xl leading-[1.04] tracking-[-0.03em]">
                        Scan your stats<br />
                        <span className="text-accent italic font-normal">Rank</span> your damage
                    </span>
                </h1>

                <p className="mt-5 max-w-xl text-base md:text-lg leading-normal text-text-primary/65">
                    Search any player, or import your own build from a wuwa-bot screenshot
                    {totalBuilds > 0 && (
                        <span className="block mt-1 font-mono text-xs text-text-primary/45 tabular-nums">
                            {totalBuilds.toLocaleString('en-US')} builds across {totalLeaderboards} boards
                        </span>
                    )}
                </p>

                <div id="home-profile-search" className="mt-7 scroll-mt-24">
                    <ProfileSearch />
                </div>

                <div className="mt-6 flex items-center gap-5 md:gap-6">
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
                    <div className="flex flex-col gap-y-1.5 md:flex-row md:items-center md:gap-x-6">
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
                </div>

                {/* Record panel for the active slide */}
                {active && (
                    <div
                        className="mt-8 max-w-95 md:absolute md:bottom-6 md:right-6 md:mt-0 md:w-90"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => {
                            setPaused(false);
                            setResumes((current) => current + 1);
                        }}
                    >
                        <HomeLink
                            href={active.href}
                            cta="leaderboards"
                            section="hero"
                            characterId={active.characterId}
                            className="group relative block overflow-hidden rounded-lg border border-border bg-background-secondary/75 backdrop-blur-sm transition-colors hover:border-accent/40"
                        >
                            {/* Countdown hairline (charge): fills over the slide duration, freezes
                                while hovered (rotation is paused), restarts when the countdown
                                rearms. Its end-of-cycle spike hands off to the scan below. */}
                            {rotates && (
                                <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5" aria-hidden>
                                    <span
                                        key={`${index}:${resumes}`}
                                        className={`hero-timer block h-full w-full origin-left bg-accent ${paused ? '[animation-play-state:paused]' : ''}`}
                                        style={{ animationDuration: `${ROTATE_MS}ms` }}
                                    />
                                </span>
                            )}

                            {/* The shell never remounts; records swap inside it via a scan-line
                                wipe (discharge) — the leaving record holds in place while the next
                                is revealed left-to-right behind the sweep. */}
                            <div className="relative">
                                {leaving && (
                                    <div
                                        key={`out:${leaving.characterId}:${leaving.trackKey}`}
                                        className="hero-scan-out pointer-events-none absolute inset-0 overflow-hidden"
                                        style={{ animationDuration: `${SCAN_MS}ms` }}
                                        aria-hidden
                                    >
                                        <RecordSlideContent slide={leaving} />
                                    </div>
                                )}
                                <div
                                    key={`${active.characterId}:${active.trackKey}`}
                                    className="hero-scan-in relative"
                                    style={{ animationDuration: `${SCAN_MS}ms` }}
                                >
                                    <RecordSlideContent slide={active} />
                                </div>
                                <span
                                    key={`scan:${active.characterId}:${active.trackKey}`}
                                    className="hero-scan-line"
                                    style={{ animationDuration: `${SCAN_MS}ms` }}
                                    aria-hidden
                                />
                            </div>
                        </HomeLink>
                    </div>
                )}
            </div>
        </section>
    );
}

/* Inner record rows, padding included, so the leaving and incoming copies
   stack pixel-identically and the clip reveal tracks the card's full width. */
function RecordSlideContent({ slide }: { slide: HomeHeroSlide }) {
    return (
        <div className="px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary/45">
                    Highest damage
                </span>
                {slide.reignLabel && (
                    <span className="font-mono text-[10px] text-accent/80 tabular-nums">
                        {slide.reignLabel}
                    </span>
                )}
            </div>

            <div className="mt-1.5 flex items-center gap-2 min-w-0">
                <span className={`truncate text-lg font-semibold leading-tight ${slide.element ? `char-sig ${slide.element}` : 'text-text-primary'}`}>
                    {slide.name}
                </span>
                {slide.seqLevel > 0 && (
                    <span className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[slide.seqLevel]}`}>
                        S{slide.seqLevel}
                    </span>
                )}
                {slide.trackLabel && (
                    <span className="shrink-0 text-xs text-text-primary/50">
                        {slide.trackLabel}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-gowun text-[26px] leading-none text-accent tabular-nums">
                        {Math.round(slide.damage).toLocaleString('en-US')}
                    </div>
                    <div className="mt-1.5 truncate font-mono text-[10px] text-text-primary/50">
                        by {slide.owner || 'Anonymous'} ↗
                    </div>
                </div>
                {slide.weaponIcon && (
                    <div className="flex shrink-0 items-center gap-2">
                        <img
                            src={slide.weaponIcon}
                            alt=""
                            className="h-10 w-10 object-contain"
                            loading="lazy"
                        />
                        {slide.weaponName && (
                            <span className="hidden sm:block max-w-28 text-right text-xs leading-tight text-text-primary/55">
                                {slide.weaponName}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
