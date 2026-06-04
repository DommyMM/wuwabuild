import { NextRequest } from 'next/server';
import { DEFAULT_LB_TRACK, parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { OG_CONTENT_TYPE, renderFallbackCard, renderOgCard } from '@/lib/server/og';
import { loadCharacterSummary, loadWeaponSummary } from '@/lib/server/gameData';

export const revalidate = 86400;

function compactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return Math.round(value).toLocaleString('en-US');
}

function resolveTrackLabel(trackKey: string, tracks: { key: string; label: string }[]): string {
  const track = tracks.find((entry) => entry.key === trackKey);
  return stripLBSeqPrefix(track?.label?.trim() || trackKey || 'Damage') || 'Damage';
}

function resolveHolderLabel(owner: { username: string; uid: string } | undefined): string | undefined {
  const username = owner?.username.trim();
  if (username) return `held by ${username}`;
  const uid = owner?.uid.trim();
  return uid ? `held by UID ${uid}` : undefined;
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
  const sequence = parseLBSeqLevel(activeTrack);
  const playstyle = resolveTrackLabel(activeTrack, leaderboard?.tracks ?? []);
  const artUrl = character.splashUrl ?? character.bannerUrl;

  const response = await renderOgCard({
    variant: 'leaderboard',
    title: character.name,
    subtitle: `${playstyle} leaderboard · S${sequence}${weapon?.name ? ` · ${weapon.name}` : ''}`,
    chips: [],
    artUrl,
    secondaryArtUrl: weapon?.iconUrl,
    accentColor: character.elementColor ?? undefined,
    element: character.element,
    artKind: character.splashUrl ? 'scene' : 'character',
    metricLabel: top ? 'Top damage' : 'Global leaderboard',
    metricValue: top ? compactNumber(top.damage) : undefined,
    detailLabel: top ? resolveHolderLabel(top.owner) : undefined,
  });
  response.headers.set('Content-Type', OG_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return response;
}
