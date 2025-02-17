import { Metadata } from 'next';
import BuildPageClient from '@/components/Build/BuildPageClient';
import '@/styles/SavesPage.css';

export const metadata: Metadata = {
    title: 'Global Builds - WuWa Builds',
    description: 'View and compare builds from players worldwide. Standardized to level 90.',
    openGraph: {
        title: 'Global Builds - WuWa Builds',
        description: 'View and compare builds from players worldwide',
        images: ['/images/buildspage.png'],
    }
};

export default function BuildsPage() {
    return (
        <main className="builds-page">
            <BuildPageClient />
        </main>
    );
}