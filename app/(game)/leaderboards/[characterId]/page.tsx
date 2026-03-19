import type { Metadata } from 'next';

// Reads searchParams to determine weapon/track — must be dynamic.
// Overrides the force-static default set in (game)/layout.tsx.
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LeaderboardCharacterClient } from '@/components/leaderboards/character/LeaderboardCharacterClient';
import { DEFAULT_LB_TRACK } from '@/components/leaderboards/constants';
import { buildLeaderboardHref, leaderboardSnapshotToApiQuery, parseInitialLeaderboardQuery, serializeLeaderboardQuery, toURLSearchParams } from '@/components/leaderboards/character/leaderboardCharacterQuery';
import { adaptCDNCharacter, formatCharacterDisplayName } from '@/lib/character';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { loadCharacterRaw } from '@/lib/server/ogData';

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params;
  const { character, characterName } = getCharacterPageCopy(characterId);

  if (character) {
    const title = `${characterName} Leaderboard - WuWaBuilds`;
    const description = `Global damage rankings for ${characterName} in Wuthering Waves. Compare top builds, weapons, tracks, echo sets, and benchmark setups on WuWaBuilds.`;

    return {
      title,
      description,
      openGraph: { title, description, url: `https://wuwa.build/leaderboards/${characterId}` },
      twitter: { title, description },
      alternates: { canonical: `/leaderboards/${characterId}` },
    };
  }

  const fallbackTitle = `Character Leaderboard #${characterId} - WuWaBuilds`;
  const fallbackDescription = 'Global damage rankings for this Wuthering Waves character. Filter by weapon, track, echo sets, and more.';
  return {
    title: fallbackTitle,
    description: fallbackDescription,
    twitter: { title: fallbackTitle, description: fallbackDescription },
    alternates: { canonical: `/leaderboards/${characterId}` },
  };
}

export default async function CharacterLeaderboardPage({ params, searchParams }: Props) {
  const { characterId } = await params;
  const rawSearchParams = toURLSearchParams(await searchParams);
  const parsedQuery = parseInitialLeaderboardQuery(rawSearchParams);
  const { character, characterName } = getCharacterPageCopy(characterId);

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

  const activeTrack = initialData?.tracks.find((track) => track.key === initialData.activeTrack) ?? initialData?.tracks[0] ?? null;
  const characterElement = character?.roverElementName ?? character?.element ?? null;
  const leaderboardSummary = initialData
    ? `${initialData.total.toLocaleString()} ranked build${initialData.total === 1 ? '' : 's'}`
    : 'global ranked builds';

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
      {character && (
        <div className="sr-only">
          <h1>{characterName} Damage Leaderboard</h1>
          <p>
            Explore the WuWaBuilds damage leaderboard for {characterName}.
            {characterElement ? ` ${characterName} is a ${characterElement} Resonator` : ''}
            {character.weaponType ? ` who uses ${character.weaponType}.` : '.'}
            {' '}Compare weapon rankings, build filters, echo combinations, and benchmark tracks for this character.
          </p>
          <p>
            This page tracks {leaderboardSummary}
            {activeTrack ? ` across the ${activeTrack.label} benchmark.` : '.'}
          </p>
          <p>
            Use the filters to narrow results by weapon, sequence track, main stats, echo sets, username, or UID.
          </p>
          <p>
            Visit the <Link href={`/characters/${characterId}`}>{characterName} build calculator</Link> or return to the <Link href="/leaderboards">leaderboard overview</Link>.
          </p>
        </div>
      )}
      <LeaderboardCharacterClient characterId={characterId} initialData={initialData} />
    </div>
  );
}
