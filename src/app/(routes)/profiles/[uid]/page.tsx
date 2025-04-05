import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProfileDetail from '@/components/Profiles/ProfileDetail';
import '@/styles/Profile.css';
import '@/styles/BuildPage.css';
import '@/styles/BuildExpand.css';
import '@/styles/SavesPage.css';

interface Props {
    params: Promise<{ uid: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { uid } = await params;
    
    return {
        title: `Player Profile: ${uid} - WuWa Builds`,
        description: `View character builds for Wuthering Waves player with UID ${uid}`,
        openGraph: {
            title: `Player Profile: ${uid} - WuWa Builds`,
            description: `View character builds for Wuthering Waves player with UID ${uid}`,
            images: ['/images/profiles.png'],
        }
    };
}

export default async function ProfilePage({ params }: Props) {
    const { uid } = await params;
    
    // Validate UID format on the server side as well
    if (!/^\d{9}$/.test(uid)) {
        return notFound();
    }
    
    return (
        <main className="profile-page">
            <ProfileDetail uid={uid} />
        </main>
    );
}