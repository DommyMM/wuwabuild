import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import type { HomeBoardRecord, HomeHeroSlide } from '@/components/home/types';
import { buildLeaderboardHref } from '@/components/leaderboards/character/leaderboardCharacterQuery';
import { parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { isHealTrackKey } from '@/lib/lb';
import { processMoves, type TypeTotal } from '@/lib/moveBreakdown';
import { prefetchLeaderboardOverview, prefetchBuilds, prefetchBuildMoves } from '@/lib/lbServer';
import { loadCharacterSummary, loadWeaponSummary } from '@/lib/server/gameData';

// The homepage is an hourly editorial and stat snapshot, never refetched after hydration
// That saves an API request per landing-page visit, where hourly freshness is enough
export const revalidate = 3600;

export const metadata: Metadata = {
    title: { absolute: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards' },
    description: 'Search any Wuthering Waves player, or import your own from a wuwa-bot screenshot. Every board runs one standardized rotation, so builds are ranked on echoes alone.',
    twitter: {
        card: 'summary_large_image',
        title: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards',
        description: 'Search any Wuthering Waves player, or import your own from a wuwa-bot screenshot. Every board runs one standardized rotation, so builds are ranked on echoes alone.',
    },
    alternates: { canonical: '/' },
};

function reignLabelFor(reignSince: string): string | null {
    if (!reignSince) return null;
    const since = Date.parse(reignSince);
    if (!Number.isFinite(since)) return null;
    const days = Math.floor((Date.now() - since) / 86_400_000);
    if (days < 1) return 'took #1 today';
    return `#1 for ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Deterministic shuffle so the hero lineup reorders once per ISR window, not per request */
function shuffleSeeded<T>(items: T[], seed: number): T[] {
    const arr = [...items];
    let s = seed >>> 0;
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Resolve one showcase slide from the overview payload plus local display data */
function resolveHeroSlide(record: HomeBoardRecord): HomeHeroSlide | null {
    const splashUrl = loadCharacterSummary(record.characterId)?.splashUrl ?? null;
    if (!splashUrl) return null;
    const weapon = record.topWeaponId ? loadWeaponSummary(record.topWeaponId) : null;
    // Deep link to the record, not just its board: the weapon it was set on plus the build id
    // The leaderboard then opens with that row already expanded
    const href = record.topBuildId
        ? buildLeaderboardHref(record.characterId, {
            track: record.trackKey,
            weaponId: record.topWeaponId,
            buildId: record.topBuildId,
        })
        : record.href;
    return {
        characterId: record.characterId,
        trackKey: record.trackKey,
        href,
        buildId: record.topBuildId,
        weaponId: record.topWeaponId,
        name: record.name,
        element: record.element,
        seqLevel: record.seqLevel,
        trackLabel: record.trackLabel,
        splashUrl,
        weaponName: weapon?.name ?? '',
        weaponIcon: weapon?.iconUrl ?? null,
        damage: record.topDamage,
        owner: record.topOwner,
        ownerUid: record.topOwnerUid,
        reignLabel: reignLabelFor(record.topReignSince),
    };
}

export default async function Home() {
    const [overview, buildsRes] = await Promise.all([
        prefetchLeaderboardOverview(revalidate),
        prefetchBuilds('finalCV', revalidate),
    ]);
    const lbStats = {
        totalBuilds: buildsRes?.total ?? 0,
        totalLeaderboards: overview?.length ?? 0,
    };

    const records: HomeBoardRecord[] = (overview ?? []).map((entry) => {
        let top: { weaponId: string; buildId: string; damage: number; owner: { username: string; uid: string }; reignSince: string } | null = null;
        for (const weapon of entry.weapons) {
            if (weapon.damage > 0 && (!top || weapon.damage > top.damage)) top = weapon;
        }
        return {
            characterId: entry.id,
            trackKey: entry.trackKey,
            href: buildLeaderboardHref(entry.id, { track: entry.trackKey }, {
                defaultWeaponId: entry.weaponIds[0] ?? '',
                defaultTrack: entry.trackKey,
            }),
            name: entry.display?.name ?? `Character ${entry.id}`,
            element: entry.display?.element ?? '',
            head: entry.display?.head ?? null,
            seqLevel: parseLBSeqLevel(entry.trackKey),
            trackLabel: stripLBSeqPrefix(entry.trackLabel),
            totalEntries: entry.totalEntries,
            topDamage: top?.damage ?? 0,
            topOwner: top?.owner.username ?? '',
            topOwnerUid: top?.owner.uid ?? '',
            topWeaponId: top?.weaponId ?? '',
            topBuildId: top?.buildId ?? '',
            topReignSince: top?.reignSince ?? '',
            isHeal: isHealTrackKey(entry.trackKey),
        };
    });

    // Hero showcase rotates board-level records so lower-sequence tracks can appear too
    const slideCandidates = shuffleSeeded(
        records.filter((record) => !record.isHeal && record.topDamage > 0),
        // eslint-disable-next-line react-hooks/purity -- Server-rendered ISR seed, cached for the matching revalidate window
        Math.floor(Date.now() / (revalidate * 1000)),
    );
    const slides = slideCandidates.map(resolveHeroSlide)
        .filter((slide): slide is HomeHeroSlide => slide !== null);

    // Every visitor sees the first slide at first paint, so its move profile is baked into the ISR HTML
    // One upstream call per revalidate window, later slides keeping the lazy client fetch
    const first = slides[0];
    let initialProfile: TypeTotal[] | null = null;
    if (first?.buildId && first.weaponId) {
        const moves = await prefetchBuildMoves(first.buildId, first.weaponId, first.trackKey, revalidate);
        if (moves && moves.length > 0) initialProfile = processMoves(moves).typeTotals;
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://wuwa.build/#website",
                "name": "WuWaBuilds",
                "alternateName": ["WuWa Builds", "wuwa.build"],
                "url": "https://wuwa.build",
                "publisher": { "@id": "https://wuwa.build/#organization" }
            },
            {
                "@type": "Organization",
                "@id": "https://wuwa.build/#organization",
                "name": "WuWaBuilds",
                "alternateName": ["WuWa Builds", "wuwa.build"],
                "url": "https://wuwa.build",
                "logo": "https://wuwa.build/logo512.png"
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <HomePage lbStats={lbStats} slides={slides} records={records} initialProfile={initialProfile} />
        </>
    );
}
