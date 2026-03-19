import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from '@/lib/server/og';

export const alt = 'Character Leaderboards – WuWa Builds';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    variant: 'leaderboard-overview',
    title: 'Character Leaderboards',
    subtitle: 'Global damage rankings, builds, and benchmark tracks',
    chips: ['Rankings', 'Builds', 'Wuthering Waves'],
  });
}
