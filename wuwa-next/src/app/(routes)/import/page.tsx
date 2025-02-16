import { Metadata } from 'next';
import ImportPageClient from '@/components/Import/ImportPageClient';

export const metadata: Metadata = {
    title: 'Import Builds - WuWa Builds',
    description: 'Import builds directly from the official wuwa-bot. One click, hassle-free.',
    openGraph: {
        title: 'Import Builds - WuWa Builds',
        description: 'Import builds directly from the official wuwa-bot',
        images: ['/images/import.png'],
    }
};

export default function ImportPage() {
    return (
        <ImportPageClient />
    );
}