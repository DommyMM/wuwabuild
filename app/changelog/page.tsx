import type { Metadata } from 'next';
import { ChangelogPage } from '@/components/changelog/ChangelogPage';

export const metadata: Metadata = {
    title: 'Changelog',
    description: 'New features, fixes, and Wuthering Waves game data updates for WuWaBuilds.',
    alternates: { canonical: '/changelog' },
};

export default function Page() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://wuwa.build"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Changelog",
                "item": "https://wuwa.build/changelog"
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ChangelogPage />
        </>
    );
}
