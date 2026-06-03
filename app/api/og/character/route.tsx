import { NextRequest } from 'next/server';
import { OG_CONTENT_TYPE, renderFallbackCard, renderOgCard } from '@/lib/server/og';
import { loadCharacterSummary } from '@/lib/server/gameData';

export const revalidate = 604800;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim() || '';
  const character = id ? loadCharacterSummary(id) : null;
  if (!character) return renderFallbackCard();

  const response = await renderOgCard({
    variant: 'character',
    title: character.name,
    subtitle: 'Build calculator and optimization',
    chips: [character.element, character.weaponType, `${character.rarity}★`],
    artUrl: character.bannerUrl,
    accentColor: character.elementColor ?? undefined,
    element: character.element,
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
  return response;
}
