import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard, renderFallbackCard } from '@/lib/server/og';
import { loadCharacterSummary } from '@/lib/server/ogData';

export const alt = 'Character – WuWa Builds';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const char = loadCharacterSummary(id);
  if (!char) return renderFallbackCard();

  return renderOgCard({
    variant: 'character',
    title: char.name,
    subtitle: 'Build calculator and optimization',
    chips: [char.element, char.weaponType, `${char.rarity}★`],
    artUrl: char.bannerUrl,
    accentColor: char.elementColor ?? undefined,
  });
}
