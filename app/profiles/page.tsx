import type { Metadata } from 'next';
import { ProfilesLanding } from '@/components/profile/ProfilesLanding';

export const metadata: Metadata = {
    title: 'Player Profiles',
    description: 'Search Wuthering Waves players by UID or username and jump back to recently viewed profiles on WuWaBuilds.',
    alternates: { canonical: '/profiles' },
    openGraph: {
        title: 'Player Profiles',
        description: 'Search Wuthering Waves players by UID or username and jump back to recently viewed profiles on WuWaBuilds.',
        url: 'https://wuwa.build/profiles',
        images: [{ url: 'https://wuwa.build/api/og/profiles', width: 1200, height: 630, alt: 'Player Profiles' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Player Profiles',
        description: 'Search Wuthering Waves players by UID or username and jump back to recently viewed profiles on WuWaBuilds.',
        images: ['https://wuwa.build/api/og/profiles'],
    },
};

export default function ProfilesPage() {
    return <ProfilesLanding />;
}
