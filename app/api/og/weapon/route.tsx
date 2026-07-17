import { NextRequest } from 'next/server';
import { OG_CONTENT_TYPE, renderFallbackCard, renderOgCard } from '@/lib/server/og';
import { loadWeaponSummary } from '@/lib/server/gameData';

export const revalidate = 604800;

const RARITY_ACCENT: Record<number, string> = { 5: '#CFB17F', 4: '#B98BE0', 3: '#5B8FB0' };

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim() || '';
  const weapon = id ? loadWeaponSummary(id) : null;
  if (!weapon) return renderFallbackCard();

  const response = await renderOgCard({
    variant: 'weapon',
    title: weapon.name,
    subtitle: 'Weapon details, stats, and resonator reference',
    chips: [weapon.weaponType, `${weapon.rarity}★`],
    verbs: ['BUILD'],
    artUrl: weapon.iconUrl,
    accentColor: RARITY_ACCENT[weapon.rarity],
    artKind: 'weapon',
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
  return response;
}
