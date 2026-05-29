import type { Metadata } from 'next';
import { PrivacyPage } from '@/components/legal/PrivacyPage';

export const metadata: Metadata = {
    title: 'Privacy Policy · WuWa Builds',
    description: 'Privacy Policy for WuWa Builds. Learn how we collect, use, and handle your data.',
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
