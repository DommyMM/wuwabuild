import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'Wuthering Waves Build Cards',
    description: 'Build and customize Wuthering Waves characters, then export a showcase card. Set echoes, weapons, and forte levels with live stat and damage calculation.',
    alternates: { canonical: '/edit' },
};

export default function EditLayout({ children }: { children: React.ReactNode }) {
    return <EditorProviders>{children}</EditorProviders>;
}
