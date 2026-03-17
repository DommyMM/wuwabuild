'use client';

import Link from 'next/link';

const PATHS = [
    {
        href: '/import',
        title: 'Import Screenshot',
        description: 'Upload a 1080p screenshot — OCR auto-fills character, weapon, echoes, and forte instantly.',
        accent: true,
    },
    {
        href: '/edit',
        title: 'Open Editor',
        description: 'Build from scratch with real-time stat calculations, weapon passives, and forte node bonuses.',
        accent: false,
    },
    {
        href: '/builds',
        title: 'Browse Builds',
        description: 'Filter and sort community builds by character, echo sets, CV, damage output, and more.',
        accent: false,
    },
    {
        href: '/leaderboards',
        title: 'Leaderboards',
        description: 'Top-ranked damage runs per character, weapon, and sequence level.',
        accent: false,
    },
] as const;

export function PathCards() {
    return (
        <section className="py-8 border-t border-border">
            <div className="grid grid-cols-4 gap-3">
                {PATHS.map((path) => (
                    <Link
                        key={path.href}
                        href={path.href}
                        className={`group flex flex-col gap-2 p-4 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 ${
                            path.accent
                                ? 'border-accent/25 bg-accent/6 hover:border-accent/50 hover:bg-accent/10'
                                : 'border-border bg-background-secondary hover:border-accent/30'
                        }`}
                    >
                        <div className={`font-semibold text-sm ${path.accent ? 'text-accent' : 'text-text-primary group-hover:text-accent transition-colors duration-150'}`}>
                            {path.title}
                        </div>
                        <div className="text-xs text-text-primary/45 leading-relaxed">
                            {path.description}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
