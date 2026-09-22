import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { EditorProviders } from '@/contexts';

const PAGE_TITLE = 'Wuthering Waves Build Editor';
const PAGE_DESCRIPTION = 'Create and tune Wuthering Waves builds with editable characters, echoes, weapons, forte levels, and exportable showcase cards.';

export const metadata: Metadata = {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/edit', image: 'https://wuwa.build/api/og/edit' }),
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
