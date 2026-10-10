import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/jarvis-bridge'],
        },
        sitemap: 'https://ai-solutions.company/sitemap.xml',
    };
}
