import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { FAQS } from '@/components/home/faqs';
import type { HomeBoardRecord, HomeHeroSlide } from '@/components/home/types';
import { buildLeaderboardHref } from '@/components/leaderboards/character/leaderboardCharacterQuery';
import { parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { isHealTrackKey } from '@/lib/lb';
import { prefetchLeaderboardOverview, prefetchBuilds, prefetchLeaderboard } from '@/lib/lbServer';
import { loadCharacterSummary, loadWeaponSummary } from '@/lib/server/gameData';

export const revalidate = 300; // ISR: full page HTML cached at edge, re-rendered at most once per 5 min

const MAX_HERO_SLIDES = 6;

export const metadata: Metadata = {
    title: { absolute: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards' },
    description: 'Scan, build, and rank Wuthering Waves characters. Import screenshots, view builds, compare damage on leaderboards, and export showcase cards.',
    twitter: {
        title: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards',
        description: 'Scan, build, and rank Wuthering Waves characters. Import screenshots, view builds, compare damage on leaderboards, and export showcase cards',
    },
    alternates: { canonical: '/' },
};

function reignLabelFor(reignSince: string | undefined, estimated: boolean): string | null {
    if (!reignSince) return null;
    const since = Date.parse(reignSince);
    if (!Number.isFinite(since)) return null;
    const days = Math.floor((Date.now() - since) / 86_400_000);
    if (days < 1) return estimated ? null : 'took #1 today';
    const dayWord = days === 1 ? 'day' : 'days';
    return estimated ? `#1 for about ${days} ${dayWord}` : `#1 for ${days} ${dayWord}`;
}

/** Resolve one showcase slide: splash art, weapon display, and the board's #1 row for reign info. */
async function resolveHeroSlide(record: HomeBoardRecord): Promise<HomeHeroSlide | null> {
    const splashUrl = loadCharacterSummary(record.characterId)?.splashUrl ?? null;
    if (!splashUrl) return null;
    const weapon = record.topWeaponId ? loadWeaponSummary(record.topWeaponId) : null;
    const detail = await prefetchLeaderboard(record.characterId, {
        track: record.trackKey,
        weaponId: record.topWeaponId || undefined,
        pageSize: 5,
    });
    const top = detail?.builds.find((entry) => entry.globalRank === 1) ?? null;
    return {
        characterId: record.characterId,
        href: record.href,
        name: record.name,
        element: record.element,
        seqLevel: record.seqLevel,
        trackLabel: record.trackLabel,
        splashUrl,
        weaponName: weapon?.name ?? '',
        weaponIcon: weapon?.iconUrl ?? null,
        damage: top && top.damage > 0 ? top.damage : record.topDamage,
        owner: top?.owner.username || record.topOwner,
        reignLabel: top ? reignLabelFor(top.reignSince, top.reignEstimated ?? false) : null,
    };
}

export default async function Home() {
    const [overview, buildsRes] = await Promise.all([
        prefetchLeaderboardOverview(),
        prefetchBuilds(),
    ]);
    const lbStats = {
        totalBuilds: buildsRes?.total ?? 0,
        totalLeaderboards: overview?.length ?? 0,
    };

    const records: HomeBoardRecord[] = (overview ?? []).map((entry) => {
        let top: { weaponId: string; damage: number; owner: { username: string } } | null = null;
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
            topWeaponId: top?.weaponId ?? '',
            isHeal: isHealTrackKey(entry.trackKey),
        };
    });

    // Hero showcase: each character's single biggest run (heal scores aren't damage, so they sit out),
    // most contested characters first, capped and filtered to those with local splash art.
    const bestByCharacter = new Map<string, HomeBoardRecord>();
    for (const record of records) {
        if (record.isHeal || record.topDamage <= 0) continue;
        const current = bestByCharacter.get(record.characterId);
        if (!current || record.topDamage > current.topDamage) {
            bestByCharacter.set(record.characterId, record);
        }
    }
    const slideCandidates = [...bestByCharacter.values()]
        .sort((a, b) => b.totalEntries - a.totalEntries)
        .slice(0, MAX_HERO_SLIDES + 2);
    const slides = (await Promise.all(slideCandidates.map(resolveHeroSlide)))
        .filter((slide): slide is HomeHeroSlide => slide !== null)
        .slice(0, MAX_HERO_SLIDES);

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://wuwa.build/#website",
                "name": "WuWa Builds",
                "url": "https://wuwa.build",
                "publisher": { "@id": "https://wuwa.build/#organization" }
            },
            {
                "@type": "Organization",
                "@id": "https://wuwa.build/#organization",
                "name": "WuWa Builds",
                "url": "https://wuwa.build",
                "logo": "https://wuwa.build/logo512.png"
            },
            {
                "@type": "SoftwareApplication",
                "name": "WuWa Builds - Wuthering Waves Build Editor",
                "operatingSystem": "Any",
                "applicationCategory": "GameApplication",
                "url": "https://wuwa.build",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": FAQS.map((faq) => ({
                    "@type": "Question",
                    "name": faq.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.text
                    }
                }))
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <HomePage lbStats={lbStats} slides={slides} records={records} />
        </>
    );
}
