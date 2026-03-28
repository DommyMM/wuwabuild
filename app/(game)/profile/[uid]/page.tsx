import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: Promise<{ uid: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { uid } = await params;
  return {
    title: `${uid}'s Profile — wuwa.build`,
    description: `Browse Wuthering Waves builds submitted by UID ${uid}.`,
    alternates: { canonical: `/profile/${uid}` },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { uid } = await params;
  return (
    <Suspense>
      <ProfilePageClient uid={uid} />
    </Suspense>
  );
}
