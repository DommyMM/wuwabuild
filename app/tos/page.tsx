import type { Metadata } from 'next';
import { TosPage } from '@/components/legal/TosPage';

export const metadata: Metadata = {
    title: 'Terms of Service · WuWa Builds',
    description: 'Terms of Service for WuWa Builds. Read the terms and conditions for using our platform.',
    alternates: { canonical: '/tos' },
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
                "name": "Terms",
                "item": "https://wuwa.build/tos"
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <TosPage />
        </>
    );
}
