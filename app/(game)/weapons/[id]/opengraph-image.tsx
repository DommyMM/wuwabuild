import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard, renderFallbackCard } from '@/lib/server/og';
import { loadWeaponSummary } from '@/lib/server/ogData';

export const alt = 'Weapon – WuWa Builds';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const weapon = loadWeaponSummary(id);
  if (!weapon) return renderFallbackCard();

  return renderOgCard({
    variant: 'weapon',
    title: weapon.name,
    subtitle: 'Weapon stats and calculator',
    chips: [weapon.weaponType, `${weapon.rarity}★`, 'Wuthering Waves'],
    artUrl: weapon.iconUrl,
  });
}
