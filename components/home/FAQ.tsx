'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DiscordHandle } from '@/components/ui/DiscordHandle';

const FAQS: { q: string; a: React.ReactNode }[] = [
    {
        q: 'Is this affiliated with Kuro Games?',
        a: 'No, independent fan tool. All game content and assets belong to Kuro Games.',
    },
    {
        q: 'Can I edit my build after submitting?',
        a: 'No. The build data is locked to what was scanned. You can only update your display name or UID before hitting submit.',
    },
    {
        q: "What's the difference between Builds and Leaderboards?",
        a: 'Builds is an archive of all builds without damage, while Leaderboards standardize to specific weapons and conditions with calculated damage.',
    },
    {
        q: 'What is CV?',
        a: 'Crit Value: (Crit Rate × 2) + Crit DMG. Standard way to measure how well your crit stats rolled. Separate from leaderboard rank, which is based on computed damage.',
    },
    {
        q: 'What screenshot format does Import accept?',
        a: 'Exactly and only the 1920×1080 wuwa-bot output. Screenshots or crops will ruin results and accuracy.',
    },
    {
        q: 'When is <character> getting added to Leaderboards?',
        a: (
            <>
                Whenever I feel like it. Hit up <DiscordHandle label="message me" /> on Discord to
                request a character or share the details.
            </>
        ),
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(2);

    const toggle = (index: number) => {
        setOpenIndex((prev) => (prev === index ? null : index));
    };

    return (
        <section className="pt-14 md:pt-20">
            <div className="flex items-baseline justify-between gap-6 mb-8 md:mb-10">
                <div>
                    <div className="text-[11px] tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
                        Frequently asked
                    </div>
                    <h2 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] tracking-[-0.02em] font-medium text-balance">
                        Things players ask first.
                    </h2>
                </div>
            </div>

            <div className="border-t border-border">
                    {FAQS.map((faq, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={faq.q} className="border-b border-border">
                                <button
                                    onClick={() => toggle(i)}
                                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <div className="flex items-baseline gap-4 min-w-0">
                                        <span className="font-gowun text-xs text-text-primary/40 shrink-0">
                                            0{i + 1}
                                        </span>
                                        <span
                                            className={`text-sm sm:text-base transition-colors ${
                                                isOpen ? 'text-accent' : 'text-text-primary'
                                            }`}
                                        >
                                            {faq.q}
                                        </span>
                                    </div>
                                    <span
                                        className={`shrink-0 text-lg leading-none transition-colors ${
                                            isOpen ? 'text-accent' : 'text-text-primary/50'
                                        }`}
                                        aria-hidden
                                    >
                                        {isOpen ? '−' : '+'}
                                    </span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="answer"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="pb-5 pl-7 sm:pl-9 text-sm leading-relaxed text-text-primary/65">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
            </div>
        </section>
    );
}
