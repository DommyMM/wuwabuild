import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { PrivacyPage } from '@/components/legal/PrivacyPage';

const PAGE_TITLE = 'Privacy Policy';
const PAGE_DESCRIPTION = 'Privacy Policy for WuWaBuilds. Learn how we collect, use, and handle your data.';

export const metadata: Metadata = {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/privacy' }),
    alternates: { canonical: '/privacy' },
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
                "name": "Privacy",
                "item": "https://wuwa.build/privacy"
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <PrivacyPage />
        </>
    );
}
