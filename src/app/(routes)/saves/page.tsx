import { Metadata } from 'next';
import SavePageClient from '@/components/Save/SavePageClient';

export const metadata: Metadata = {
    title: 'Saved Builds - WuWa Builds',
    description: 'View and manage your Wuthering Waves character builds. Search, sort, and export your build collection.',
    openGraph: {
        type: 'website',
        title: 'Saved Builds - WuWa Builds',
        description: 'View and manage your Wuthering Waves builds',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/saves',
        images: [{
            url: '/images/builds.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Saved Builds'
        }]
    }
};
export default function SavesPage() {
    return (
        <SavePageClient />
    );
}