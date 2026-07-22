import { parseLBSeqLevel } from '@/components/leaderboards/constants';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';
import { OG_CONTENT_TYPE, renderOgCard, type OgRow } from '@/lib/server/og';

export const revalidate = 86400;

export async function GET() {
  const overview = await prefetchLeaderboardOverview();

  // Top base boards (S0), one per character, biggest first — mirrors what the
  // overview page leads with. Falls back to the centered card when the API is out.
  const seen = new Set<string>();
  const boards = (overview ?? []).filter((board) => {
    if (!board.display?.name || parseLBSeqLevel(board.trackKey) !== 0) return false;
    if (seen.has(board.id)) return false;
    seen.add(board.id);
    return true;
  });
  boards.sort((a, b) => b.totalEntries - a.totalEntries);

  const rows: OgRow[] = boards.slice(0, 3).map((board) => ({
    iconUrl: board.display?.head ?? null,
    label: board.display?.name ?? '',
    sub: `${board.totalEntries.toLocaleString('en-US')} builds`,
    value: Math.max(0, ...board.weapons.map((weapon) => weapon.damage)).toLocaleString('en-US'),
    valueSub: 'top score',
  }));

  const response = await renderOgCard({
    variant: 'index',
    title: 'Leaderboards',
    subtitle: 'Ranked builds across standardized rotations',
    chips: [],
    verbs: ['RANK'],
    rows,
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return response;
}
