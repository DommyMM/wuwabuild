import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Wuthering Waves Leaderboard',
  description: 'Global Wuthering Waves leaderboards. Compare the best character builds, see top-tier simulated damage rotations, Crit Value (CV) rankings, and echo stats.',
  twitter: {
    title: 'Wuthering Waves Leaderboard',
    description: 'Global Wuthering Waves leaderboards. Compare the best character builds, see top-tier simulated damage rotations, Crit Value (CV) rankings, and echo stats.',
  },
  alternates: { canonical: '/leaderboards' },
};

export default async function Leaderboards() {
  const initialData = await prefetchLeaderboardOverview();

  return (
    <main className="bg-background">
      <LeaderboardOverviewClient initialData={initialData} />
    </main>
  );
}
