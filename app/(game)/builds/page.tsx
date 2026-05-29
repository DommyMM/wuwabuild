import type { Metadata } from 'next';
import { GlobalBoardPageClient } from '@/components/leaderboards/board/GlobalBoardPageClient';
import { prefetchBuilds } from '@/lib/lbServer';

export const dynamic = 'force-static';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Wuthering Waves Builds',
  description: 'Explore the best Wuthering Waves character builds. Filter by resonator, weapon, and echoes to find optimal substats, main stats, and community guides.',
  alternates: { canonical: '/builds' },
};

export default async function Builds() {
  const initialData = await prefetchBuilds();

  return <GlobalBoardPageClient initialData={initialData} />;
}
