import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FULBO',
    short_name: 'FULBO',
    description: 'Coordiná el partido con tus amigos',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#22c55e',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
