import { Metadata } from 'next';
import SavePageClient from '@/components/Save/SavePageClient';

export const metadata: Metadata = {
    title: 'Saved Builds - WuWa Builds',
    description: 'View and manage your Wuthering Waves character builds. Search, sort, and export your build collection.',
    openGraph: {
        title: 'Saved Builds - WuWa Builds',
        description: 'View and manage your Wuthering Waves builds',
        images: ['/images/builds.png'],
    }
};

export default function SavesPage() {
    return (
        <SavePageClient />
    );
}