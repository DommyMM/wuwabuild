import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'Wuthering Waves Build Cards',
    description: 'Build and customize Wuthering Waves characters, then export a showcase card. Set echoes, weapons, and forte levels with live stat and damage calculation.',
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
