import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboard/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

export const metadata: Metadata = {
  title: 'Global Leaderboards',
  description: 'Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.',
};

export default async function Leaderboards() {
  const initialData = await prefetchLeaderboardOverview();
  return (
    <main className="min-h-screen bg-background">
      <Suspense>
        <LeaderboardOverviewClient initialData={initialData} />
      </Suspense>
    </main>
  );
}
