import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

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
            const wepsData = JSON.parse(fs.readFileSync(wepPath, 'utf8'));
            // Weapons is organized by type, e.g. {"Broadblade": {"21010016": {id: "..."}}}
            const wepRoutes: MetadataRoute.Sitemap = [];
            for (const typeKey in wepsData) {
                Object.values(wepsData[typeKey]).forEach((wep: unknown) => {
                    wepRoutes.push({
                        url: `${baseUrl}/weapons/${(wep as { id: string | number }).id}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly' as const,
                        priority: 0.6,
                    });
                });
            }
            dynamicRoutes = [...dynamicRoutes, ...wepRoutes];
        }
    } catch (err) {
        console.error('Error generating dynamic sitemap', err);
    }

    return [...staticRoutes, ...dynamicRoutes];
}
