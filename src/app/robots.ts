import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                // Agent-facing JSON interface: explicitly readable.
                userAgent: '*',
                allow: ['/api/bot', '/api/bot/', '/llms.txt', '/agents.json', '/bot'],
            },
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/jarvis-bridge', '/club/login', '/club/chat'],
            },
        ],
        sitemap: 'https://ai-solutions.company/sitemap.xml',
    };
}
