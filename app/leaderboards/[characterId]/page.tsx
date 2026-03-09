import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LeaderboardCharacterClient } from '@/components/leaderboard/LeaderboardCharacterClient';
import { prefetchLeaderboard } from '@/lib/lbServer';

interface Props {
  params: Promise<{ characterId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params;
  return {
    title: `Character Leaderboard #${characterId} — WuWaBuilds`,
    description: 'Global damage rankings for this Wuthering Waves character. Filter by weapon, sequence, echo sets, and more.',
  };
}

export default async function CharacterLeaderboardPage({ params }: Props) {
  const { characterId } = await params;
  const initialData = await prefetchLeaderboard(characterId);
  return (
    <main className="min-h-screen bg-background">
      <Suspense>
        <LeaderboardCharacterClient characterId={characterId} initialData={initialData} />
      </Suspense>
    </main>
  );
}
