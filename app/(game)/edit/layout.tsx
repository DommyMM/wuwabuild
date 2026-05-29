import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'Wuthering Waves Build Editor',
    description: 'Use the Wuthering Waves build editor to customize characters, set echoes, weapons, and forte levels, then export a showcase card.',
    alternates: { canonical: '/edit' },
};

export default function EditLayout({ children }: { children: React.ReactNode }) {
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
                "name": "Build Editor",
                "item": "https://wuwa.build/edit"
            }
        ]
    };

    return (
        <EditorProviders>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </EditorProviders>
    );
}
