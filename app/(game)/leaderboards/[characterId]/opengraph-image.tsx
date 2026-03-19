import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard, renderFallbackCard } from '@/lib/server/og';
import { loadCharacterSummary } from '@/lib/server/ogData';

export const alt = 'Leaderboard – WuWa Builds';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const char = loadCharacterSummary(characterId);
  if (!char) return renderFallbackCard();

  return renderOgCard({
    variant: 'leaderboard',
    title: char.name,
    subtitle: 'Global build leaderboard',
    chips: [char.element, char.weaponType, 'Damage rankings'],
    artUrl: char.bannerUrl,
    accentColor: char.elementColor ?? undefined,
  });
}
