import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

export const metadata: Metadata = {
  title: 'Character Leaderboards',
  description: 'Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.',
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
