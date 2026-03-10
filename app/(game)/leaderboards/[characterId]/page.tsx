import type { Metadata } from 'next';
import { LeaderboardCharacterClient } from '@/components/leaderboard/LeaderboardCharacterClient';
import { leaderboardSnapshotToApiQuery, parseInitialLeaderboardQuery, toURLSearchParams } from '@/components/leaderboard/leaderboardQuery';
import { DEFAULT_LB_TRACK } from '@/components/leaderboard/leaderboardConstants';
import { prefetchLeaderboard } from '@/lib/lbServer';

interface Props {
  params: Promise<{ characterId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params;
  return {
    title: `Character Leaderboard #${characterId} — WuWaBuilds`,
    description: 'Global damage rankings for this Wuthering Waves character. Filter by weapon, track, echo sets, and more.',
  };
}

export default async function CharacterLeaderboardPage({ params, searchParams }: Props) {
  const { characterId } = await params;
  const rawSearchParams = toURLSearchParams(await searchParams);
  const parsedQuery = parseInitialLeaderboardQuery(rawSearchParams);

  let initialData = await prefetchLeaderboard(characterId, leaderboardSnapshotToApiQuery(parsedQuery));

  if (!rawSearchParams.get('weaponId') && rawSearchParams.get('weaponIndex') && initialData?.weaponIds.length) {
    const canonicalQuery = parseInitialLeaderboardQuery(rawSearchParams, {
      weaponIds: initialData.weaponIds,
      tracks: initialData.tracks,
      defaultWeaponId: initialData.activeWeaponId || initialData.weaponIds[0] || '',
      defaultTrack: initialData.activeTrack || initialData.tracks[0]?.key || DEFAULT_LB_TRACK,
    });

    if (canonicalQuery.weaponId && canonicalQuery.weaponId !== initialData.activeWeaponId) {
      initialData = await prefetchLeaderboard(characterId, leaderboardSnapshotToApiQuery(canonicalQuery));
    }
  }

  return (
    <main className="bg-background">
      <LeaderboardCharacterClient characterId={characterId} initialData={initialData} />
    </main>
  );
}
