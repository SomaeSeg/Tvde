import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VitaOS — Saúde, Treino & Nutrição',
    short_name: 'VitaOS',
    description: 'Biometria, treino em casa e nutrição num só lugar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#059669',
    lang: 'pt-PT',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
