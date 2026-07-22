import type { ReactNode } from 'react';
import { HomeLink } from './HomeLink';

export interface FaqItem {
    q: string;
    /** Rendered answer (may contain links). */
    a: ReactNode;
}

export const FAQS: FaqItem[] = [
    {
        q: "What's the difference between Builds and Leaderboards",
        a: 'Builds is an archive of every submitted build, with no ranking. Leaderboards standardize weapons, teammates, and rotations so only your echoes change.',
    },
    {
        q: 'What screenshot format does Import accept',
        a: 'Exactly and only the 1920×1080 wuwa-bot output. Screenshots or crops will ruin results and accuracy.',
    },
    {
        q: 'Can I edit my build after submitting',
        a: 'No. The build data is locked to what was scanned. You can only update your display name or UID before hitting submit.',
    },
    {
        q: 'What is CV',
        a: 'Crit Value: (Crit Rate × 2) + Crit DMG. Standard way to measure how well your crit stats rolled. Separate from leaderboard rank, which comes from the full rotation.',
    },
    {
        q: 'How do I get a shareable build card',
        a: (
            <>
                Open the{' '}
                <HomeLink href="/edit" cta="edit" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    editor
                </HomeLink>{' '}
                or your{' '}
                <HomeLink href="/profiles" cta="profile" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    profile
                </HomeLink>{' '}
                page to view and download the build card for any imported build
            </>
        ),
    },
    {
        q: 'When is <character> getting added to Leaderboards',
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
    },
    {
        q: 'Is this affiliated with Kuro Games',
        a: 'No, independent fan tool. All game content and assets belong to Kuro Games.',
    },
];
