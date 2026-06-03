import { NextRequest } from 'next/server';
import { DEFAULT_LB_TRACK, parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { OG_CONTENT_TYPE, renderFallbackCard, renderOgCard } from '@/lib/server/og';
import { loadCharacterSummary, loadWeaponSummary } from '@/lib/server/gameData';

export const revalidate = 300;

function compactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return Math.round(value).toLocaleString('en-US');
}

function resolveTrackLabel(trackKey: string, tracks: { key: string; label: string }[]): string {
  const track = tracks.find((entry) => entry.key === trackKey);
  return stripLBSeqPrefix(track?.label?.trim() || trackKey || 'Damage') || 'Damage';
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const characterId = params.get('char')?.trim() || params.get('characterId')?.trim() || '';
  if (!characterId) return renderFallbackCard();

  const character = loadCharacterSummary(characterId);
  if (!character) return renderFallbackCard();

  const requestedWeaponId = params.get('weaponId')?.trim() || '';
  const requestedTrack = params.get('track')?.trim() || DEFAULT_LB_TRACK;
  const leaderboard = await prefetchLeaderboard(characterId, {
    weaponId: requestedWeaponId || undefined,
    track: requestedTrack || undefined,
    page: 1,
    pageSize: 12,
    sort: 'damage',
    direction: 'desc',
  });

  const activeWeaponId = leaderboard?.activeWeaponId || requestedWeaponId;
  const activeTrack = leaderboard?.activeTrack || requestedTrack;
  const weapon = activeWeaponId ? loadWeaponSummary(activeWeaponId) : null;
  const top = leaderboard?.builds[0] ?? null;
  const sequence = Math.max(parseLBSeqLevel(activeTrack), top?.sequence ?? 0);
  const playstyle = resolveTrackLabel(activeTrack, leaderboard?.tracks ?? []);

  const response = await renderOgCard({
    variant: 'leaderboard',
    title: character.name,
    subtitle: `${playstyle} leaderboard`,
    chips: [
      character.element,
      sequence > 0 ? `S${sequence}` : character.weaponType,
      weapon?.name ?? 'Damage rankings',
    ],
    artUrl: character.bannerUrl,
    secondaryArtUrl: weapon?.iconUrl,
    accentColor: character.elementColor ?? undefined,
    element: character.element,
    metricLabel: top ? 'Top ranked build' : 'Global leaderboard',
    metricValue: top ? `#${top.globalRank || 1} · ${compactNumber(top.damage)}` : undefined,
    detailLabel: top ? 'simulated damage' : undefined,
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return response;
}
