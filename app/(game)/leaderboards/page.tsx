import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';

export const metadata: Metadata = {
  title: 'Character Leaderboards',
  description: 'Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.',
  twitter: {
    title: 'Character Leaderboards',
    description: 'Ranking the best Wuthering Waves character builds globally. See top-tier damage outputs, CV rankings, and optimal echo loadouts.',
  },
  alternates: { canonical: '/leaderboards' },
};

export default function Leaderboards() {
  return (
    <main className="bg-background">
      <LeaderboardOverviewClient />
    </main>
  );
}
