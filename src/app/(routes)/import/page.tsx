import { Metadata } from 'next';
import ImportPageClient from '@/components/Import/ImportPageClient';

export const metadata: Metadata = {
    title: 'Import Builds - WuWa Builds',
    description: 'Import builds directly from the official wuwa-bot. One click, hassle-free.',
    openGraph: {
        type: 'website',
        title: 'Import Builds - WuWa Builds',
        description: 'Import builds directly from the official wuwa-bot',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/import',
        images: [{
            url: '/images/import.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Import'
        }]
    }
};

export default function ImportPage() {
    return (
        <ImportPageClient />
    );
}