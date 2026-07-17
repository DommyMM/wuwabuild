import { prefetchBuilds } from '@/lib/lbServer';
import { loadCharacterDisplayMap } from '@/lib/server/gameData';
import { OG_CONTENT_TYPE, renderOgCard, type OgRow } from '@/lib/server/og';

export const revalidate = 86400;

export async function GET() {
  const data = await prefetchBuilds('finalCV');
  const charMap = loadCharacterDisplayMap();

  const rows: OgRow[] = (data?.builds ?? []).slice(0, 3).map((build) => {
    const character = charMap[build.character.id];
    return {
      iconUrl: character?.head ?? null,
      label: build.owner.username.trim() || `UID ${build.owner.uid}`,
      sub: character?.name,
      value: `${build.cv.toFixed(1)} CV`,
    };
  });

  const total = data?.total ?? 0;
  const response = await renderOgCard({
    variant: 'index',
    title: 'Builds',
    subtitle: total > 0 ? `${total.toLocaleString('en-US')} builds ranked and browsable` : 'Browse Wuthering Waves builds',
    chips: [],
    verbs: ['RANK'],
    rows,
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return response;
}
