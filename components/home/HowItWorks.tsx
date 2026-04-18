'use client';

import type React from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';

const STEPS: { n: string; title: string; desc: React.ReactNode }[] = [
    {
        n: '01',
        title: 'Take a screenshot',
        desc: (
            <>
                Grab the image from the{' '}
                <a
                    href="https://discord.com/channels/963760374543450182/1323199091072569479"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                    Discord bot
                </a>
                . Don't crop or screenshot, just download or copy directly
            </>
        ),
    },
    {
        n: '02',
        title: 'Drop it on Import',
        desc: 'We will automatically scan the image. Just review the results, adjust the name or uid if needed, and report any errors encountered. ',
    },
    {
        n: '03',
        title: 'Download the build card',
        desc: 'Open the editor to download a card image of the full build and stats.',
    },
    {
        n: '04',
        title: 'See where you rank',
        desc: 'Browse the leaderboards to see how you match up against other players in specific weapons, sequences, and playstyles.',
    },
];

export function HowItWorks() {
    const trackFlowClick = (cta: 'import' | 'edit') => {
        posthog.capture('home_cta_click', { cta, section: 'how_it_works' });
    };

    return (
        <section className="pt-14 md:pt-20">
            <div className="mb-8 md:mb-10">
                <div className="text-xs tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
                    How it works
                </div>
                <h2 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] tracking-[-0.02em] font-medium text-balance">
                    Screenshot to leaderboard, in about ten seconds.
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 border-t border-b border-border">
                {STEPS.map((step, i) => (
                    <div
                        key={step.n}
                        className={`py-7 md:py-9 md:px-7 ${
                            i < STEPS.length - 1
                                ? 'border-b md:border-b-0 md:border-r border-border'
                                : ''
                        }`}
                    >
                        <div className="font-gowun text-sm text-accent tracking-widest mb-5">
                            {step.n} <span className="text-text-primary/25">/ 04</span>
                        </div>
                        <div className="text-lg font-medium text-text-primary mb-2.5">
                            {step.title}
                        </div>
                        <p className="text-sm leading-normal text-text-primary/55">
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-2">
                <Link
                    href="/import"
                    onClick={() => trackFlowClick('import')}
                    className="text-sm text-accent hover:text-accent-hover border-b border-accent pb-0.5 transition-colors"
                >
                    Import a screenshot →
                </Link>
                <Link
                    href="/edit"
                    onClick={() => trackFlowClick('edit')}
                    className="text-sm text-text-primary/70 hover:text-accent transition-colors"
                >
                    Open the editor →
                </Link>
            </div>
        </section>
    );
}
