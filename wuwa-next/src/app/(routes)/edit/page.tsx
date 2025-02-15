import { Metadata } from 'next';
import EditPageClient from '@/components/Edit/EditPageClient';

export const metadata: Metadata = {
    title: 'Build Editor - WuWa Builds',
    description: 'Scan in-game screenshots to create and customize Wuthering Waves builds with real-time stat calculations and build management tools.',
    openGraph: {
        title: 'Build Editor - WuWa Builds',
        description: 'Create and customize Wuthering Waves builds',
        images: ['/images/edit.png'],
    }
};

export default function EditPage() {
    return (
        <EditPageClient />
    );
}