import { Metadata } from 'next';
import EditPageClient from '@/components/Edit/EditPageClient';

export const metadata: Metadata = {
    title: 'Build Editor - WuWa Builds',
    description: 'Scan in-game screenshots to create and customize Wuthering Waves builds with real-time stat calculations and build management tools.',
    openGraph: {
        type: 'website',
        title: 'Build Editor - WuWa Builds',
        description: 'Create and customize Wuthering Waves builds',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/edit',
        images: [{
            url: '/images/edit.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Editor'
        }]
    }
};

export default function EditPage() {
    return (
        <EditPageClient />
    );
}