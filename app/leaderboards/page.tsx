import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboard/LeaderboardOverviewClient';

export const metadata: Metadata = {
  title: 'Global Leaderboards',
  description: 'Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.',
};

export default function Leaderboards() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense>
        <LeaderboardOverviewClient />
      </Suspense>
    </main>
  );
}
