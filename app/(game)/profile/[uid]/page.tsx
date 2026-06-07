import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';
import { fetchProfileSummary } from '@/lib/lbServer';

interface ProfilePageProps {
  params: Promise<{ uid: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { uid } = await params;
  const summary = await fetchProfileSummary(uid);
  const displayName = summary?.username || uid;
  return {
    title: `${displayName}'s Profile`,
    description: `Browse Wuthering Waves builds submitted by ${displayName} (UID ${uid}).`,
    alternates: { canonical: `/profile/${uid}` },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { uid } = await params;
  const summary = await fetchProfileSummary(uid);
  return (
    <Suspense>
      <ProfilePageClient uid={uid} profileSummary={summary} />
    </Suspense>
  );
}
