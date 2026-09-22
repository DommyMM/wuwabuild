import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { ChangelogPage } from '@/components/changelog/ChangelogPage';

const PAGE_TITLE = 'Changelog';
const PAGE_DESCRIPTION = 'New features, fixes, and Wuthering Waves game data updates for WuWaBuilds.';

export const metadata: Metadata = {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/changelog' }),
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
