import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { CHANGELOG } from '@/lib/changelog';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';
import { PRIVACY_UPDATED, TOS_UPDATED } from '@/lib/legalDates';
import { SITE_URL } from '@/lib/metadata';

type WeaponSitemapEntry = {
    id?: string | number;
};

const DATA_DIR = path.join(process.cwd(), 'public', 'Data');
const CHARACTERS_PATH = path.join(DATA_DIR, 'Characters.json');
const WEAPONS_PATH = path.join(DATA_DIR, 'Weapons.json');

export const revalidate = 600;

function loadWeaponsForSitemap(): WeaponSitemapEntry[] {
    if (!fs.existsSync(WEAPONS_PATH)) {
        return [];
    }

    const rawData = JSON.parse(fs.readFileSync(WEAPONS_PATH, 'utf8')) as unknown;
    if (Array.isArray(rawData)) {
        return rawData as WeaponSitemapEntry[];
    }
    if (!rawData || typeof rawData !== 'object') {
        return [];
    }

    return Object.values(rawData as Record<string, unknown>).flatMap((group) => {
        if (Array.isArray(group)) {
            return group as WeaponSitemapEntry[];
        }
        if (group && typeof group === 'object') {
            return Object.values(group as Record<string, unknown>) as WeaponSitemapEntry[];
        }
        return [];
    });
}

// Only pages with a date the content actually carries get lastModified, since file mtimes on Vercel are the deploy time
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: SITE_URL, priority: 1.0, changeFrequency: 'daily' },
        { url: `${SITE_URL}/builds`, priority: 0.9, changeFrequency: 'daily' },
        { url: `${SITE_URL}/leaderboards`, priority: 0.9, changeFrequency: 'daily' },
        { url: `${SITE_URL}/profiles`, priority: 0.8, changeFrequency: 'weekly' },
        { url: `${SITE_URL}/edit`, priority: 0.9, changeFrequency: 'weekly' },
        { url: `${SITE_URL}/import`, priority: 0.8, changeFrequency: 'weekly' },
        { url: `${SITE_URL}/changelog`, priority: 0.7, changeFrequency: 'daily', lastModified: new Date(CHANGELOG[0].date) },
        { url: `${SITE_URL}/privacy`, priority: 0.3, changeFrequency: 'monthly', lastModified: new Date(PRIVACY_UPDATED) },
        { url: `${SITE_URL}/tos`, priority: 0.3, changeFrequency: 'monthly', lastModified: new Date(TOS_UPDATED) },
    ];

    const leaderboardOverview = await prefetchLeaderboardOverview();
    // A failed overview would silently drop every board URL for the revalidate window, so the last good sitemap keeps serving
    // The build has no last good copy to fall back on, so it ships without boards and ISR fills them in
    if (!leaderboardOverview && process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error('sitemap: leaderboard overview unavailable');
    }
    const leaderboardCharacterIds = new Set(
        (leaderboardOverview ?? []).map((entry) => entry.id).filter(Boolean),
    );

    let dynamicRoutes: MetadataRoute.Sitemap = [];
    try {
        if (fs.existsSync(CHARACTERS_PATH)) {
            const charsData = JSON.parse(fs.readFileSync(CHARACTERS_PATH, 'utf8')) as unknown;
            const chars = (Array.isArray(charsData) ? charsData : Object.values(charsData as Record<string, unknown>))
                .filter((char): char is { id: string | number } => (
                    Boolean(char) && typeof char === 'object' && (char as { id?: unknown }).id != null
                ));
            const charRoutes = chars.map((char) => ({
                url: `${SITE_URL}/characters/${char.id}`,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
            const lbRoutes = chars.filter((char) => leaderboardCharacterIds.has(String(char.id))).map((char) => ({
                url: `${SITE_URL}/leaderboards/${char.id}`,
                changeFrequency: 'daily' as const,
                priority: 0.9,
            }));
            dynamicRoutes = [...dynamicRoutes, ...charRoutes, ...lbRoutes];
        }

        if (fs.existsSync(WEAPONS_PATH)) {
            const wepRoutes = loadWeaponsForSitemap()
                .filter((weapon): weapon is WeaponSitemapEntry & { id: string | number } => weapon.id != null)
                .map((weapon) => ({
                    url: `${SITE_URL}/weapons/${weapon.id}`,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
            dynamicRoutes = [...dynamicRoutes, ...wepRoutes];
        }
    } catch (err) {
        console.error('Error generating dynamic sitemap', err);
    }

    return [...staticRoutes, ...dynamicRoutes];
}
