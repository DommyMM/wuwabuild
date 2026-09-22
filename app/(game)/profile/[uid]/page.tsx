import type { Metadata } from 'next';
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
  // No Suspense of its own: the route renders per request, so useSearchParams needs none, and a boundary here would
  // swap the loading skeleton out for its own fallback while the profile client chunk downloads
  return <ProfilePageClient uid={uid} profileSummary={summary} />;
}
