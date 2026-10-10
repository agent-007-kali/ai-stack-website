import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const base = 'https://ai-solutions.company';
    const lastModified = new Date();
    return [
        { url: base + '/', lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: base + '/learn', lastModified, changeFrequency: 'weekly', priority: 0.9 },
        { url: base + '/academy', lastModified, changeFrequency: 'weekly', priority: 0.9 },
        { url: base + '/try', lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: base + '/accounting', lastModified, changeFrequency: 'monthly', priority: 0.7 },
        { url: base + '/privacy', lastModified, changeFrequency: 'yearly', priority: 0.3 },
    ];
}
