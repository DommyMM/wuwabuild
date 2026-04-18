'use client';

import Link from 'next/link';
import posthog from 'posthog-js';

const STEPS: { n: string; title: string; desc: string }[] = [
    {
        n: '01',
        title: 'Take a screenshot',
        desc: 'Use wuwa-bot in Discord to get a clean 1920×1080 stat panel image. Crops and manual screenshots OCR poorly — don\'t bother.',
    },
    {
        n: '02',
        title: 'Drop it on Import',
        desc: 'OCR fills the stats it reads. Review the scan, correct anything off, report any misreads so training data improves.',
    },
    {
        n: '03',
        title: 'Submit or edit',
        desc: 'Publish to the per-character leaderboard, or open the editor to iterate on the build without submitting.',
    },
    {
        n: '04',
        title: 'Ranked per weapon & playstyle',
        desc: 'Damage is computed against a standardized rotation and ranked within each weapon × playstyle tab.',
    },
];

export function HowItWorks() {
    const trackFlowClick = (cta: 'import' | 'edit') => {
        posthog.capture('home_cta_click', { cta, section: 'how_it_works' });
    };

    return (
        <section className="px-6 sm:px-10 lg:px-16 pt-20 sm:pt-28 lg:pt-32">
            <div className="mb-10 sm:mb-12">
                <div className="text-[11px] tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
                    How it works
                </div>
                <h2 className="font-plus-jakarta text-3xl sm:text-4xl lg:text-[40px] leading-[1.05] tracking-[-0.02em] font-medium">
                    Screenshot to leaderboard,<br className="hidden sm:inline" />
                    {' '}in about ten seconds.
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 border-t border-b border-border">
                {STEPS.map((step, i) => (
                    <div
                        key={step.n}
                        className={`py-8 sm:py-10 lg:px-7 ${
                            i < STEPS.length - 1
                                ? 'border-b lg:border-b-0 lg:border-r border-border'
                                : ''
                        }`}
                    >
                        <div className="font-gowun text-sm text-accent tracking-widest mb-6 sm:mb-7">
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
