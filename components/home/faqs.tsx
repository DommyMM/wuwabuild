import type { ReactNode } from 'react';

export interface FaqItem {
    /** Question text, used verbatim for both the rendered FAQ and the FAQPage schema. */
    q: string;
    /** Rendered answer (may contain links). */
    a: ReactNode;
    /** Plain-text answer for JSON-LD FAQPage schema (no markup). */
    text: string;
}

export const FAQS: FaqItem[] = [
    {
        q: 'Is this affiliated with Kuro Games?',
        a: 'No, independent fan tool. All game content and assets belong to Kuro Games.',
        text: 'No, independent fan tool. All game content and assets belong to Kuro Games.',
    },
    {
        q: 'Can I edit my build after submitting?',
        a: 'No. The build data is locked to what was scanned. You can only update your display name or UID before hitting submit.',
        text: 'No. The build data is locked to what was scanned. You can only update your display name or UID before hitting submit.',
    },
    {
        q: "What's the difference between Builds and Leaderboards?",
        a: 'Builds is an archive of all builds without damage, while Leaderboards standardize to specific weapons and conditions with calculated damage.',
        text: 'Builds is an archive of all builds without damage, while Leaderboards standardize to specific weapons and conditions with calculated damage.',
    },
    {
        q: 'What is CV?',
        a: 'Crit Value: (Crit Rate × 2) + Crit DMG. Standard way to measure how well your crit stats rolled. Separate from leaderboard rank, which is based on computed damage.',
        text: 'Crit Value: (Crit Rate × 2) + Crit DMG. Standard way to measure how well your crit stats rolled. Separate from leaderboard rank, which is based on computed damage.',
    },
    {
        q: 'What screenshot format does Import accept?',
        a: 'Exactly and only the 1920×1080 wuwa-bot output. Screenshots or crops will ruin results and accuracy.',
        text: 'Exactly and only the 1920×1080 wuwa-bot output. Screenshots or crops will ruin results and accuracy.',
    },
    {
        q: 'When is <character> getting added to Leaderboards?',
        a: (
            <>
                Whenever I feel like it. Ask in the{' '}
                <a
                    href="https://discord.gg/puZSXRKTPC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                    Discord
                </a>{' '}
                to request a character or share the details.
            </>
        ),
        text: 'Whenever I feel like it. Ask in the Discord to request a character or share the details.',
    },
];
