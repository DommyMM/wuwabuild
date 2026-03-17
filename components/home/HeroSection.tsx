'use client';

import Link from 'next/link';
import { Carousel } from './Carousel';

interface HeroSectionProps {
    totalBuilds: number;
    totalLeaderboards: number;
}

export function HeroSection({ totalBuilds, totalLeaderboards }: HeroSectionProps) {
    return (
        <section className="pt-10 pb-8">
            {/* Live stats */}
            {(totalBuilds > 0 || totalLeaderboards > 0) && (
                <div className="flex items-center justify-center flex-wrap gap-6 sm:gap-8 mb-5">
                    {totalBuilds > 0 && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-gowun text-accent">
                                {totalBuilds.toLocaleString()}
                            </span>
                            <span className="text-sm text-text-primary/40 uppercase tracking-widest">
                                builds submitted
                            </span>
                        </div>
                    )}
                    {totalLeaderboards > 0 && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-gowun text-accent">
                                {totalLeaderboards.toLocaleString()}
                            </span>
                            <span className="text-sm text-text-primary/40 uppercase tracking-widest">
                                active leaderboards
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Tagline */}
            <p className="text-text-primary/60 text-base mb-7 text-center">
                Scan your build, submit to the leaderboard, or browse what everyone else is running.
            </p>

            {/* CTAs */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 mb-10">
                <Link href="/import" className="text-center px-5 py-2.5 bg-accent text-background font-semibold rounded-md transition-colors duration-200 hover:bg-accent-hover hover:shadow-[0_0_18px_rgba(166,150,98,0.35)]">
                    Import Build
                </Link>
                <Link href="/edit" className="text-center px-5 py-2.5 bg-accent/6 border border-accent/20 text-text-primary/75 rounded-md transition-colors duration-200 hover:bg-accent/12 hover:border-accent/45 hover:text-accent">
                    Open Editor
                </Link>
                <Link href="/builds" className="text-center px-5 py-2.5 bg-accent/6 border border-accent/20 text-text-primary/75 rounded-md transition-colors duration-200 hover:bg-accent/12 hover:border-accent/45 hover:text-accent">
                    Browse Builds
                </Link>
                <Link href="/leaderboards" className="text-center px-5 py-2.5 bg-accent/6 border border-accent/20 text-text-primary/75 rounded-md transition-colors duration-200 hover:bg-accent/12 hover:border-accent/45 hover:text-accent">
                    View Leaderboards
                </Link>
            </div>

            {/* Carousel */}
            <Carousel />
        </section>
    );
}
