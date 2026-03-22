'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
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
        a: 'Crit Value: (Crit Rate × 2) + Crit DMG. Standard way to measure how well your crit stats rolled.',
    },
    {
        q: 'What screenshot format does Import accept?',
        a: 'Exactly and only the 1920x1080 wuwa-bot output, screenshots or crops will ruin results and accuracy',
    },
    {
        q: 'When is <character> getting added to Leaderboards?',
        a: <>Whenever I feel like it. Hit up <DiscordHandle label="message me" /> on Discord to request a character or share the details.</>,
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    function toggle(index: number) {
        setOpenIndex((prev) => (prev === index ? null : index));
    }

    return (
        <section className="py-6 border-t border-border">
            <h2 className="text-xs font-semibold text-text-primary/40 uppercase tracking-widest mb-2">FAQ</h2>
            <div className="flex flex-col gap-2">
                {FAQS.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <div
                            key={faq.q}
                            className={`bg-background-secondary rounded-xl border transition-colors duration-200 ${
                                isOpen ? 'border-accent/30' : 'border-border'
                            }`}
                        >
                            <button
                                onClick={() => toggle(index)}
                                className="flex w-full items-center justify-between px-5 py-4 text-left"
                            >
                                <span className="text-sm font-medium text-text-primary">{faq.q}</span>
                                {isOpen ? (
                                    <Minus className="size-4 shrink-0 text-accent" />
                                ) : (
                                    <Plus className="size-4 shrink-0 text-accent" />
                                )}
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
                                        <div className="px-5 pb-4">
                                            <div className="border border-dashed border-border rounded-lg p-4">
                                                <div className="text-sm text-text-primary/55 leading-relaxed">{faq.a}</div>
                                            </div>
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
