import type { Metadata } from 'next';
import { ChangelogPage } from '@/components/changelog/ChangelogPage';

export const metadata: Metadata = {
    title: 'Changelog · WuWa Builds',
    description: 'New features, fixes, and game data updates for WuWa Builds.',
    alternates: { canonical: '/changelog' },
};

export default function Page() {
    return <ChangelogPage />;
}
