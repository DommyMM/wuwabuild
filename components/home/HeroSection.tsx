'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

interface HeroSectionProps {
    totalBuilds: number;
    totalLeaderboards: number;
}

function LiveNumber({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (typeof window === 'undefined') {
            setDisplay(value);
            return;
        }
        let frame: number;
        const start = performance.now();
        const dur = 1500;
        const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(value * eased));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return <>{display.toLocaleString()}</>;
}

type SecondaryCta = 'edit' | 'builds' | 'leaderboards';

const SECONDARY_CTAS: { label: string; href: string; cta: SecondaryCta }[] = [
    { label: 'Open editor', href: '/edit', cta: 'edit' },
    { label: 'Browse builds', href: '/builds', cta: 'builds' },
    { label: 'Leaderboards', href: '/leaderboards', cta: 'leaderboards' },
];

export function HeroSection({ totalBuilds, totalLeaderboards }: HeroSectionProps) {
    const trackCtaClick = (cta: 'import' | SecondaryCta) => {
        posthog.capture('home_cta_click', { cta, section: 'hero' });
    };

    return (
        <section className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-16 lg:pt-24 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 xl:gap-20 items-start">
                {/* Left — headline + CTAs */}
                <div>
                    <div className="flex items-center gap-2.5 mb-6 sm:mb-7">
                        <span className="live-dot" />
                        <span className="text-[11px] tracking-[0.22em] uppercase text-text-primary/55">
                            Independent fan tool
                        </span>
                    </div>

                    <h1 className="font-plus-jakarta text-[44px] sm:text-6xl lg:text-[76px] leading-[0.98] tracking-[-0.035em] font-medium text-text-primary">
                        Scan your stats.<br />
                        <span className="text-accent italic font-normal pr-[0.18em]">Rank</span>
                        your damage.
                    </h1>

                    <p className="mt-6 sm:mt-7 max-w-[560px] text-base sm:text-[17px] leading-[1.5] text-text-primary/65">
                        Drop a screenshot. We OCR the stat panel, compute damage against standardized
                        conditions, and rank you per-character against every other player.
                    </p>

                    <div className="mt-10 sm:mt-12 flex flex-col gap-3.5 max-w-[480px]">
                        <Link
                            href="/import"
                            onClick={() => trackCtaClick('import')}
                            className="gold-glow flex items-center justify-between gap-3 px-5 sm:px-7 py-5 sm:py-[22px] bg-accent text-background font-semibold text-base sm:text-[17px] tracking-[0.02em] rounded-sm hover:bg-accent-hover"
                        >
                            <span className="flex items-center gap-3.5">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                    <path d="M12 15V3m0 0l-4 4m4-4l4 4M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
                                </svg>
                                Import build from screenshot
                            </span>
                            <span className="opacity-60 text-xs tracking-[0.1em] hidden sm:inline">→</span>
                        </Link>

                        <div className="grid grid-cols-3 gap-2.5">
                            {SECONDARY_CTAS.map((item, i) => (
                                <Link
                                    key={item.cta}
                                    href={item.href}
                                    onClick={() => trackCtaClick(item.cta)}
                                    className="gold-glow px-3 sm:px-4 py-3 sm:py-3.5 bg-transparent border border-border text-text-primary/80 hover:text-accent hover:border-accent/45 text-left text-xs sm:text-sm rounded-sm tracking-[0.01em]"
                                >
                                    <div className="text-[10px] tracking-[0.18em] text-text-primary/40 mb-1">
                                        0{i + 2}
                                    </div>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right — stats masthead */}
                <div className="lg:border-l lg:border-accent/[0.18] lg:pl-10 flex flex-col gap-9">
                    <div className="text-[11px] tracking-[0.22em] uppercase text-text-primary/40">
                        By the numbers
                    </div>

                    <div className="flex flex-col">
                        <div className="pb-7 border-b border-border">
                            <div className="font-gowun text-5xl sm:text-6xl lg:text-[76px] leading-[0.95] text-accent tracking-[-0.03em] tabular-nums">
                                <LiveNumber value={totalBuilds} />
                            </div>
                            <div className="text-[11px] tracking-[0.18em] uppercase text-text-primary/45 mt-2.5">
                                Builds submitted
                            </div>
                        </div>
                        <div className="pt-7">
                            <div className="font-gowun text-5xl sm:text-6xl lg:text-[76px] leading-[0.95] text-accent tracking-[-0.03em] tabular-nums">
                                <LiveNumber value={totalLeaderboards} />
                            </div>
                            <div className="text-[11px] tracking-[0.18em] uppercase text-text-primary/45 mt-2.5">
                                Active leaderboards
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-text-primary/40 leading-[1.5] max-w-[380px]">
                        Every leaderboard is scoped per character, weapon and track. Pick a matchup and
                        see where your damage lands.
                    </p>
                </div>
            </div>
        </section>
    );
}
