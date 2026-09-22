import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            // Preview images live under /api/og, and the longer Allow wins over the /api/ Disallow
            allow: ['/', '/api/og/'],
            disallow: ['/api/'],
        },
        sitemap: 'https://wuwa.build/sitemap.xml',
    };
}
