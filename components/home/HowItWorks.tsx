'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import { setNextEditorSource } from '@/lib/analytics';

const FLOWS = [
    {
        title: 'Submitting to the leaderboard',
        description: (
            <>
                Use{' '}
                <a
                    href="https://discord.com/channels/963760374543450182/1323199091072569479"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent/80 hover:text-accent underline underline-offset-2"
                >
                    wuwa-bot
                </a>{' '}
                to get an image, then drop it on the import page. OCR scans it and fills everything in automatically.
                You can update your display name or UID before submitting but the rest is locked to what was scanned. Do report issues or misreads.
            </>
        ),
        link: { href: '/import', label: 'Import a screenshot →' },
    },
    {
        title: 'Build editor',
        description: 'Separate from the leaderboard. Create builds from scratch, swap echoes, adjust forte nodes, try different weapon ranks — stats recalculate live. Export a build card image to share anywhere. Good for planning or sharing without submitting to the board.',
        link: { href: '/edit', label: 'Open the editor →' },
    },
] as const;

export function HowItWorks() {
    const trackFlowClick = (cta: 'import' | 'edit') => {
        if (cta === 'edit') setNextEditorSource('home_cta');
        posthog.capture('home_cta_clicked', {
            cta,
            section: 'how_it_works',
        });
    };

    return (
        <section className="py-6 border-t border-border">
            <h2 className="text-xs font-semibold text-text-primary/40 uppercase tracking-widest mb-2">
                How it works
            </h2>
            <div className="flex flex-col gap-4">
                {FLOWS.map((flow) => (
                    <div key={flow.title}>
                        <div className="font-semibold text-text-primary text-sm mb-1.5">{flow.title}</div>
                        <p className="text-sm text-text-primary/50 leading-relaxed mb-2">{flow.description}</p>
                        <Link
                            href={flow.link.href}
                            onClick={() => trackFlowClick(flow.link.href === '/import' ? 'import' : 'edit')}
                            className="relative text-sm text-accent/70 hover:text-accent transition-colors duration-150 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-[width] after:duration-200 hover:after:w-full"
                        >
                            {flow.link.label}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
