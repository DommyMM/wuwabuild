'use client';

import Link from 'next/link';
import { Carousel } from './Carousel';

export function HeroSection() {
    return (
        <section className="pt-14 pb-10">
            {/* Headline + subcopy + CTAs — centered */}
            <div className="text-center mb-10">
                <h1 className="text-5xl font-bold font-gowun text-text-primary leading-tight mb-4">
                    Build, import, and compare<br />
                    <span className="text-accent">Wuthering Waves</span> builds
                </h1>
                <p className="text-text-primary/60 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                    Scan screenshots into editable builds, fine-tune stats live, export polished cards, and explore top leaderboard setups.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link
                        href="/import"
                        className="px-5 py-3 bg-accent text-background font-semibold rounded-md hover:bg-accent-hover transition-all duration-200 hover:-translate-y-0.5"
                    >
                        Import Screenshot
                    </Link>
                    <Link
                        href="/edit"
                        className="px-5 py-3 bg-background-secondary border border-border text-text-primary rounded-md hover:border-accent hover:text-accent transition-all duration-200 hover:-translate-y-0.5"
                    >
                        Open Editor
                    </Link>
                    <Link href="/builds" className="text-sm text-text-primary/50 hover:text-accent transition-colors duration-150 ml-2">
                        Browse Builds →
                    </Link>
                    <Link href="/leaderboards" className="text-sm text-text-primary/50 hover:text-accent transition-colors duration-150">
                        View Leaderboards →
                    </Link>
                </div>
            </div>

            {/* Carousel — full width below hero text */}
            <Carousel />
        </section>
    );
}
