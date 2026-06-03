import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'Wuthering Waves Build Editor',
    description: 'Create and tune Wuthering Waves builds with editable characters, echoes, weapons, forte levels, and exportable showcase cards.',
    openGraph: {
        title: 'Wuthering Waves Build Editor',
        description: 'Create and tune Wuthering Waves builds with editable characters, echoes, weapons, forte levels, and exportable showcase cards.',
        url: 'https://wuwa.build/edit',
        images: [{ url: 'https://wuwa.build/api/og/edit', width: 1200, height: 630, alt: 'Wuthering Waves Build Editor' }],
    },
    twitter: {
        title: 'Wuthering Waves Build Editor',
        description: 'Create and tune Wuthering Waves builds with editable characters, echoes, weapons, forte levels, and exportable showcase cards.',
        images: ['https://wuwa.build/api/og/edit'],
    },
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
