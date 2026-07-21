import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LeaderboardCharacterClient } from '@/components/leaderboards/character/LeaderboardCharacterClient';
import { DEFAULT_LB_TRACK, parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { adaptCDNCharacter, formatCharacterDisplayName } from '@/lib/character';
import type { LBTrack } from '@/lib/lb';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { loadBoardDisplayCatalog, loadCharacterDisplayMap, loadCharacterRaw, loadWeaponSummary } from '@/lib/server/gameData';

// ISR: one canonical board per character (the default weapon/track). Weapon/track/
// filter variants are client-side UI state under that canonical, so the route no
// longer reads searchParams and no longer renders a Vercel function per request. The
// client background-refreshes the board on mount through the short Cloudflare API
// cache. `revalidate` is passed to the prefetch so no nested fetch drags the page below hourly.
export const revalidate = 3600;

interface Props {
  params: Promise<{ characterId: string }>;
}

// Prerender every character's board at build so the route is ISR. A dynamic segment
// WITHOUT generateStaticParams renders per-request (dynamic) even with `revalidate` set
// `revalidate` alone does not make it static. Mirrors /characters/[id] and /weapons/[id], which are ISR for exactly this reason.
export function generateStaticParams(): { characterId: string }[] {
  return Object.keys(loadCharacterDisplayMap()).map((characterId) => ({ characterId }));
}

function getCharacterPageCopy(characterId: string) {
  const rawCharacter = loadCharacterRaw(characterId);
  const character = rawCharacter ? adaptCDNCharacter(rawCharacter) : null;
  const characterName = character
    ? formatCharacterDisplayName(character, {
        baseName: character.name,
        roverElement: undefined,
      })
    : `Character ${characterId}`;

  return { rawCharacter, character, characterName };
}

function getLeaderboardOgImageUrl(characterId: string, weaponId: string, trackKey: string): string {
  const query = new URLSearchParams({ char: characterId });
  if (weaponId) query.set('weaponId', weaponId);
  if (trackKey) query.set('track', trackKey);
  return `https://wuwa.build/api/og/leaderboard?${query.toString()}`;
}

function getTrackTitleParts(trackKey: string, tracks: LBTrack[]): { playstyle: string; sequence: number } {
  const track = tracks.find((entry) => entry.key === trackKey);
  const rawLabel = track?.label?.trim() || trackKey || 'Score';
  const playstyle = stripLBSeqPrefix(rawLabel).trim() || rawLabel;
  return {
    playstyle,
    sequence: parseLBSeqLevel(trackKey),
  };
}

function getLeaderboardTitle(characterName: string, trackKey: string, tracks: LBTrack[]): string {
  const { playstyle, sequence } = getTrackTitleParts(trackKey, tracks);
  const scope = [characterName, sequence > 0 ? `S${sequence}` : '', playstyle]
    .filter(Boolean)
    .join(' ');
  return `${scope} Leaderboard Rankings`;
}

function getLeaderboardDescription(characterName: string, trackKey: string, tracks: LBTrack[], weaponId: string): string {
  const { playstyle, sequence } = getTrackTitleParts(trackKey, tracks);
  const weapon = weaponId ? loadWeaponSummary(weaponId) : null;
  const sequenceText = sequence > 0 ? ` S${sequence}` : '';
  const weaponText = weapon?.name ? ` with ${weapon.name}` : '';
  return `${characterName}${sequenceText} ${playstyle} damage rankings${weaponText} in Wuthering Waves. Compare standardized damage, the best echo sets, stats, and top-player builds on WuWaBuilds.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params;
  const { character, characterName } = getCharacterPageCopy(characterId);
  if (!character) notFound();

  // Metadata describes the default board (weapon/track variants are client-side state
  // under this one canonical), so no searchParams are read here.
  const initialData = await prefetchLeaderboard(characterId, {}, revalidate);
  const activeWeaponId = initialData?.activeWeaponId || initialData?.weaponIds[0] || '';
  const activeTrack = initialData?.activeTrack || initialData?.tracks[0]?.key || DEFAULT_LB_TRACK;
  const tracks = initialData?.tracks ?? [];
  const title = getLeaderboardTitle(characterName, activeTrack, tracks);
  const description = getLeaderboardDescription(characterName, activeTrack, tracks, activeWeaponId);
  const canonical = `/leaderboards/${characterId}`;
  const image = getLeaderboardOgImageUrl(characterId, activeWeaponId, activeTrack);

  return {
    title,
    description,
    openGraph: { title, description, url: canonical, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { title, description, images: [image] },
    alternates: { canonical },
  };
}

export default async function CharacterLeaderboardPage({ params }: Props) {
  const { characterId } = await params;
  const { character, characterName } = getCharacterPageCopy(characterId);
  if (!character) notFound();

  // Always the default board. The client reads the URL's weapon/track/filter/buildId
  // and fetches the requested variant on mount; it also normalizes the address bar
  // (replacing the old server-side canonical redirect for human navigation).
  const initialData = await prefetchLeaderboard(characterId, {}, revalidate);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://wuwa.build"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Leaderboards",
        "item": "https://wuwa.build/leaderboards"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": characterName ? `${characterName} Leaderboard` : "Character Leaderboard",
        "item": `https://wuwa.build/leaderboards/${characterId}`
      }
    ]
  };

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LeaderboardCharacterClient
        characterId={characterId}
        initialData={initialData}
        boardDisplay={loadBoardDisplayCatalog()}
      />
    </div>
  );
}
