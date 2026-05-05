import type { Metadata } from 'next';
import { EditorProviders } from '@/contexts';

export const metadata: Metadata = {
    title: 'WuWa Build Maker & Showcase Card Generator',
    description: 'Create and generate beautiful Wuthering Waves character build cards. Flex your best builds with our automatic OCR scanner and live damage leaderboards.',
};

export default function EditLayout({ children }: { children: React.ReactNode }) {
    return <EditorProviders>{children}</EditorProviders>;
}
