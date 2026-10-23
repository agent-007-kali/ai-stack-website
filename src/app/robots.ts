import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/jarvis-bridge', '/club/login', '/club/chat'],
        },
        sitemap: 'https://ai-solutions.company/sitemap.xml',
    };
}
