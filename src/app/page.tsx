import { Metadata } from 'next';
import HomePage from '@/components/Home/HomePage';

export const metadata: Metadata = {
    title: 'WuWa Builds - Wuthering Waves Build Creator',
    description: 'Create and share Wuthering Waves builds with automatic screenshot scanning, real-time stat calculations, and build management tools.',
    openGraph: {
        type: 'website',
        title: 'WuWa Builds - Wuthering Waves Build Creator',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning',
        url: 'https://wuwabuilds.moe',
        siteName: 'WuWa Builds',
        images: [{
            url: '/images/card.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Homepage'
        }]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WuWa Builds',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning',
        images: ['/images/card.png']
    }
};

export default function Page() {
    return <HomePage />;
}