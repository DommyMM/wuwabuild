import { OG_CONTENT_TYPE, renderOgCard } from '@/lib/server/og';

export const revalidate = 604800;

export async function GET() {
  const response = await renderOgCard({
    variant: 'page',
    title: 'Build Editor',
    subtitle: 'Tune builds and export showcase cards',
    chips: [],
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
  return response;
}
