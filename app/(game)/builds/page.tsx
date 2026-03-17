import type { Metadata } from 'next';
import { GlobalBoardPageClient } from '@/components/leaderboards/board/GlobalBoardPageClient';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Browse Builds',
  description: 'Explore and filter community-created Wuthering Waves builds. Find the best echo combinations, main stats, and substat priorities for every character.',
  alternates: { canonical: '/builds' },
};

export default function Builds() {
  return <GlobalBoardPageClient />;
}
