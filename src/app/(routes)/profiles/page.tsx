import { Metadata } from 'next';
import ProfilesClient from '@/components/Profiles/ProfilesClient';
import '@/styles/Profile.css';
import '@/styles/BuildPage.css';

export const metadata: Metadata = {
    title: 'Player Profiles - WuWa Builds',
    description: 'Search for Wuthering Waves player profiles and view their builds',
    openGraph: {
        type: 'website',
        title: 'Player Profiles - WuWa Builds',
        description: 'Search for Wuthering Waves player profiles and view their character builds',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/profiles',
        images: [{
            url: '/images/profiles.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Player Profiles'
        }]
    }
};

export default function ProfilesPage() {
    return <ProfilesClient />;
}