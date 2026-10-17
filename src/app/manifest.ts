import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bow Chat - AI Solutions',
    short_name: 'Bow Chat',
    description:
      'Chat with Bow Bot, your 3-day free trial experience. A scripted demo, not a live model.',
    id: '/try',
    start_url: '/try',
    scope: '/try',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#070d1f',
    theme_color: '#0b1530',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
