'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HomeLink } from './HomeLink';
import { ProfileSearch } from './ProfileSearch';
import { LB_SEQ_BADGE_COLORS } from '../leaderboards/constants';
import { getHeroSplashOffset } from '@/lib/splashArt';
import { getBuildMoves } from '@/lib/lb';
import { processMoves, typeMeta, type TypeTotal } from '@/lib/moveBreakdown';
import type { HomeHeroSlide } from './types';

interface HeroProps {
    slides: HomeHeroSlide[];
    totalBuilds: number;
    totalLeaderboards: number;
    /** Server-fetched move profile for slides[0], so the first paint already has the bar. */
    initialProfile: TypeTotal[] | null;
}

const profileKeyOf = (slide: HomeHeroSlide | null) => (
    slide?.buildId && slide.weaponId ? `${slide.buildId}:${slide.weaponId}:${slide.trackKey}` : ''
);

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

export function Hero({ slides, totalBuilds, totalLeaderboards, initialProfile }: HeroProps) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    // Bumps on hover release so the timer hairline remounts and restarts in
    // sync with the rearmed countdown; slide changes restart it via index.
    const [resumes, setResumes] = useState(0);
    // The record being scanned out: held under the incoming slide for the
    // wipe's duration so the sweep replaces content instead of fading it.
    const [leaving, setLeaving] = useState<HomeHeroSlide | null>(null);
    // Touch users cannot hover to pause, so the first deliberate touch on the
    // record card stops rotation for good. The card is a link, and a swap timed
    // under a thumb would open a board the user never chose.
    const [stopped, setStopped] = useState(false);
    const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServer);
    const rotates = slides.length >= 2 && !reducedMotion && !stopped;
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

    // The record's own damage profile, fetched for whichever slide is showing.
    // This is the one thing on the page only this site can render: the board's
    // rank-1 run broken down by move type, straight from the damage engine.
    // Purely additive, so a failed or slow fetch just omits the bar.
    // Seeded with the server-fetched profile for slides[0]: the first paint
    // renders the bar from the ISR HTML, and the seeded key never refetches.
    const [profiles, setProfiles] = useState<Record<string, TypeTotal[]>>(() => {
        const firstKey = profileKeyOf(slides[0] ?? null);
        return firstKey && initialProfile && initialProfile.length > 0
            ? { [firstKey]: initialProfile }
            : {};
    });
    const requestedRef = useRef<Set<string>>(new Set(Object.keys(profiles)));
    const activeProfileKey = profileKeyOf(active);

    useEffect(() => {
        if (!activeProfileKey || !active) return;
        if (requestedRef.current.has(activeProfileKey)) return;
        requestedRef.current.add(activeProfileKey);

        const controller = new AbortController();
        void getBuildMoves(active.buildId, active.weaponId, active.trackKey, controller.signal)
            .then((moves) => {
                if (controller.signal.aborted) return;
                setProfiles((prev) => ({ ...prev, [activeProfileKey]: processMoves(moves).typeTotals }));
            })
            .catch(() => {
                // Let a later pass retry: rotating away aborts in-flight requests,
                // and the bar is an enhancement, never a blocking failure.
                requestedRef.current.delete(activeProfileKey);
            });
        return () => controller.abort();
    }, [activeProfileKey, active]);

    const profileFor = (slide: HomeHeroSlide | null): TypeTotal[] | null => {
        const key = profileKeyOf(slide);
        return key ? profiles[key] ?? null : null;
    };

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
                                // Settle duration lives in CSS so the art can arrive and
                                // rest. Pinning it to ROTATE_MS made it drift for the whole
                                // slide and never come to rest.
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === index ? 'hero-settle opacity-100' : 'opacity-0'}`}
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

            <div className="relative mx-auto max-w-260 px-6 md:px-10 py-14 md:py-28">
                <h1 className="font-plus-jakarta font-medium text-text-primary max-w-3xl">
                    <span className="block font-mono text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em] text-text-primary/55 mb-4">
                        Wuthering Waves Character Builds &amp; Leaderboards
                    </span>
                    <span className="block text-[40px] md:text-6xl leading-[1.02] tracking-[-0.03em]">
                        Scan your build<br />
                        {/* Italic leans right and the tracking is negative, so the word
                            space optically collapses. Em-based padding scales with size. */}
                        <span className="text-accent italic font-normal pr-[0.08em]">Rank</span> your damage
                    </span>
                </h1>

                {/* State the differentiator plainly: this is a ranking engine, not OCR
                    plus a list. Search-by-UID is a genre convention, the simulation is not. */}
                <p className="mt-5 max-w-xl text-base md:text-lg leading-normal text-text-primary/70">
                    Search any player, or import your own from a wuwa-bot image.
                    Every board runs the same rotation, weapon, and team, so your echoes are the only differentiating factor.
                </p>

                {totalBuilds > 0 && (
                    <p className="mt-3 font-mono text-xs text-text-primary/55 tabular-nums">
                        {totalBuilds.toLocaleString('en-US')} builds · {totalLeaderboards} boards
                    </p>
                )}

                <div id="home-profile-search" className="mt-7 scroll-mt-24">
                    {/* The placeholder example is the first slide's record holder: a
                        real, searchable name and UID that teach both input forms. */}
                    <ProfileSearch
                        exampleName={slides[0]?.owner || undefined}
                        exampleUid={slides[0]?.ownerUid || undefined}
                    />
                </div>

                {/* Search is the primary action (its gold submit is the only solid accent
                    fill in the hero); import steps down to an outline so a first-timer with
                    a screenshot still sees it without it outweighing search. */}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 md:gap-x-6">
                    <HomeLink
                        href="/import"
                        cta="import"
                        section="hero"
                        className="inline-flex items-center gap-2.5 rounded-sm border border-accent/50 px-5 py-2.5 text-[15px] font-semibold tracking-[0.02em] text-accent transition-colors hover:border-accent hover:bg-accent/10"
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
                        className="mt-8 max-w-95 md:absolute md:bottom-6 md:right-6 md:mt-0 md:w-90"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => {
                            setPaused(false);
                            setResumes((current) => current + 1);
                        }}
                        onTouchStart={() => setStopped(true)}
                        onFocusCapture={() => setPaused(true)}
                        onBlurCapture={() => {
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
                                        <RecordSlideContent slide={leaving} profile={profileFor(leaving)} />
                                    </div>
                                )}
                                <div
                                    key={`${active.characterId}:${active.trackKey}`}
                                    className="hero-scan-in relative"
                                    style={{ animationDuration: `${SCAN_MS}ms` }}
                                >
                                    <RecordSlideContent slide={active} profile={profileFor(active)} />
                                </div>
                                <span
                                    key={`scan:${active.characterId}:${active.trackKey}`}
                                    className="hero-scan-line"
                                    style={{ animationDuration: `${SCAN_MS}ms` }}
                                    aria-hidden
                                />
                            </div>
                            {/* Stable footer under the swapping record: makes the card's
                                clickability explicit (a cold visitor's zero-asset action). */}
                            <div className="flex items-center justify-end border-t border-border/60 px-4 py-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent/70 transition-colors group-hover:text-accent">
                                    Open board →
                                </span>
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
function RecordSlideContent({ slide, profile }: { slide: HomeHeroSlide; profile: TypeTotal[] | null }) {
    return (
        <div className="px-4 py-3.5">
            {/* Title, sequence, and reign share one line. The old "Board record"
                label was a static line of chrome, and "#1 for N days" already says
                what this is. Character and track read as one char-sig title with the
                sequence pill trailing, mirroring LeaderboardCharacterHeader. */}
            <div className="flex items-center gap-2 min-w-0">
                <span className={`truncate text-lg font-semibold leading-tight ${slide.element ? `char-sig ${slide.element}` : 'text-text-primary'}`}>
                    {slide.trackLabel ? `${slide.name} - ${slide.trackLabel}` : slide.name}
                </span>
                {slide.seqLevel > 0 && (
                    // Caps and digits have no descenders, so in a leading-none box the
                    // glyphs sit high and the empty descender space below reads as extra
                    // bottom padding. 1px more top than bottom re-centers it optically.
                    <span className={`shrink-0 rounded-full border px-2 pt-1.25 pb-1 text-[10px] font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[slide.seqLevel]}`}>
                        S{slide.seqLevel}
                    </span>
                )}
                {slide.reignLabel && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-accent/80 tabular-nums">
                        {slide.reignLabel}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-gowun text-[26px] leading-none text-accent tabular-nums">
                        {Math.round(slide.damage).toLocaleString('en-US')}
                    </div>
                    {/* No ↗ here: the whole card links to the board, not to this
                        player's profile, and an arrow on the owner line promised a
                        profile link it does not deliver. */}
                    <div className="mt-1.5 truncate font-mono text-[10px] text-text-primary/50">
                        by {slide.owner || 'Anonymous'}
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

            {/* Where that damage came from, by move type, from the same engine and
                the same palette as the full breakdown panel. Renders only once the
                fetch lands, so the card never reserves space for missing data. */}
            {profile && profile.length > 0 && (
                <div className="mt-3">
                    <div className="flex h-1.5 gap-px overflow-hidden rounded-full">
                        {profile.map((total) => (
                            <div
                                key={total.type}
                                className="min-w-0.5"
                                style={{ width: `${total.percentage}%`, backgroundColor: typeMeta(total.type).color }}
                            />
                        ))}
                    </div>
                    {/* Two labels, never wrapping: three long type names spill onto a
                        second line and the card starts to look ragged. The bar above
                        still carries every segment, so this is a key, not the data. */}
                    <div className="mt-1.5 flex items-center gap-x-2.5 overflow-hidden font-mono text-[9.5px] uppercase tracking-widest text-text-primary/50">
                        {profile.slice(0, 2).map((total) => (
                            <span key={total.type} className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-xs"
                                    style={{ backgroundColor: typeMeta(total.type).color }}
                                />
                                {typeMeta(total.type).label} {total.percentage.toFixed(0)}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
