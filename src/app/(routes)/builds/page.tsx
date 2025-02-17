import { Metadata } from 'next';
import BuildPageClient from '@/components/Build/BuildPageClient';
import '@/styles/SavesPage.css';

export const metadata: Metadata = {
    title: 'Global Builds - WuWa Builds',
    description: 'View and compare builds from players worldwide. Standardized to level 90.',
    openGraph: {
        type: 'website',
        title: 'Global Builds - WuWa Builds',
        description: 'View and compare builds from players worldwide',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/builds',
        images: [{
            url: '/images/buildspage.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Global Builds'
        }]
    }
};

export default function BuildsPage() {
    return (
        <main className="builds-page">
            <BuildPageClient />
        </main>
    );
}