import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

type WeaponSitemapEntry = {
    id?: string | number;
};

function loadWeaponsForSitemap(): WeaponSitemapEntry[] {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    const wepPath = path.join(dataDir, 'Weapons.json');

    if (!fs.existsSync(wepPath)) {
        return [];
    }

    const rawData = JSON.parse(fs.readFileSync(wepPath, 'utf8')) as unknown;
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

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://wuwabuilds.moe';

    const staticRoutes = [
        '',
        '/builds',
        '/edit',
        '/import',
        '/saves',
        '/leaderboards',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    let dynamicRoutes: MetadataRoute.Sitemap = [];

    try {
        const dataDir = path.join(process.cwd(), 'public', 'Data');

        // Characters
        const charPath = path.join(dataDir, 'Characters.json');
        if (fs.existsSync(charPath)) {
            const charsData = JSON.parse(fs.readFileSync(charPath, 'utf8'));
            // Characters is a dictionary: {"1105": { id: "1105", ... }, ...}
            const charRoutes = Object.values(charsData).map((char: unknown) => ({
                url: `${baseUrl}/characters/${(char as { id: string | number }).id}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
            dynamicRoutes = [...dynamicRoutes, ...charRoutes];
        }

        // Weapons
        const wepPath = path.join(dataDir, 'Weapons.json');
        if (fs.existsSync(wepPath)) {
            const wepRoutes = loadWeaponsForSitemap()
                .filter((weapon): weapon is WeaponSitemapEntry & { id: string | number } => weapon.id != null)
                .map((weapon) => ({
                    url: `${baseUrl}/weapons/${weapon.id}`,
                    lastModified: new Date(),
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
