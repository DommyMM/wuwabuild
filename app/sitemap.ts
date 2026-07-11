import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

type WeaponSitemapEntry = {
    id?: string | number;
};

const DATA_DIR = path.join(process.cwd(), 'public', 'Data');
const CHARACTERS_PATH = path.join(DATA_DIR, 'Characters.json');
const WEAPONS_PATH = path.join(DATA_DIR, 'Weapons.json');
const CHANGELOG_PATH = path.join(process.cwd(), 'lib', 'changelog.ts');
const PRIVACY_PATH = path.join(process.cwd(), 'components', 'legal', 'PrivacyPage.tsx');
const TOS_PATH = path.join(process.cwd(), 'components', 'legal', 'TosPage.tsx');

export const revalidate = 600;

function getFileLastModified(filePath: string): Date {
    try {
        return fs.statSync(filePath).mtime;
    } catch {
        return new Date('2026-01-01T00:00:00.000Z');
    }
}

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://wuwa.build';
    const characterDataModified = getFileLastModified(CHARACTERS_PATH);
    const weaponDataModified = getFileLastModified(WEAPONS_PATH);
    const staticLastModified = characterDataModified > weaponDataModified
        ? characterDataModified
        : weaponDataModified;

    const staticRoutes = [
        { path: '', priority: 1.0, changeFrequency: 'daily' as const, lastModified: staticLastModified },
        { path: '/builds', priority: 0.9, changeFrequency: 'daily' as const },
        { path: '/leaderboards', priority: 0.9, changeFrequency: 'daily' as const },
        { path: '/profiles', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/edit', priority: 0.9, changeFrequency: 'weekly' as const },
        { path: '/import', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/changelog', priority: 0.7, changeFrequency: 'daily' as const, lastModified: getFileLastModified(CHANGELOG_PATH) },
        { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' as const, lastModified: getFileLastModified(PRIVACY_PATH) },
        { path: '/tos', priority: 0.3, changeFrequency: 'monthly' as const, lastModified: getFileLastModified(TOS_PATH) },
    ].map((route) => ({
        url: `${baseUrl}${route.path}`,
        ...('lastModified' in route ? { lastModified: route.lastModified } : {}),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));

    let dynamicRoutes: MetadataRoute.Sitemap = [];
    const leaderboardOverview = await prefetchLeaderboardOverview();
    const leaderboardCharacterIds = new Set(
        (leaderboardOverview ?? []).map((entry) => entry.id).filter(Boolean),
    );

    try {
        // Characters
        if (fs.existsSync(CHARACTERS_PATH)) {
            const charsData = JSON.parse(fs.readFileSync(CHARACTERS_PATH, 'utf8')) as unknown;
            const chars = (Array.isArray(charsData) ? charsData : Object.values(charsData as Record<string, unknown>))
                .filter((char): char is { id: string | number } => (
                    Boolean(char) && typeof char === 'object' && (char as { id?: unknown }).id != null
                ));
            const charRoutes = chars.map((char) => ({
                url: `${baseUrl}/characters/${char.id}`,
                lastModified: characterDataModified,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
            const lbRoutes = chars.filter((char) => leaderboardCharacterIds.has(String(char.id))).map((char) => ({
                url: `${baseUrl}/leaderboards/${char.id}`,
                lastModified: characterDataModified,
                changeFrequency: 'daily' as const,
                priority: 0.9,
            }));
            dynamicRoutes = [...dynamicRoutes, ...charRoutes, ...lbRoutes];
        }

        // Weapons
        if (fs.existsSync(WEAPONS_PATH)) {
            const wepRoutes = loadWeaponsForSitemap()
                .filter((weapon): weapon is WeaponSitemapEntry & { id: string | number } => weapon.id != null)
                .map((weapon) => ({
                    url: `${baseUrl}/weapons/${weapon.id}`,
                    lastModified: weaponDataModified,
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
