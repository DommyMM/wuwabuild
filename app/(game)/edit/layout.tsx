import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'WuWa Build Maker, Showcase Card Generator & Calculator',
    description: 'The ultimate Wuthering Waves build maker. Create, calculate, and generate beautiful character showcase cards. Flex your echo stats with our real-time calculator.',
    alternates: { canonical: '/edit' },
};

export default function EditLayout({ children }: { children: React.ReactNode }) {
    return <EditorProviders>{children}</EditorProviders>;
}
