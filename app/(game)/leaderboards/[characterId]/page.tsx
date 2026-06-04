import type { Metadata } from 'next';

// Reads searchParams to determine weapon/track, must be dynamic.
// Overrides the force-static default set in (game)/layout.tsx.
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { LeaderboardCharacterClient } from '@/components/leaderboards/character/LeaderboardCharacterClient';
import { DEFAULT_LB_TRACK, parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { buildLeaderboardHref, leaderboardSnapshotToApiQuery, parseInitialLeaderboardQuery, serializeLeaderboardQuery, toURLSearchParams } from '@/components/leaderboards/character/leaderboardCharacterQuery';
import { adaptCDNCharacter, formatCharacterDisplayName } from '@/lib/character';
import type { LBTrack } from '@/lib/lb';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { loadCharacterRaw, loadWeaponSummary } from '@/lib/server/gameData';

interface Props {
  params: Promise<{ characterId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

function getCoreLeaderboardCanonical(characterId: string, weaponId: string, trackKey: string): string {
  const query = new URLSearchParams();
  if (weaponId) query.set('weaponId', weaponId);
  if (trackKey) query.set('track', trackKey);
  const search = query.toString();
  return search ? `/leaderboards/${characterId}?${search}` : `/leaderboards/${characterId}`;
}

function getLeaderboardOgImageUrl(characterId: string, weaponId: string, trackKey: string): string {
  const query = new URLSearchParams({ char: characterId });
  if (weaponId) query.set('weaponId', weaponId);
  if (trackKey) query.set('track', trackKey);
  return `https://wuwa.build/api/og/leaderboard?${query.toString()}`;
}

function getTrackTitleParts(trackKey: string, tracks: LBTrack[]): { playstyle: string; sequence: number } {
  const track = tracks.find((entry) => entry.key === trackKey);
  const rawLabel = track?.label?.trim() || trackKey || 'Damage';
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { characterId } = await params;
  const rawSearchParams = toURLSearchParams(await searchParams);
  const parsedQuery = parseInitialLeaderboardQuery(rawSearchParams);
  const { character, characterName } = getCharacterPageCopy(characterId);

  if (character) {
    const initialData = await prefetchLeaderboard(characterId, leaderboardSnapshotToApiQuery(parsedQuery));
    const activeWeaponId = initialData?.activeWeaponId || parsedQuery.weaponId || initialData?.weaponIds[0] || '';
    const activeTrack = initialData?.activeTrack || parsedQuery.track || initialData?.tracks[0]?.key || DEFAULT_LB_TRACK;
    const tracks = initialData?.tracks ?? [];
    const title = getLeaderboardTitle(characterName, activeTrack, tracks);
    const description = getLeaderboardDescription(characterName, activeTrack, tracks, activeWeaponId);
    const canonical = getCoreLeaderboardCanonical(characterId, activeWeaponId, activeTrack);
    const image = getLeaderboardOgImageUrl(characterId, activeWeaponId, activeTrack);

    return {
      title,
      description,
      openGraph: { title, description, url: canonical, images: [{ url: image, width: 1200, height: 630, alt: title }] },
      twitter: { title, description, images: [image] },
      alternates: { canonical },
    };
  }

  const fallbackTitle = `Character Leaderboard #${characterId}`;
  const fallbackDescription = 'Global damage rankings for this Wuthering Waves character. Filter by weapon, track, echo sets, and compare setups.';
  const fallbackImage = getLeaderboardOgImageUrl(characterId, '', DEFAULT_LB_TRACK);
  return {
    title: fallbackTitle,
    description: fallbackDescription,
    openGraph: { title: fallbackTitle, description: fallbackDescription, images: [{ url: fallbackImage, width: 1200, height: 630, alt: fallbackTitle }] },
    twitter: { title: fallbackTitle, description: fallbackDescription, images: [fallbackImage] },
    alternates: { canonical: `/leaderboards/${characterId}` },
  };
}

export default async function CharacterLeaderboardPage({ params, searchParams }: Props) {
  const { characterId } = await params;
  const rawSearchParams = toURLSearchParams(await searchParams);
  const parsedQuery = parseInitialLeaderboardQuery(rawSearchParams);
  const { characterName } = getCharacterPageCopy(characterId);

  const initialData = await prefetchLeaderboard(characterId, leaderboardSnapshotToApiQuery(parsedQuery));

  if (initialData) {
    const canonicalQuery = parseInitialLeaderboardQuery(rawSearchParams, {
      weaponIds: initialData.weaponIds,
      tracks: initialData.tracks,
      defaultWeaponId: initialData.activeWeaponId || initialData.weaponIds[0] || '',
      defaultTrack: initialData.activeTrack || initialData.tracks[0]?.key || DEFAULT_LB_TRACK,
    });
    const canonicalSearch = serializeLeaderboardQuery(canonicalQuery, {
      defaultWeaponId: initialData.activeWeaponId || initialData.weaponIds[0] || '',
      defaultTrack: initialData.activeTrack || initialData.tracks[0]?.key || DEFAULT_LB_TRACK,
    });

    if (rawSearchParams.toString() !== canonicalSearch) {
      redirect(buildLeaderboardHref(characterId, canonicalQuery, {
        defaultWeaponId: initialData.activeWeaponId || initialData.weaponIds[0] || '',
        defaultTrack: initialData.activeTrack || initialData.tracks[0]?.key || DEFAULT_LB_TRACK,
      }));
    }
  }

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
      <LeaderboardCharacterClient characterId={characterId} initialData={initialData} />
    </div>
  );
}
